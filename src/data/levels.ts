import type { LevelDef, ObstacleKind } from '../types';

/** Repeat obstacle strips along a run for Temple Run density */
function hazardRun(
  startZ: number,
  count: number,
  step: number,
  pattern: { x: number; type: ObstacleKind }[]
) {
  const segs: LevelDef['segments'] = [];
  for (let i = 0; i < count; i++) {
    const z = startZ + i * step;
    segs.push({
      kind: 'obstacles',
      z,
      items: pattern.map((p) => ({ x: p.x, type: p.type })),
    });
  }
  return segs;
}

export const LEVELS: LevelDef[] = [
  {
    id: '1-1',
    district: 1,
    name: 'First Delivery',
    briefing: 'Temple Run rules: jump hazards, pick the GREEN fork. Wrong lane = instant death. Center wall kills too.',
    segments: [
      { kind: 'packages', z: 40, count: 4, spread: 3.5 },
      ...hazardRun(70, 4, 22, [
        { x: 2.5, type: 'cones' },
        { x: -2.5, type: 'debris' },
      ]),
      { kind: 'gate', z: 160, safe: 'left' },
      ...hazardRun(190, 5, 20, [
        { x: 0, type: 'pod' },
        { x: 3, type: 'cones' },
      ]),
      { kind: 'coins', z: 310, count: 12, spread: 4 },
      { kind: 'gate', z: 360, safe: 'right' },
      ...hazardRun(390, 4, 24, [
        { x: -2, type: 'barricade' },
        { x: 2, type: 'pod' },
      ]),
      { kind: 'enemy', z: 500, enemy: 'pickpocket', count: 12 },
      ...hazardRun(530, 3, 28, [{ x: 0, type: 'barricade' }]),
      { kind: 'packages', z: 620, count: 5, spread: 4 },
      { kind: 'gate', z: 680, safe: 'left' },
      { kind: 'dropoff', z: 750 },
    ],
    timeLimit: 180,
  },
  {
    id: '1-2',
    district: 1,
    name: 'Dog Park Detour',
    briefing: 'Longer route — aliens and pods everywhere. Read the fork signs: ✓ SAFE vs ✗ DEAD END.',
    segments: [
      { kind: 'packages', z: 50, count: 5, spread: 3.5 },
      ...hazardRun(80, 6, 25, [
        { x: -2.5, type: 'cones' },
        { x: 1.5, type: 'pod' },
      ]),
      { kind: 'gate', z: 240, safe: 'right' },
      ...hazardRun(270, 5, 22, [{ x: 0, type: 'barricade' }]),
      { kind: 'enemy', z: 390, enemy: 'pickpocket', count: 14 },
      { kind: 'coins', z: 450, count: 14, spread: 5 },
      { kind: 'gate', z: 520, safe: 'left' },
      ...hazardRun(550, 6, 20, [
        { x: 2.5, type: 'pod' },
        { x: -1, type: 'debris' },
      ]),
      { kind: 'enemy', z: 680, enemy: 'pickpocket', count: 16 },
      { kind: 'gate', z: 740, safe: 'right' },
      { kind: 'packages', z: 780, count: 4 },
      { kind: 'dropoff', z: 850 },
    ],
    timeLimit: 200,
  },
  {
    id: '1-3',
    district: 1,
    name: 'Block Party Run',
    briefing: 'Barricade gauntlet then alien fight. Stay in your lane at every fork!',
    segments: [
      { kind: 'packages', z: 60, count: 6, spread: 4 },
      ...hazardRun(90, 8, 22, [
        { x: 0, type: 'barricade' },
        { x: -3, type: 'cones' },
        { x: 3, type: 'cones' },
      ]),
      { kind: 'gate', z: 280, safe: 'left' },
      { kind: 'coins', z: 320, count: 12, spread: 5 },
      ...hazardRun(350, 5, 24, [
        { x: 1, type: 'pod' },
        { x: -2.5, type: 'debris' },
      ]),
      { kind: 'gate', z: 480, safe: 'right' },
      { kind: 'enemy', z: 530, enemy: 'pickpocket', count: 18 },
      ...hazardRun(560, 4, 26, [{ x: 0, type: 'barricade' }]),
      { kind: 'gate', z: 680, safe: 'left' },
      { kind: 'enemy', z: 720, enemy: 'rival', count: 14 },
      { kind: 'packages', z: 780, count: 5 },
      { kind: 'dropoff', z: 900 },
    ],
    timeLimit: 220,
  },
  {
    id: '1-4',
    district: 1,
    name: 'Suburban Sprint',
    briefing: 'Extended sprint — double alien waves and tight forks.',
    segments: [
      { kind: 'packages', z: 50, count: 5 },
      ...hazardRun(80, 7, 24, [
        { x: -2, type: 'barricade' },
        { x: 2, type: 'pod' },
      ]),
      { kind: 'gate', z: 260, safe: 'right' },
      { kind: 'coins', z: 300, count: 10 },
      { kind: 'enemy', z: 360, enemy: 'rival', count: 14 },
      ...hazardRun(390, 5, 22, [{ x: 0, type: 'debris' }]),
      { kind: 'gate', z: 520, safe: 'left' },
      { kind: 'enemy', z: 580, enemy: 'pickpocket', count: 18 },
      ...hazardRun(610, 5, 25, [
        { x: -3, type: 'barricade' },
        { x: 1, type: 'pod' },
      ]),
      { kind: 'gate', z: 750, safe: 'right' },
      { kind: 'packages', z: 800, count: 4 },
      { kind: 'enemy', z: 840, enemy: 'rival', count: 16 },
      { kind: 'dropoff', z: 950 },
    ],
    timeLimit: 240,
  },
  {
    id: '1-5',
    district: 1,
    name: 'Boss: HOA Alien',
    briefing: 'Boss gauntlet — survive the longest run yet, then drop the Commander.',
    segments: [
      { kind: 'packages', z: 70, count: 8, spread: 4 },
      ...hazardRun(100, 8, 26, [
        { x: 0, type: 'pod' },
        { x: 3, type: 'barricade' },
        { x: -3, type: 'debris' },
      ]),
      { kind: 'gate', z: 320, safe: 'left' },
      { kind: 'enemy', z: 380, enemy: 'rival', count: 18 },
      { kind: 'coins', z: 430, count: 14, spread: 6 },
      ...hazardRun(460, 6, 24, [{ x: 0, type: 'barricade' }]),
      { kind: 'gate', z: 620, safe: 'right' },
      { kind: 'enemy', z: 680, enemy: 'pickpocket', count: 22 },
      ...hazardRun(710, 5, 28, [
        { x: -2, type: 'pod' },
        { x: 2, type: 'barricade' },
      ]),
      { kind: 'gate', z: 860, safe: 'left' },
      { kind: 'packages', z: 900, count: 6 },
      { kind: 'enemy', z: 940, enemy: 'boss', count: 28 },
      { kind: 'dropoff', z: 1050 },
    ],
    timeLimit: 280,
  },
  {
    id: '2-1',
    district: 2,
    name: 'Morning Commute',
    briefing: 'Downtown chaos — faster pace, deadlier forks.',
    segments: [
      { kind: 'packages', z: 60, count: 5 },
      ...hazardRun(90, 7, 24, [
        { x: 0, type: 'barricade' },
        { x: -2.8, type: 'cones' },
      ]),
      { kind: 'gate', z: 270, safe: 'right' },
      { kind: 'enemy', z: 330, enemy: 'pickpocket', count: 16 },
      ...hazardRun(360, 6, 22, [{ x: 2.5, type: 'pod' }]),
      { kind: 'gate', z: 500, safe: 'left' },
      { kind: 'coins', z: 540, count: 12 },
      { kind: 'enemy', z: 600, enemy: 'rival', count: 18 },
      ...hazardRun(630, 5, 26, [{ x: 0, type: 'barricade' }]),
      { kind: 'gate', z: 770, safe: 'right' },
      { kind: 'packages', z: 820, count: 5 },
      { kind: 'dropoff', z: 920 },
    ],
    timeLimit: 240,
  },
  {
    id: '2-2',
    district: 2,
    name: 'Food Truck Alley',
    briefing: 'Coins between hazards — don\'t get greedy in the wrong lane!',
    segments: [
      { kind: 'packages', z: 50, count: 6, spread: 5 },
      { kind: 'coins', z: 100, count: 14, spread: 6 },
      ...hazardRun(130, 8, 24, [
        { x: 0, type: 'cones' },
        { x: 3, type: 'debris' },
      ]),
      { kind: 'gate', z: 330, safe: 'left' },
      { kind: 'enemy', z: 390, enemy: 'pickpocket', count: 20 },
      ...hazardRun(420, 5, 26, [{ x: 0, type: 'barricade' }]),
      { kind: 'gate', z: 560, safe: 'right' },
      { kind: 'coins', z: 600, count: 16, spread: 6 },
      { kind: 'enemy', z: 660, enemy: 'rival', count: 22 },
      { kind: 'gate', z: 760, safe: 'left' },
      { kind: 'packages', z: 800, count: 5 },
      { kind: 'dropoff', z: 950 },
    ],
    timeLimit: 260,
  },
  {
    id: '2-3',
    district: 2,
    name: 'Alien Territory',
    briefing: 'Pod minefield + back-to-back alien squads.',
    segments: [
      { kind: 'packages', z: 60, count: 7 },
      ...hazardRun(90, 9, 22, [
        { x: -2, type: 'pod' },
        { x: 2, type: 'pod' },
        { x: 0, type: 'debris' },
      ]),
      { kind: 'gate', z: 300, safe: 'right' },
      { kind: 'enemy', z: 360, enemy: 'rival', count: 24 },
      ...hazardRun(390, 6, 24, [{ x: 0, type: 'barricade' }]),
      { kind: 'gate', z: 540, safe: 'left' },
      { kind: 'enemy', z: 600, enemy: 'rival', count: 26 },
      { kind: 'coins', z: 650, count: 14 },
      ...hazardRun(680, 5, 28, [
        { x: -3, type: 'barricade' },
        { x: 1, type: 'pod' },
      ]),
      { kind: 'gate', z: 830, safe: 'right' },
      { kind: 'packages', z: 870, count: 6 },
      { kind: 'dropoff', z: 1000 },
    ],
    timeLimit: 280,
  },
  {
    id: '2-4',
    district: 2,
    name: 'Rush Hour',
    briefing: 'Everything at once — longest commute route.',
    segments: [
      { kind: 'packages', z: 50, count: 5 },
      ...hazardRun(80, 8, 24, [
        { x: 2, type: 'barricade' },
        { x: -2, type: 'cones' },
      ]),
      { kind: 'gate', z: 280, safe: 'left' },
      { kind: 'coins', z: 320, count: 12 },
      { kind: 'enemy', z: 380, enemy: 'pickpocket', count: 24 },
      ...hazardRun(410, 6, 26, [{ x: 0, type: 'pod' }]),
      { kind: 'gate', z: 570, safe: 'right' },
      { kind: 'enemy', z: 630, enemy: 'rival', count: 24 },
      ...hazardRun(660, 5, 28, [{ x: 0, type: 'barricade' }]),
      { kind: 'gate', z: 810, safe: 'left' },
      { kind: 'packages', z: 850, count: 5 },
      { kind: 'enemy', z: 900, enemy: 'pickpocket', count: 20 },
      { kind: 'gate', z: 960, safe: 'right' },
      { kind: 'dropoff', z: 1050 },
    ],
    timeLimit: 300,
  },
  {
    id: '2-5',
    district: 2,
    name: 'Boss: Alien Commander',
    briefing: 'Final marathon — thread every fork, then kill the Commander.',
    segments: [
      { kind: 'packages', z: 70, count: 8, spread: 4 },
      ...hazardRun(100, 10, 26, [
        { x: -2.5, type: 'barricade' },
        { x: 0, type: 'pod' },
        { x: 2.5, type: 'debris' },
      ]),
      { kind: 'gate', z: 370, safe: 'left' },
      { kind: 'coins', z: 410, count: 16, spread: 6 },
      { kind: 'enemy', z: 470, enemy: 'rival', count: 30 },
      ...hazardRun(500, 6, 28, [{ x: 0, type: 'barricade' }]),
      { kind: 'gate', z: 680, safe: 'right' },
      { kind: 'packages', z: 720, count: 6 },
      { kind: 'enemy', z: 780, enemy: 'pickpocket', count: 28 },
      ...hazardRun(810, 5, 30, [
        { x: -2, type: 'pod' },
        { x: 2, type: 'barricade' },
      ]),
      { kind: 'gate', z: 960, safe: 'left' },
      { kind: 'packages', z: 1000, count: 5 },
      { kind: 'enemy', z: 1040, enemy: 'boss', count: 38 },
      { kind: 'dropoff', z: 1150 },
    ],
    timeLimit: 320,
  },
];

export function getLevel(id: string): LevelDef | undefined {
  return LEVELS.find((l) => l.id === id);
}

export function nextLevelId(currentId: string): string | null {
  const idx = LEVELS.findIndex((l) => l.id === currentId);
  if (idx < 0 || idx >= LEVELS.length - 1) return null;
  return LEVELS[idx + 1].id;
}

export function prevDistrictLevels(district: number): LevelDef[] {
  return LEVELS.filter((l) => l.district === district);
}
