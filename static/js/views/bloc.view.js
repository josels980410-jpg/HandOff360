import {
  addNote,
  convertNotesToPendings,
  deleteNote,
  getSector,
} from '../core/store.js';
import { icon } from '../core/icons.js';
import { confirmDialog, toast } from '../core/ui.js';
import { startDictation } from '../features/voice.js';
import { escapeHtml, joinText, relativeTime } from '../core/utils.js';

const NOTE_MAX = 400;

function noteRow(note) {
  return `
    <article class="bloc-note ${note.converted ? 'bloc-note--converted' : ''}">
      <div class="bloc-note__head">
        <span class="bloc-note__time">${escapeHtml(relativeTime(note.createdAt))}</span>
        <span class="bloc-note__badge ${note.converted ? 'bloc-note__badge--converted' : ''}">
          ${note.converted ? 'Convertida' : 'Nota'}
        </span>
      </div>
      <p class="bloc-note__text">${escapeHtml(note.text)}</p>
      <div class="bloc-note__actions">
        ${
          note.converted
            ? ''
            : `<button type="button" class="bloc-action bloc-action--primary" data-convert-note="${escapeHtml(note.id)}">
                 ${icon('checkCircle')}Convertir a pendiente
               </button>`
        }
        <button type="button" class="bloc-action bloc-action--danger" data-delete-note="${escapeHtml(note.id)}">
          ${icon('trash')}Eliminar
        </button>
      </div>
    </article>
  `;
}

export function mountBloc(root, { sectorId }) {
  const sector = getSector(sectorId);
  if (!sector) return;

  const notes = sector.notes || [];
  const activeNotes = notes.filter((note) => !note.converted).length;
  let destroyed = false;
  let dictation = null;
  let voiceBase = '';
  let voicePartial = '';

  root.innerHTML = `
    <div class="view bloc-view">
      <div class="view-head">
        <div>
          <div class="eyebrow">Modo sin datos</div>
          <h2>Bloc Offline</h2>
          <p class="view-head__sub">
            Escribe o dicta notas rápidas. Todo se guarda en este dispositivo, sin necesidad de internet.
          </p>
        </div>
        <span class="pill pill--dark">${icon('wifiOff')}Local</span>
      </div>

      <section class="bloc-composer">
        <div class="field-head">
          <div class="field-label">${icon('note')}Nota rápida</div>
          <span class="field-meta" data-note-count>0/${NOTE_MAX}</span>
        </div>
        <form id="noteForm">
          <textarea
            id="noteInput"
            class="field-input"
            maxlength="${NOTE_MAX}"
            placeholder="Ej. Llamar al proveedor, revisar el andén 4, confirmar traslado..."
            aria-label="Nota offline"
          ></textarea>
          <div class="field-tools">
            <button class="tool-btn" id="noteMic" type="button" aria-label="Dictar nota" aria-pressed="false" title="Dictar nota">
              ${icon('mic')}<span>Dictar nota</span>
            </button>
            <button class="btn-primary bloc-save" type="submit">
              ${icon('plus')}<span>Guardar nota</span>
            </button>
          </div>
          <div class="dictation-preview" id="notePreview">
            <strong>Escuchando...</strong>
            <span id="notePreviewText"></span>
          </div>
        </form>
        <div class="bloc-hint">
          ${icon('wifiOff')}
          <span>Funciona sin internet. Las notas viven en el localStorage de este dispositivo.</span>
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <div class="section-title">${icon('note')}Mis notas</div>
          <span class="field-meta">${activeNotes} activas · ${notes.length} guardadas</span>
        </div>
        <div class="bloc-list" id="noteList">
          ${
            notes.length
              ? notes.map(noteRow).join('')
              : '<p class="detail-text" style="color:var(--muted);font-size:13px">Aún no tienes notas. Guarda la primera arriba.</p>'
          }
        </div>
      </section>
    </div>
  `;

  const form = root.querySelector('#noteForm');
  const textarea = root.querySelector('#noteInput');
  const micButton = root.querySelector('#noteMic');
  const micLabel = micButton.querySelector('span');
  const countEl = root.querySelector('[data-note-count]');
  const preview = root.querySelector('#notePreview');
  const previewText = root.querySelector('#notePreviewText');
  const noteList = root.querySelector('#noteList');

  const updateCount = () => {
    countEl.textContent = `${textarea.value.length}/${NOTE_MAX}`;
  };

  const setPreview = (text) => {
    if (!text) {
      preview.classList.remove('is-visible');
      return;
    }
    preview.classList.add('is-visible');
    previewText.textContent = text;
  };

  const resetDictation = () => {
    dictation = null;
    micButton.classList.remove('is-listening');
    micButton.setAttribute('aria-pressed', 'false');
    micButton.setAttribute('aria-label', 'Dictar nota');
    micButton.setAttribute('title', 'Dictar nota');
    micLabel.textContent = 'Dictar nota';
    setPreview('');
  };

  const applyTranscript = (finalText) => {
    const addition = String(finalText || voicePartial || '').trim();
    if (addition) {
      textarea.value = joinText(voiceBase, addition).slice(0, NOTE_MAX);
      updateCount();
    }
    resetDictation();
    textarea.focus();
    return addition;
  };

  const startVoice = () => {
    if (dictation) {
      dictation.stop();
      return;
    }

    voiceBase = textarea.value;
    voicePartial = '';

    const controller = startDictation({
      onPartial: (text) => {
        if (destroyed) return;
        voicePartial = text;
        textarea.value = joinText(voiceBase, text).slice(0, NOTE_MAX);
        updateCount();
        setPreview(text);
      },
      onEnd: (finalText) => {
        if (destroyed) return;
        const addition = applyTranscript(finalText);
        if (!addition) toast('No se escuchó nada. Intenta de nuevo.');
      },
      onError: (error) => {
        if (destroyed) return;
        const addition = applyTranscript();
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
      resetDictation();
      toast('Tu navegador no soporta dictado. Escribe la nota.');
      return;
    }

    dictation = controller;
    micButton.classList.add('is-listening');
    micButton.setAttribute('aria-pressed', 'true');
    micButton.setAttribute('aria-label', 'Detener dictado');
    micButton.setAttribute('title', 'Detener dictado');
    micLabel.textContent = 'Escuchando...';
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (dictation) dictation.stop();
    const text = textarea.value.trim();
    if (!text) {
      toast('Escribe o dicta una nota antes de guardarla.');
      textarea.focus();
      return;
    }
    const saved = addNote(sectorId, text);
    if (!saved) {
      toast('No se pudo guardar la nota.');
      return;
    }
    textarea.value = '';
    updateCount();
    setPreview('');
    toast('Nota guardada offline');
    requestAnimationFrame(() => document.getElementById('noteInput')?.focus());
  });

  micButton.addEventListener('click', startVoice);

  noteList.addEventListener('click', async (event) => {
    const convert = event.target.closest('[data-convert-note]');
    if (convert) {
      const result = convertNotesToPendings(sectorId, convert.dataset.convertNote);
      if (!result.created) {
        toast('No hay notas por convertir.');
        return;
      }
      toast(`${result.created} nota${result.created === 1 ? '' : 's'} convertida${result.created === 1 ? '' : 's'} en pendiente${result.created === 1 ? '' : 's'}`);
      return;
    }

    const remove = event.target.closest('[data-delete-note]');
    if (!remove) return;
    const confirmed = await confirmDialog({
      title: 'Eliminar nota',
      body: 'Esta nota se eliminará de este dispositivo. No se puede deshacer.',
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
    });
    if (confirmed) deleteNote(sectorId, remove.dataset.deleteNote);
  });

  return () => {
    destroyed = true;
    if (dictation) {
      try {
        dictation.stop();
      } catch (error) {
        // el dictado ya se detuvo
      }
      dictation = null;
    }
  };
}
