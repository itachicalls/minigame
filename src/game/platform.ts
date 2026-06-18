/** Coarse pointer or common mobile UA — used for renderer + spawn budgets */
export const IS_MOBILE =
  (typeof window !== 'undefined' &&
    window.matchMedia('(pointer: coarse)').matches) ||
  /Android|iPhone|iPad|iPod|Mobile/i.test(typeof navigator !== 'undefined' ? navigator.userAgent : '');

export function getPixelRatio(): number {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
  return IS_MOBILE ? Math.min(dpr, 1.25) : Math.min(dpr, 2);
}
