import { getSector } from '../core/store.js';
import { icon } from '../core/icons.js';
import { computeSectorMetrics } from '../core/metrics.js';
import { escapeHtml, relativeTime } from '../core/utils.js';

function durationParts(minutes) {
  const safe = Math.max(0, Math.round(minutes));
  if (safe < 60) return { value: String(safe), unit: 'min' };
  const hours = safe / 60;
  return {
    value: String(hours >= 10 ? Math.round(hours) : Math.round(hours * 10) / 10),
    unit: 'h',
  };
}

function mixRows(items) {
  return items
    .map(
      (item) => `
        <div class="metrics-mix__row">
          <span class="metrics-mix__label">
            ${escapeHtml(item.label)}
            <small>${item.percent}%</small>
          </span>
          <span class="metrics-mix__track" aria-hidden="true">
            <i class="metrics-mix__fill metrics-mix__fill--${item.key}" style="width:${item.percent}%"></i>
          </span>
          <span class="metrics-mix__count">${item.count}</span>
        </div>
      `
    )
    .join('');
}

export function mountKpis(root, { sectorId }) {
  const sector = getSector(sectorId);
  if (!sector) return;

  const profile = sector.profile;
  const operator = profile?.name || sector.meta.supervisor;
  const operatorArea = profile?.area || sector.meta.area;
  const startedLabel = profile?.startedAt ? relativeTime(profile.startedAt) : '';
  const metrics = computeSectorMetrics(sector);
  const duration = durationParts(metrics.response.minutes);

  const criticalHint = metrics.critical.total
    ? metrics.critical.open
      ? `${metrics.critical.open} ${metrics.critical.open === 1 ? 'crítica sigue activa' : 'críticas siguen activas'}`
      : 'Todas las alertas críticas fueron atendidas'
    : 'Sin alertas críticas registradas';

  const responseHint = metrics.response.estimated
    ? 'Estimado con la antigüedad de lo abierto'
    : `Promedio de ${metrics.response.samples} ${metrics.response.samples === 1 ? 'cierre registrado' : 'cierres registrados'}`;

  const mixSummary = metrics.pendingMix.items
    .map((item) => `${item.label}: ${item.count}`)
    .join(', ');

  root.innerHTML = `
    <div class="view metrics-view">
      <div class="view-head">
        <div>
          <div class="eyebrow">KPIs y métricas</div>
          <h2>Rendimiento del turno</h2>
          <p class="view-head__sub">
            ${escapeHtml(operator)} · ${escapeHtml(operatorArea)}${startedLabel ? ` · ${escapeHtml(startedLabel)}` : ''}
          </p>
        </div>
        <span class="pill pill--dark">${icon('chart')}En vivo</span>
      </div>

      <section class="metrics-hero" aria-label="Tasa de resolución del turno">
        <div class="metrics-hero__top">
          <span class="metrics-hero__label">${icon('checkCircle')}Tasa de resolución de turno</span>
          <span class="metrics-live"><span class="live-dot"></span>${escapeHtml(sector.meta.shiftLabel)}</span>
        </div>
        <div class="metrics-hero__value">
          <strong>${metrics.resolution.rate}</strong><span>%</span>
        </div>
        <p class="metrics-hero__sub">
          ${
            metrics.resolution.total
              ? `${metrics.resolution.closed} de ${metrics.resolution.total} elementos del turno cerrados.`
              : 'Aún no hay pendientes ni alertas registrados en este turno.'
          }
        </p>
        <div class="metrics-hero__bar" aria-hidden="true">
          <i style="width:${metrics.resolution.rate}%"></i>
        </div>
        <div class="metrics-hero__foot">
          <span>${icon('checkCircle')}${metrics.resolution.closed} ${metrics.resolution.closed === 1 ? 'cerrado' : 'cerrados'}</span>
          <span>${icon('clock')}${metrics.resolution.open} ${metrics.resolution.open === 1 ? 'abierto' : 'abiertos'}</span>
        </div>
      </section>

      <div class="metrics-grid">
        <article class="metric-tile">
          <div class="metric-tile__top">
            <span class="metric-tile__icon">${icon('shield')}</span>
            <span class="metric-tile__mark">Críticas</span>
          </div>
          <div class="metric-tile__label">Alertas críticas atendidas</div>
          <div class="metric-tile__value">
            ${metrics.critical.resolved}<small>${metrics.critical.total ? `/${metrics.critical.total}` : ''}</small>
          </div>
          <p class="metric-tile__hint">${escapeHtml(criticalHint)}</p>
        </article>

        <article class="metric-tile">
          <div class="metric-tile__top">
            <span class="metric-tile__icon">${icon('clock')}</span>
            <span class="metric-tile__mark">${metrics.response.estimated ? 'Estimado' : 'Real'}</span>
          </div>
          <div class="metric-tile__label">Tiempo promedio de cierre</div>
          <div class="metric-tile__value">
            ${duration.value}<small> ${duration.unit}</small>
          </div>
          <p class="metric-tile__hint">${escapeHtml(responseHint)}</p>
        </article>
      </div>

      <section class="metrics-chart" aria-labelledby="pendingMixTitle">
        <div class="section-head">
          <div class="section-title" id="pendingMixTitle">
            ${icon('clipboard')}Pendientes por prioridad
          </div>
          <span class="field-meta">${metrics.pendingMix.total} activos</span>
        </div>
        <div
          class="metrics-mix"
          role="img"
          aria-label="Distribución de pendientes activos. ${escapeHtml(mixSummary)}"
        >
          ${mixRows(metrics.pendingMix.items)}
        </div>
        ${
          metrics.pendingMix.total
            ? ''
            : '<p class="metrics-chart__empty">No hay pendientes activos. El siguiente turno recibe la lista limpia.</p>'
        }
        <div class="metrics-chart__foot">
          <span>${icon('checkCircle')}${metrics.pendingMix.done} completados</span>
          <span>${icon('clipboard')}${metrics.pendingMix.total} en curso</span>
        </div>
      </section>

      <div class="metrics-note">
        ${icon('spark')}
        <span>Los KPIs se recalculan al resolver alertas, marcar pendientes o cerrar el turno. Todo vive en este dispositivo.</span>
      </div>
    </div>
  `;
}
