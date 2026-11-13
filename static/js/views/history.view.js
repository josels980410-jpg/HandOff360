import { getSector } from '../core/store.js';
import { searchSector } from '../core/search.js';
import { openCaseDetail, openReportDetail } from '../core/details.js';
import { icon } from '../core/icons.js';
import { escapeHtml, formatDateTime, relativeTime } from '../core/utils.js';

const FILTERS = [
  { id: 'todo', label: 'Todo' },
  { id: 'reportes', label: 'Reportes' },
  { id: 'casos', label: 'Casos' },
];

let saved = { sectorId: null, query: '', filter: 'todo' };

function reportCard(report) {
  const closer = report.closedBy || report.supervisor || '';
  const closerArea = report.closedByArea ? ` · ${report.closedByArea}` : '';
  return `
    <button type="button" class="result-card result-card--report" data-report="${escapeHtml(report.id)}">
      <span class="result-icon">${icon('note')}</span>
      <span class="result-copy">
        <span class="result-title"><span class="id">${escapeHtml(report.id)}</span>${escapeHtml(report.shiftLabel || '')}</span>
        <span class="result-sub">${escapeHtml(formatDateTime(report.createdAt))} · ${escapeHtml(`${closer}${closerArea}`)}</span>
        <span class="result-detail">${escapeHtml(report.summary || '')}</span>
        <span class="result-foot">
          <span class="status-pill">${report.criticalAlerts} críticas</span>
          <span class="status-pill status-pill--done">${report.pendings.length} pendientes</span>
        </span>
      </span>
    </button>
  `;
}

function caseCard(item) {
  return `
    <button type="button" class="result-card" data-case="${escapeHtml(item.id)}">
      <span class="result-icon">${icon('user')}</span>
      <span class="result-copy">
        <span class="result-title"><span class="id">${escapeHtml(item.id)}</span>${escapeHtml(item.name)}</span>
        <span class="result-sub">${escapeHtml(item.location || '')} · ${escapeHtml(item.owner || '')}</span>
        <span class="result-detail">${escapeHtml(item.detail || '')}</span>
        <span class="result-foot">
          <span class="status-pill status-pill--${escapeHtml(item.statusTone || 'normal')}">${escapeHtml(item.status)}</span>
          <span class="status-pill status-pill--done">${escapeHtml(relativeTime(item.updatedAt))}</span>
        </span>
      </span>
    </button>
  `;
}

function emptyResults(query) {
  return `
    <div class="empty">
      <div class="empty-icon">${icon('search')}</div>
      <h3>Sin coincidencias</h3>
      <p>${
        query
          ? `No encontramos nada para "${escapeHtml(query)}". Prueba con otro nombre o con un ID.`
          : 'Aún no hay reportes ni casos para mostrar.'
      }</p>
    </div>
  `;
}

function buildResults(sector, query, filter) {
  const { reports, cases } = searchSector(sector, query);
  const showReports = filter !== 'casos';
  const showCases = filter !== 'reportes';
  const reportList = showReports ? reports : [];
  const caseList = showCases ? cases : [];
  const total = reportList.length + caseList.length;

  if (!total) return emptyResults(query);

  const meta = `${total} resultado${total === 1 ? '' : 's'} · ${reportList.length} reporte${
    reportList.length === 1 ? '' : 's'
  } · ${caseList.length} caso${caseList.length === 1 ? '' : 's'}`;

  let html = `<div class="result-meta"><span>${escapeHtml(meta)}</span></div>`;

  if (reportList.length) {
    html += `
      <div class="result-group">
        <div class="result-group__title">${icon('note')}Reportes de turno</div>
        ${reportList.map(reportCard).join('')}
      </div>
    `;
  }

  if (caseList.length) {
    html += `
      <div class="result-group">
        <div class="result-group__title">${icon('user')}Casos y registros</div>
        ${caseList.map(caseCard).join('')}
      </div>
    `;
  }

  return html;
}

export function mountHistory(root, { sectorId, route }) {
  const sector = getSector(sectorId);
  if (!sector) return;

  const profile = sector.profile;
  const operator = profile?.name || sector.meta.supervisor;
  const operatorArea = profile?.area || sector.meta.area;
  const routeQuery = route?.query?.q || '';
  const routeFilter = route?.query?.f || '';

  if (saved.sectorId !== sectorId) {
    saved = {
      sectorId,
      query: routeQuery,
      filter: FILTERS.some((filter) => filter.id === routeFilter) ? routeFilter : 'todo',
    };
  } else if (routeQuery) {
    saved.query = routeQuery;
    if (FILTERS.some((filter) => filter.id === routeFilter)) saved.filter = routeFilter;
  }

  const example = sector.cases[0];
  const exampleName = (sector.cases[1]?.name || sector.cases[0]?.name || '').split(' ')[0];

  root.innerHTML = `
    <div class="view">
      <div class="view-head">
        <div>
          <div class="eyebrow">Historial</div>
          <h2>Buscar en la bitácora</h2>
          <p class="view-head__sub">
            Sesión de <strong>${escapeHtml(operator)}</strong> · ${escapeHtml(operatorArea)}. Encuentra reportes de turno y casos por nombre o ID.
          </p>
        </div>
      </div>

      <div class="search-bar">
        ${icon('search')}
        <input id="searchInput" type="search" enterkeyhint="search" placeholder="Nombre o ID…" value="${escapeHtml(saved.query)}" autocomplete="off">
        <button class="search-clear" id="searchClear" type="button" aria-label="Limpiar búsqueda" ${saved.query ? '' : 'hidden'}>
          ${icon('close')}
        </button>
      </div>

      <button class="search-hint" type="button" data-set-query="${escapeHtml(example?.id || '')}">
        ${icon('spark')}
        <span>Prueba con <strong style="color:var(--green-700)">${escapeHtml(example?.id || '')}</strong> o "${escapeHtml(exampleName)}"</span>
      </button>

      <div class="filter-row">
        ${FILTERS.map(
          (filter) => `<button type="button" class="filter-chip ${saved.filter === filter.id ? 'is-active' : ''}" data-filter="${filter.id}">${filter.label}</button>`
        ).join('')}
      </div>

      <div id="historyResults"></div>
    </div>
  `;

  const viewEl = root.querySelector('.view');
  const inputEl = root.querySelector('#searchInput');
  const clearBtn = root.querySelector('#searchClear');
  const resultsEl = root.querySelector('#historyResults');

  function update() {
    const current = getSector(sectorId);
    if (!current || !resultsEl.isConnected) return;
    resultsEl.innerHTML = buildResults(current, saved.query, saved.filter);
    clearBtn.hidden = !saved.query;
  }

  inputEl.addEventListener('input', () => {
    saved.query = inputEl.value;
    update();
  });

  clearBtn.addEventListener('click', () => {
    inputEl.value = '';
    saved.query = '';
    update();
    inputEl.focus();
  });

  viewEl.querySelectorAll('[data-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      saved.filter = button.dataset.filter;
      viewEl.querySelectorAll('[data-filter]').forEach((item) => {
        item.classList.toggle('is-active', item === button);
      });
      update();
    });
  });

  viewEl.addEventListener('click', (event) => {
    const setQuery = event.target.closest('[data-set-query]');
    if (setQuery) {
      inputEl.value = setQuery.dataset.setQuery;
      saved.query = inputEl.value;
      update();
      inputEl.focus();
      return;
    }

    const report = event.target.closest('[data-report]');
    if (report) {
      openReportDetail(sectorId, report.dataset.report);
      return;
    }

    const item = event.target.closest('[data-case]');
    if (item) {
      openCaseDetail(sectorId, item.dataset.case);
    }
  });

  update();
}
