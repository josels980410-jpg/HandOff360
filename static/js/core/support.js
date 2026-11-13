import { addSupportTicket, getSector } from './store.js';
import { icon } from './icons.js';
import { modal, toast } from './ui.js';
import { escapeHtml } from './utils.js';

export const SUPPORT_PHONE = '+52 800 000 0000';
export const SUPPORT_EMAIL = 'soporte@handoff360.local';

const FAQS = [
  {
    q: '¿Cómo registro un pendiente para el siguiente turno?',
    a: 'Ve a Entrega, escribe o dicta el pendiente, elige la prioridad Alta, Media o Baja y presiona +. Se guarda en localStorage.',
  },
  {
    q: '¿Cómo cierro mi turno?',
    a: 'En Entrega, completa el resumen, revisa tus pendientes y presiona Cerrar turno. Se genera un reporte con ID único y se archivan los pendientes.',
  },
  {
    q: '¿Qué pasa si no tengo internet?',
    a: 'La app sigue funcionando. Usa el Bloc Offline para dictar o escribir notas y conviértelas en pendientes cuando lo necesites.',
  },
  {
    q: '¿Cómo uso el dictado por voz?',
    a: 'Toca el micrófono del resumen, del pendiente o del Bloc Offline y habla con naturalidad. El texto se transcribe en el campo.',
  },
  {
    q: '¿Dónde reviso los KPIs del turno?',
    a: 'Abre la pestaña KPIs en la navegación inferior. Ahí verás resolución, alertas críticas, pendientes por prioridad y tiempo de cierre.',
  },
];

export function openSupport(sectorId, { onTalkToAdvisor } = {}) {
  const sector = getSector(sectorId);
  if (!sector) return;

  const body = `
    <div class="support-advisor">
      <div class="support-advisor__copy">
        <strong>Asesoría en línea</strong>
        <small>Abrimos el asistente con las opciones de soporte más usadas.</small>
      </div>
      <button class="support-advisor__btn" type="button" id="supportAdvisorBtn">
        💬 Hablar con un asesor
      </button>
    </div>

    <div class="support-section">
      <div class="support-section__head">
        ${icon('help')}
        <h4>Preguntas frecuentes</h4>
      </div>
      <div class="support-faq">
        ${FAQS.map(
          (faq) => `
          <details>
            <summary>${escapeHtml(faq.q)}</summary>
            <p>${escapeHtml(faq.a)}</p>
          </details>
        `
        ).join('')}
      </div>
    </div>

    <div class="support-contact">
      <span class="support-contact__icon">${icon('phone')}</span>
      <div class="support-contact__copy">
        <strong>${escapeHtml(SUPPORT_PHONE)}</strong>
        <a class="support-contact__mail" href="mailto:${escapeHtml(SUPPORT_EMAIL)}">${escapeHtml(SUPPORT_EMAIL)}</a>
        <small>Asistencia 24/7 · Soporte simulado</small>
      </div>
      <a class="support-contact__call" href="tel:+528000000000" aria-label="Llamar al soporte">Llamar</a>
    </div>

    <div class="support-section">
      <div class="support-section__head">
        ${icon('note')}
        <h4>Reportar una falla</h4>
      </div>
      <form class="support-form" id="supportForm">
        <label for="supportCategory">Tipo de problema</label>
        <select id="supportCategory" class="field-input">
          <option value="Cierre de turno">No puedo cerrar el turno</option>
          <option value="Dictado por voz">El dictado por voz no funciona</option>
          <option value="Datos">Los datos no se guardan</option>
          <option value="Visual">La app se ve mal</option>
          <option value="Otro">Otro</option>
        </select>

        <label for="supportMessage">¿Qué está pasando?</label>
        <textarea
          id="supportMessage"
          class="field-input"
          maxlength="280"
          required
          placeholder="Describe el fallo con el menor detalle posible."
        ></textarea>

        <label for="supportContact">Contacto opcional</label>
        <input
          id="supportContact"
          class="field-input"
          maxlength="60"
          placeholder="Teléfono o correo"
          autocomplete="off"
        >

        <button class="btn-primary support-submit" type="submit">
          ${icon('send')}Enviar reporte
        </button>
      </form>
      <p class="support-hint">
        Se guarda en este dispositivo. ${sector.supportTickets.length} reporte${sector.supportTickets.length === 1 ? '' : 's'} enviado${sector.supportTickets.length === 1 ? '' : 's'}.
      </p>
    </div>
  `;

  modal({
    eyebrow: 'Soporte técnico',
    title: 'Ayuda rápida',
    body,
    actions: [{ label: 'Cerrar', variant: 'soft' }],
    onMount: (overlay, close) => {
      const advisorBtn = overlay.querySelector('#supportAdvisorBtn');
      advisorBtn?.addEventListener('click', () => {
        close();
        if (typeof onTalkToAdvisor === 'function') onTalkToAdvisor();
      });

      const form = overlay.querySelector('#supportForm');
      form?.addEventListener('submit', (event) => {
        event.preventDefault();
        const category = overlay.querySelector('#supportCategory')?.value || 'Otro';
        const message = overlay.querySelector('#supportMessage')?.value || '';
        const contact = overlay.querySelector('#supportContact')?.value || '';
        if (!String(message).trim()) {
          toast('Describe el fallo antes de enviar el reporte.');
          return;
        }
        const ticket = addSupportTicket(sectorId, { category, message, contact });
        if (!ticket) {
          toast('No se pudo guardar el reporte.');
          return;
        }
        toast('Reporte enviado. Te contactaremos pronto.');
        close();
      });
    },
  });
}
