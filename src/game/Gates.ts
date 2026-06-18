import * as THREE from 'three';
import type { BlockerKind, GateOption } from '../types';
import { addMesh, mat } from './ModelUtils';

function addGatePillar(group: THREE.Group, x: number, accent: string): void {
  addMesh(group, new THREE.CylinderGeometry(0.2, 0.24, 4.4, 12), mat('#CFD8DC', { metalness: 0.45, roughness: 0.4 }), x, 2.2, 0);
  addMesh(group, new THREE.CylinderGeometry(0.22, 0.22, 0.12, 12), mat(accent, { emissive: accent, emissiveIntensity: 0.5 }), x, 0.06, 0);
  for (const y of [0.8, 1.6, 2.4, 3.2]) {
    addMesh(group, new THREE.BoxGeometry(0.08, 0.06, 0.08), mat(accent, { emissive: accent, emissiveIntensity: 0.85 }), x, y, 0.14);
  }
  addMesh(
    group,
    new THREE.SphereGeometry(0.26, 12, 12),
    mat('#FFD54F', { emissive: '#FFA000', emissiveIntensity: 0.65, metalness: 0.3 }),
    x,
    4.45,
    0
  );
}

export type GateEntity = {
  kind: 'route';
  mesh: THREE.Group;
  z: number;
  safeSide: 'left' | 'right';
  resolved: boolean;
  leftMesh: THREE.Group;
  rightMesh: THREE.Group;
  leftLabel: THREE.Sprite;
  rightLabel: THREE.Sprite;
  centerWall: THREE.Mesh;
  animTime: number;
};

export type BlockerEntity = {
  kind: 'blocker';
  mesh: THREE.Group;
  z: number;
  blocker: BlockerKind;
  required: number;
  packageCost: number;
  label: string;
  cleared: boolean;
  progress: number;
  barcodeMesh: THREE.Mesh;
  leftDoor: THREE.Mesh;
  rightDoor: THREE.Mesh;
  scannerBeam: THREE.Mesh;
  statusLight: THREE.Mesh;
};

export type DropoffEntity = {
  kind: 'dropoff';
  mesh: THREE.Group;
  z: number;
  reached: boolean;
  platform: THREE.Mesh;
};

const BLOCKER_THEME: Record<BlockerKind, { accent: string; light: string; door: string; labelBg: string }> = {
  scan: { accent: '#00BFA5', light: '#69F0AE', door: '#00897B', labelBg: 'rgba(0,100,85,0.92)' },
  stamp: { accent: '#9C27B0', light: '#EA80FC', door: '#6A1B9A', labelBg: 'rgba(80,20,100,0.92)' },
  ram: { accent: '#E53935', light: '#FF8A80', door: '#C62828', labelBg: 'rgba(120,20,20,0.92)' },
  toll: { accent: '#FB8C00', light: '#FFCC80', door: '#EF6C00', labelBg: 'rgba(100,50,0,0.92)' },
};

export function createRouteGate(
  scene: THREE.Scene,
  z: number,
  safeSide: 'left' | 'right'
): GateEntity {
  const group = new THREE.Group();
  group.position.set(0, 0, z);

  const leftSafe = safeSide === 'left';
  const leftLabelText = leftSafe ? '✓ SAFE PATH' : '✗ DEAD END';
  const rightLabelText = safeSide === 'right' ? '✓ SAFE PATH' : '✗ DEAD END';
  const leftColor = leftSafe ? '#43A047' : '#C62828';
  const rightColor = safeSide === 'right' ? '#1E88E5' : '#C62828';

  const leftGate = makeRouteBooth(3.2, leftLabelText, leftColor, leftSafe);
  const rightGate = makeRouteBooth(-3.2, rightLabelText, rightColor, safeSide === 'right');

  group.add(leftGate.booth, rightGate.booth, leftGate.label, rightGate.label);

  for (const [x, accent, safe] of [
    [3.2, leftColor, leftSafe],
    [-3.2, rightColor, safeSide === 'right'],
  ] as const) {
    addGatePillar(group, x, accent);
    if (!safe) {
      addMesh(
        group,
        new THREE.BoxGeometry(2.8, 3.2, 0.35),
        mat('#B71C1C', { emissive: '#FF1744', emissiveIntensity: 0.55 }),
        x,
        1.6,
        1.2
      );
    }
  }

  addMesh(
    group,
    new THREE.TorusGeometry(5.2, 0.14, 10, 32, Math.PI),
    mat('#FFD54F', { emissive: '#FFA000', emissiveIntensity: 0.45, metalness: 0.5 }),
    0,
    4.15,
    0
  );
  addMesh(group, new THREE.BoxGeometry(10.8, 0.35, 0.4), mat('#37474F', { metalness: 0.55 }), 0, 4.0, 0);

  const forkBanner = makeTextSprite('PICK A LANE — WRONG = DEATH', '#FF1744', 'rgba(80,0,0,0.92)');
  forkBanner.position.set(0, 4.8, 0);
  forkBanner.scale.set(4.5, 0.9, 1);
  group.add(forkBanner);

  for (let i = 0; i < 6; i++) {
    const chev = addMesh(
      group,
      new THREE.BoxGeometry(0.5, 0.02, 0.25),
      mat(leftSafe ? '#00E676' : '#FF1744', { emissive: leftSafe ? '#00E676' : '#FF1744', emissiveIntensity: 0.45 }),
      3.2,
      0.02,
      1.5 - i * 0.55,
      false
    );
    chev.rotation.y = Math.PI / 4;
    const chevR = addMesh(
      group,
      new THREE.BoxGeometry(0.5, 0.02, 0.25),
      mat(safeSide === 'right' ? '#00E676' : '#FF1744', { emissive: safeSide === 'right' ? '#00E676' : '#FF1744', emissiveIntensity: 0.45 }),
      -3.2,
      0.02,
      1.5 - i * 0.55,
      false
    );
    chevR.rotation.y = -Math.PI / 4;
  }

  const centerWall = addMesh(
    group,
    new THREE.BoxGeometry(2.4, 3.4, 0.55),
    mat('#37474F', { emissive: '#FFEB3B', emissiveIntensity: 0.45, metalness: 0.35 }),
    0,
    1.7,
    0.2
  );
  addMesh(group, new THREE.BoxGeometry(2.6, 0.14, 0.58), mat('#FFEB3B', { emissive: '#FFC107', emissiveIntensity: 0.75 }), 0, 3.45, 0.2);
  addMesh(
    group,
    new THREE.BoxGeometry(0.14, 3.2, 0.12),
    mat('#FF1744', { emissive: '#FF1744', emissiveIntensity: 0.8 }),
    0,
    1.6,
    0.5
  );

  const beaconL = new THREE.PointLight(leftSafe ? 0x66bb6a : 0xff1744, 1.2, 12);
  beaconL.position.set(3.2, 2.5, 0);
  group.add(beaconL);
  const beaconR = new THREE.PointLight(safeSide === 'right' ? 0x42a5f5 : 0xff1744, 1.2, 12);
  beaconR.position.set(-3.2, 2.5, 0);
  group.add(beaconR);

  scene.add(group);

  return {
    kind: 'route',
    mesh: group,
    z,
    safeSide,
    resolved: false,
    leftMesh: leftGate.booth,
    rightMesh: rightGate.booth,
    leftLabel: leftGate.label,
    rightLabel: rightGate.label,
    centerWall,
    animTime: 0,
  };
}

export function createBlocker(
  scene: THREE.Scene,
  z: number,
  blocker: BlockerKind,
  label: string,
  required = 10,
  packageCost = 0
): BlockerEntity {
  const group = new THREE.Group();
  group.position.set(0, 0, z);

  const theme = BLOCKER_THEME[blocker];

  for (const x of [-4.0, 4.0]) {
    addMesh(group, new THREE.BoxGeometry(0.45, 4.8, 0.45), mat('#455A64', { metalness: 0.6, roughness: 0.35 }), x, 2.4, 0);
    addMesh(group, new THREE.BoxGeometry(0.5, 0.15, 0.5), mat(theme.accent, { emissive: theme.accent, emissiveIntensity: 0.4 }), x, 0.08, 0);
    for (const y of [1.0, 2.0, 3.0, 4.0]) {
      addMesh(
        group,
        new THREE.BoxGeometry(0.12, 0.08, 0.06),
        mat(theme.light, { emissive: theme.light, emissiveIntensity: 0.9 }),
        x,
        y,
        0.24
      );
    }
  }

  addMesh(group, new THREE.BoxGeometry(8.6, 0.5, 0.55), mat('#546E7A', { metalness: 0.55 }), 0, 4.65, 0);
  addMesh(group, new THREE.BoxGeometry(8.2, 0.12, 0.35), mat(theme.accent, { emissive: theme.accent, emissiveIntensity: 0.35 }), 0, 4.35, 0.1);

  const labelSprite = makeTextSprite(label, '#fff', theme.labelBg);
  labelSprite.position.set(0, 5.35, 0);
  labelSprite.scale.set(5.2, 1.25, 1);
  group.add(labelSprite);

  if (packageCost > 0) {
    const costSprite = makeTextSprite(`📦 ×${packageCost} required`, '#FFD54F', 'rgba(80,40,0,0.88)');
    costSprite.position.set(0, 4.85, 0);
    costSprite.scale.set(3.5, 0.85, 1);
    group.add(costSprite);
  }

  const doorMat = mat(theme.door, { metalness: 0.25, roughness: 0.5, emissive: theme.accent, emissiveIntensity: 0.35 });
  const leftDoor = addMesh(group, new THREE.BoxGeometry(3.8, 3.6, 0.22), doorMat, -1.95, 1.85, 0);
  const rightDoor = addMesh(group, new THREE.BoxGeometry(3.8, 3.6, 0.22), doorMat, 1.95, 1.85, 0);

  for (const dx of [-1.95, 1.95]) {
    addMesh(group, new THREE.BoxGeometry(2.8, 0.08, 0.02), mat('#263238'), dx, 3.2, 0.12);
    addMesh(group, new THREE.BoxGeometry(2.8, 0.08, 0.02), mat('#263238'), dx, 1.4, 0.12);
    for (let s = 0; s < 6; s++) {
      addMesh(group, new THREE.BoxGeometry(0.35, 0.5, 0.02), mat('#37474F', { metalness: 0.5 }), dx - 1.0 + s * 0.4, 2.3, 0.13);
    }
  }

  const scannerHousing = addMesh(group, new THREE.BoxGeometry(2.2, 0.55, 0.35), mat('#263238', { metalness: 0.65 }), 0, 3.85, 0.15);
  addMesh(scannerHousing, new THREE.BoxGeometry(1.8, 0.08, 0.02), mat(theme.light, { emissive: theme.light, emissiveIntensity: 1 }), 0, 0, 0.18);

  const barcode = addMesh(group, new THREE.BoxGeometry(1.5, 0.75, 0.04), mat('#1A1A1A', { metalness: 0.2 }), 0, 2.55, 0.14);
  for (let i = 0; i < 12; i++) {
    addMesh(group, new THREE.BoxGeometry(0.06, 0.6, 0.01), mat(i % 2 === 0 ? '#FFFFFF' : '#111111'), -0.6 + i * 0.1, 2.55, 0.17);
  }

  const scannerBeam = addMesh(
    group,
    new THREE.PlaneGeometry(3.6, 0.04),
    new THREE.MeshBasicMaterial({ color: theme.light, transparent: true, opacity: 0.55 }),
    0,
    2.55,
    0.2,
    false
  );

  const statusLight = addMesh(
    group,
    new THREE.SphereGeometry(0.14, 10, 10),
    mat('#FF1744', { emissive: '#FF1744', emissiveIntensity: 1.2 }),
    3.55,
    4.65,
    0.2
  );

  addMesh(group, new THREE.BoxGeometry(8.4, 0.03, 0.12), mat('#FFD54F', { emissive: '#FFC107', emissiveIntensity: 0.25 }), 0, 0.02, 1.8);
  for (const dx of [-2.5, 0, 2.5]) {
    addMesh(group, new THREE.BoxGeometry(0.15, 0.02, 1.2), mat('#FFFFFF', { emissive: '#FFFFFF', emissiveIntensity: 0.15 }), dx, 0.02, 0.8);
  }

  if (blocker === 'stamp') {
    addMesh(group, new THREE.CylinderGeometry(0.35, 0.35, 0.12, 16), mat('#7B1FA2', { emissive: '#AB47BC', emissiveIntensity: 0.4 }), 0, 2.9, 0.25);
  } else if (blocker === 'ram') {
    addMesh(group, new THREE.ConeGeometry(0.5, 0.8, 4), mat('#FF1744', { emissive: '#D50000', emissiveIntensity: 0.35 }), 0, 0.45, 0.5);
  } else if (blocker === 'toll') {
    addMesh(group, new THREE.BoxGeometry(1.2, 0.9, 0.6), mat('#F57C00'), -3.2, 0.5, 0.4);
    addMesh(group, new THREE.CylinderGeometry(0.08, 0.08, 0.5, 8), mat('#FFD54F', { emissive: '#FFC107', emissiveIntensity: 0.6 }), -3.2, 1.1, 0.4);
  }

  const gateLight = new THREE.PointLight(theme.light, 0.9, 14);
  gateLight.position.set(0, 3, 2);
  group.add(gateLight);

  scene.add(group);

  return {
    kind: 'blocker',
    mesh: group,
    z,
    blocker,
    required,
    packageCost,
    label,
    cleared: false,
    progress: 0,
    barcodeMesh: barcode,
    leftDoor,
    rightDoor,
    scannerBeam,
    statusLight,
  };
}

export function createDropoff(scene: THREE.Scene, z: number): DropoffEntity {
  const group = new THREE.Group();
  group.position.set(0, 0, z);

  const platform = addMesh(
    group,
    new THREE.CylinderGeometry(3.5, 3.8, 0.35, 32),
    mat('#FFD54F', { emissive: '#FF8F00', emissiveIntensity: 0.5, metalness: 0.3 }),
    0,
    0.18,
    0
  );

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    addMesh(group, new THREE.CylinderGeometry(0.08, 0.08, 2), mat('#ECEFF1'), Math.cos(a) * 3.2, 1, Math.sin(a) * 3.2);
    addMesh(
      group,
      new THREE.SphereGeometry(0.1, 8, 8),
      mat('#00E676', { emissive: '#00E676', emissiveIntensity: 0.8 }),
      Math.cos(a) * 3.2,
      2.05,
      Math.sin(a) * 3.2
    );
  }

  addMesh(
    group,
    new THREE.CylinderGeometry(3.2, 3.2, 0.04, 32),
    mat('#00E676', { emissive: '#00E676', emissiveIntensity: 0.3, transparent: true, opacity: 0.4 }),
    0,
    0.36,
    0,
    false
  );

  const sign = makeTextSprite('DROP-OFF ZONE', '#FFD54F', 'rgba(0,80,0,0.88)');
  sign.position.set(0, 3.5, 0);
  sign.scale.set(5, 1.2, 1);
  group.add(sign);

  const glow = new THREE.PointLight(0xffd54f, 2, 20);
  glow.position.set(0, 4, 0);
  group.add(glow);

  scene.add(group);
  return { kind: 'dropoff', mesh: group, z, reached: false, platform };
}

function makeRouteBooth(x: number, label: string, color: string, safe: boolean) {
  const booth = new THREE.Group();
  booth.position.set(x, 0, 0);

  addMesh(booth, new THREE.BoxGeometry(2.4, 2.8, 1.1), mat('#37474F', { metalness: 0.4, roughness: 0.5 }), 0, 1.4, 0);
  addMesh(booth, new THREE.BoxGeometry(2.5, 0.15, 1.2), mat(color, { emissive: color, emissiveIntensity: safe ? 0.5 : 0.35 }), 0, 2.85, 0);
  addMesh(
    booth,
    new THREE.BoxGeometry(1.8, 1.2, 0.06),
    mat(color, { emissive: color, emissiveIntensity: safe ? 0.65 : 0.4 }),
    0,
    1.7,
    0.58
  );

  const arm = addMesh(booth, new THREE.BoxGeometry(1.6, 0.1, 0.1), mat(safe ? '#FFD54F' : '#FF1744', { emissive: safe ? '#FFC107' : '#FF1744', emissiveIntensity: 0.5 }), 0, 2.2, 0.9);
  arm.rotation.y = x > 0 ? -0.55 : 0.55;
  addMesh(
    arm,
    new THREE.SphereGeometry(0.12, 10, 10),
    mat(safe ? '#00E676' : '#FF1744', { emissive: safe ? '#00E676' : '#FF1744', emissiveIntensity: 0.85 }),
    x > 0 ? -0.75 : 0.75,
    0,
    0
  );

  addMesh(booth, new THREE.BoxGeometry(2.6, 0.08, 1.3), mat('#263238'), 0, 0.04, 0);

  const sprite = makeTextSprite(label, '#fff', safe ? 'rgba(0,80,30,0.9)' : 'rgba(100,0,0,0.92)');
  sprite.position.set(x, 3.85, 0);
  sprite.scale.set(4.2, 1, 1);

  return { booth, label: sprite };
}

function makeTextSprite(text: string, textColor: string, bg: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(8, 8, 496, 112, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = textColor;
  ctx.font = 'bold 34px Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 64);

  const tex = new THREE.CanvasTexture(canvas);
  return new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
}

export function animateGate(gate: GateEntity, time: number): void {
  gate.animTime = time;
  const pulse = 1 + Math.sin(time * 4) * 0.03;
  gate.leftMesh.scale.set(pulse, pulse, pulse);
  gate.rightMesh.scale.set(pulse, pulse, pulse);
  gate.leftLabel.position.y = 3.85 + Math.sin(time * 3) * 0.06;
  gate.rightLabel.position.y = 3.85 + Math.sin(time * 3 + 1) * 0.06;

  if (!gate.resolved) {
    gate.centerWall.visible = true;
    gate.centerWall.position.y = 1.7 + Math.sin(time * 5) * 0.04;
    (gate.centerWall.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.35 + Math.sin(time * 6) * 0.2;
  } else {
    gate.centerWall.visible = false;
  }
}

export function animateBlocker(b: BlockerEntity, time: number): void {
  if (b.cleared) return;

  const open = b.progress * 3.2;
  b.leftDoor.position.x = -1.95 - open;
  b.rightDoor.position.x = 1.95 + open;

  b.scannerBeam.position.y = 1.8 + ((Math.sin(time * 6) + 1) / 2) * 1.5;
  (b.scannerBeam.material as THREE.MeshBasicMaterial).opacity = 0.35 + Math.sin(time * 10) * 0.25;

  const scanned = b.progress > 0;
  const statusMat = b.statusLight.material as THREE.MeshStandardMaterial;
  if (b.progress >= 1) {
    statusMat.color.set('#00E676');
    statusMat.emissive.set('#00E676');
  } else if (scanned) {
    statusMat.color.set('#FFC107');
    statusMat.emissive.set('#FFC107');
  } else {
    statusMat.color.set('#FF1744');
    statusMat.emissive.set('#FF1744');
  }
  statusMat.emissiveIntensity = 0.8 + Math.sin(time * 5) * 0.4;

  if (b.barcodeMesh.material instanceof THREE.MeshStandardMaterial) {
    b.barcodeMesh.material.emissive.set(scanned ? '#00E676' : '#000000');
    b.barcodeMesh.material.emissiveIntensity = scanned ? 0.3 + Math.sin(time * 8) * 0.2 : 0;
  }
}

export function animateDropoff(d: DropoffEntity, time: number): void {
  d.platform.rotation.y = time * 0.5;
  d.platform.position.y = 0.18 + Math.sin(time * 2) * 0.06;
}

export function applyGateEffect(
  effect: GateOption['effect'],
  run: {
    convoy: number;
    maxConvoy: number;
    packages: number;
    maxPackages: number;
    coins: number;
    stamps: number;
    integrity: number;
    maxIntegrity: number;
    speed: number;
    baseSpeed: number;
    bonusRoute: boolean;
  }
): string {
  const msgs: string[] = [];
  if (effect.convoy) {
    run.convoy = Math.min(run.maxConvoy, Math.max(0, run.convoy + effect.convoy));
    msgs.push(`${effect.convoy > 0 ? '+' : ''}${effect.convoy} convoy`);
  }
  if (effect.convoyMul) {
    run.convoy = Math.min(run.maxConvoy, Math.max(1, Math.floor(run.convoy * effect.convoyMul)));
    msgs.push(`×${effect.convoyMul} convoy!`);
    run.bonusRoute = true;
  }
  if (effect.packages) {
    run.packages = Math.min(run.maxPackages, run.packages + effect.packages);
    msgs.push(`${effect.packages > 0 ? '+' : ''}${effect.packages} packages`);
  }
  if (effect.coins) {
    run.coins += effect.coins;
    msgs.push(`+${effect.coins} coins`);
  }
  if (effect.stamps) {
    run.stamps += effect.stamps;
    msgs.push(`+${effect.stamps} stamp`);
  }
  if (effect.integrity) {
    run.integrity = Math.min(run.maxIntegrity, run.integrity + effect.integrity);
    msgs.push(`+${effect.integrity} integrity`);
  }
  if (effect.speedMul) {
    run.speed = run.baseSpeed * effect.speedMul;
    msgs.push('Speed boost!');
  }
  return msgs.join(' · ') || 'Route claimed!';
}

export function disposeEntity(group: THREE.Group, scene: THREE.Scene): void {
  scene.remove(group);
  group.traverse((c: THREE.Object3D) => {
    if (c instanceof THREE.Mesh) {
      c.geometry.dispose();
      const m = c.material;
      if (Array.isArray(m)) m.forEach((x) => x.dispose());
      else m.dispose();
    }
    if (c instanceof THREE.Sprite) {
      (c.material as THREE.SpriteMaterial).map?.dispose();
      c.material.dispose();
    }
  });
}
