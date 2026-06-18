import { SaveManager } from './save/SaveManager';
import { UIManager } from './ui/UIManager';

const save = new SaveManager();
const uiRoot = document.getElementById('ui-root')!;
new UIManager(uiRoot, save);

document.addEventListener(
  'touchmove',
  (e) => {
    if ((e.target as HTMLElement).closest('#game-canvas, .hud, .screen')) {
      e.preventDefault();
    }
  },
  { passive: false }
);

document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('contextmenu', (e) => {
  if ((e.target as HTMLElement).closest('#game-canvas, .hud')) e.preventDefault();
});
