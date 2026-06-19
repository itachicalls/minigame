import * as THREE from 'three';

/** Coarse pointer or common mobile UA — used for renderer + spawn budgets */
export const IS_MOBILE =
  (typeof window !== 'undefined' &&
    window.matchMedia('(pointer: coarse)').matches) ||
  /Android|iPhone|iPad|iPod|Mobile/i.test(typeof navigator !== 'undefined' ? navigator.userAgent : '');

export const ENABLE_SHADOWS = false;
export const ENABLE_ANTIALIAS = false;
export const ENABLE_TONE_MAPPING = !IS_MOBILE;

export const NEAR_RANGE = IS_MOBILE ? 48 : 62;
export const WORLD_AHEAD = IS_MOBILE ? 72 : 88;
export const WORLD_BEHIND = IS_MOBILE ? 28 : 34;
export const SKY_RES = IS_MOBILE ? 256 : 384;
export const SKY_UPDATE_SEC = IS_MOBILE ? 0.35 : 0.22;

export function getPixelRatio(): number {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
  return IS_MOBILE ? Math.min(dpr, 1) : Math.min(dpr, 1);
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

export function lerpColor(a: string, b: string, t: number): string {
  const ca = new THREE.Color(a);
  const cb = new THREE.Color(b);
  return ca.lerp(cb, t).getStyle();
}
