import {
  appendChat,
  addPending,
  closeShift,
  convertNotesToPendings,
  getSector,
  saveDraft,
  suggestHandoverSummary,
} from '../core/store.js';
import { searchSector } from '../core/search.js';
import { navigate } from '../core/router.js';
import { icon } from '../core/icons.js';
import { toast } from '../core/ui.js';
import {
  escapeHtml,
  firstName,
  joinText,
  normalizeText,
  plural,
  relativeTime,
} from '../core/utils.js';
import { startDictation } from './voice.js';

export const ADVISOR_GREETING =
  'En unos momentos uno de los asesores te estará apoyando. ¿En qué puedo ayudarte hoy?';

const SUPPORT_CHIPS = [
  {
    id: 'cierre-turno',
    label: '📋 Problema al cerrar o guardar mi turno',
    reply:
      'El cierre vive en la pestaña **Entrega**: completa el resumen, revisa tus pendientes y presiona **Cerrar turno**.\n\n• Si el resumen está vacío, se arma uno automático con la alerta crítica y los pendientes abiertos.\n• Al cerrar se genera un reporte con ID (ej. REP-112) y los pendientes quedan archivados en **Historial**.\n• Si no te deja cerrar, revisa que tengas nombre y área guardados; el cierre registra quién y desde qué área.\n\nTus datos viven en este dispositivo: si cierras sin internet, el reporte se guarda igual.',
    actions: [{ label: 'Ir a entrega', action: 'go_handover' }],
  },
  {
    id: 'dictado-voz',
    label: '🎙️ Fallas con el dictado por voz',
    reply:
      'El dictado usa la Web Speech API del navegador, así que depende de tu navegador:\n\n• Funciona en Chrome, Edge y Safari recientes; en Firefox suele no estar disponible.\n• Debes permitir el micrófono cuando el navegador lo pida.\n• Algunos navegadores requieren conexión para transcribir, aunque el resto de la app es 100% local.\n\nSi no te escucha, escribe el texto a mano en el mismo campo: el resultado es idéntico. También puedes probar el micrófono del **Bloc Offline** para separar el problema del dictado del cierre de turno.',
    actions: [{ label: 'Ir a entrega', action: 'go_handover' }],
  },
  {
    id: 'sincronizacion',
    label: '🔄 Sincronización o datos en localStorage',
    reply:
      'HandOff 360 es **100% local**, y eso es intencional:\n\n• Todo se guarda en el `localStorage` de este navegador, bajo la clave `handoff360:v1`.\n• No hay servidor ni sincronización entre dispositivos: cada turno se entrega en persona, no por la nube.\n• Si borras los datos del sitio o usas otro navegador, la información no estará ahí.\n\nLo que sí queda registrado y es consultable es el **Historial**: ahí están los reportes de cada turno cerrado, con pendientes archivados y casos resueltos.',
    actions: [{ label: 'Ver historial', action: 'go_history' }],
  },
  {
    id: 'censo-areas',
    label: '🏥 Dudas sobre el censo o áreas del sector',
    reply:
      'El **censo** son los casos del sector: pacientes en Salud, embarques en Logística y productos en Retail. Cada uno tiene ID, estado, responsable y línea de tiempo.\n\n• Búscalos en **Historial** por ID (PAC-1042, EMB-2041, SKU-7781) o por nombre.\n• Al tocar un caso puedes escribir o dictar la resolución, que queda en su línea de tiempo.\n\nLas **áreas** son las unidades donde puedes operar (Urgencias, Andenes, Cajas…). Cambia de área desde la pantalla de identificación, y el perfil se guarda por sector.',
    actions: [{ label: 'Abrir historial', action: 'go_history' }],
  },
  {
    id: 'perfil-operador',
    label: '👤 Cambiar de perfil u operador',
    reply:
      'El perfil es **local y contextual**: define con qué nombre y área firmas el turno. No es una autenticación ni una contraseña, así que puedes cambiarlo en cualquier momento.\n\n• Cambiar de nombre o área: vuelve a la pantalla de identificación desde **Volver a Sectores** y confirma los datos.\n• Cada sector guarda su propio perfil, así que puedes tener identidades distintas por área.\n• El nombre y el área quedan impresos en el reporte de cierre (`closedBy` y `closedByArea`).\n\nTen en cuenta que al reidentificarte se vuelve a mostrar la alerta crítica del sector para que la revises antes de operar.',
    actions: [{ label: 'Cambiar perfil', action: 'go_access' }],
  },
  {
    id: 'asesor',
    label: '💬 Hablar con un asesor',
    reply:
      'En unos momentos uno de los asesores te estará apoyando.\n\nMientras tanto puedes:\n• Revisar las **preguntas frecuentes** en el botón de Soporte Técnico.\n• Enviar un **reporte de falla** desde ese mismo modal; queda guardado en el dispositivo.\n• Escribir aquí mismo tu duda y te oriento con lo que la app ya sabe hacer.\n\nTeléfono simulado **+52 800 000 0000** y correo **soporte@handoff360.local**, ambos con atención 24/7.',
    actions: [{ label: 'Ver historial', action: 'go_history' }],
  },
];

let fab = null;
let scrim = null;
let panel = null;
let bodyEl = null;
let inputEl = null;
let suggestEl = null;
let micBtn = null;
let sectorId = null;
let panelOpen = false;
let respondTimer = null;
let dictation = null;
let ctx = { pendingClose: false };

export function initChat({ fab: fabElement, container }) {
  fab = fabElement;

  container.innerHTML = `
    <div class="chat-scrim" data-scrim></div>
    <section class="chat-panel" role="dialog" aria-modal="true" aria-label="Asistente HandOff" data-panel>
      <div class="chat-grabber"></div>
      <header class="chat-head">
        <div class="chat-avatar">${icon('bot')}</div>
        <div class="chat-head-copy">
          <strong>Asistente HandOff</strong>
          <small><span class="live-dot"></span>Local · responde sin conexión</small>
        </div>
        <button class="chat-close" type="button" data-close aria-label="Cerrar asistente">${icon('close')}</button>
      </header>
      <div class="chat-body" data-body></div>
      <div class="chat-suggest" data-suggest></div>
      <div class="chat-composer">
        <input class="chat-input" type="text" placeholder="Escribe o dicta un comando…" autocomplete="off" enterkeyhint="send" data-input>
        <button class="chat-mic" type="button" data-mic aria-label="Dictar mensaje">${icon('mic')}</button>
        <button class="chat-send" type="button" data-send aria-label="Enviar mensaje">${icon('send')}</button>
      </div>
    </section>
  `;

  scrim = container.querySelector('[data-scrim]');
  panel = container.querySelector('[data-panel]');
  bodyEl = container.querySelector('[data-body]');
  suggestEl = container.querySelector('[data-suggest]');
  inputEl = container.querySelector('[data-input]');
  micBtn = container.querySelector('[data-mic]');

  fab.addEventListener('click', () => openChat());
  scrim.addEventListener('click', closeChat);
  container.querySelector('[data-close]').addEventListener('click', closeChat);
  container.querySelector('[data-send]').addEventListener('click', () => submit());
  inputEl.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submit();
    }
  });
  micBtn.addEventListener('click', toggleMic);
  bodyEl.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-chip]');
    if (chip) {
      handleSupportChip(chip.dataset.chip);
      return;
    }
    const button = event.target.closest('[data-chat-action]');
    if (button) handleAction(button.dataset.chatAction, button.dataset.value || '');
  });
  suggestEl.addEventListener('click', (event) => {
    const button = event.target.closest('[data-suggest-text]');
    if (button) submit(button.dataset.suggestText);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && panel.classList.contains('is-open')) closeChat();
  });
}

export function setChatSector(id) {
  window.clearTimeout(respondTimer);
  ctx.pendingClose = false;
  sectorId = id;
  fab.hidden = !id;
  stopDictation();
  if (!id) {
    closeChat();
    return;
  }
  ensureGreeting();
  renderSuggestions();
  if (panel.classList.contains('is-open')) renderMessages();
}

function isTouchDevice() {
  return window.matchMedia('(pointer: coarse)').matches;
}

export function openChat({ focus = true } = {}) {
  if (!sectorId) return;
  ensureGreeting();
  panel.classList.add('is-open');
  scrim.classList.add('is-open');
  panelOpen = true;
  renderMessages();
  if (focus && !isTouchDevice()) {
    window.setTimeout(() => inputEl.focus({ preventScroll: true }), 280);
  }
}

export function closeChat() {
  panelOpen = false;
  panel.classList.remove('is-open');
  scrim.classList.remove('is-open');
  stopDictation();
}

export function openAdvisorChat() {
  if (!sectorId) return;
  ensureGreeting();
  const sector = getSector(sectorId);
  const alreadyOpen = panel.classList.contains('is-open');
  const last = sector?.chat?.[sector.chat.length - 1];
  if (last?.advisor) {
    openChat({ focus: false });
    scrollToAdvisorMessage();
    return;
  }
  appendChat(sectorId, {
    role: 'bot',
    advisor: true,
    text: ADVISOR_GREETING,
    chips: SUPPORT_CHIPS.map((chip) => ({ id: chip.id, label: chip.label })),
  });
  if (alreadyOpen) renderMessages();
  else openChat({ focus: false });
  scrollToAdvisorMessage();
}

function scrollToAdvisorChips() {
  scrollToAdvisorMessage();
}
function handleSupportChip(chipId) {
  const chip = SUPPORT_CHIPS.find((item) => item.id === chipId);
  if (!chip) return;
  pushMessage('user', chip.label);
  renderMessages();
  showTyping();
  window.clearTimeout(respondTimer);
  respondTimer = window.setTimeout(() => {
    hideTyping();
    pushMessage('bot', chip.reply, chip.actions);
    renderMessages();
  }, 520);
}

function ensureGreeting() {
  const sector = getSector(sectorId);
  if (!sector || sector.chat.length) return;
  const profile = sector.profile;
  const critical = sector.alerts.filter((alert) => alert.severity === 'critical').length;
  const active = sector.pendings.filter((pending) => !pending.done).length;
  const welcome = profile ? `Hola, ${firstName(profile.name)}.` : 'Hola.';
  const profileLine = profile
    ? ` Tu perfil activo es **${profile.name} · ${profile.area}**.`
    : '';
  appendChat(sectorId, {
    role: 'bot',
    text: `${welcome} Soy tu asistente HandOff. Estoy viendo ${sector.meta.area}.${profileLine} Tienes ${active} ${plural(active, 'pendiente')} activo${active === 1 ? '' : 's'} y ${critical} ${plural(critical, 'alerta')} crítica${critical === 1 ? '' : 's'}. Puedo darte un resumen, revisar pendientes y alertas, buscar un caso o preparar el cierre del turno.`,
  });
}

function renderSuggestions() {
  const sector = getSector(sectorId);
  const suggestions = ['Resumen rápido', 'Mi perfil', 'Pendientes', 'Ayúdame a cerrar turno', 'Alertas críticas'];
  suggestions.push('Bloc Offline');
  if (sector?.notes?.some((note) => !note.converted)) {
    suggestions.push('Convertir notas a pendientes');
  }
  if (sector?.cases?.length) suggestions.push(`Buscar ${sector.cases[0].id}`);
  suggestEl.innerHTML = suggestions
    .map(
      (text) =>
        `<button type="button" class="quick-chip" data-suggest-text="${escapeHtml(text)}">${escapeHtml(text)}</button>`
    )
    .join('');
}

function submit(preset) {
  const text = String(preset ?? inputEl.value ?? '').trim();
  if (!text || !sectorId) return;
  inputEl.value = '';
  pushMessage('user', text);
  renderMessages();
  respond(text);
}

function pushMessage(role, text, actions) {
  appendChat(sectorId, {
    role,
    text,
    actions: actions?.length ? actions : undefined,
  });
}

function respond(text) {
  showTyping();
  window.clearTimeout(respondTimer);
  respondTimer = window.setTimeout(() => {
    const { reply, actions } = resolveIntent(text, sectorId);
    hideTyping();
    pushMessage('bot', reply, actions);
    renderMessages();
  }, 520);
}

function showTyping() {
  if (!bodyEl.querySelector('[data-typing]')) {
    bodyEl.insertAdjacentHTML(
      'beforeend',
      '<div class="typing" data-typing><i></i><i></i><i></i></div>'
    );
    bodyEl.scrollTop = bodyEl.scrollHeight;
  }
}

function hideTyping() {
  bodyEl.querySelector('[data-typing]')?.remove();
}

function formatMessage(text = '') {
  return escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

function renderMessages() {
  const sector = getSector(sectorId);
  const messages = sector?.chat || [];
  bodyEl.innerHTML = messages
    .map((message) => {
      const actions = message.actions?.length
        ? `<div class="msg-actions">${message.actions
            .map(
              (action) =>
                `<button type="button" class="msg-action" data-chat-action="${escapeHtml(action.action)}" data-value="${escapeHtml(action.value || '')}">${escapeHtml(action.label)}</button>`
            )
            .join('')}</div>`
        : '';
      const chips = message.chips?.length
        ? `<div class="msg-chips">${message.chips
            .map(
              (chip) =>
                `<button type="button" class="msg-chip" data-chip="${escapeHtml(chip.id)}">${escapeHtml(chip.label)}</button>`
            )
            .join('')}</div>`
        : '';
      const modifier = message.chips?.length ? ' msg--chips' : '';
      return `<div class="msg ${message.role === 'user' ? 'msg--user' : 'msg--bot'}${modifier}">${formatMessage(message.text)}<time>${escapeHtml(relativeTime(message.at))}</time>${actions}${chips}</div>`;
    })
    .join('');
  bodyEl.scrollTop = bodyEl.scrollHeight;
}

function scrollToAdvisorMessage() {
  window.requestAnimationFrame(() => {
    const advisorMsg = bodyEl?.querySelector('.msg--chips');
    if (!advisorMsg) return;
    const bodyRect = bodyEl.getBoundingClientRect();
    const msgRect = advisorMsg.getBoundingClientRect();
    const delta = msgRect.top - bodyRect.top;
    if (delta < 0) {
      bodyEl.scrollTop += delta - 4;
    } else if (msgRect.bottom > bodyRect.bottom) {
      bodyEl.scrollTop += msgRect.bottom - bodyRect.bottom + 4;
    }
  });
}

function severityLabel(severity) {
  return { critical: 'Crítica', warn: 'Advertencia', info: 'Info' }[severity] || 'Info';
}

function resolveIntent(raw, id) {
  const sector = getSector(id);
  if (!sector) {
    return { reply: 'No tengo contexto de sector. Vuelve a elegir un sector para continuar.' };
  }

  const text = String(raw || '');
  const normalized = normalizeText(text);
  const has = (...words) => words.some((word) => normalized.includes(word));

  if (ctx.pendingClose && /^(confirmar|confirma|confirmo|si|cierra|cerrar|adelante|listo|hazlo)\b/.test(normalized) && !/^no\b/.test(normalized)) {
    ctx.pendingClose = false;
    return executeClose(id, sector);
  }

  if (/confirmar cierre|confirmo el cierre|confirma el cierre/.test(normalized)) {
    ctx.pendingClose = false;
    return executeClose(id, sector);
  }
  ctx.pendingClose = false;

  if (has('resumen', 'estado del turno', 'como va', 'reporte rapido', 'situacion')) {
    return summaryReply(sector);
  }

  if (has('cerrar turno', 'cierra el turno', 'cerrar el turno', 'entregar turno', 'cerrar mi turno', 'handoff')) {
    if (/(ya|ahora)\s*$/.test(normalized) || normalized.startsWith('cierralo')) {
      return executeClose(id, sector);
    }
    return prepareClose(id, sector);
  }

  if (/(^|\s)(ayuda|que puedes|que haces|opciones|comandos|help)(\s|$)/.test(normalized)) {
    return {
      reply:
        'Puedo ayudarte con esto:\n\n• **Resumen rápido** del turno\n• **Mi perfil**: nombre y área activos\n• **Pendientes**: listar o agregar\n• **Alertas críticas** activas\n• **Buscar** casos por nombre o ID\n• **Ayúdame a cerrar turno**: preparo el borrador y confirmas\n\nEjemplo: "agrega un pendiente: llamar al proveedor".',
    };
  }

  if (has('perfil', 'quien soy', 'mi nombre', 'mi area', 'mi departamento', 'cambiar area', 'cambiar de area')) {
    const profile = sector.profile;
    if (!profile) {
      return {
        reply: 'Aún no tienes un perfil activo. Vuelve a elegir tu sector para identificarte.',
        actions: [{ label: 'Identificarme', action: 'go_access' }],
      };
    }
    return {
      reply: `Tu perfil activo es **${profile.name} · ${profile.area}**.`,
      actions: [{ label: 'Cambiar perfil', action: 'go_access' }],
    };
  }

  if (has('bloc offline', 'bloc', 'notas offline', 'mis notas', 'nota offline', 'notas')) {
    if (has('convierte', 'convertir', 'pasar a pendiente', 'crear pendiente')) {
      return convertNotesReply(id, sector);
    }
    return notesReply(sector);
  }

  if (has('pendiente')) {
    if (has('agrega', 'agregar', 'anade', 'anadir', 'crea', 'crear', 'registra', 'registrar', 'apunta', 'anota')) {
      return addPendingReply(id, text);
    }
    return pendingsReply(sector);
  }

  if (has('alerta', 'critico', 'critica', 'urgente')) return alertsReply(sector);

  if (has('busca', 'buscar', 'buscame', 'encuentra', 'localiza', 'que paso con', 'historial de')) {
    return searchReply(sector, text);
  }

  if (has('historial', 'reportes', 'bitacora')) {
    return {
      reply: 'Abro tu historial. Ahí puedes buscar reportes y casos por nombre o ID.',
      actions: [{ label: 'Ver historial', action: 'go_history' }],
    };
  }

  if (has('panel', 'dashboard', 'inicio')) {
    return {
      reply: 'Vuelvo al panel del turno.',
      actions: [{ label: 'Ir al panel', action: 'go_panel' }],
    };
  }

  if (has('abre entrega', 'ver entrega', 'ir a entrega', 'pantalla de entrega')) {
    return {
      reply: 'Abro la entrega de turno.',
      actions: [{ label: 'Ir a entrega', action: 'go_handover' }],
    };
  }

  if (has('cama', 'camas', 'ocupacion', 'anden', 'andenes', 'venta', 'ventas', 'kpi', 'indicador', 'ticket', 'quiebre', 'stock')) {
    return kpiReply(sector, normalized);
  }

  if (has('gracias')) {
    return {
      reply: 'Para eso estoy. Cuando quieras, cierro el turno o busco algo en el historial.',
    };
  }

  if (has('hola', 'buenas', 'buenos dias', 'buenas tardes', 'hey')) {
    const operator = sector.profile?.name || sector.meta.supervisor;
    return {
      reply: `Hola, ${firstName(operator)}. Puedo darte un resumen, revisar pendientes y alertas, buscar un caso o preparar el cierre del turno.`,
    };
  }

  return {
    reply:
      'No estoy seguro de entender. Puedo darte un **resumen rápido**, revisar **pendientes** y **alertas**, **buscar** un caso por nombre o ID, o **preparar el cierre** del turno.',
  };
}

function prepareClose(id, sector) {
  let draftNote;
  if (!String(sector.draft || '').trim()) {
    saveDraft(id, suggestHandoverSummary(id));
    draftNote = 'Preparé un borrador automático con el resumen del turno';
  } else {
    draftNote = 'Usé el borrador que ya tenías escrito';
  }
  ctx.pendingClose = true;
  const critical = sector.alerts.filter((alert) => alert.severity === 'critical').length;
  return {
    reply: `${draftNote} y lo dejé listo en la entrega de turno.\n\nTienes ${sector.pendings.length} ${plural(sector.pendings.length, 'pendiente')} activo${sector.pendings.length === 1 ? '' : 's'} y ${critical} ${plural(critical, 'alerta')} crítica${critical === 1 ? '' : 's'}.\n\nEscribe **confirmar cierre** y lo cierro ahora, o revisa el borrador antes.`,
    actions: [
      { label: 'Confirmar cierre', action: 'confirm_close' },
      { label: 'Revisar entrega', action: 'review_handover' },
    ],
  };
}

function executeClose(id, sector) {
  const report = closeShift(id, sector.draft || '');
  if (!report) {
    return { reply: 'No pude cerrar el turno. Inténtalo desde la entrega de turno.' };
  }
  const name = sector.profile?.name ? `, ${firstName(sector.profile.name)}` : '';
  toast(`Turno cerrado · ${report.id}`);
  return {
    reply: `Listo${name}. Cerré el turno y guardé el reporte **${report.id}** con ${report.pendings.length} ${plural(report.pendings.length, 'pendiente')} archivado${report.pendings.length === 1 ? '' : 's'}. Ya está disponible en el historial.`,
    actions: [
      { label: 'Ver en historial', action: 'view_report', value: report.id },
      { label: 'Ir al panel', action: 'go_panel' },
    ],
  };
}

function summaryReply(sector) {
  const kpiLines = sector.kpis.map((kpi) => `• ${kpi.label}: ${kpi.value}`).join('\n');
  const critical = sector.alerts.filter((alert) => alert.severity === 'critical');
  const alertLine = critical.length
    ? critical.map((alert) => `• ${alert.title}`).join('\n')
    : '• Sin alertas críticas.';
  const pendingLine = sector.pendings.length
    ? `${sector.pendings.length} ${plural(sector.pendings.length, 'pendiente')} activo${sector.pendings.length === 1 ? '' : 's'}.`
    : 'Sin pendientes activos.';
  const last = sector.lastClose
    ? `\n\nÚltimo cierre: ${sector.lastClose.reportId} (${relativeTime(sector.lastClose.createdAt)}).`
    : '';
  const profile = sector.profile
    ? ` · ${sector.profile.name} · ${sector.profile.area}`
    : '';
  return {
    reply: `Resumen rápido de **${sector.meta.shiftLabel}**${profile}:\n\n**${sector.hero.label}:** ${sector.hero.value}${sector.hero.suffix}\n\n${kpiLines}\n\n**Alertas críticas:**\n${alertLine}\n\n**Pendientes:** ${pendingLine}${last}`,
  };
}

function pendingsReply(sector) {
  if (!sector.pendings.length) {
    return {
      reply:
        'No tienes pendientes activos. Si quieres registrar uno, dile: "agrega un pendiente: ...".',
      actions: [{ label: 'Ir a entrega', action: 'go_handover' }],
    };
  }
  const lines = sector.pendings
    .map((pending, index) => `${index + 1}. [${pending.priority}] ${pending.done ? '✓ ' : ''}${pending.text}`)
    .join('\n');
  return {
    reply: `Pendientes activos (${sector.pendings.length}):\n\n${lines}`,
    actions: [{ label: 'Ir a entrega', action: 'go_handover' }],
  };
}

function notesReply(sector) {
  if (!sector.notes.length) {
    return {
      reply:
        'No tienes notas en el Bloc Offline. Escribe o dicta una nota rápida y la guardaré en este dispositivo.',
      actions: [{ label: 'Abrir Bloc Offline', action: 'go_bloc' }],
    };
  }
  const active = sector.notes.filter((note) => !note.converted).length;
  const lines = sector.notes
    .slice(0, 5)
    .map((note, index) => `${index + 1}. ${note.converted ? '✓ ' : ''}${note.text}`)
    .join('\n');
  const actions = [{ label: 'Abrir Bloc Offline', action: 'go_bloc' }];
  if (active) actions.unshift({ label: 'Convertir a pendientes', action: 'convert_notes' });
  return {
    reply: `Bloc Offline (${sector.notes.length} nota${sector.notes.length === 1 ? '' : 's'}, ${active} por convertir):\n\n${lines}`,
    actions,
  };
}

function convertNotesReply(id, sector) {
  const result = convertNotesToPendings(id);
  if (!result.created) {
    return {
      reply: 'No hay notas pendientes por convertir. Ya están todas como pendientes oficiales.',
      actions: [{ label: 'Abrir Bloc Offline', action: 'go_bloc' }],
    };
  }
  toast(`${result.created} nota${result.created === 1 ? '' : 's'} convertida${result.created === 1 ? '' : 's'} en pendiente${result.created === 1 ? '' : 's'}`);
  return {
    reply: `Listo. Convertí ${result.created} nota${result.created === 1 ? '' : 's'} en pendiente${result.created === 1 ? '' : 's'} oficial${result.created === 1 ? '' : 's'} del turno.`,
    actions: [{ label: 'Ir a entrega', action: 'go_handover' }],
  };
}

function addPendingReply(id, text) {
  let rest = text;
  rest = rest
    .replace(/^.*?\b(agrega|agregar|anade|anadir|crea|crear|registra|registrar|apunta|anota)\b/i, '')
    .trim();
  rest = rest
    .replace(/^(un|una|el|la|los|las)?\s*(pendiente|tarea|recordatorio)\b/i, '')
    .trim();
  rest = rest.replace(/^(de|para|que|sobre|con)\s+/i, '').trim();
  rest = rest.replace(/^[\s:\-–—.]+/, '').trim();

  if (!rest) {
    return { reply: '¿Qué pendiente quieres registrar? Por ejemplo: "agrega un pendiente: llamar al proveedor".' };
  }

  const normalizedRest = normalizeText(rest);
  const priority = /alta|importante|urgente|critica|critico/.test(normalizedRest)
    ? 'alta'
    : /baja|despues|cuando puedas/.test(normalizedRest)
      ? 'baja'
      : 'media';

  addPending(id, rest, priority);
  return {
    reply: `Pendiente registrado con prioridad **${priority}**:\n\n${rest}\n\nLo verás en la entrega de turno.`,
    actions: [{ label: 'Ir a entrega', action: 'go_handover' }],
  };
}

function alertsReply(sector) {
  if (!sector.alerts.length) {
    return { reply: 'No hay alertas registradas en este turno.' };
  }
  const lines = sector.alerts
    .map((alert) => `• [${severityLabel(alert.severity)}] ${alert.title} (${alert.id})`)
    .join('\n');
  return {
    reply: `Alertas del turno (${sector.alerts.length}):\n\n${lines}`,
    actions: [{ label: 'Ir al panel', action: 'go_panel' }],
  };
}

function searchReply(sector, text) {
  let query = text.replace(
    /^.*?\b(busca|buscar|buscame|encuentra|localiza|que paso con|revisa|muestrame|dime)\b/i,
    ''
  );
  query = query.replace(
    /^(el|la|los|las|un|una)?\s*(caso|reporte|registro|pedido|embarque|paciente|cliente|producto|ticket|guia|guía|turno|incidencia)?\s*/i,
    ''
  );
  query = query.replace(/[¿?¡!.,]+$/, '').trim();

  if (!query) {
    return { reply: '¿Qué caso quieres buscar? Puedes usar un nombre o un ID, por ejemplo "PAC-1042".' };
  }

  const { reports, cases } = searchSector(sector, query);

  if (!reports.length && !cases.length) {
    return {
      reply: `No encontré coincidencias para "${query}". Prueba con un ID (ej. ${sector.cases[0]?.id || '—'}) o con un nombre completo.`,
      actions: [{ label: 'Abrir historial', action: 'go_history' }],
    };
  }

  const caseLines = cases
    .slice(0, 3)
    .map((item) => `• Caso ${item.id} · ${item.name} — ${item.status}`);
  const reportLines = reports
    .slice(0, 2)
    .map((report) => `• Reporte ${report.id} · ${report.shiftLabel} (${relativeTime(report.createdAt)})`);

  return {
    reply: `Encontré ${cases.length} ${plural(cases.length, 'caso')} y ${reports.length} ${plural(reports.length, 'reporte')} para "${query}":\n\n${[...caseLines, ...reportLines].join('\n')}`,
    actions: [{ label: 'Ver en historial', action: 'search_history', value: query }],
  };
}

function kpiReply(sector, normalized) {
  const words = normalized.split(/\s+/).filter((word) => word.length > 3);
  const kpi = sector.kpis.find((item) => {
    const label = normalizeText(item.label);
    return label.includes(normalized) || words.some((word) => label.includes(word));
  });
  if (kpi) {
    return {
      reply: `${kpi.label}: **${kpi.value}**${kpi.hint ? ` · ${kpi.hint}` : ''}`,
    };
  }
  return {
    reply: `Indicador principal: ${sector.hero.label} **${sector.hero.value}${sector.hero.suffix}** · ${sector.hero.sub || ''}`,
  };
}

function handleAction(action, value) {
  if (!sectorId) return;
  switch (action) {
    case 'confirm_close':
      submit('confirmar cierre');
      break;
    case 'review_handover':
    case 'go_handover':
      closeChat();
      navigate(`/s/${sectorId}/turno`);
      break;
    case 'go_history':
      closeChat();
      navigate(`/s/${sectorId}/historial`);
      break;
    case 'go_panel':
      closeChat();
      navigate(`/s/${sectorId}/panel`);
      break;
    case 'go_bloc':
      closeChat();
      navigate(`/s/${sectorId}/bloc`);
      break;
    case 'convert_notes':
      submit('convertir notas a pendientes');
      break;
    case 'go_access':
      closeChat();
      navigate(`/s/${sectorId}/acceso`);
      break;
    case 'search_history':
    case 'view_report':
      closeChat();
      navigate(`/s/${sectorId}/historial?q=${encodeURIComponent(value)}`);
      break;
    case 'show_pendings':
      submit('pendientes');
      break;
    default:
      break;
  }
}

function stopDictation() {
  const active = dictation;
  dictation = null;
  if (active) {
    try {
      active.stop();
    } catch (error) {
      // el dictado ya se detuvo
    }
  }
  micBtn?.classList.remove('is-listening');
  if (inputEl) inputEl.placeholder = 'Escribe o dicta un comando…';
}

function toggleMic() {
  if (dictation) {
    stopDictation();
    return;
  }

  const controller = startDictation({
    onPartial: () => {},
    onEnd: (finalText) => {
      stopDictation();
      if (!panelOpen) return;
      const addition = String(finalText || '').trim();
      if (addition) {
        inputEl.value = joinText(inputEl.value, addition);
        inputEl.focus();
      } else {
        toast('No se escuchó nada. Intenta de nuevo.');
      }
    },
    onError: (error) => {
      stopDictation();
      if (!panelOpen) return;
      if (error === 'not-allowed' || error === 'service-not-allowed') {
        toast('Permite el uso del micrófono.');
      } else if (error === 'network') {
        toast('El dictado requiere conexión.');
      } else {
        toast('No se pudo iniciar el dictado.');
      }
    },
  });

  if (!controller) {
    toast('Tu navegador no soporta dictado. Escribe tu mensaje.');
    return;
  }

  dictation = controller;
  micBtn.classList.add('is-listening');
  inputEl.placeholder = 'Escuchando…';
}
