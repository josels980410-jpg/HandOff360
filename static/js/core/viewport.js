const root = document.documentElement;

function applyViewportVars() {
  const viewport = window.visualViewport;
  const visibleHeight = viewport ? viewport.height : window.innerHeight;
  const offsetTop = viewport ? viewport.offsetTop : 0;
  const keyboardInset = Math.max(0, window.innerHeight - visibleHeight - offsetTop);

  root.style.setProperty('--vvh', `${Math.round(visibleHeight)}px`);
  root.style.setProperty('--vv-top', `${Math.round(offsetTop)}px`);
  root.style.setProperty('--kb-inset', `${Math.round(keyboardInset)}px`);
}

export function initViewport() {
  applyViewportVars();

  const viewport = window.visualViewport;
  if (viewport) {
    viewport.addEventListener('resize', applyViewportVars);
    viewport.addEventListener('scroll', applyViewportVars);
  }
  window.addEventListener('resize', applyViewportVars);
  window.addEventListener('orientationchange', applyViewportVars);
}
