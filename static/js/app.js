import { initStore, getSector, subscribe } from './core/store.js';
import { initViewport } from './core/viewport.js';
import { currentRoute, onRouteChange, navigate } from './core/router.js';
import { icon } from './core/icons.js';
import { escapeHtml } from './core/utils.js';
import { mountSelect } from './views/select.view.js';
import { mountAccess } from './views/access.view.js';
import { mountDashboard } from './views/dashboard.view.js';
import { mountKpis } from './views/kpis.view.js';
import { mountHandover } from './views/handover.view.js';
import { mountHistory } from './views/history.view.js';
import { mountBloc } from './views/bloc.view.js';
import { initChat, setChatSector, closeChat, openAdvisorChat } from './features/chatbot.js';
import { openSupport } from './core/support.js';

const els = {
  header: document.getElementById('appHeader'),
  view: document.getElementById('view'),
  nav: document.getElementById('bottomNav'),
  fab: document.getElementById('chatFab'),
  chatRoot: document.getElementById('chatRoot'),
};

const NAV_ITEMS = [
  { tab: 'panel', label: 'Panel', icon: 'home' },
  { tab: 'kpis', label: 'KPIs', icon: 'chart' },
  { tab: 'turno', label: 'Entrega', icon: 'clipboard' },
  { tab: 'bloc', label: 'Bloc', icon: 'note', ariaLabel: 'Bloc Offline: notas sin internet' },
  { tab: 'historial', label: 'Historial', icon: 'history' },
];

const VIEW_MAP = {
  acceso: mountAccess,
  panel: mountDashboard,
  kpis: mountKpis,
  turno: mountHandover,
  historial: mountHistory,
  bloc: mountBloc,
};

let cleanup = null;
let lastKey = '';

function boot() {
  initStore();
  initViewport();
  initChat({ fab: els.fab, container: els.chatRoot });
  bindShell();
  subscribe(() => render({ preserveScroll: true }));
  onRouteChange(() => render());
  if (!window.location.hash) {
    window.history.replaceState(null, '', '#/');
  }
  render();
}

function bindShell() {
  els.header.addEventListener('click', (event) => {
    const support = event.target.closest('[data-support]');
    if (support) {
      const route = currentRoute();
      if (route.name === 'sector') {
        openSupport(route.sectorId, { onTalkToAdvisor: openAdvisorChat });
      }
      return;
    }

    const bloc = event.target.closest('[data-bloc]');
    if (bloc) {
      const route = currentRoute();
      if (route.name === 'sector') navigate(`/s/${route.sectorId}/bloc`);
      return;
    }

    if (event.target.closest('[data-back]')) navigate('/');
  });

  els.nav.addEventListener('click', (event) => {
    const button = event.target.closest('[data-tab]');
    if (!button) return;
    const route = currentRoute();
    if (route.name === 'sector') {
      navigate(`/s/${route.sectorId}/${button.dataset.tab}`);
    }
  });
}

function render({ preserveScroll = false } = {}) {
  const route = currentRoute();
  const hash = window.location.hash;
  if (route.name === 'select' && hash && hash !== '#/') {
    navigate('/');
    return;
  }
  if (route.name === 'sector') {
    const sector = getSector(route.sectorId);
    if (sector && route.tab !== 'acceso' && !sector.profile) {
      navigate(`/s/${route.sectorId}/acceso`);
      return;
    }
  }
  const key = `${route.name}:${route.sectorId || ''}:${route.tab || ''}:${route.query?.q || ''}`;
  const scrollTop = els.view.scrollTop;

  if (typeof cleanup === 'function') {
    try {
      cleanup();
    } catch (error) {
      console.error('[HandOff360] Error en cleanup de vista', error);
    }
    cleanup = null;
  }

  if (route.name === 'sector' && getSector(route.sectorId)) {
    renderShell(route);
  } else {
    renderSelect();
  }

  if (preserveScroll && key === lastKey) {
    els.view.scrollTop = scrollTop;
  } else {
    els.view.scrollTop = 0;
  }
  lastKey = key;
}

function renderShell(route) {
  const sector = getSector(route.sectorId);
  const isAccess = route.tab === 'acceso';
  els.view.classList.remove('is-select');
  els.header.hidden = false;
  els.nav.hidden = isAccess;
  els.fab.hidden = isAccess;

  renderHeader(sector);
  if (!isAccess) renderNav(route);

  cleanup = VIEW_MAP[route.tab](els.view, {
    sectorId: route.sectorId,
    route,
  }) || null;

  if (isAccess) {
    setChatSector(null);
  } else {
    setChatSector(route.sectorId);
  }
}

function renderSelect() {
  els.view.classList.add('is-select');
  els.header.hidden = true;
  els.nav.hidden = true;
  els.fab.hidden = true;
  setChatSector(null);
  closeChat();

  els.view.innerHTML = '';
  cleanup = mountSelect(els.view) || null;
}

function renderHeader(sector) {
  const profile = sector.profile;
  const context = profile
    ? `${profile.name} · ${profile.area}`
    : sector.meta.area;
  els.header.innerHTML = `
    <div class="header-row">
      <button type="button" class="header-back" data-back aria-label="Volver a sectores">
        ${icon('chevronLeft')}
      </button>
      <div class="header-sector">
        <span class="header-emoji">${sector.meta.emoji}</span>
        <div class="header-copy">
          <strong>${escapeHtml(sector.meta.short)}</strong>
          <small>${escapeHtml(context)}</small>
        </div>
      </div>
      <div class="header-actions">
        <button class="header-action" type="button" data-support aria-label="Soporte técnico" title="Soporte técnico">
          ${icon('help')}
        </button>
      </div>
      <span class="header-shift" title="${escapeHtml(sector.meta.shiftLabel)}" aria-label="Turno ${escapeHtml(sector.meta.shiftLabel)}">
        <span class="live-dot"></span><span class="header-shift__label">${escapeHtml(sector.meta.shiftLabel)}</span>
      </span>
    </div>
  `;
}

function renderNav(route) {
  els.nav.innerHTML = NAV_ITEMS.map(
    (item) => `
      <button
        type="button"
        class="nav-item ${route.tab === item.tab ? 'is-active' : ''}"
        data-tab="${item.tab}"
        aria-label="${escapeHtml(item.ariaLabel || item.label)}"
        ${route.tab === item.tab ? 'aria-current="page"' : ''}
      >
        ${icon(item.icon)}<span>${item.label}</span>
      </button>
    `
  ).join('');
}

boot();
