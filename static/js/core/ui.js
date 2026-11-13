import { icon } from './icons.js';
import { escapeHtml } from './utils.js';

export function toast(message, { ms = 2600 } = {}) {
  const root = document.getElementById('toastRoot');
  if (!root) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `${icon('checkCircle')}<span>${escapeHtml(message)}</span>`;
  root.appendChild(el);
  window.setTimeout(() => {
    el.classList.add('is-leaving');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }, ms);
}

export function modal({
  eyebrow = '',
  title = '',
  body = '',
  actions = [],
  variant = '',
  onMount = null,
  onClose = null,
} = {}) {
  const root = document.getElementById('modalRoot');
  if (!root) return () => {};

  const toastRoot = document.getElementById('toastRoot');
  if (toastRoot) toastRoot.replaceChildren();

  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  const variantClass = variant ? ` modal--${variant}` : '';
  overlay.innerHTML = `
    <div class="modal${variantClass}" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
      <div class="modal-grabber"></div>
      <div class="modal-head">
        <div class="modal-head-copy">
          ${eyebrow ? `<div class="modal-eyebrow">${escapeHtml(eyebrow)}</div>` : ''}
          <div class="modal-title">${escapeHtml(title)}</div>
        </div>
        <button type="button" class="modal-close" data-modal-close aria-label="Cerrar">
          ${icon('close')}
        </button>
      </div>
      ${body ? `<div class="modal-body">${body}</div>` : ''}
      ${
        actions.length
          ? `<div class="modal-actions">${actions
              .map(
                (action, index) =>
                  `<button type="button" class="${action.variant === 'soft' ? 'btn-soft' : 'btn-primary'}" data-action="${index}">${escapeHtml(action.label)}</button>`
              )
              .join('')}</div>`
          : ''
      }
    </div>
  `;

  root.appendChild(overlay);

  const reveal = () => overlay.classList.add('is-open');
  requestAnimationFrame(reveal);
  window.setTimeout(reveal, 60);

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    overlay.classList.remove('is-open');
    window.setTimeout(() => overlay.remove(), 220);
    document.removeEventListener('keydown', onKeydown);
    if (typeof onClose === 'function') onClose();
  };

  const onKeydown = (event) => {
    if (event.key === 'Escape') close();
  };

  document.addEventListener('keydown', onKeydown);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });
  overlay.querySelector('[data-modal-close]').addEventListener('click', close);

  overlay.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = actions[Number(button.dataset.action)];
      const result = action.onClick ? action.onClick(close) : undefined;
      if (result !== false) close();
    });
  });

  const firstAction = overlay.querySelector('[data-action]');
  if (firstAction) firstAction.focus({ preventScroll: true });

  if (typeof onMount === 'function') onMount(overlay, close);

  return close;
}

export function confirmDialog({
  title,
  body,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
} = {}) {
  return new Promise((resolve) => {
    modal({
      eyebrow: 'Confirmación',
      title,
      body: `<p class="detail-text">${escapeHtml(body)}</p>`,
      actions: [
        {
          label: cancelLabel,
          variant: 'soft',
          onClick: (close) => {
            close();
            resolve(false);
          },
        },
        {
          label: confirmLabel,
          onClick: (close) => {
            close();
            resolve(true);
          },
        },
      ],
    });
  });
}
