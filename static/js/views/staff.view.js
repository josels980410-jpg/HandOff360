import {
  addStaffMember,
  getSector,
  removeStaffMember,
  updateStaffMember,
} from '../core/store.js';
import { confirmDialog, modal, toast } from '../core/ui.js';
import { icon } from '../core/icons.js';
import { navigate } from '../core/router.js';
import {
  SHIFTS,
  STAFF_ROLES,
  getShift,
  groupStaffByArea,
} from '../core/staff.js';
import { escapeHtml, relativeTime } from '../core/utils.js';

function initials(name) {
  return String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function statusBadge(member) {
  return member.active
    ? '<span class="staff-status staff-status--active">En puesto</span>'
    : '<span class="staff-status staff-status--missing">Falta</span>';
}

function memberRow(member) {
  const shift = getShift(member.shift);
  return `
    <div class="staff-row ${member.active ? '' : 'staff-row--missing'}">
      <span class="staff-avatar">${escapeHtml(initials(member.name))}</span>
      <div class="staff-copy">
        <strong>${escapeHtml(member.name)}</strong>
        <span class="staff-meta">
          ${escapeHtml(member.role)} · ${escapeHtml(shift.label)}
        </span>
        <span class="staff-meta staff-meta--time">Actualizado ${escapeHtml(relativeTime(member.updatedAt))}</span>
      </div>
      <div class="staff-row__side">
        ${statusBadge(member)}
        <div class="staff-row__actions">
          <button type="button" class="staff-btn" data-move-staff="${escapeHtml(member.id)}" aria-label="Mover ${escapeHtml(member.name)}">
            ${icon('swap')}Mover
          </button>
          <button type="button" class="staff-btn staff-btn--icon" data-toggle-staff="${escapeHtml(member.id)}" aria-label="${member.active ? 'Marcar falta' : 'Marcar en puesto'}">
            ${icon(member.active ? 'close' : 'check')}
          </button>
          <button type="button" class="staff-btn staff-btn--icon staff-btn--danger" data-remove-staff="${escapeHtml(member.id)}" aria-label="Dar de baja a ${escapeHtml(member.name)}">
            ${icon('trash')}
          </button>
        </div>
      </div>
    </div>
  `;
}

function groupCard(group) {
  const active = group.members.filter((member) => member.active).length;
  return `
    <section class="staff-group">
      <div class="staff-group__head">
        <div class="staff-group__title">
          ${icon('building')}<strong>${escapeHtml(group.area)}</strong>
        </div>
        <span class="staff-group__count">${group.members.length} · ${active} en puesto</span>
      </div>
      <div class="staff-group__body">
        ${
          group.members.length
            ? group.members.map(memberRow).join('')
            : '<p class="staff-empty">Sin personal asignado en esta área.</p>'
        }
      </div>
    </section>
  `;
}

export function mountStaff(root, { sectorId }) {
  const sector = getSector(sectorId);
  if (!sector) return;

  const areas = Array.isArray(sector.meta.areas) ? sector.meta.areas : [];
  const staff = sector.staff || [];
  const groups = groupStaffByArea(staff, areas);
  const activeCount = staff.filter((member) => member.active).length;

  root.innerHTML = `
    <div class="view staff-view">
      <div class="view-head">
        <div>
          <div class="eyebrow">Encargado de área</div>
          <h2>Asignación de personal</h2>
          <p class="view-head__sub">
            Registra, asigna y mueve al personal entre áreas críticas y turnos.
          </p>
        </div>
        <span class="pill pill--dark">${icon('user')}${staff.length}</span>
      </div>

      <section class="staff-summary">
        <div class="staff-summary__item">
          <strong>${staff.length}</strong>
          <span>Personal total</span>
        </div>
        <div class="staff-summary__item">
          <strong>${activeCount}</strong>
          <span>En puesto</span>
        </div>
        <div class="staff-summary__item">
          <strong>${staff.length - activeCount}</strong>
          <span>Faltan</span>
        </div>
      </section>

      <div class="staff-nav">
        <button type="button" class="section-link" data-nav="horarios">
          Ver tablero de turnos${icon('chevronRight')}
        </button>
      </div>

      <section class="staff-form-card">
        <div class="field-head">
          <div class="field-label">${icon('plus')}Registrar personal</div>
        </div>
        <form id="staffForm" class="staff-form">
          <div class="staff-field staff-field--wide">
            <label class="field-label" for="staffName">Nombre completo</label>
            <input class="field-input" id="staffName" name="name" type="text" maxlength="60" required placeholder="Ej. Enf. Sofía Marín">
          </div>
          <div class="staff-field">
            <label class="field-label" for="staffRole">Rol</label>
            <select class="field-input" id="staffRole" name="role">
              ${STAFF_ROLES.map((role) => `<option value="${escapeHtml(role)}">${escapeHtml(role)}</option>`).join('')}
            </select>
          </div>
          <div class="staff-field">
            <label class="field-label" for="staffArea">Área</label>
            <select class="field-input" id="staffArea" name="area">
              <option value="">Sin área</option>
              ${areas.map((area) => `<option value="${escapeHtml(area)}">${escapeHtml(area)}</option>`).join('')}
            </select>
          </div>
          <div class="staff-field staff-field--wide">
            <label class="field-label" for="staffShift">Turno</label>
            <select class="field-input" id="staffShift" name="shift">
              ${SHIFTS.map((shift) => `<option value="${escapeHtml(shift.id)}">${escapeHtml(shift.label)} · ${escapeHtml(shift.window)}</option>`).join('')}
            </select>
          </div>
          <button class="btn-primary staff-submit" type="submit">
            ${icon('plus')}Asignar a ${icon('arrowRight')}
          </button>
        </form>
      </section>

      <div class="staff-groups">
        ${groups.map(groupCard).join('')}
      </div>
    </div>
  `;

  const form = root.querySelector('#staffForm');
  const viewEl = root.querySelector('.view');

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = root.querySelector('#staffName').value.trim();
    const role = root.querySelector('#staffRole').value;
    const area = root.querySelector('#staffArea').value;
    const shift = root.querySelector('#staffShift').value;
    if (name.length < 2) {
      toast('Escribe el nombre de la persona.');
      return;
    }
    const created = addStaffMember(sectorId, { name, role, area, shift });
    if (!created) {
      toast('No se pudo registrar el personal.');
      return;
    }
    toast(`${created.name} asignado a ${created.area || 'sin área'}`);
  });

  viewEl.addEventListener('click', async (event) => {
    const nav = event.target.closest('[data-nav]');
    if (nav) {
      navigate(`/s/${sectorId}/${nav.dataset.nav}`);
      return;
    }

    const move = event.target.closest('[data-move-staff]');
    if (move) {
      const member = staff.find((item) => item.id === move.dataset.moveStaff);
      if (member) openMoveDialog(sectorId, member, areas);
      return;
    }

    const toggle = event.target.closest('[data-toggle-staff]');
    if (toggle) {
      const member = staff.find((item) => item.id === toggle.dataset.toggleStaff);
      if (!member) return;
      updateStaffMember(sectorId, member.id, { active: !member.active });
      toast(member.active ? `${member.name} marcado como falta` : `${member.name} en puesto`);
      return;
    }

    const remove = event.target.closest('[data-remove-staff]');
    if (remove) {
      const member = staff.find((item) => item.id === remove.dataset.removeStaff);
      if (!member) return;
      const confirmed = await confirmDialog({
        title: 'Dar de baja',
        body: `${member.name} dejará de estar asignado al turno.`,
        confirmLabel: 'Dar de baja',
        cancelLabel: 'Cancelar',
      });
      if (confirmed) {
        removeStaffMember(sectorId, member.id);
        toast('Personal dado de baja');
      }
    }
  });
}

function openMoveDialog(sectorId, member, areas) {
  modal({
    eyebrow: 'Mover personal',
    title: member.name,
    body: `
      <p class="detail-text">Asigna un área y un turno. El cambio se guarda de inmediato en este dispositivo.</p>
      <div class="support-form">
        <label for="moveArea">Área</label>
        <select id="moveArea" class="field-input">
          <option value="">Sin área</option>
          ${areas
            .map(
              (area) =>
                `<option value="${escapeHtml(area)}" ${area === member.area ? 'selected' : ''}>${escapeHtml(area)}</option>`
            )
            .join('')}
        </select>
        <label for="moveShift">Turno</label>
        <select id="moveShift" class="field-input">
          ${SHIFTS.map(
            (shift) =>
              `<option value="${escapeHtml(shift.id)}" ${shift.id === member.shift ? 'selected' : ''}>${escapeHtml(shift.label)} · ${escapeHtml(shift.window)}</option>`
          ).join('')}
        </select>
      </div>
    `,
    actions: [
      {
        label: 'Cancelar',
        variant: 'soft',
        onClick: (close) => close(),
      },
      {
        label: 'Guardar cambio',
        onClick: (close) => {
          const area = document.getElementById('moveArea')?.value ?? '';
          const shift = document.getElementById('moveShift')?.value ?? member.shift;
          updateStaffMember(sectorId, member.id, { area, shift });
          toast(`${member.name} movido a ${getShift(shift).label}`);
          close();
        },
      },
    ],
  });
}
