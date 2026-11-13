import { getSector, togglePending } from '../core/store.js';
import { navigate } from '../core/router.js';
import { icon } from '../core/icons.js';
import { openCaseDetail, openReportDetail } from '../core/details.js';
import { maybeShowCriticalAlert } from '../core/critical.js';
import { supportsSupervisor } from '../core/staff.js';
import { clamp, escapeHtml, relativeTime } from '../core/utils.js';

function kpiCard(kpi) {
  const tone = kpi.tone && kpi.tone !== 'normal' ? ` kpi-card--${kpi.tone}` : '';
  return `
    <div class="kpi-card${tone}">
      <div class="kpi-top">
        <span class="kpi-icon">${icon(kpi.icon || 'chart')}</span>
        <span class="kpi-tone"></span>
      </div>
      <div class="kpi-label">${escapeHtml(kpi.label)}</div>
      <div class="kpi-value">${escapeHtml(String(kpi.value))}</div>
      <div class="kpi-hint">${escapeHtml(kpi.hint || '')}</div>
    </div>
  `;
}

function alertCard(alert) {
  const severityLabel = {
    critical: 'Crítica',
    warn: 'Advertencia',
    info: 'Info',
  }[alert.severity] || 'Info';
  const content = `
    <span class="alert-icon">${icon(alert.severity === 'critical' ? 'alert' : alert.severity === 'warn' ? 'clock' : 'spark')}</span>
    <span class="alert-copy">
      <span class="alert-title"><span class="sev">${severityLabel}</span>${escapeHtml(alert.title)}</span>
      <span class="alert-detail">${escapeHtml(alert.detail || '')}</span>
      <span class="alert-time">${icon('clock')}${escapeHtml(relativeTime(alert.at))}</span>
    </span>
    ${alert.caseId ? `<span class="alert-arrow">${icon('chevronRight')}</span>` : ''}
  `;
  return alert.caseId
    ? `<button type="button" class="alert-card alert-card--${alert.severity}" data-case="${escapeHtml(alert.caseId)}">${content}</button>`
    : `<div class="alert-card alert-card--${alert.severity}">${content}</div>`;
}

function pendingRow(pending) {
  return `
    <button type="button" class="pending-row ${pending.done ? 'pending-row--done' : ''}" data-toggle-pending="${escapeHtml(pending.id)}">
      <span class="pending-check">${icon('check')}</span>
      <span class="pending-copy">${escapeHtml(pending.text)}</span>
      <span class="pending-prio prio-${escapeHtml(pending.priority)}">${escapeHtml(pending.priority)}</span>
    </button>
  `;
}

function emptyState(title, message) {
  return `
    <div class="empty">
      <div class="empty-icon">${icon('checkCircle')}</div>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

export function mountDashboard(root, { sectorId }) {
  const sector = getSector(sectorId);
  if (!sector) return;

  const profile = sector.profile;
  const operator = profile?.name || sector.meta.supervisor;
  const operatorArea = profile?.area || sector.meta.area;
  const criticalCount = sector.alerts.filter((alert) => alert.severity === 'critical').length;
  const activePendings = sector.pendings.filter((pending) => !pending.done);
  const previewPendings = activePendings.slice(0, 3);
  const lastReport = (sector.reports || []).find(
    (report) => report.id === sector.lastClose?.reportId
  );

  root.innerHTML = `
    <div class="view">
      <div class="view-head">
        <div>
          <div class="eyebrow">Panel del turno</div>
          <h2>${escapeHtml(sector.meta.shiftLabel)}</h2>
          <p class="view-head__sub">${escapeHtml(operator)} · ${escapeHtml(operatorArea)}</p>
        </div>
        <span class="pill"><span class="live-dot"></span>En curso</span>
      </div>

      <section class="hero-card" aria-label="Indicador principal del turno">
        <div class="hero-top">
          <div class="hero-label">${icon(sector.hero.icon || 'chart')}${escapeHtml(sector.hero.label)}</div>
          <span class="hero-tag">Turno ${escapeHtml(String(sector.meta.shiftNumber || ''))}</span>
        </div>
        <div class="hero-value">
          <strong>${escapeHtml(String(sector.hero.value))}</strong>
          <span>${escapeHtml(sector.hero.suffix || '')}</span>
        </div>
        <p class="hero-sub">${escapeHtml(sector.hero.sub || '')}</p>
        <div class="hero-bar"><i style="width:${clamp(sector.hero.value, 0, 100)}%"></i></div>
        <div class="hero-foot">
          <div class="hero-stat">
            <strong>${escapeHtml(String(sector.hero.footLeft?.value || ''))}</strong>
            <span>${escapeHtml(sector.hero.footLeft?.label || '')}</span>
          </div>
          <div class="hero-stat hero-stat--right">
            <strong>${escapeHtml(String(sector.hero.footRight?.value || ''))}</strong>
            <span>${escapeHtml(sector.hero.footRight?.label || '')}</span>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <div class="section-title">${icon('chart')}Indicadores clave</div>
        </div>
        <div class="kpi-grid">${sector.kpis.map(kpiCard).join('')}</div>
      </section>

      <section class="section">
        <div class="section-head">
          <div class="section-title">
            ${icon('alert')}Alertas del turno
            <span class="count-badge ${criticalCount ? '' : 'count-badge--dark'}">${criticalCount}</span>
          </div>
          <button type="button" class="section-link" data-nav="turno">Ver entrega${icon('chevronRight')}</button>
        </div>
        <div class="alert-list">
          ${sector.alerts.length ? sector.alerts.map(alertCard).join('') : emptyState('Sin alertas', 'No hay alertas registradas en este turno.')}
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <div class="section-title">
            ${icon('clipboard')}Pendientes activos
            <span class="count-badge count-badge--dark">${activePendings.length}</span>
          </div>
          <button type="button" class="section-link" data-nav="turno">Ir a entrega${icon('chevronRight')}</button>
        </div>
        ${
          previewPendings.length
            ? `<div class="pending-list">${previewPendings.map(pendingRow).join('')}</div>`
            : emptyState('Todo en orden', 'No tienes pendientes activos. Registra uno en la entrega de turno.')
        }
      </section>

      ${
        supportsSupervisor(sectorId)
          ? `
        <section class="section">
          <div class="section-head">
            <div class="section-title">
              ${icon('shield')}Gestión de Encargado de Área
              <span class="count-badge count-badge--dark">${(sector.staff || []).length}</span>
            </div>
          </div>
          <div class="supervisor-grid">
            <button type="button" class="supervisor-card" data-nav="personal">
              <span class="supervisor-card__icon">${icon('user')}</span>
              <strong>Asignación de personal</strong>
              <span>Registra, asigna y mueve personal por área crítica.</span>
              ${icon('chevronRight')}
            </button>
            <button type="button" class="supervisor-card" data-nav="horarios">
              <span class="supervisor-card__icon">${icon('clock')}</span>
              <strong>Tablero de turnos</strong>
              <span>Cobertura, activos y faltas por turno en vivo.</span>
              ${icon('chevronRight')}
            </button>
          </div>
        </section>
      `
          : ''
      }

      ${
        sector.lastClose
          ? `
        <button type="button" class="close-card" ${lastReport ? `data-report="${escapeHtml(lastReport.id)}"` : ''}>
          <div class="close-head">
            ${icon('history')}
            <strong>Último cierre</strong>
            <time>${escapeHtml(relativeTime(sector.lastClose.createdAt))}</time>
          </div>
          <p class="close-summary">${escapeHtml(lastReport?.summary || 'Reporte disponible en el historial.')}</p>
          <div class="close-foot">
            <div class="close-meta">
              <span class="mini-chip">${escapeHtml(sector.lastClose.reportId)}</span>
              <span class="mini-chip">${escapeHtml(lastReport?.shiftLabel || '')}</span>
            </div>
            ${icon('chevronRight')}
          </div>
        </button>
      `
          : ''
      }
    </div>
  `;

  const viewEl = root.querySelector('.view');
  viewEl.addEventListener('click', (event) => {
    const nav = event.target.closest('[data-nav]');
    if (nav) {
      navigate(`/s/${sectorId}/${nav.dataset.nav}`);
      return;
    }

    const pending = event.target.closest('[data-toggle-pending]');
    if (pending) {
      togglePending(sectorId, pending.dataset.togglePending);
      return;
    }

    const alert = event.target.closest('[data-case]');
    if (alert) {
      openCaseDetail(sectorId, alert.dataset.case);
      return;
    }

    const report = event.target.closest('[data-report]');
    if (report) {
      openReportDetail(sectorId, report.dataset.report);
    }
  });

  maybeShowCriticalAlert(sectorId);
}
