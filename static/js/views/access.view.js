import { getSector, setProfile } from '../core/store.js';
import { SECTOR_MAP } from '../data/seed.js';
import { navigate } from '../core/router.js';
import { icon } from '../core/icons.js';
import { toast } from '../core/ui.js';
import { escapeHtml, firstName } from '../core/utils.js';

export function mountAccess(root, { sectorId }) {
  const sector = getSector(sectorId);
  if (!sector) return;

  const profile = sector.profile;
  const areas =
    Array.isArray(sector.meta.areas) && sector.meta.areas.length
      ? sector.meta.areas
      : SECTOR_MAP[sectorId]?.areas || [];
  const selectedArea =
    profile?.area && areas.includes(profile.area) ? profile.area : areas[0] || '';
  const greeting = profile
    ? `Hola de nuevo, ${escapeHtml(firstName(profile.name))}`
    : `Bienvenido a ${escapeHtml(sector.meta.short)}`;

  root.innerHTML = `
    <section class="access-screen">
      <div class="access-hero">
        <div class="access-hero__top">
          <span class="access-emoji">${sector.meta.emoji}</span>
          <span class="access-badge">${icon('lock')}Perfil local</span>
        </div>
        <div class="eyebrow">Identificación de turno</div>
        <h1>${greeting}</h1>
        <p>${profile ? 'Confirma tu nombre y área para retomar el turno.' : 'Identifícate para entrar al panel de tu turno.'}</p>
        <div class="access-hero__meta">
          <span>${icon('clock')}${escapeHtml(sector.meta.shiftLabel)}</span>
          <span>${icon('building')}${escapeHtml(sector.meta.area)}</span>
        </div>
      </div>

      <form class="access-card" id="accessForm" novalidate>
        <div class="access-field">
          <label class="field-label" for="accessName">${icon('user')}Nombre del profesional / operador</label>
          <input
            class="field-input"
            id="accessName"
            name="name"
            type="text"
            maxlength="60"
            autocomplete="name"
            placeholder="Ej. Elena Ríos"
            value="${escapeHtml(profile?.name || '')}"
            required
          >
        </div>

        <div class="access-field">
          <label class="field-label" for="accessArea">${icon('building')}Área o departamento</label>
          <select class="field-input" id="accessArea" name="area" required>
            ${areas
              .map(
                (area) =>
                  `<option value="${escapeHtml(area)}" ${area === selectedArea ? 'selected' : ''}>${escapeHtml(area)}</option>`
              )
              .join('')}
          </select>
          <p class="access-hint">Áreas disponibles para ${escapeHtml(sector.meta.short)}.</p>
        </div>

        <div class="access-note">
          ${icon('shield')}
          <span>Tu perfil se guarda solo en este navegador y queda vinculado a este sector.</span>
        </div>

        <button class="btn-primary" type="submit">
          ${icon('arrowRight')}Entrar al Turno
        </button>
      </form>

      <button type="button" class="link-btn" data-back-select>
        ${icon('chevronLeft')}
        Volver a sectores
      </button>
    </section>
  `;

  const form = root.querySelector('#accessForm');
  const nameInput = root.querySelector('#accessName');
  const areaSelect = root.querySelector('#accessArea');

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = nameInput.value.trim().replace(/\s+/g, ' ');
    const area = areaSelect.value;

    if (name.length < 2) {
      toast('Escribe tu nombre para continuar.');
      nameInput.focus();
      return;
    }

    if (!area) {
      toast('Selecciona tu área o departamento.');
      areaSelect.focus();
      return;
    }

    const saved = setProfile(sectorId, { name, area });
    if (!saved) {
      toast('No se pudo guardar tu perfil. Intenta de nuevo.');
      return;
    }

    toast(`Turno iniciado · ${saved.name}`);
    navigate(`/s/${sectorId}/panel`);
  });

  root.querySelector('[data-back-select]')?.addEventListener('click', () => {
    navigate('/');
  });
}
