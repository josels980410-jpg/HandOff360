import { getSector, updateStaffMember } from '../core/store.js';
import { icon } from '../core/icons.js';
import { navigate } from '../core/router.js';
import {
  SHIFTS,
  computeAreaDistribution,
  computeShiftSummary,
  getShift,
} from '../core/staff.js';
import { escapeHtml, plural } from '../core/utils.js';

function initials(name) {
  return String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function shiftCard(summary, selected) {
  const shift = getShift(summary.shiftId);
  return `
    <button
      type="button"
      class="shift-card ${selected ? 'shift-card--active' : ''}"
      data-shift="${escapeHtml(summary.shiftId)}"
      aria-pressed="${selected}"
    >
      <div class="shift-card__head">
        <span class="shift-card__label">${escapeHtml(shift.label)}</span>
        <span class="shift-card__window">${escapeHtml(shift.window)}</span>
      </div>
      <div class="shift-card__value">
        <strong>${summary.active}</strong><span>/${summary.total} en puesto</span>
      </div>
      <div class="shift-card__bar" aria-hidden="true">
        <i style="width:${summary.coverage}%"></i>
      </div>
      <div class="shift-card__foot">
        <span>${icon('checkCircle')}${summary.active} activos</span>
        <span>${icon('alert')}${summary.missing} ${plural(summary.missing, 'falta', 'faltan')}</span>
      </div>
    </button>
  `;
}

function staffRow(member) {
  return `
    <div class="board-row ${member.active ? '' : 'board-row--missing'}">
      <span class="staff-avatar">${escapeHtml(initials(member.name))}</span>
      <div class="staff-copy">
        <strong>${escapeHtml(member.name)}</strong>
        <span class="staff-meta">${escapeHtml(member.role)} · ${escapeHtml(member.area || 'Sin área')}</span>
      </div>
      ${
        member.active
          ? '<span class="staff-status staff-status--active">En puesto</span>'
          : '<span class="staff-status staff-status--missing">Falta</span>'
      }
    </div>
  `;
}

export function mountShifts(root, { sectorId, route }) {
  const sector = getSector(sectorId);
  if (!sector) return;

  const staff = sector.staff || [];
  const requested = route?.query?.shift || '';
  const selectedShift = SHIFTS.some((shift) => shift.id === requested)
    ? requested
    : SHIFTS[0].id;

  const summaries = SHIFTS.map((shift) => computeShiftSummary(staff, shift.id));
  const current = summaries.find((summary) => summary.shiftId === selectedShift);
  const distribution = computeAreaDistribution(staff, selectedShift);
  const totalActive = staff.filter((member) => member.active).length;

  root.innerHTML = `
    <div class="view board-view">
      <div class="view-head">
        <div>
          <div class="eyebrow">Encargado de área</div>
          <h2>Tablero de turnos</h2>
          <p class="view-head__sub">
            Cobertura y estatus en vivo del personal de ${escapeHtml(sector.meta.short)}.
          </p>
        </div>
        <span class="pill pill--dark">${icon('clock')}${escapeHtml(sector.meta.shiftLabel)}</span>
      </div>

      <section class="board-stats" aria-label="Resumen de personal">
        <div class="board-stat">
          <span class="board-stat__icon">${icon('user')}</span>
          <strong>${staff.length}</strong>
          <span>Personal total</span>
        </div>
        <div class="board-stat">
          <span class="board-stat__icon">${icon('checkCircle')}</span>
          <strong>${totalActive}</strong>
          <span>En puesto</span>
        </div>
        <div class="board-stat">
          <span class="board-stat__icon">${icon('alert')}</span>
          <strong>${staff.length - totalActive}</strong>
          <span>Faltan</span>
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <div class="section-title">${icon('clock')}Turnos del hospital</div>
        </div>
        <div class="shift-board">
          ${summaries.map((summary) => shiftCard(summary, summary.shiftId === selectedShift)).join('')}
        </div>
      </section>

      <section class="metrics-chart">
        <div class="section-head">
          <div class="section-title">${icon('chart')}Distribución por área</div>
          <span class="field-meta">${escapeHtml(getShift(selectedShift).label)}</span>
        </div>
        ${
          distribution.length
            ? `<div class="metrics-mix" role="img" aria-label="Distribución de personal por área en el turno ${escapeHtml(getShift(selectedShift).label)}">
                ${distribution
                  .map(
                    (item) => `
                      <div class="metrics-mix__row">
                        <span class="metrics-mix__label">
                          ${escapeHtml(item.area)}
                          <small>${item.percent}%</small>
                        </span>
                        <span class="metrics-mix__track" aria-hidden="true">
                          <i class="metrics-mix__fill metrics-mix__fill--area" style="width:${item.percent}%"></i>
                        </span>
                        <span class="metrics-mix__count">${item.count}</span>
                      </div>
                    `
                  )
                  .join('')}
              </div>`
            : '<p class="metrics-chart__empty">Sin personal asignado en este turno.</p>'
        }
      </section>

      <section class="section">
        <div class="section-head">
          <div class="section-title">
            ${icon('user')}Personal en ${escapeHtml(getShift(selectedShift).label)}
            <span class="count-badge count-badge--dark">${current.total}</span>
          </div>
          <button type="button" class="section-link" data-nav="personal">
            Asignar personal${icon('chevronRight')}
          </button>
        </div>
        <div class="board-list">
          ${
            current.roster.length
              ? current.roster.map(staffRow).join('')
              : '<p class="staff-empty">Sin personal asignado a este turno.</p>'
          }
        </div>
      </section>
    </div>
  `;

  const viewEl = root.querySelector('.view');
  viewEl.addEventListener('click', (event) => {
    const shift = event.target.closest('[data-shift]');
    if (shift) {
      navigate(`/s/${sectorId}/horarios?shift=${shift.dataset.shift}`);
      return;
    }

    const nav = event.target.closest('[data-nav]');
    if (nav) {
      navigate(`/s/${sectorId}/${nav.dataset.nav}`);
      return;
    }

    const toggle = event.target.closest('[data-toggle-staff]');
    if (toggle) {
      const member = staff.find((item) => item.id === toggle.dataset.toggleStaff);
      if (member) updateStaffMember(sectorId, member.id, { active: !member.active });
    }
  });
}
