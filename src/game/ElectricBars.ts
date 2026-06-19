import * as THREE from 'three';
import { addMesh, mat, disposeObject3D } from './ModelUtils';
import { IS_MOBILE, isNearZ } from './platform';

export const ROAD_LANES = [-3.2, -1.6, 0, 1.6, 3.2] as const;

export type BarClearance = 'jump' | 'slide';
export type BarSpan = 'full' | 'lane-1' | 'lane-2';
export type BarMotion = 'static' | 'sweep';

export type ElectricBarEntity = {
  mesh: THREE.Group;
  barAssembly: THREE.Group;
  z: number;
  x: number;
  span: BarSpan;
  clearance: BarClearance;
  motion: BarMotion;
  laneXs: number[];
  resolved: boolean;
  penalized: boolean;
  barrierMesh: THREE.Mesh;
  glowMesh: THREE.Mesh;
  sparks: THREE.Mesh[];
  sweepStarted: boolean;
  sweepTelegraphed: boolean;
  sweepT0: number;
  sweepDir: 1 | -1;
  styleAwarded: boolean;
};

export const LANE_HALF = 0.82;

type BarPalette = {
  wire: string;
  glow: string;
  sparkA: string;
  sparkB: string;
  arc: string;
};

const DISTRICT_PALETTE: BarPalette[] = [
  { wire: '#FFD54F', glow: '#80DEEA', sparkA: '#FFEB3B', sparkB: '#B2FF59', arc: '#CCFF90' },
  { wire: '#EA80FC', glow: '#B388FF', sparkA: '#E1BEE7', sparkB: '#CE93D8', arc: '#AB47BC' },
  { wire: '#FFB74D', glow: '#FFCC80', sparkA: '#FFE082', sparkB: '#FFAB40', arc: '#FF9800' },
  { wire: '#69F0AE', glow: '#A7FFEB', sparkA: '#B9F6CA', sparkB: '#00E676', arc: '#1DE9B6' },
];

function paletteFor(district: number, clearance: BarClearance): BarPalette {
  const base = DISTRICT_PALETTE[Math.min(Math.max(0, district - 1), DISTRICT_PALETTE.length - 1)];
  if (clearance === 'slide') {
    return {
      wire: '#E040FB',
      glow: '#EA80FC',
      sparkA: '#E1BEE7',
      sparkB: '#B388FF',
      arc: '#CE93D8',
    };
  }
  return base;
}

function spanWidth(span: BarSpan): number {
  if (span === 'full') return 7.35;
  if (span === 'lane-2') return 3.25;
  return 1.55;
}

function laneCenter(lanes: number[]): number {
  if (lanes.length === 0) return 0;
  return lanes.reduce((a, b) => a + b, 0) / lanes.length;
}

function buildBarAssembly(
  parent: THREE.Group,
  cableSpan: number,
  clearance: BarClearance,
  palette: BarPalette
): {
  assembly: THREE.Group;
  barrierMesh: THREE.Mesh;
  glowMesh: THREE.Mesh;
  sparks: THREE.Mesh[];
} {
  const assembly = new THREE.Group();
  parent.add(assembly);

  const isJump = clearance === 'jump';
  const barY = isJump ? 0.48 : 1.82;
  const poleH = isJump ? 1.28 : 2.72;
  const seg = IS_MOBILE ? 8 : 12;
  const half = cableSpan / 2;

  for (const x of [-half, half]) {
    const lean = x < 0 ? 0 : -0.08;
    const pole = addMesh(
      assembly,
      new THREE.CylinderGeometry(0.075, 0.095, poleH, seg),
      mat('#6D4C41', { roughness: 0.92 }),
      x,
      poleH / 2,
      0
    );
    pole.rotation.z = lean;
    addMesh(
      assembly,
      new THREE.BoxGeometry(0.38, 0.05, 0.05),
      mat('#546E7A', { metalness: 0.45, roughness: 0.5 }),
      x + lean * 0.3,
      barY + 0.02,
      0.04
    );
    addMesh(
      assembly,
      new THREE.CylinderGeometry(0.045, 0.06, 0.1, 6),
      mat('#ECEFF1', { roughness: 0.45 }),
      x + lean * 0.35,
      barY,
      0.06
    );
  }

  const cableSegs = IS_MOBILE ? 3 : Math.max(3, Math.ceil(cableSpan / 1.8));
  for (let i = 0; i < cableSegs; i++) {
    const t0 = i / cableSegs;
    const t1 = (i + 1) / cableSegs;
    const x0 = -half + t0 * cableSpan;
    const x1 = -half + t1 * cableSpan;
    const y0 = barY - 0.08 * Math.sin(t0 * Math.PI);
    const y1 = barY - 0.08 * Math.sin(t1 * Math.PI);
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    const len = Math.hypot(x1 - x0, y1 - y0);
    const angle = Math.atan2(y1 - y0, x1 - x0);
    const segMesh = addMesh(
      assembly,
      new THREE.CylinderGeometry(0.045, 0.045, len, 6),
      mat('#37474F', { metalness: 0.65, roughness: 0.4 }),
      mx,
      my,
      0
    );
    segMesh.rotation.z = angle - Math.PI / 2;
  }

  const barrierMesh = addMesh(
    assembly,
    new THREE.CylinderGeometry(isJump ? 0.065 : 0.08, isJump ? 0.065 : 0.08, cableSpan, seg),
    mat('#263238', {
      metalness: 0.75,
      roughness: 0.35,
      emissive: palette.wire,
      emissiveIntensity: isJump ? 0.22 : 0.4,
    }),
    0,
    barY - 0.05,
    0
  );
  barrierMesh.rotation.z = Math.PI / 2;

  const glowMesh = addMesh(
    assembly,
    new THREE.CylinderGeometry(isJump ? 0.1 : 0.13, isJump ? 0.1 : 0.13, cableSpan - 0.04, seg),
    new THREE.MeshBasicMaterial({
      color: palette.glow,
      transparent: true,
      opacity: isJump ? 0.38 : 0.52,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
    0,
    barY - 0.05,
    0,
    false
  );
  glowMesh.rotation.z = Math.PI / 2;

  const sparks: THREE.Mesh[] = [];
  const sparkCount = IS_MOBILE ? 4 : 6;
  for (let i = 0; i < sparkCount; i++) {
    const t = sparkCount > 1 ? i / (sparkCount - 1) : 0.5;
    const sx = -half + 0.25 + t * (cableSpan - 0.5);
    const sag = barY - 0.08 * Math.sin(t * Math.PI) - 0.05;
    const spark = addMesh(
      assembly,
      new THREE.SphereGeometry(0.03 + (i % 2) * 0.012, 6, 6),
      new THREE.MeshBasicMaterial({
        color: i % 3 === 0 ? palette.sparkA : palette.sparkB,
        transparent: true,
        opacity: isJump ? 0.68 : 0.82,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
      sx,
      sag + (i % 2) * 0.05,
      (i % 3 - 1) * 0.06,
      false
    );
    spark.userData.isSpark = true;
    spark.userData.sparkPhase = i;
    spark.userData.baseY = spark.position.y;
    sparks.push(spark);
  }

  const arcCount = IS_MOBILE ? 2 : 3;
  for (let i = 0; i < arcCount; i++) {
    const arc = addMesh(
      assembly,
      new THREE.PlaneGeometry(0.28, 0.05),
      new THREE.MeshBasicMaterial({
        color: palette.arc,
        transparent: true,
        opacity: isJump ? 0.42 : 0.58,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
      -half * 0.55 + i * (cableSpan / (arcCount + 0.5)),
      barY - 0.12 - (i % 2) * 0.04,
      0.1,
      false
    );
    arc.userData.isArc = true;
    arc.userData.sparkPhase = i + 0.5;
    sparks.push(arc);
  }

  return { assembly, barrierMesh, glowMesh, sparks };
}

export type CreateBarOptions = {
  span: BarSpan;
  clearance: BarClearance;
  motion?: BarMotion;
  lanes?: number[];
  district?: number;
};

export function createElectricBar(
  scene: THREE.Scene,
  z: number,
  options: CreateBarOptions
): ElectricBarEntity {
  const { span, clearance, motion = 'static', district = 1 } = options;
  let laneXs = options.lanes ?? [];
  if (span === 'full') laneXs = [...ROAD_LANES];
  else if (laneXs.length === 0) laneXs = [0];

  const centerX = span === 'full' ? 0 : laneCenter(laneXs);
  const cableSpan = spanWidth(span);
  const palette = paletteFor(district, clearance);

  const mesh = new THREE.Group();
  mesh.position.set(0, 0, z);

  if (span !== 'full') {
    const pad = addMesh(
      mesh,
      new THREE.CircleGeometry(cableSpan * 0.55, IS_MOBILE ? 8 : 12),
      mat('#ECEFF1', { roughness: 0.9, emissive: palette.wire, emissiveIntensity: 0.08 }),
      centerX,
      0.006,
      0,
      false
    );
    pad.rotation.x = -Math.PI / 2;
  }

  const { assembly, barrierMesh, glowMesh, sparks } = buildBarAssembly(mesh, cableSpan, clearance, palette);
  assembly.position.x = motion === 'sweep' ? (Math.random() < 0.5 ? -5.2 : 5.2) : centerX;

  scene.add(mesh);

  return {
    mesh,
    barAssembly: assembly,
    z,
    x: centerX,
    span,
    clearance,
    motion,
    laneXs,
    resolved: false,
    penalized: false,
    barrierMesh,
    glowMesh,
    sparks,
    sweepStarted: false,
    sweepTelegraphed: false,
    sweepT0: 0,
    sweepDir: Math.random() < 0.5 ? 1 : -1,
    styleAwarded: false,
  };
}

function animateBarVisuals(bar: ElectricBarEntity, time: number): void {
  const isSlide = bar.clearance === 'slide';
  const flicker = 0.22 + Math.sin(time * 14 + bar.z) * 0.1 + Math.sin(time * 27) * 0.06;
  const telegraphBoost = bar.motion === 'sweep' && bar.sweepTelegraphed && !bar.sweepStarted ? 0.35 : 0;
  const glowMat = bar.glowMesh.material as THREE.MeshBasicMaterial;
  glowMat.opacity = (flicker + 0.12 + telegraphBoost) * (isSlide ? 1.35 : 1);

  const barMat = bar.barrierMesh.material as THREE.MeshStandardMaterial;
  const emBase = isSlide ? 0.28 : 0.14;
  barMat.emissiveIntensity =
    emBase + Math.abs(Math.sin(time * 11 + bar.z * 0.3)) * (isSlide ? 0.55 : 0.35) + telegraphBoost * 0.5;

  for (const s of bar.sparks) {
    const phase = (s.userData.sparkPhase as number) ?? 0;
    const m = s.material as THREE.MeshBasicMaterial;
    if (s.userData.isArc) {
      m.opacity = 0.1 + Math.abs(Math.sin(time * 9 + phase * 1.7)) * 0.42 + telegraphBoost;
      s.scale.x = 0.7 + Math.abs(Math.sin(time * 13 + phase)) * 0.55;
      s.rotation.z = Math.sin(time * 6 + phase) * 0.35;
    } else {
      m.opacity = 0.25 + Math.abs(Math.sin(time * 16 + phase * 2.1)) * 0.55 + telegraphBoost * 0.4;
      s.position.y = (s.userData.baseY as number) + Math.sin(time * 20 + phase) * 0.012;
    }
  }
}

function sweepBarX(bar: ElectricBarEntity, time: number): number {
  const elapsed = time - bar.sweepT0;
  const dur = 1.05;
  const t = Math.min(1, Math.max(0, elapsed / dur));
  const ease = t * t * (3 - 2 * t);
  const from = bar.sweepDir === 1 ? -5.2 : 5.2;
  const to = bar.sweepDir === 1 ? 5.2 : -5.2;
  return from + (to - from) * ease;
}

export function playerInBarLanes(playerX: number, bar: ElectricBarEntity): boolean {
  if (bar.span === 'full') return true;
  for (const lx of bar.laneXs) {
    if (Math.abs(playerX - lx) < LANE_HALF + 0.12) return true;
  }
  return false;
}

export function updateElectricBars(
  bars: ElectricBarEntity[],
  time: number,
  playerZ: number,
  onSweepTelegraph?: (bar: ElectricBarEntity) => void
): void {
  for (const bar of bars) {
    if (bar.resolved) {
      bar.mesh.visible = false;
      continue;
    }
    if (!isNearZ(bar.z, playerZ, IS_MOBILE ? 48 : 60)) continue;

    if (bar.motion === 'sweep') {
      const dist = bar.z - playerZ;
      if (dist < 16 && dist > 0 && !bar.sweepTelegraphed) {
        bar.sweepTelegraphed = true;
        onSweepTelegraph?.(bar);
      }
      if (dist < 8 && dist > -2 && !bar.sweepStarted) {
        bar.sweepStarted = true;
        bar.sweepT0 = time;
      }
      if (bar.sweepStarted) {
        bar.barAssembly.position.x = sweepBarX(bar, time);
      }
    }

    animateBarVisuals(bar, time);
  }
}

export function disposeElectricBars(bars: ElectricBarEntity[], scene: THREE.Scene): void {
  for (const b of bars) {
    scene.remove(b.mesh);
    disposeObject3D(b.mesh);
  }
}

export function getActiveBarX(bar: ElectricBarEntity): number {
  if (bar.motion === 'sweep' && bar.sweepStarted) return bar.barAssembly.position.x;
  return bar.x;
}
