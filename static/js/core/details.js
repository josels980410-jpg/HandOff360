import { getSector, resolveCaseAlert } from './store.js';
import { modal, toast } from './ui.js';
import { icon } from './icons.js';
import { startDictation } from '../features/voice.js';
import { escapeHtml, formatDate, formatTime, joinText, relativeTime } from './utils.js';

export function openCaseDetail(sectorId, caseId) {
  const sector = getSector(sectorId);
  if (!sector) return;
  const item = (sector.cases || []).find((entry) => entry.id === caseId);
  if (!item) return;

  const activeAlert = (sector.alerts || []).find((alert) => alert.caseId === item.id) || null;
  const resolution = item.resolution?.note ? item.resolution : null;
  const resolvedBy = [resolution?.by, resolution?.area].filter(Boolean).join(' · ');
  let dictation = null;
  let destroyed = false;
  let stopVoice = () => {};
  let noteField = null;

  const timeline = (item.timeline || [])
    .map(
      (entry) => `
        <li class="timeline-item">
          <div class="timeline-time">${escapeHtml(entry.time || '')}</div>
          <div class="timeline-text">${escapeHtml(entry.text || '')}</div>
        </li>
      `
    )
    .join('');

  const resolutionSection = resolution
    ? `
      <div class="detail-section">
        <h4>${icon('checkCircle')}<span>Resolución</span></h4>
        <div class="resolution-card">
          <p class="detail-text">${escapeHtml(resolution.note)}</p>
          <p class="resolution-meta">
            ${escapeHtml(resolvedBy || 'Turno')} · ${escapeHtml(relativeTime(resolution.at))}
          </p>
        </div>
      </div>
    `
    : `
      <div class="detail-section">
        <h4>${icon('note')}<span>Registrar resolución</span></h4>
        <p class="resolution-hint">
          ${
            activeAlert
              ? 'Describe cómo se atendió la alerta antes de cerrarla.'
              : 'Registra la nota de resolución de este caso.'
          }
        </p>
        <div class="resolution-field">
          <textarea
            id="resolutionNote"
            class="field-input"
            maxlength="280"
            placeholder="Ej. Se confirmó el traslado y se notificó al siguiente turno."
            aria-label="Nota de resolución"
          ></textarea>
          <div class="resolution-tools">
            <button
              type="button"
              class="tool-btn"
              id="resolutionMic"
              aria-label="Dictar resolución"
              aria-pressed="false"
            >${icon('mic')}<span>Dictar</span></button>
            <span class="field-meta" id="resolutionMeta">0/280</span>
          </div>
          <div class="dictation-preview" id="resolutionPreview">
            <strong>Escuchando.</strong>
            <span id="resolutionPreviewText"></span>
          </div>
        </div>
      </div>
    `;

  const body = `
    <div class="detail-grid">
      <div class="detail-cell"><span>ID</span><strong>${escapeHtml(item.id)}</strong></div>
      <div class="detail-cell"><span>Estado</span><strong>${escapeHtml(item.status)}</strong></div>
      <div class="detail-cell"><span>Ubicación</span><strong>${escapeHtml(item.location || '—')}</strong></div>
      <div class="detail-cell"><span>Responsable</span><strong>${escapeHtml(item.owner || '—')}</strong></div>
    </div>
    <div class="detail-section">
      <h4>${icon('note')}<span>Detalle</span></h4>
      <p class="detail-text">${escapeHtml(item.detail || '')}</p>
    </div>
    <div class="detail-section">
      <h4>${icon('history')}<span>Línea de tiempo</span></h4>
      <ol class="timeline">${timeline}</ol>
    </div>
    ${resolutionSection}
    <p class="detail-text" style="margin-top:16px;color:var(--muted);font-size:12px">
      Actualizado ${escapeHtml(relativeTime(item.updatedAt))}.
    </p>
  `;

  const actions = resolution
    ? [
        {
          label: 'Buscar en historial',
          variant: 'soft',
          onClick: (close) => {
            close();
            window.location.hash = `/s/${sectorId}/historial?q=${encodeURIComponent(item.id)}`;
          },
        },
        {
          label: 'Cerrar',
          onClick: (close) => close(),
        },
      ]
    : [
        {
          label: activeAlert ? 'Resolver y Cerrar Alerta' : 'Guardar resolución',
          onClick: () => {
            stopVoice();
            const cleanNote = String(noteField?.value || '').trim();
            if (!cleanNote) {
              toast('Escribe o dicta una resolución para continuar.');
              noteField?.focus();
              return false;
            }
            const saved = resolveCaseAlert(sectorId, item.id, cleanNote);
            if (!saved) {
              toast('No se pudo guardar la resolución.');
              return false;
            }
            toast(activeAlert ? 'Alerta resuelta y cerrada' : 'Resolución guardada');
          },
        },
        {
          label: 'Cerrar',
          variant: 'soft',
          onClick: (close) => close(),
        },
      ];

  modal({
    eyebrow: activeAlert ? 'Alerta activa · Caso del sector' : 'Caso del sector',
    title: `${item.id} · ${item.name}`,
    body,
    actions,
    onMount: (overlay) => {
      noteField = overlay.querySelector('#resolutionNote');
      const micButton = overlay.querySelector('#resolutionMic');
      if (!noteField || !micButton) return;

      const meta = overlay.querySelector('#resolutionMeta');
      const preview = overlay.querySelector('#resolutionPreview');
      const previewText = overlay.querySelector('#resolutionPreviewText');
      const micLabel = micButton.querySelector('span');

      const updateCount = () => {
        if (meta) meta.textContent = `${noteField.value.length}/280`;
      };

      const setPreview = (text) => {
        if (!preview || !previewText) return;
        previewText.textContent = text;
        preview.classList.toggle('is-visible', Boolean(text));
      };

      const resetDictation = () => {
        dictation = null;
        micButton.classList.remove('is-listening');
        micButton.setAttribute('aria-pressed', 'false');
        micLabel.textContent = 'Dictar';
        setPreview('');
      };

      stopVoice = () => {
        if (!dictation) return;
        const active = dictation;
        dictation = null;
        try {
          active.stop();
        } catch (error) {
          // el dictado ya se detuvo
        }
      };

      const startVoice = () => {
        if (dictation) {
          dictation.stop();
          return;
        }

        const controller = startDictation({
          onPartial: (text) => {
            if (!destroyed) setPreview(text);
          },
          onEnd: (finalText) => {
            if (destroyed) return;
            resetDictation();
            const addition = String(finalText || '').trim();
            if (addition) {
              noteField.value = joinText(noteField.value, addition);
              updateCount();
              noteField.focus();
            } else {
              toast('No se escuchó nada. Intenta de nuevo.');
            }
          },
          onError: (error) => {
            if (destroyed) return;
            resetDictation();
            if (error === 'not-allowed' || error === 'service-not-allowed') {
              toast('Permite el uso del micrófono para dictar.');
            } else if (error === 'network') {
              toast('El dictado requiere conexión en este navegador.');
            } else {
              toast('No se pudo iniciar el dictado.');
            }
          },
        });

        if (!controller) {
          toast('Tu navegador no soporta dictado. Escribe la nota.');
          return;
        }

        dictation = controller;
        micButton.classList.add('is-listening');
        micButton.setAttribute('aria-pressed', 'true');
        micLabel.textContent = 'Escuchando.';
      };

      noteField.addEventListener('input', updateCount);
      micButton.addEventListener('click', startVoice);
      updateCount();
    },
    onClose: () => {
      destroyed = true;
      if (dictation) {
        const active = dictation;
        dictation = null;
        try {
          active.stop();
        } catch (error) {
          // el dictado ya se detuvo
        }
      }
    },
  });
}

function buildReportText(report) {
  const closer = report.closedBy || report.supervisor;
  const closerLine = report.closedByArea
    ? `${closer} · ${report.closedByArea}`
    : closer;
  const lines = [
    `HandOff 360 · Reporte ${report.id}`,
    `${report.shiftLabel} · Turno ${report.shiftNumber}`,
    `Cerró: ${closerLine}`,
    `Fecha: ${formatDate(report.createdAt)} ${formatTime(report.createdAt)}`,
    '',
    report.summary,
    '',
    `Alertas al cierre: ${report.criticalAlerts} crítica(s) de ${report.totalAlerts} total(es).`,
    '',
    `Pendientes archivados (${report.pendings.length}):`,
    ...report.pendings.map((pending) => `- [${pending.priority}] ${pending.text}`),
  ];
  return lines.join('\n');
}

export function openReportDetail(sectorId, reportId) {
  const sector = getSector(sectorId);
  if (!sector) return;
  const report = (sector.reports || []).find((entry) => entry.id === reportId);
  if (!report) return;

  const pendingList = report.pendings.length
    ? `<ul class="pending-list">${report.pendings
        .map(
          (pending) => `
          <li class="pending-row ${pending.done ? 'pending-row--done' : ''}">
            <span class="pending-copy">${escapeHtml(pending.text)}</span>
            <span class="pending-prio prio-${escapeHtml(pending.priority)}">${escapeHtml(pending.priority)}</span>
          </li>
        `
        )
        .join('')}</ul>`
    : '<p class="detail-text">No se registraron pendientes.</p>';

  const closer = report.closedBy || report.supervisor || '—';
  const closerArea = report.closedByArea ? ` · ${report.closedByArea}` : '';
  const body = `
    <div class="detail-grid">
      <div class="detail-cell"><span>Reporte</span><strong>${escapeHtml(report.id)}</strong></div>
      <div class="detail-cell"><span>Turno</span><strong>${escapeHtml(report.shiftLabel)} · ${escapeHtml(String(report.shiftNumber || ''))}</strong></div>
      <div class="detail-cell"><span>Cerró</span><strong>${escapeHtml(`${closer}${closerArea}`)}</strong></div>
      <div class="detail-cell"><span>Fecha</span><strong>${escapeHtml(formatDate(report.createdAt))} · ${escapeHtml(formatTime(report.createdAt))}</strong></div>
    </div>
    <div class="detail-section">
      <h4>${icon('clipboard')}<span>Resumen del turno</span></h4>
      <p class="detail-text">${escapeHtml(report.summary)}</p>
    </div>
    <div class="detail-section">
      <h4>${icon('alert')}<span>Alertas al cierre</span></h4>
      <p class="detail-text">${report.criticalAlerts} crítica(s) de ${report.totalAlerts} total(es).</p>
    </div>
    <div class="detail-section">
      <h4>${icon('checkCircle')}<span>Pendientes archivados (${report.pendings.length})</span></h4>
      ${pendingList}
    </div>
  `;

  modal({
    eyebrow: 'Reporte de turno',
    title: `${report.id} · ${report.shiftLabel}`,
    body,
    actions: [
      {
        label: 'Copiar reporte',
        variant: 'soft',
        onClick: async () => {
          try {
            await navigator.clipboard.writeText(buildReportText(report));
            toast('Reporte copiado al portapapeles');
          } catch (error) {
            toast('No se pudo copiar el reporte');
          }
        },
      },
      {
        label: 'Cerrar',
        onClick: (close) => close(),
      },
    ],
  });
}

export function openShiftClosedModal(report, sectorId) {
  modal({
    eyebrow: 'Entrega completada',
    title: 'Turno cerrado',
    body: `
      <div class="success-mark">${icon('checkCircle')}</div>
      <div class="success-title">El reporte quedó guardado</div>
      <p class="success-sub">${escapeHtml(report.summary)}</p>
      <div style="text-align:center">
        <span class="report-id">${icon('note')}${escapeHtml(report.id)}</span>
      </div>
      <p class="success-sub" style="margin-top:12px">
        <strong>${escapeHtml(report.closedBy || report.supervisor || '')}</strong>${report.closedByArea ? ` · ${escapeHtml(report.closedByArea)}` : ''}
      </p>
      <p class="success-sub" style="margin-top:8px">
        ${report.pendings.length} pendiente(s) archivados · ${report.criticalAlerts} alerta(s) crítica(s) · bitácora actualizada.
      </p>
    `,
    actions: [
      {
        label: 'Ver en historial',
        variant: 'soft',
        onClick: (close) => {
          close();
          window.location.hash = `/s/${sectorId}/historial?q=${encodeURIComponent(report.id)}`;
        },
      },
      {
        label: 'Entendido',
        onClick: (close) => close(),
      },
    ],
  });
}
