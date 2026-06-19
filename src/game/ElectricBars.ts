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
  rotors: THREE.Group[];
  orbitRings: THREE.Mesh[];
  floorPulse: THREE.Mesh[];
  warningGlyphs: THREE.Object3D[];
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
  core: string;
  sparkA: string;
  sparkB: string;
  arc: string;
  floor: string;
};

const DISTRICT_PALETTE: BarPalette[] = [
  {
    wire: '#FFD54F',
    glow: '#80DEEA',
    core: '#FFFFFF',
    sparkA: '#FFEB3B',
    sparkB: '#B2FF59',
    arc: '#CCFF90',
    floor: '#FFE082',
  },
  {
    wire: '#EA80FC',
    glow: '#B388FF',
    core: '#F3E5F5',
    sparkA: '#E1BEE7',
    sparkB: '#CE93D8',
    arc: '#AB47BC',
    floor: '#EA80FC',
  },
  {
    wire: '#FFB74D',
    glow: '#FFCC80',
    core: '#FFF8E1',
    sparkA: '#FFE082',
    sparkB: '#FFAB40',
    arc: '#FF9800',
    floor: '#FFCC80',
  },
  {
    wire: '#69F0AE',
    glow: '#A7FFEB',
    core: '#E0F7FA',
    sparkA: '#B9F6CA',
    sparkB: '#00E676',
    arc: '#1DE9B6',
    floor: '#A7FFEB',
  },
];

function paletteFor(district: number, clearance: BarClearance): BarPalette {
  const base = DISTRICT_PALETTE[Math.min(Math.max(0, district - 1), DISTRICT_PALETTE.length - 1)];
  if (clearance === 'slide') {
    return {
      wire: '#E040FB',
      glow: '#EA80FC',
      core: '#FCE4EC',
      sparkA: '#F48FB1',
      sparkB: '#B388FF',
      arc: '#CE93D8',
      floor: '#E1BEE7',
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

function glowMat(color: string, opacity: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

function buildFloorZone(
  parent: THREE.Object3D,
  span: number,
  palette: BarPalette,
  clearance: BarClearance
): THREE.Mesh[] {
  const pulses: THREE.Mesh[] = [];
  const seg = IS_MOBILE ? 10 : 16;

  const base = addMesh(
    parent,
    new THREE.CircleGeometry(span * 0.52, seg),
    mat('#1a1f28', { roughness: 0.95, metalness: 0.15 }),
    0,
    0.004,
    0,
    false
  );
  base.rotation.x = -Math.PI / 2;

  const ring = addMesh(
    parent,
    new THREE.RingGeometry(span * 0.38, span * 0.54, seg),
    glowMat(palette.floor, IS_MOBILE ? 0.55 : 0.72),
    0,
    0.006,
    0,
    false
  );
  ring.rotation.x = -Math.PI / 2;
  ring.userData.isFloorRing = true;
  pulses.push(ring);

  const inner = addMesh(
    parent,
    new THREE.RingGeometry(span * 0.12, span * 0.22, seg),
    glowMat(palette.glow, 0.35),
    0,
    0.007,
    0,
    false
  );
  inner.rotation.x = -Math.PI / 2;
  inner.userData.isFloorRing = true;
  pulses.push(inner);

  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const chev = addMesh(
      parent,
      new THREE.PlaneGeometry(0.22, 0.22),
      glowMat(clearance === 'jump' ? palette.sparkA : palette.sparkB, 0.5),
      Math.cos(a) * span * 0.32,
      0.02,
      Math.sin(a) * span * 0.32,
      false
    );
    chev.rotation.x = -Math.PI / 2;
    chev.rotation.z = a + Math.PI / 2;
    chev.userData.isChevron = true;
    chev.userData.chevPhase = i;
  }

  return pulses;
}

function buildEnergyPillar(
  parent: THREE.Object3D,
  x: number,
  barY: number,
  clearance: BarClearance,
  palette: BarPalette
): void {
  const isJump = clearance === 'jump';
  const poleH = isJump ? 1.35 : 2.85;
  const seg = IS_MOBILE ? 8 : 12;

  addMesh(
    parent,
    new THREE.CylinderGeometry(0.11, 0.14, poleH, seg),
    mat('#37474F', { metalness: 0.72, roughness: 0.28 }),
    x,
    poleH / 2,
    0
  );

  addMesh(
    parent,
    new THREE.CylinderGeometry(0.16, 0.2, 0.18, seg),
    mat('#546E7A', { metalness: 0.85, roughness: 0.2, emissive: palette.wire, emissiveIntensity: 0.35 }),
    x,
    poleH - 0.08,
    0
  );

  const core = addMesh(
    parent,
    new THREE.OctahedronGeometry(0.11, 0),
    mat(palette.core, { emissive: palette.glow, emissiveIntensity: 0.85, metalness: 0.4, roughness: 0.2 }),
    x,
    barY,
    0.08
  );
  core.userData.isCore = true;
  core.userData.corePhase = x;

  for (let i = 0; i < 3; i++) {
    const ring = addMesh(
      parent,
      new THREE.TorusGeometry(0.14 + i * 0.05, 0.012, 6, seg),
      glowMat(palette.glow, 0.45 - i * 0.08),
      x,
      barY - 0.15 + i * 0.12,
      0.06,
      false
    );
    ring.rotation.x = Math.PI / 2;
    ring.userData.isPillarRing = true;
    ring.userData.ringPhase = i + x;
  }
}

function buildRotorArms(
  hub: THREE.Group,
  armLen: number,
  palette: BarPalette,
  isJump: boolean,
  spinSign: number
): void {
  hub.userData.spinSign = spinSign;
  hub.userData.spinAxis = isJump ? 'z' : 'y';

  const bladeCount = IS_MOBILE ? 2 : 3;
  for (let i = 0; i < bladeCount; i++) {
    const arm = new THREE.Group();
    hub.add(arm);
    arm.rotation.z = (i / bladeCount) * Math.PI * 2;

    addMesh(
      arm,
      new THREE.BoxGeometry(armLen, 0.06, 0.06),
      mat('#263238', { metalness: 0.8, roughness: 0.25, emissive: palette.wire, emissiveIntensity: 0.45 }),
      armLen / 2,
      0,
      0
    );

    const tip = addMesh(
      arm,
      new THREE.SphereGeometry(0.07, IS_MOBILE ? 6 : 8, IS_MOBILE ? 6 : 8),
      glowMat(palette.sparkA, 0.85),
      armLen,
      0,
      0,
      false
    );
    tip.userData.isArmTip = true;

    const trail = addMesh(
      arm,
      new THREE.PlaneGeometry(armLen * 0.85, 0.14),
      glowMat(palette.glow, 0.28),
      armLen * 0.42,
      0,
      0,
      false
    );
    trail.userData.isArmTrail = true;
    if (isJump) trail.rotation.y = Math.PI / 2;
    else trail.rotation.x = Math.PI / 2;
  }

  const hubGlow = addMesh(
    hub,
    new THREE.SphereGeometry(0.09, 8, 8),
    glowMat(palette.core, 0.75),
    0,
    0,
    0,
    false
  );
  hubGlow.userData.isHubGlow = true;
}

function buildPlasmaConduit(
  parent: THREE.Object3D,
  cableSpan: number,
  barY: number,
  palette: BarPalette,
  isJump: boolean
): { barrierMesh: THREE.Mesh; glowMesh: THREE.Mesh } {
  const seg = IS_MOBILE ? 10 : 14;

  const barrierMesh = addMesh(
    parent,
    new THREE.CylinderGeometry(isJump ? 0.055 : 0.072, isJump ? 0.055 : 0.072, cableSpan, seg),
    mat('#111820', {
      metalness: 0.9,
      roughness: 0.15,
      emissive: palette.wire,
      emissiveIntensity: isJump ? 0.35 : 0.55,
    }),
    0,
    barY,
    0
  );
  barrierMesh.rotation.z = Math.PI / 2;

  const glowMesh = addMesh(
    parent,
    new THREE.CylinderGeometry(isJump ? 0.095 : 0.12, isJump ? 0.095 : 0.12, cableSpan - 0.02, seg),
    glowMat(palette.glow, isJump ? 0.42 : 0.58),
    0,
    barY,
    0,
    false
  );
  glowMesh.rotation.z = Math.PI / 2;

  const coreBeam = addMesh(
    parent,
    new THREE.CylinderGeometry(0.025, 0.025, cableSpan - 0.08, 6),
    glowMat(palette.core, 0.9),
    0,
    barY,
    0.02,
    false
  );
  coreBeam.rotation.z = Math.PI / 2;
  coreBeam.userData.isCoreBeam = true;

  return { barrierMesh, glowMesh };
}

function buildTravelingRings(
  parent: THREE.Object3D,
  cableSpan: number,
  barY: number,
  palette: BarPalette
): THREE.Mesh[] {
  const rings: THREE.Mesh[] = [];
  const count = IS_MOBILE ? 3 : 5;
  const half = cableSpan / 2;
  for (let i = 0; i < count; i++) {
    const ring = addMesh(
      parent,
      new THREE.TorusGeometry(0.11, 0.018, 6, IS_MOBILE ? 8 : 12),
      glowMat(i % 2 === 0 ? palette.sparkA : palette.sparkB, 0.55),
      -half + (i / (count - 1 || 1)) * cableSpan,
      barY,
      0.04,
      false
    );
    ring.rotation.y = Math.PI / 2;
    ring.userData.isOrbitRing = true;
    ring.userData.orbitPhase = i * 1.7;
    ring.userData.orbitHalf = half;
    rings.push(ring);
  }
  return rings;
}

function buildSparkField(
  parent: THREE.Object3D,
  cableSpan: number,
  barY: number,
  palette: BarPalette
): THREE.Mesh[] {
  const sparks: THREE.Mesh[] = [];
  const half = cableSpan / 2;
  const sparkCount = IS_MOBILE ? 6 : 10;
  for (let i = 0; i < sparkCount; i++) {
    const t = sparkCount > 1 ? i / (sparkCount - 1) : 0.5;
    const sx = -half + 0.2 + t * (cableSpan - 0.4);
    const spark = addMesh(
      parent,
      new THREE.SphereGeometry(0.022 + (i % 3) * 0.01, 6, 6),
      glowMat(i % 2 === 0 ? palette.sparkA : palette.sparkB, 0.75),
      sx,
      barY + (i % 2) * 0.06 - 0.03,
      (i % 3 - 1) * 0.05,
      false
    );
    spark.userData.isSpark = true;
    spark.userData.sparkPhase = i;
    spark.userData.baseY = spark.position.y;
    sparks.push(spark);
  }

  const arcCount = IS_MOBILE ? 3 : 5;
  for (let i = 0; i < arcCount; i++) {
    const arc = addMesh(
      parent,
      new THREE.PlaneGeometry(0.35, 0.07),
      glowMat(palette.arc, 0.5),
      -half * 0.7 + i * (cableSpan / (arcCount - 0.5 || 1)),
      barY - 0.14,
      0.08,
      false
    );
    arc.userData.isArc = true;
    arc.userData.sparkPhase = i + 0.5;
    sparks.push(arc);
  }

  return sparks;
}

function buildWarningGlyphs(
  parent: THREE.Object3D,
  half: number,
  barY: number,
  clearance: BarClearance,
  palette: BarPalette
): THREE.Object3D[] {
  const glyphs: THREE.Object3D[] = [];
  const isJump = clearance === 'jump';

  for (const side of [-1, 1] as const) {
    const g = new THREE.Group();
    g.position.set(side * half * 0.55, barY + (isJump ? 0.55 : -0.35), 0.15);
    parent.add(g);

    const plate = addMesh(
      g,
      new THREE.BoxGeometry(0.42, 0.42, 0.04),
      mat('#263238', { metalness: 0.7, emissive: palette.wire, emissiveIntensity: 0.4 }),
      0,
      0,
      0
    );

    const arrow = addMesh(
      g,
      new THREE.ConeGeometry(0.12, 0.22, 4),
      glowMat(palette.core, 0.9),
      0,
      isJump ? 0.08 : -0.08,
      0.04,
      false
    );
    if (!isJump) arrow.rotation.x = Math.PI;
    arrow.userData.isWarningArrow = true;

    g.userData.isWarningGlyph = true;
    g.userData.glyphPhase = side;
    glyphs.push(g);
  }

  return glyphs;
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
  rotors: THREE.Group[];
  orbitRings: THREE.Mesh[];
  floorPulse: THREE.Mesh[];
  warningGlyphs: THREE.Object3D[];
} {
  const assembly = new THREE.Group();
  parent.add(assembly);

  const isJump = clearance === 'jump';
  const barY = isJump ? 0.48 : 1.82;
  const half = cableSpan / 2;

  const floorPulse = buildFloorZone(assembly, cableSpan, palette, clearance);

  for (const x of [-half, half]) {
    buildEnergyPillar(assembly, x, barY, clearance, palette);
  }

  const { barrierMesh, glowMesh } = buildPlasmaConduit(assembly, cableSpan, barY, palette, isJump);

  const rotors: THREE.Group[] = [];
  for (const x of [-half, half]) {
    const hub = new THREE.Group();
    hub.position.set(x, barY, 0);
    assembly.add(hub);
    buildRotorArms(hub, Math.min(half * 0.55, 1.35), palette, isJump, x < 0 ? 1 : -1);
    rotors.push(hub);
  }

  const orbitRings = buildTravelingRings(assembly, cableSpan, barY, palette);
  const sparks = buildSparkField(assembly, cableSpan, barY, palette);
  const warningGlyphs = buildWarningGlyphs(assembly, half, barY, clearance, palette);

  return {
    assembly,
    barrierMesh,
    glowMesh,
    sparks,
    rotors,
    orbitRings,
    floorPulse,
    warningGlyphs,
  };
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

  const built = buildBarAssembly(mesh, cableSpan, clearance, palette);
  built.assembly.position.x = motion === 'sweep' ? (Math.random() < 0.5 ? -5.2 : 5.2) : centerX;

  scene.add(mesh);

  return {
    mesh,
    barAssembly: built.assembly,
    z,
    x: centerX,
    span,
    clearance,
    motion,
    laneXs,
    resolved: false,
    penalized: false,
    barrierMesh: built.barrierMesh,
    glowMesh: built.glowMesh,
    sparks: built.sparks,
    rotors: built.rotors,
    orbitRings: built.orbitRings,
    floorPulse: built.floorPulse,
    warningGlyphs: built.warningGlyphs,
    sweepStarted: false,
    sweepTelegraphed: false,
    sweepT0: 0,
    sweepDir: Math.random() < 0.5 ? 1 : -1,
    styleAwarded: false,
  };
}

function animateBarVisuals(bar: ElectricBarEntity, time: number): void {
  const isSlide = bar.clearance === 'slide';
  const telegraphBoost = bar.motion === 'sweep' && bar.sweepTelegraphed && !bar.sweepStarted ? 0.45 : 0;
  const pulse = 0.5 + Math.sin(time * 8 + bar.z * 0.2) * 0.5;

  const glowMat = bar.glowMesh.material as THREE.MeshBasicMaterial;
  glowMat.opacity = (isSlide ? 0.52 : 0.42) + pulse * 0.18 + telegraphBoost;

  const barMat = bar.barrierMesh.material as THREE.MeshStandardMaterial;
  barMat.emissiveIntensity =
    (isSlide ? 0.45 : 0.28) + Math.abs(Math.sin(time * 11 + bar.z * 0.3)) * 0.4 + telegraphBoost * 0.6;

  const spinSpeed = (isSlide ? 2.8 : 3.6) + telegraphBoost * 2;
  for (const rotor of bar.rotors) {
    const sign = (rotor.userData.spinSign as number) ?? 1;
    const axis = rotor.userData.spinAxis as string;
    if (axis === 'y') rotor.rotation.y = sign * time * spinSpeed;
    else rotor.rotation.z = sign * time * spinSpeed;
  }

  for (const ring of bar.orbitRings) {
    const phase = (ring.userData.orbitPhase as number) ?? 0;
    const half = (ring.userData.orbitHalf as number) ?? 2;
    ring.position.x = Math.sin(time * 2.2 + phase) * half * 0.85;
    ring.rotation.x = Math.PI / 2 + Math.sin(time * 3 + phase) * 0.35;
    ring.rotation.z = time * 1.5 + phase;
    const m = ring.material as THREE.MeshBasicMaterial;
    m.opacity = 0.35 + Math.abs(Math.sin(time * 5 + phase)) * 0.35 + telegraphBoost * 0.3;
  }

  for (const fp of bar.floorPulse) {
    const m = fp.material as THREE.MeshBasicMaterial;
    m.opacity = 0.4 + pulse * 0.3 + telegraphBoost * 0.25;
    fp.rotation.z = time * 0.6;
    fp.scale.setScalar(1 + pulse * 0.06 + telegraphBoost * 0.08);
  }

  for (const g of bar.warningGlyphs) {
    const phase = (g.userData.glyphPhase as number) ?? 0;
    g.position.y += Math.sin(time * 4 + phase) * 0.0008;
    g.rotation.y = Math.sin(time * 2 + phase) * 0.12;
  }

  bar.barAssembly.traverse((c) => {
    if (!(c instanceof THREE.Mesh)) return;
    const phase = (c.userData.sparkPhase as number) ?? (c.userData.corePhase as number) ?? 0;

    if (c.userData.isCore) {
      c.rotation.y = time * 2.5;
      c.rotation.x = Math.sin(time * 3 + phase) * 0.4;
      const m = c.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = 0.75 + pulse * 0.45 + telegraphBoost * 0.4;
      c.scale.setScalar(1 + pulse * 0.12);
    }
    if (c.userData.isPillarRing) {
      c.rotation.z = time * (1.5 + phase * 0.1);
    }
    if (c.userData.isCoreBeam) {
      const m = c.material as THREE.MeshBasicMaterial;
      m.opacity = 0.65 + pulse * 0.35;
    }
    if (c.userData.isArmTip) {
      const m = c.material as THREE.MeshBasicMaterial;
      m.opacity = 0.55 + Math.abs(Math.sin(time * 18 + phase)) * 0.45;
      c.scale.setScalar(1 + Math.sin(time * 12 + phase) * 0.2);
    }
    if (c.userData.isArmTrail) {
      const m = c.material as THREE.MeshBasicMaterial;
      m.opacity = 0.15 + Math.abs(Math.sin(time * 10 + phase)) * 0.25;
    }
    if (c.userData.isSpark) {
      const m = c.material as THREE.MeshBasicMaterial;
      m.opacity = 0.35 + Math.abs(Math.sin(time * 16 + phase * 2.1)) * 0.55 + telegraphBoost * 0.3;
      c.position.y = (c.userData.baseY as number) + Math.sin(time * 20 + phase) * 0.025;
    }
    if (c.userData.isArc) {
      const m = c.material as THREE.MeshBasicMaterial;
      m.opacity = 0.12 + Math.abs(Math.sin(time * 9 + phase * 1.7)) * 0.48 + telegraphBoost * 0.35;
      c.scale.x = 0.6 + Math.abs(Math.sin(time * 13 + phase)) * 0.65;
      c.rotation.z = Math.sin(time * 6 + phase) * 0.45;
    }
    if (c.userData.isChevron) {
      const m = c.material as THREE.MeshBasicMaterial;
      m.opacity = 0.35 + pulse * 0.35;
    }
    if (c.userData.isWarningArrow) {
      const m = c.material as THREE.MeshBasicMaterial;
      m.opacity = 0.6 + Math.abs(Math.sin(time * 6 + phase)) * 0.4;
    }
  });
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
