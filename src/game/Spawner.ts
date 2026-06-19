import { IS_MOBILE } from './platform';
import type { BarClearance, BarMotion, BarSpan, CreateBarOptions } from './ElectricBars';
/** Five full lanes including center — Temple Run style */
export const LANES = [-3.2, -1.6, 0, 1.6, 3.2] as const;

export function pickRandomLane(): number {
  return LANES[Math.floor(Math.random() * LANES.length)];
}

export function pickAdjacentLanes(): number[] {
  const idx = Math.floor(Math.random() * (LANES.length - 1));
  return [LANES[idx], LANES[idx + 1]];
}

let barClearanceFlip = false;

export function pickBarSpawn(difficulty: number): CreateBarOptions {
  const sweepChance = difficulty >= 6 ? 0.14 : difficulty >= 4 ? 0.1 : difficulty >= 2 ? 0.06 : 0.03;
  const fullChance = difficulty >= 5 ? 0.2 : difficulty >= 3 ? 0.14 : 0.08;
  const twoLaneChance = difficulty >= 3 ? 0.24 : difficulty >= 2 ? 0.16 : 0.1;

  barClearanceFlip = !barClearanceFlip;
  const clearance: BarClearance =
    difficulty < 2 ? 'jump' : barClearanceFlip ? 'jump' : 'slide';

  const roll = Math.random();
  if (roll < sweepChance) {
    return {
      span: 'full',
      clearance: Math.random() < 0.55 ? 'jump' : 'slide',
      motion: 'sweep' as BarMotion,
    };
  }
  if (roll < sweepChance + fullChance) {
    return { span: 'full' as BarSpan, clearance, motion: 'static' };
  }
  if (roll < sweepChance + fullChance + twoLaneChance) {
    return {
      span: 'lane-2' as BarSpan,
      clearance,
      motion: 'static',
      lanes: pickAdjacentLanes(),
    };
  }
  return {
    span: 'lane-1' as BarSpan,
    clearance: difficulty < 3 && Math.random() < 0.75 ? 'jump' : clearance,
    motion: 'static',
    lanes: [pickRandomLane()],
  };
}

export function barSpacing(difficulty: number): number {
  const base = Math.max(18, 30 - difficulty * 1.05);
  return IS_MOBILE ? base + 6 : base;
}

export function runnerSpacing(difficulty: number): number {
  return Math.max(11, 22 - difficulty * 1.35);
}

export function powerUpSpacing(): number {
  return 32 + Math.random() * 22;
}

export function packageSpacing(): number {
  return 22 + Math.random() * 18;
}
