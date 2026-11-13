import { addSupportTicket, getSector } from './store.js';
import { currentRoute } from './router.js';
import { toast } from './ui.js';

function activeSectorId() {
  const route = currentRoute();
  return route.name === 'sector' ? route.sectorId : '';
}

function updateTicketCount(sectorId) {
  const counter = document.getElementById('supportTicketCount');
  if (!counter) return;
  const total = getSector(sectorId)?.supportTickets?.length || 0;
  counter.textContent = String(total);
}

export function initSupport({ onTalkToAdvisor } = {}) {
  document.addEventListener('support:advisor', () => {
    if (typeof onTalkToAdvisor === 'function') onTalkToAdvisor();
  });

  document.addEventListener('support:opened', () => {
    updateTicketCount(activeSectorId());
  });

  updateTicketCount(activeSectorId());

  document.addEventListener('support:report', (event) => {
    const detail = event.detail || {};
    const message = String(detail.message || '').trim();
    if (!message) {
      toast('Describe el fallo antes de enviar el reporte.');
      return;
    }
    const sectorId = activeSectorId();
    if (!sectorId) {
      toast('Identifícate en un sector para enviar el reporte.');
      return;
    }
    const ticket = addSupportTicket(sectorId, {
      category: detail.category,
      message,
      contact: detail.contact,
    });
    if (!ticket) {
      toast('No se pudo guardar el reporte.');
      return;
    }
    document.getElementById('supportForm')?.reset();
    updateTicketCount(sectorId);
    window.HandOffSupport?.close();
    toast('Reporte enviado. Te contactaremos pronto.');
  });
}
