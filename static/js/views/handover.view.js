import {
  getSector,
  saveDraft,
  addPending,
  togglePending,
  removePending,
  closeShift,
  consumeDraftClosed,
} from '../core/store.js';
import { icon } from '../core/icons.js';
import { toast } from '../core/ui.js';
import { openShiftClosedModal } from '../core/details.js';
import { startDictation } from '../features/voice.js';
import { debounce, escapeHtml, joinText, relativeTime } from '../core/utils.js';

const QUICK_CHIPS = [
  'Sin novedades relevantes en el turno.',
  'Se atendieron todas las alertas críticas.',
  'Pendiente coordinar con el siguiente turno.',
  'Todo operativo y sin incidencias.',
];

function logItem(entry) {
  const iconName = {
    inicio: 'home',
    cierre: 'checkCircle',
    pendiente: 'clipboard',
    alerta: 'alert',
  }[entry.type] || 'spark';
  const dark = entry.type === 'cierre' ? ' log-icon--cierre' : '';
  return `
    <div class="log-item">
      <div class="log-icon${dark}">${icon(iconName)}</div>
      <div class="log-copy">
        <strong>${escapeHtml(entry.text)}</strong>
        <div class="log-time">${escapeHtml(relativeTime(entry.at))}</div>
      </div>
    </div>
  `;
}

function pendingRow(pending) {
  return `
    <div class="pending-row ${pending.done ? 'pending-row--done' : ''}">
      <button type="button" class="pending-check" data-toggle-pending="${escapeHtml(pending.id)}" aria-label="Marcar pendiente como atendido">
        ${icon('check')}
      </button>
      <span class="pending-copy">${escapeHtml(pending.text)}</span>
      <span class="pending-prio prio-${escapeHtml(pending.priority)}">${escapeHtml(pending.priority)}</span>
      <button type="button" class="pending-remove" data-remove-pending="${escapeHtml(pending.id)}" aria-label="Eliminar pendiente">
        ${icon('trash')}
      </button>
    </div>
  `;
}

export function mountHandover(root, { sectorId }) {
  const sector = getSector(sectorId);
  if (!sector) return;

  const profile = sector.profile;
  const operator = profile?.name || sector.meta.supervisor;
  const operatorArea = profile?.area || sector.meta.area;
  const draft = sector.draft || '';
  const activePendings = sector.pendings.filter((pending) => !pending.done);
  const PENDING_MAX = 160;
  let priority = 'media';
  let closed = false;
  let destroyed = false;
  let dictation = null;
  let pendingDictation = null;
  let pendingVoiceBase = '';
  let pendingVoicePartial = '';

  root.innerHTML = `
    <div class="view">
      <div class="view-head">
        <div>
          <div class="eyebrow">Entrega de turno</div>
          <h2>Cierra tu turno</h2>
          <p class="view-head__sub">
            Turno de <strong>${escapeHtml(operator)}</strong> · ${escapeHtml(operatorArea)}. Deja registrado lo que pasó, tus pendientes y lo que el siguiente turno debe saber.
          </p>
        </div>
        <span class="pill pill--dark">${escapeHtml(sector.meta.shiftLabel)}</span>
      </div>

      <section class="field-card">
        <div class="field-head">
          <div class="field-label">${icon('note')}Resumen del turno</div>
          <span class="field-meta" data-draft-count>${draft.length} caracteres</span>
        </div>
        <textarea id="shiftSummary" class="field-input" maxlength="600" placeholder="Ej. Se atendieron 3 ingresos, 2 altas y quedó pendiente el traslado de PAC-1042...">${escapeHtml(draft)}</textarea>
        <div class="field-tools">
          <button class="tool-btn" id="dictateBtn" type="button">${icon('mic')}<span>Dictar resumen</span></button>
          <button class="tool-btn" id="clearBtn" type="button">${icon('trash')}<span>Limpiar</span></button>
        </div>
        <div class="dictation-preview" id="dictationPreview">
          <strong>Escuchando…</strong>
          <span id="dictationText"></span>
        </div>
        <div class="chip-row">
          ${QUICK_CHIPS.map(
            (chip) => `<button type="button" class="quick-chip" data-chip="${escapeHtml(chip)}">${escapeHtml(chip)}</button>`
          ).join('')}
        </div>
      </section>

      <section class="field-card">
        <div class="field-head">
          <div class="field-label">${icon('clipboard')}Pendientes para el siguiente turno</div>
          <span class="field-meta">${activePendings.length} activos</span>
        </div>
        <form class="composer" id="pendingForm">
          <div class="composer-main">
            <input class="field-input" id="pendingInput" type="text" maxlength="${PENDING_MAX}" placeholder="Ej. Confirmar traslado de PAC-1042" autocomplete="off">
            <button class="composer-mic" id="pendingMic" type="button" aria-label="Dictar pendiente" aria-pressed="false" title="Dictar pendiente">
              ${icon('mic')}
            </button>
            <button class="btn-primary composer-add" type="submit" aria-label="Agregar pendiente">
              ${icon('plus')}
            </button>
          </div>
          <div class="seg" role="group" aria-label="Prioridad del pendiente">
            <button type="button" data-priority="alta">Alta</button>
            <button type="button" data-priority="media" class="is-active">Media</button>
            <button type="button" data-priority="baja">Baja</button>
          </div>
        </form>
        <div class="pending-list" id="pendingList">
          ${
            sector.pendings.length
              ? sector.pendings.map(pendingRow).join('')
              : '<p class="detail-text" style="color:var(--muted);font-size:13px">Sin pendientes registrados. Agrega el primero arriba.</p>'
          }
        </div>
      </section>

      <section class="close-card">
        <h3>${icon('lock')}Cerrar turno</h3>
        <p>
          Guarda el reporte en el historial, archiva los pendientes y actualiza la bitácora.
          El siguiente turno verá todo lo registrado.
        </p>
        <div class="close-list">
          <div class="close-item">${icon('checkCircle')}<span>Reporte con ID único y resumen</span></div>
          <div class="close-item">${icon('clipboard')}<span>${activePendings.length} pendiente(s) archivados</span></div>
          <div class="close-item">${icon('history')}<span>Bitácora del turno actualizada</span></div>
        </div>
        <button class="btn-primary" id="closeShiftBtn" type="button">${icon('lock')}Cerrar turno</button>
      </section>

      <section class="section">
        <div class="section-head">
          <div class="section-title">${icon('history')}Bitácora reciente</div>
        </div>
        <div class="log-list">
          ${sector.log.length ? sector.log.slice(0, 6).map(logItem).join('') : '<p class="detail-text" style="color:var(--muted);font-size:13px">Sin movimientos registrados.</p>'}
        </div>
      </section>
    </div>
  `;

  const textarea = root.querySelector('#shiftSummary');
  const countEl = root.querySelector('[data-draft-count]');
  const dictateBtn = root.querySelector('#dictateBtn');
  const dictateLabel = dictateBtn.querySelector('span');
  const clearBtn = root.querySelector('#clearBtn');
  const preview = root.querySelector('#dictationPreview');
  const previewText = root.querySelector('#dictationText');
  const pendingInput = root.querySelector('#pendingInput');
  const pendingMic = root.querySelector('#pendingMic');
  const pendingForm = root.querySelector('#pendingForm');
  const pendingList = root.querySelector('#pendingList');
  const segButtons = [...root.querySelectorAll('[data-priority]')];
  const closeBtn = root.querySelector('#closeShiftBtn');

  const persistDraft = debounce((text) => saveDraft(sectorId, text), 220);

  function updateCount() {
    countEl.textContent = `${textarea.value.length} caracteres`;
  }

  function setPreview(text) {
    if (!text) {
      preview.classList.remove('is-visible');
      return;
    }
    preview.classList.add('is-visible');
    previewText.textContent = text;
  }

  function resetDictation() {
    dictation = null;
    dictateBtn.classList.remove('is-listening');
    dictateLabel.textContent = 'Dictar resumen';
    setPreview('');
  }

  function startVoice() {
    if (dictation) {
      dictation.stop();
      return;
    }

    if (pendingDictation) {
      pendingDictation.stop();
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
          textarea.value = joinText(textarea.value, addition);
          updateCount();
          persistDraft.flush(textarea.value);
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
      toast('Tu navegador no soporta dictado. Escribe el resumen.');
      return;
    }

    dictation = controller;
    dictateBtn.classList.add('is-listening');
    dictateLabel.textContent = 'Escuchando…';
  }

  function resetPendingDictation() {
    pendingDictation = null;
    pendingMic.classList.remove('is-listening');
    pendingMic.setAttribute('aria-pressed', 'false');
    pendingMic.setAttribute('aria-label', 'Dictar pendiente');
    pendingMic.setAttribute('title', 'Dictar pendiente');
  }

  function applyPendingTranscript(finalText) {
    const addition = String(finalText || pendingVoicePartial || '').trim();
    if (addition) {
      pendingInput.value = joinText(pendingVoiceBase, addition).slice(0, PENDING_MAX);
    }
    resetPendingDictation();
    pendingInput.focus();
    return addition;
  }

  function startPendingVoice() {
    if (pendingDictation) {
      pendingDictation.stop();
      return;
    }

    if (dictation) {
      dictation.stop();
    }

    pendingVoiceBase = pendingInput.value;
    pendingVoicePartial = '';

    const controller = startDictation({
      onPartial: (text) => {
        if (destroyed) return;
        pendingVoicePartial = text;
        pendingInput.value = joinText(pendingVoiceBase, text).slice(0, PENDING_MAX);
      },
      onEnd: (finalText) => {
        if (destroyed) return;
        const addition = applyPendingTranscript(finalText);
        if (!addition) toast('No se escuchó nada. Intenta de nuevo.');
      },
      onError: (error) => {
        if (destroyed) return;
        const addition = applyPendingTranscript();
        if (addition) return;
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
      resetPendingDictation();
      toast('Tu navegador no soporta dictado. Escribe el pendiente.');
      return;
    }

    pendingDictation = controller;
    pendingMic.classList.add('is-listening');
    pendingMic.setAttribute('aria-pressed', 'true');
    pendingMic.setAttribute('aria-label', 'Detener dictado del pendiente');
    pendingMic.setAttribute('title', 'Detener dictado');
  }

  textarea.addEventListener('input', () => {
    updateCount();
    persistDraft(textarea.value);
  });

  dictateBtn.addEventListener('click', startVoice);
  pendingMic.addEventListener('click', startPendingVoice);

  clearBtn.addEventListener('click', () => {
    textarea.value = '';
    updateCount();
    persistDraft.flush('');
    textarea.focus();
  });

  root.querySelectorAll('[data-chip]').forEach((button) => {
    button.addEventListener('click', () => {
      textarea.value = joinText(textarea.value, button.dataset.chip);
      updateCount();
      persistDraft.flush(textarea.value);
      textarea.focus();
    });
  });

  segButtons.forEach((button) => {
    button.addEventListener('click', () => {
      priority = button.dataset.priority;
      segButtons.forEach((item) => item.classList.toggle('is-active', item === button));
    });
  });

  pendingForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (pendingDictation) pendingDictation.stop();
    const text = pendingInput.value.trim();
    if (!text) {
      toast('Escribe el pendiente antes de agregarlo');
      pendingInput.focus();
      return;
    }
    addPending(sectorId, text, priority);
    requestAnimationFrame(() => document.getElementById('pendingInput')?.focus());
  });

  pendingList.addEventListener('click', (event) => {
    const toggle = event.target.closest('[data-toggle-pending]');
    if (toggle) {
      togglePending(sectorId, toggle.dataset.togglePending);
      return;
    }
    const remove = event.target.closest('[data-remove-pending]');
    if (remove) {
      removePending(sectorId, remove.dataset.removePending);
    }
  });

  closeBtn.addEventListener('click', () => {
    const summary = textarea.value.trim();
    closed = true;
    const report = closeShift(sectorId, summary);
    if (report) openShiftClosedModal(report, sectorId);
  });

  return () => {
    destroyed = true;
    persistDraft.cancel();
    if (dictation) {
      try {
        dictation.stop();
      } catch (error) {
        // el dictado ya se detuvo
      }
      dictation = null;
    }
    if (pendingDictation) {
      try {
        pendingDictation.stop();
      } catch (error) {
        // el dictado ya se detuvo
      }
      pendingDictation = null;
    }
    const draftWasClosed = consumeDraftClosed(sectorId);
    if (!closed && !draftWasClosed) {
      const current = root.querySelector('#shiftSummary');
      if (current) saveDraft(sectorId, current.value);
    }
  };
}
