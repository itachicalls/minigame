import { IS_MOBILE } from './platform';
import type { BarClearance, BarMotion, BarSpan, CreateBarOptions } from './ElectricBars';
import type { ObstacleKind } from '../types';
import { pickRandomHazardForLevel } from '../data/hazards';
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
  barClearanceFlip = !barClearanceFlip;
  const clearance: BarClearance =
    difficulty < 2 ? 'jump' : barClearanceFlip ? 'jump' : 'slide';

  const sweepChance = difficulty >= 5 ? 0.14 : difficulty >= 3 ? 0.09 : 0.04;

  if (Math.random() < sweepChance) {
    return {
      span: 'full',
      clearance: Math.random() < 0.5 ? 'jump' : 'slide',
      motion: 'sweep' as BarMotion,
    };
  }

  // Full-width or two-lane blocks only — no scattered solo lane bars
  if (Math.random() < 0.52) {
    return { span: 'full' as BarSpan, clearance, motion: 'static' };
  }

  return {
    span: 'lane-2' as BarSpan,
    clearance,
    motion: 'static',
    lanes: pickAdjacentLanes(),
  };
}

export function barSpacing(difficulty: number): number {
  const base = Math.max(20, 32 - difficulty * 1.0);
  return IS_MOBILE ? base + 8 : base;
}

/** Prop hazards — fewer than before, wider spacing */
export function pickObstacleLanes(): number[] {
  if (Math.random() < (IS_MOBILE ? 0.06 : 0.12)) {
    const used = new Set<number>();
    const picked: number[] = [];
    while (picked.length < 2) {
      const lane = pickRandomLane();
      if (used.has(lane)) continue;
      used.add(lane);
      picked.push(lane);
    }
    return picked;
  }
  return [pickRandomLane()];
}

export function pickObstacleForLevel(levelId: string): ObstacleKind {
  return pickRandomHazardForLevel(levelId);
}

export function obstacleSpacing(difficulty: number): number {
  const base = Math.max(32, 48 - difficulty * 0.85);
  return IS_MOBILE ? base + 14 : base;
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
