import { IS_MOBILE } from './platform';

export const VIEWPORT_META =
  'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content';

export type ViewportMetrics = {
  width: number;
  height: number;
  offsetTop: number;
  offsetLeft: number;
  scale: number;
};

export function getViewportMetrics(): ViewportMetrics {
  const vv = window.visualViewport;
  if (vv) {
    return {
      width: Math.max(1, Math.round(vv.width)),
      height: Math.max(1, Math.round(vv.height)),
      offsetTop: vv.offsetTop,
      offsetLeft: vv.offsetLeft,
      scale: vv.scale,
    };
  }
  return {
    width: Math.max(1, window.innerWidth),
    height: Math.max(1, window.innerHeight),
    offsetTop: 0,
    offsetLeft: 0,
    scale: 1,
  };
}

const listeners = new Set<() => void>();

export function onViewportChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function resetBrowserZoom(): void {
  window.scrollTo(0, 0);
  const vv = window.visualViewport;
  if (!vv || vv.scale === 1) return;
  const meta = document.querySelector('meta[name="viewport"]');
  if (meta) meta.setAttribute('content', VIEWPORT_META);
}

/** Pin #app to the visible viewport; counter scroll via transform (not top offset). */
export function applyMobileViewportLock(): ViewportMetrics {
  const metrics = getViewportMetrics();
  if (!IS_MOBILE) return metrics;

  resetBrowserZoom();
  window.scrollTo(0, 0);

  const app = document.getElementById('app');
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
  if (!app) return metrics;

  const { width, height, offsetLeft, offsetTop } = metrics;

  app.style.position = 'fixed';
  app.style.top = '0';
  app.style.left = '0';
  app.style.width = `${width}px`;
  app.style.height = `${height}px`;
  app.style.padding = '0';
  app.style.margin = '0';
  app.style.overflow = 'hidden';
  app.style.transform = `translate(${-offsetLeft}px, ${-offsetTop}px)`;
  app.style.transformOrigin = 'top left';
  app.style.willChange = 'transform';

  if (canvas) {
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }

  return metrics;
}

function notify(): void {
  if (IS_MOBILE) applyMobileViewportLock();
  listeners.forEach((fn) => fn());
}

export function initViewportLock(): void {
  const meta = document.querySelector('meta[name="viewport"]');
  if (meta) meta.setAttribute('content', VIEWPORT_META);

  applyMobileViewportLock();

  window.addEventListener('resize', notify);
  window.addEventListener('orientationchange', () => {
    window.scrollTo(0, 0);
    setTimeout(notify, 50);
    setTimeout(notify, 150);
    setTimeout(notify, 400);
  });

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', notify);
    window.visualViewport.addEventListener('scroll', notify);
  }
}

export function setGameActive(active: boolean): void {
  document.body.classList.toggle('game-active', active);
  if (active && IS_MOBILE) {
    applyMobileViewportLock();
    requestAnimationFrame(() => {
      applyMobileViewportLock();
      listeners.forEach((fn) => fn());
    });
  }
}
