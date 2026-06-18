import * as THREE from 'three';

/** Coarse pointer or common mobile UA — used for renderer + spawn budgets */
export const IS_MOBILE =
  (typeof window !== 'undefined' &&
    window.matchMedia('(pointer: coarse)').matches) ||
  /Android|iPhone|iPad|iPod|Mobile/i.test(typeof navigator !== 'undefined' ? navigator.userAgent : '');

export const NEAR_RANGE = IS_MOBILE ? 52 : 75;
export const WORLD_AHEAD = IS_MOBILE ? 78 : 110;
export const WORLD_BEHIND = IS_MOBILE ? 32 : 42;

export function getPixelRatio(): number {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
  return IS_MOBILE ? Math.min(dpr, 1) : Math.min(dpr, 2);
}

export function isNearZ(z: number, playerZ: number, range = NEAR_RANGE): boolean {
  return Math.abs(z - playerZ) <= range;
}

export function freezeStatic(obj: THREE.Object3D): void {
  obj.traverse((c) => {
    c.matrixAutoUpdate = false;
    c.updateMatrix();
  });
}
