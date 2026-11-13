import { SECTOR_IDS, SECTOR_MAP, createSectorSeed } from '../data/seed.js';
import { SHIFT_IDS, STAFF_ROLES, getShift } from './staff.js';
import { uid } from './utils.js';

const STORAGE_KEY = 'handoff360:v1';
const listeners = new Set();
let state = null;

function nowIso() {
  return new Date().toISOString();
}

function readState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1 || !parsed.sectors) return null;
    return parsed;
  } catch (error) {
    console.warn('[HandOff360] No se pudo leer localStorage', error);
    return null;
  }
}

function persist(emit = true) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('[HandOff360] No se pudo guardar en localStorage', error);
  }
  if (emit) {
    listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (error) {
        console.error('[HandOff360] Error en suscriptor', error);
      }
    });
  }
}

function addLogEntry(sector, type, text) {
  sector.log = Array.isArray(sector.log) ? sector.log : [];
  sector.log.unshift({ id: uid('log'), type, text, at: nowIso() });
  if (sector.log.length > 40) sector.log.length = 40;
}

function normalizeProfile(profile, sector) {
  if (!profile || typeof profile !== 'object') return null;
  const name = String(profile.name || '').trim().replace(/\s+/g, ' ').slice(0, 60);
  const areas = Array.isArray(sector.meta?.areas) ? sector.meta.areas : [];
  const area = areas.find((item) => item === profile.area);
  if (!name || !area) return null;
  return {
    name,
    area,
    startedAt: profile.startedAt || nowIso(),
    updatedAt: profile.updatedAt || profile.startedAt || nowIso(),
  };
}

function buildAutoSummary(sector) {
  const critical = sector.alerts.filter((alert) => alert.severity === 'critical').length;
  const pendingCount = sector.pendings.length;
  const hero = sector.hero;
  return [
    `${sector.meta.shiftLabel} cerrado. ${hero.label} en ${hero.value}${hero.suffix}.`,
    critical > 0
      ? `Se registraron ${critical} alerta${critical === 1 ? '' : 's'} crítica${critical === 1 ? '' : 's'} durante el turno.`
      : 'Sin alertas críticas abiertas.',
    pendingCount > 0
      ? `Quedan ${pendingCount} pendiente${pendingCount === 1 ? '' : 's'} para el siguiente turno.`
      : 'No quedan pendientes para el siguiente turno.',
  ].join(' ');
}

export function initStore() {
  const stored = readState();
  state = stored || { version: 1, createdAt: nowIso(), sectors: {} };

  SECTOR_IDS.forEach((id) => {
    if (!state.sectors[id]) {
      state.sectors[id] = createSectorSeed(id);
    }
    const sector = state.sectors[id];
    sector.meta = sector.meta && typeof sector.meta === 'object' ? sector.meta : {};
    if (!Array.isArray(sector.meta.areas) || !sector.meta.areas.length) {
      sector.meta.areas = SECTOR_MAP[id].areas || [];
    }
    sector.profile = normalizeProfile(sector.profile, sector);
    sector.chat = Array.isArray(sector.chat) ? sector.chat : [];
    sector.notes = Array.isArray(sector.notes) ? sector.notes : [];
    sector.staff = Array.isArray(sector.staff) ? sector.staff : [];
    sector.supportTickets = Array.isArray(sector.supportTickets) ? sector.supportTickets : [];
    sector.reports = Array.isArray(sector.reports) ? sector.reports : [];
    sector.pendings = Array.isArray(sector.pendings) ? sector.pendings : [];
    sector.log = Array.isArray(sector.log) ? sector.log : [];
    sector.alerts = Array.isArray(sector.alerts) ? sector.alerts : [];
    sector.kpis = Array.isArray(sector.kpis) ? sector.kpis : [];
    sector.criticalAck =
      sector.criticalAck && typeof sector.criticalAck === 'object'
        ? sector.criticalAck
        : null;
  });

  persist(false);
  return state;
}

export function getState() {
  return state;
}

export function getSector(id) {
  return state?.sectors?.[id] || null;
}

export function getProfile(id) {
  return getSector(id)?.profile || null;
}

export function setProfile(id, { name, area } = {}) {
  const sector = getSector(id);
  if (!sector) return null;

  const cleanName = String(name ?? '').trim().replace(/\s+/g, ' ').slice(0, 60);
  const allowedAreas = Array.isArray(sector.meta?.areas) ? sector.meta.areas : [];
  const cleanArea = allowedAreas.find((item) => item === String(area ?? '').trim());
  if (!cleanName || !cleanArea) return null;

  const previous = sector.profile;
  const changed =
    !previous || previous.name !== cleanName || previous.area !== cleanArea;

  sector.profile = {
    name: cleanName,
    area: cleanArea,
    startedAt: previous?.startedAt || nowIso(),
    updatedAt: nowIso(),
  };
  sector.criticalAck = null;

  if (changed) {
    addLogEntry(sector, 'inicio', `Turno iniciado · ${cleanName} · ${cleanArea}`);
  }

  persist(true);
  return sector.profile;
}

export function ackCriticalAlert(id, alertId) {
  const sector = getSector(id);
  if (!sector) return;
  sector.criticalAck = {
    alertId: String(alertId ?? ''),
    at: nowIso(),
  };
  persist(false);
}

export function resolveCaseAlert(id, caseId, note) {
  const sector = getSector(id);
  if (!sector) return null;

  const item = (sector.cases || []).find((entry) => entry.id === caseId);
  if (!item) return null;

  const cleanNote = String(note ?? '').trim().slice(0, 280);
  if (!cleanNote) return null;

  const profile = sector.profile;
  const at = nowIso();
  const by = profile?.name || sector.meta?.supervisor || 'Turno';
  const area = profile?.area || '';
  const linkedAlerts = (sector.alerts || []).filter((alert) => alert.caseId === caseId);
  const primaryAlert =
    linkedAlerts.find((alert) => alert.severity === 'critical') || linkedAlerts[0];
  const alertTimes = linkedAlerts
    .map((alert) => Date.parse(alert.at))
    .filter((time) => Number.isFinite(time));
  const firstAlertAt = alertTimes.length ? Math.min(...alertTimes) : null;
  const resolvedAt = Date.parse(at);
  const responseMs =
    firstAlertAt != null && Number.isFinite(resolvedAt)
      ? Math.max(0, resolvedAt - firstAlertAt)
      : null;
  const resolution = {
    note: cleanNote,
    at,
    by,
    area,
    severity: primaryAlert?.severity || '',
    responseMs,
  };

  item.resolution = resolution;
  item.status = 'Resuelto';
  item.statusTone = 'done';
  item.updatedAt = at;
  item.timeline = Array.isArray(item.timeline) ? item.timeline : [];
  item.timeline.push({
    time: new Date(at).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
    text: `Resolución registrada por ${by}${area ? ` (${area})` : ''}: ${cleanNote}`,
  });

  sector.alerts = (sector.alerts || []).filter((alert) => alert.caseId !== caseId);
  addLogEntry(sector, 'alerta', `Caso ${caseId} resuelto: ${cleanNote}`);
  persist(true);
  return resolution;
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function saveDraft(id, text) {
  const sector = getSector(id);
  if (!sector) return;
  sector.draft = String(text ?? '');
  persist(false);
}

export function appendChat(id, message) {
  const sector = getSector(id);
  if (!sector) return;
  sector.chat.push({
    id: uid('msg'),
    at: nowIso(),
    ...message,
  });
  if (sector.chat.length > 60) sector.chat = sector.chat.slice(-60);
  persist(false);
}

export function clearChat(id) {
  const sector = getSector(id);
  if (!sector) return;
  sector.chat = [];
  persist(false);
}

export function addNote(id, text) {
  const sector = getSector(id);
  if (!sector) return null;
  const clean = String(text ?? '').trim().slice(0, 400);
  if (!clean) return null;
  const note = {
    id: uid('note'),
    text: clean,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    converted: false,
  };
  sector.notes.unshift(note);
  addLogEntry(sector, 'pendiente', `Nota offline guardada: ${clean}`);
  persist(true);
  return note;
}

export function deleteNote(id, noteId) {
  const sector = getSector(id);
  if (!sector) return;
  const note = sector.notes.find((item) => item.id === noteId);
  if (!note) return;
  sector.notes = sector.notes.filter((item) => item.id !== noteId);
  addLogEntry(sector, 'pendiente', `Nota offline eliminada: ${note.text}`);
  persist(true);
}

export function convertNotesToPendings(id, noteIds = null) {
  const sector = getSector(id);
  if (!sector) return { created: 0, pendings: [] };
  const requested = noteIds == null ? null : Array.isArray(noteIds) ? noteIds : [noteIds];
  const candidates = sector.notes.filter(
    (note) => !note.converted && (!requested || requested.includes(note.id))
  );
  const pendings = candidates.map((note) => {
    const pending = {
      id: uid('pd'),
      text: note.text,
      priority: 'media',
      done: false,
      createdAt: nowIso(),
    };
    sector.pendings.unshift(pending);
    note.converted = true;
    note.convertedAt = nowIso();
    return pending;
  });

  if (pendings.length) {
    addLogEntry(
      sector,
      'pendiente',
      `${pendings.length} nota${pendings.length === 1 ? '' : 's'} offline convertida${pendings.length === 1 ? '' : 's'} en pendiente${pendings.length === 1 ? '' : 's'}`
    );
    persist(true);
  }
  return { created: pendings.length, pendings };
}

export function addSupportTicket(id, { category = '', message = '', contact = '' } = {}) {
  const sector = getSector(id);
  if (!sector) return null;
  const cleanMessage = String(message ?? '').trim().slice(0, 280);
  if (!cleanMessage) return null;
  const ticket = {
    id: uid('sup'),
    category: String(category ?? '').trim().slice(0, 80),
    message: cleanMessage,
    contact: String(contact ?? '').trim().slice(0, 60),
    createdAt: nowIso(),
  };
  sector.supportTickets.unshift(ticket);
  persist(true);
  return ticket;
}

export function addStaffMember(id, { name, role, area, shift, active = true } = {}) {
  const sector = getSector(id);
  if (!sector) return null;
  const cleanName = String(name ?? '').trim().replace(/\s+/g, ' ').slice(0, 60);
  if (!cleanName) return null;
  const cleanArea = String(area ?? '').trim().slice(0, 60);
  const cleanShift = SHIFT_IDS.includes(shift) ? shift : 'matutino';
  const member = {
    id: uid('stf'),
    name: cleanName,
    role: STAFF_ROLES.includes(role) ? role : 'Enfermería',
    area: cleanArea,
    shift: cleanShift,
    active: active !== false,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  sector.staff.unshift(member);
  addLogEntry(
    sector,
    'inicio',
    `Personal asignado: ${cleanName} · ${cleanArea || 'sin área'} · ${getShift(cleanShift).label}`
  );
  persist(true);
  return member;
}

export function updateStaffMember(id, staffId, patch = {}) {
  const sector = getSector(id);
  if (!sector) return null;
  const member = sector.staff.find((item) => item.id === staffId);
  if (!member) return null;

  if (patch.name !== undefined) {
    const cleanName = String(patch.name).trim().replace(/\s+/g, ' ').slice(0, 60);
    if (cleanName) member.name = cleanName;
  }
  if (patch.role !== undefined && STAFF_ROLES.includes(patch.role)) {
    member.role = patch.role;
  }
  if (patch.area !== undefined) {
    member.area = String(patch.area).trim().slice(0, 60);
  }
  if (patch.shift !== undefined && SHIFT_IDS.includes(patch.shift)) {
    member.shift = patch.shift;
  }
  if (patch.active !== undefined) {
    member.active = Boolean(patch.active);
  }
  member.updatedAt = nowIso();
  persist(true);
  return member;
}

export function removeStaffMember(id, staffId) {
  const sector = getSector(id);
  if (!sector) return;
  const member = sector.staff.find((item) => item.id === staffId);
  if (!member) return;
  sector.staff = sector.staff.filter((item) => item.id !== staffId);
  addLogEntry(sector, 'inicio', `Personal dado de baja: ${member.name}`);
  persist(true);
}

export function addPending(id, text, priority = 'media') {  const clean = String(text ?? '').trim().slice(0, 180);
  if (!clean) return null;
  const normalizedPriority = ['alta', 'media', 'baja'].includes(priority) ? priority : 'media';
  let created = null;

  const sector = getSector(id);
  if (!sector) return null;

  sector.pendings.unshift({
    id: uid('pd'),
    text: clean,
    priority: normalizedPriority,
    done: false,
    createdAt: nowIso(),
  });
  created = sector.pendings[0];
  addLogEntry(sector, 'pendiente', `Pendiente registrado: ${clean}`);
  persist(true);
  return created;
}

export function togglePending(id, pendingId) {
  const sector = getSector(id);
  if (!sector) return;
  const pending = sector.pendings.find((item) => item.id === pendingId);
  if (!pending) return;
  pending.done = !pending.done;
  if (pending.done) {
    pending.doneAt = nowIso();
  } else {
    delete pending.doneAt;
  }
  persist(true);
}

export function removePending(id, pendingId) {
  const sector = getSector(id);
  if (!sector) return;
  const pending = sector.pendings.find((item) => item.id === pendingId);
  if (!pending) return;
  sector.pendings = sector.pendings.filter((item) => item.id !== pendingId);
  addLogEntry(sector, 'pendiente', `Pendiente eliminado: ${pending.text}`);
  persist(true);
}

export function closeShift(id, summary = '') {
  const sector = getSector(id);
  if (!sector) return null;

  const pendingCount = sector.pendings.length;
  const profile = sector.profile;
  const operatorName = profile?.name || sector.meta.supervisor;
  const operatorArea = profile?.area || '';
  const summaryText =
    String(summary ?? sector.draft ?? '').trim() || buildAutoSummary(sector);
  const sequence = sector.reportSeq || 1;
  const report = {
    id: `REP-${String(sequence).padStart(3, '0')}`,
    sectorId: id,
    sectorName: SECTOR_MAP[id].name,
    shiftLabel: sector.meta.shiftLabel,
    shiftNumber: sector.meta.shiftNumber,
    supervisor: sector.meta.supervisor,
    area: sector.meta.area,
    summary: summaryText,
    pendings: sector.pendings.map((pending) => ({ ...pending })),
    criticalAlerts: sector.alerts.filter((alert) => alert.severity === 'critical').length,
    totalAlerts: sector.alerts.length,
    kpis: sector.kpis.map((kpi) => ({ label: kpi.label, value: kpi.value })),
    hero: {
      label: sector.hero.label,
      value: sector.hero.value,
      suffix: sector.hero.suffix,
    },
    createdAt: nowIso(),
    closedBy: operatorName,
    closedByArea: operatorArea,
  };

  sector.reports.unshift(report);
  sector.reportSeq = sequence + 1;
  sector.pendings = [];
  sector.draft = '';
  sector.draftClosed = true;
  sector.lastClose = { reportId: report.id, createdAt: report.createdAt };
  addLogEntry(
    sector,
    'cierre',
    `Turno cerrado · ${report.id} · ${operatorName}${operatorArea ? ` · ${operatorArea}` : ''} · ${pendingCount} pendiente${pendingCount === 1 ? '' : 's'} archivado${pendingCount === 1 ? '' : 's'}`
  );
  persist(true);
  return report;
}

export function consumeDraftClosed(id) {
  const sector = getSector(id);
  if (!sector || !sector.draftClosed) return false;
  sector.draftClosed = false;
  persist(false);
  return true;
}

export function suggestHandoverSummary(id) {
  const sector = getSector(id);
  return sector ? buildAutoSummary(sector) : '';
}

export function resetDemo() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('[HandOff360] No se pudo limpiar localStorage', error);
  }
  state = { version: 1, createdAt: nowIso(), sectors: {} };
  SECTOR_IDS.forEach((id) => {
    state.sectors[id] = createSectorSeed(id);
  });
  persist(true);
  return state;
}
