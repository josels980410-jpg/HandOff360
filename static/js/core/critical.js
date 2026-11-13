import { ackCriticalAlert, getSector } from './store.js';
import { modal } from './ui.js';
import { icon } from './icons.js';
import { escapeHtml, relativeTime } from './utils.js';

const SEVERITY_WEIGHT = {
  critical: 3,
  warn: 2,
  info: 1,
};

function timeValue(iso) {
  const time = new Date(iso).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export function getMostUrgentAlert(sector) {
  if (!sector || !Array.isArray(sector.alerts) || !sector.alerts.length) return null;
  return [...sector.alerts].sort((a, b) => {
    const weight = (SEVERITY_WEIGHT[b.severity] || 0) - (SEVERITY_WEIGHT[a.severity] || 0);
    if (weight !== 0) return weight;
    return timeValue(b.at) - timeValue(a.at);
  })[0];
}

function openCriticalAlertModal(sector, alert) {
  const isCritical = alert.severity === 'critical';
  const caseItem = alert.caseId
    ? (sector.cases || []).find((entry) => entry.id === alert.caseId)
    : null;

  const body = `
    <div class="critical-alert">
      <div class="critical-alert__mark">${icon('alert')}</div>
      <div class="critical-alert__copy">
        <p class="critical-alert__detail">${escapeHtml(alert.detail || 'Revisa el caso asociado a esta alerta.')}</p>
        <div class="critical-alert__meta">
          ${alert.caseId ? `<span class="critical-alert__chip">${icon('note')}${escapeHtml(alert.caseId)}</span>` : ''}
          ${alert.at ? `<span class="critical-alert__time">${icon('clock')}${escapeHtml(relativeTime(alert.at))}</span>` : ''}
          ${caseItem?.location ? `<span class="critical-alert__place">${icon('building')}${escapeHtml(caseItem.location)}</span>` : ''}
        </div>
        ${caseItem ? `<p class="critical-alert__case">${escapeHtml(caseItem.name)} · ${escapeHtml(caseItem.status)}</p>` : ''}
        <p class="critical-alert__hint">Revisa este caso antes de continuar con el turno.</p>
      </div>
    </div>
  `;

  modal({
    eyebrow: `${isCritical ? 'Alerta crítica' : 'Alerta prioritaria'} · ${sector.meta.short}`,
    title: alert.title,
    body,
    variant: 'critical',
    actions: [
      {
        label: 'Entendido, revisar caso',
        onClick: (close) => close(),
      },
    ],
  });
}

export function maybeShowCriticalAlert(sectorId) {
  const sector = getSector(sectorId);
  if (!sector || !sector.profile) return false;
  if (document.querySelector('#modalRoot .overlay.is-open')) return false;

  const alert = getMostUrgentAlert(sector);
  if (!alert) return false;
  if (sector.criticalAck?.alertId === alert.id) return false;

  ackCriticalAlert(sectorId, alert.id);
  openCriticalAlertModal(sector, alert);
  return true;
}
