import * as THREE from 'three';

/** Coarse pointer or common mobile UA — used for renderer + spawn budgets */
export const IS_MOBILE =
  (typeof window !== 'undefined' &&
    window.matchMedia('(pointer: coarse)').matches) ||
  /Android|iPhone|iPad|iPod|Mobile/i.test(typeof navigator !== 'undefined' ? navigator.userAgent : '');

export const ENABLE_SHADOWS = false;
export const ENABLE_ANTIALIAS = false;
export const ENABLE_TONE_MAPPING = true;
export const ENABLE_BLOOM = true;
export const BLOOM_RES_SCALE = IS_MOBILE ? 0.4 : 0.32;

export const NEAR_RANGE = IS_MOBILE ? 44 : 58;
export const WORLD_AHEAD = IS_MOBILE ? 72 : 80;
export const WORLD_BEHIND = IS_MOBILE ? 28 : 32;
export const SKY_RES = IS_MOBILE ? 256 : 320;
export const SKY_UPDATE_SEC = IS_MOBILE ? 0.35 : 0.45;

export function getPixelRatio(): number {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
  return IS_MOBILE ? Math.min(dpr, 1.25) : Math.min(dpr, 1.1);
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

/** Full day cycle — dawn → bright day → dusk → night → dawn (seconds). Short so it visibly loops within a run. */
export const SKY_CYCLE_SEC = 68;

/**
 * 0 = bright midday, 1 = deep night. Smooth raised-cosine so the world breathes
 * continuously between a clear bright day and a rich neon night, looping forever.
 * Day floor sits near t=0.25, night peak near t=0.75; `pow` bias widens the bright
 * daytime window so the level reads as genuine daytime for a good stretch.
 */
export function skyNightLevel(time: number): number {
  const t = (time % SKY_CYCLE_SEC) / SKY_CYCLE_SEC;
  const c = 0.5 - 0.5 * Math.cos((t - 0.25) * Math.PI * 2);
  return Math.pow(c, 1.4);
}

/** Neon / glow / bloom effects — zero during day, ramps only in deep night. */
export function nightEffectStrength(night: number): number {
  if (night <= 0.55) return 0;
  return Math.min(1, (night - 0.55) / 0.3);
}

/** Districts 1–2: warmer dusk palette & extra neon at night (full day/night cycle kept). */
export function isHeroCinematicDistrict(districtId: number): boolean {
  return districtId <= 2;
}

/** Sky & lighting time — same 120s cycle everywhere; hero districts only tint at dusk/night. */
export function cinematicNightLevel(time: number, districtId: number): number {
  return skyNightLevel(time);
}

/** Road glow, neon bloom, wet reflections — ramps from day (off) into night. */
export function sceneGlowStrength(night: number, districtId: number): number {
  const base = nightEffectStrength(night);
  if (isHeroCinematicDistrict(districtId) && night > 0.38) {
    return Math.min(1, base + (night - 0.38) * 0.45);
  }
  return base;
}

/** Hazards & enemies — subtle fill light when sky is actually dark. */
export function gameplayNightVisibility(night: number): number {
  if (night <= 0.5) return 0;
  return Math.min(1, (night - 0.5) / 0.38);
}

/** Lighting darkening — stays bright through morning & midday, capped so deep night stays moody (not pitch black). */
export function lightingNightBlend(night: number): number {
  if (night <= 0.28) return night * 0.12;
  if (night <= 0.55) return 0.034 + (night - 0.28) * 0.55;
  const fx = nightEffectStrength(night);
  return Math.min(0.86, 0.18 + (night - 0.55) * 1.05 + fx * 0.35);
}
