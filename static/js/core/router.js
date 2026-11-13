import { SECTOR_MAP } from '../data/seed.js';

export const TABS = ['acceso', 'panel', 'kpis', 'turno', 'historial', 'bloc', 'personal', 'horarios'];

export function currentRoute() {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [pathPart = '', queryPart = ''] = raw.split('?');
  const parts = pathPart.split('/').filter(Boolean);
  const params = new URLSearchParams(queryPart);

  if (parts[0] === 's' && SECTOR_MAP[parts[1]]) {
    const tab = TABS.includes(parts[2]) ? parts[2] : 'panel';
    return {
      name: 'sector',
      sectorId: parts[1],
      tab,
      query: {
        q: params.get('q') || '',
        f: params.get('f') || '',
        shift: params.get('shift') || '',
      },
    };
  }

  return { name: 'select', query: { q: '', f: '' } };
}

export function navigate(path) {
  window.location.hash = path.startsWith('#') ? path : `#${path}`;
}

export function onRouteChange(callback) {
  window.addEventListener('hashchange', () => callback(currentRoute()));
}
