import { SECTORS } from '../data/seed.js';
import { navigate } from '../core/router.js';
import { icon } from '../core/icons.js';
import { confirmDialog, toast } from '../core/ui.js';
import { getProfile, resetDemo } from '../core/store.js';
import { escapeHtml } from '../core/utils.js';

export function mountSelect(root) {
  const profiles = Object.fromEntries(
    SECTORS.map((sector) => [sector.id, getProfile(sector.id)])
  );
  const activeProfiles = Object.values(profiles).filter(Boolean).length;

  root.innerHTML = `
    <section class="select-screen">
      <div class="select-hero">
        <div class="brand-row">
          <div class="brand-mark">${icon('swap')}</div>
          <span class="brand-badge">Demo local · v1.0</span>
        </div>
        <h1>HandOff <span>360</span></h1>
        <p class="select-tagline">
          La continuidad operativa no se pierde cuando el turno cambia.
        </p>
        <div class="select-stats">
          <div class="stat-chip"><strong>3</strong><span>sectores listos</span></div>
          <div class="stat-chip"><strong>100%</strong><span>local · offline</span></div>
          <div class="stat-chip"><strong>${activeProfiles}</strong><span>perfiles activos</span></div>
        </div>
      </div>

      <div class="select-panel">
        <div class="eyebrow">Elige un entorno</div>
        <h2>¿Dónde empieza tu turno?</h2>
        <p class="select-panel__desc">
          Cada sector incluye datos simulados, alertas y pendientes listos para probar.
        </p>

        <div class="sector-list">
          ${SECTORS.map(
            (sector) => `
              <button type="button" class="sector-btn" data-sector="${sector.id}" style="--accent:${sector.accent};--accent-soft:${sector.accentSoft}">
                <span class="sector-emoji">${sector.emoji}</span>
                <span class="sector-copy">
                  <strong>${sector.name}</strong>
                  <small>${sector.tagline}</small>
                  ${
                    profiles[sector.id]
                      ? `<span class="sector-profile">${icon('user')}<span>${escapeHtml(profiles[sector.id].name)} · ${escapeHtml(profiles[sector.id].area)}</span></span>`
                      : ''
                  }
                </span>
                <span class="sector-go">${icon('chevronRight')}</span>
              </button>
            `
          ).join('')}
        </div>

        <div class="select-note">
          ${icon('shield')}
          <span>Tus datos se guardan solo en este navegador. Nada sale de tu dispositivo.</span>
        </div>

        <button type="button" class="link-btn" data-reset>
          ${icon('refresh')}
          Reiniciar datos de demostración
        </button>
      </div>
    </section>
  `;

  root.querySelectorAll('[data-sector]').forEach((button) => {
    button.addEventListener('click', () => {
      navigate(`/s/${button.dataset.sector}/acceso`);
    });
  });

  const resetButton = root.querySelector('[data-reset]');
  resetButton?.addEventListener('click', async () => {
    const confirmed = await confirmDialog({
      title: '¿Reiniciar la demo?',
      body: 'Se borrarán los reportes, pendientes, perfiles y mensajes guardados en este navegador. Los sectores volverán a sus datos de ejemplo.',
      confirmLabel: 'Reiniciar demo',
    });
    if (!confirmed) return;
    resetDemo();
    toast('Demo reiniciada con datos de ejemplo');
    navigate('/');
  });
}
