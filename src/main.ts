import { SaveManager } from './save/SaveManager';
import { UIManager } from './ui/UIManager';
import { IS_ANDROID, IS_MOBILE } from './game/platform';
import { initViewportLock } from './game/viewport';
import { kenneyAssets } from './game/KenneyAssets';
import { sfx } from './game/SoundManager';

if (IS_ANDROID) document.body.classList.add('android');

const save = new SaveManager();
const uiRoot = document.getElementById('ui-root')!;
new UIManager(uiRoot, save);

kenneyAssets.preload().catch(() => {
  /* procedural fallback until Kenney assets finish loading */
});

initViewportLock();

function bindAudioUnlock(): void {
  const unlock = () => {
    void sfx.unlock();
  };
  document.addEventListener('pointerdown', unlock, { once: true, capture: true });
  document.addEventListener('keydown', unlock, { once: true, capture: true });
}
bindAudioUnlock();

const SCROLL_ALLOW =
  '.shop-scroll, .route-scroll, .menu-scroll, .levels-screen, .mission-screen, .results-screen, .scroll-touch';

function isScrollTarget(t: HTMLElement): boolean {
  return !!t.closest(SCROLL_ALLOW);
}

function blockZoom(e: Event): void {
  const te = e as TouchEvent;
  if (te.touches && te.touches.length > 1) {
    e.preventDefault();
    return;
  }
  if (!document.body.classList.contains('game-active')) return;
  const t = e.target as HTMLElement;
  if (isScrollTarget(t)) return;
  e.preventDefault();
}

document.addEventListener('touchmove', blockZoom, { passive: false });
document.addEventListener('gesturestart', blockZoom);
document.addEventListener('gesturechange', blockZoom);
document.addEventListener('gestureend', blockZoom);

document.addEventListener(
  'touchstart',
  (e) => {
    if (e.touches.length > 1) {
      e.preventDefault();
      return;
    }
    if (document.body.classList.contains('game-active')) {
      const t = e.target as HTMLElement;
      if (!t.closest('button, .touch-steer')) e.preventDefault();
    }
  },
  { passive: false, capture: true }
);

let lastTouchEnd = 0;
document.addEventListener(
  'touchend',
  (e) => {
    if (!document.body.classList.contains('game-active')) return;
    const now = Date.now();
    if (now - lastTouchEnd <= 320) e.preventDefault();
    lastTouchEnd = now;
    if (IS_MOBILE) window.scrollTo(0, 0);
  },
  { passive: false }
);

document.addEventListener('contextmenu', (e) => {
  if ((e.target as HTMLElement).closest('#game-canvas, .hud')) e.preventDefault();
});
