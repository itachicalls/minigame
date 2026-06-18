import * as THREE from 'three';
import { addMesh, mat, type LimbSet } from './ModelUtils';

export type AlienRig = THREE.Group & { userData: { limbs: LimbSet; bobPhase: number; antenna?: THREE.Object3D } };

function addAlienFace(parent: THREE.Object3D, sc: number, layout: 'triple' | 'dual' | 'boss', glow: string): void {
  addAlienEyes(parent, sc, layout, glow);
  for (const sx of [-1, 1]) {
    addMesh(parent, new THREE.BoxGeometry(0.08 * sc, 0.025 * sc, 0.02 * sc), mat('#2E7D32'), sx * 0.12 * sc, 0.2 * sc, 0.24 * sc);
  }
  addMesh(parent, new THREE.SphereGeometry(0.04 * sc, 6, 6), mat('#689F38'), 0, 0.02 * sc, 0.26 * sc);
  for (const sx of [-1, 1]) {
    addMesh(parent, new THREE.SphereGeometry(0.035 * sc, 6, 6), mat('#558B2F', { emissive: '#33691E', emissiveIntensity: 0.2 }), sx * 0.18 * sc, -0.02 * sc, 0.18 * sc);
  }
}

function addAlienEyes(parent: THREE.Object3D, sc: number, layout: 'triple' | 'dual' | 'boss', glow: string): void {
  const eyeMat = mat('#111', { emissive: glow, emissiveIntensity: 1.1 });
  const lid = mat('#2E7D32', { roughness: 0.7 });

  if (layout === 'triple') {
    for (const [ex, ey, es] of [[0, 0.12, 1], [-0.13, 0.06, 0.85], [0.13, 0.06, 0.85]] as const) {
      addMesh(parent, new THREE.SphereGeometry(0.09 * sc * es, 10, 10), lid, ex * sc, ey * sc, 0.2 * sc);
      addMesh(parent, new THREE.SphereGeometry(0.055 * sc * es, 8, 8), eyeMat, ex * sc, ey * sc, 0.28 * sc);
    }
  } else if (layout === 'dual') {
    for (const sx of [-1, 1]) {
      addMesh(parent, new THREE.SphereGeometry(0.1 * sc, 10, 10), lid, sx * 0.15 * sc, 0.1 * sc, 0.2 * sc);
      addMesh(parent, new THREE.SphereGeometry(0.065 * sc, 8, 8), eyeMat, sx * 0.15 * sc, 0.1 * sc, 0.29 * sc);
    }
  } else {
    for (const [ex, ey] of [[-0.18, 0.15], [0, 0.22], [0.18, 0.15], [-0.1, -0.02], [0.1, -0.02]] as const) {
      addMesh(parent, new THREE.SphereGeometry(0.08 * sc, 8, 8), eyeMat, ex * sc, ey * sc, 0.38 * sc);
    }
  }
}

function addMouth(parent: THREE.Object3D, sc: number, wide: number, dark = '#1B0505'): THREE.Mesh {
  const mouth = addMesh(
    parent,
    new THREE.BoxGeometry(wide * sc, 0.05 * sc, 0.05 * sc),
    mat(dark, { emissive: '#4E0202', emissiveIntensity: 0.25 }),
    0,
    -0.08 * sc,
    0.22 * sc
  );
  for (let i = 0; i < 6; i++) {
    addMesh(
      mouth,
      new THREE.ConeGeometry(0.012 * sc, 0.035 * sc, 4),
      mat('#ECEFF1'),
      (-0.1 + i * 0.04) * sc,
      0.02 * sc,
      0.03 * sc
    );
  }
  return mouth;
}

function addArm(parent: THREE.Object3D, side: number, sc: number, skin: THREE.Material, claw = false, long = false): THREE.Group {
  const arm = new THREE.Group();
  arm.position.set(side * 0.3 * sc, 0.08 * sc, 0);
  addMesh(arm, new THREE.CapsuleGeometry(0.055 * sc, long ? 0.26 : 0.18, 4, 6), skin, 0, -0.1 * sc, 0);
  addMesh(arm, new THREE.CapsuleGeometry(0.048 * sc, long ? 0.2 : 0.14, 4, 6), skin, 0, -0.3 * sc, 0);
  const hand = addMesh(arm, new THREE.SphereGeometry(0.065 * sc, 8, 8), skin, 0, -0.44 * sc, 0);
  if (claw) {
    for (const f of [-0.05, -0.015, 0.02, 0.055]) {
      addMesh(hand, new THREE.ConeGeometry(0.012 * sc, 0.07 * sc, 4), mat('#C5E1A5'), f * sc, -0.04 * sc, 0.03 * sc);
    }
  } else {
    for (const f of [-0.035, 0, 0.035]) {
      addMesh(hand, new THREE.CapsuleGeometry(0.012 * sc, 0.04 * sc, 3, 4), skin, f * sc, -0.05 * sc, 0.02 * sc);
    }
  }
  parent.add(arm);
  return arm;
}

function addLeg(parent: THREE.Object3D, side: number, sc: number, skin: THREE.Material, boot: THREE.Material): THREE.Group {
  const leg = new THREE.Group();
  leg.position.set(side * 0.13 * sc, -0.02 * sc, 0);
  addMesh(leg, new THREE.CapsuleGeometry(0.065 * sc, 0.2 * sc, 4, 6), skin, 0, -0.12 * sc, 0);
  addMesh(leg, new THREE.CapsuleGeometry(0.055 * sc, 0.18 * sc, 4, 6), skin, 0, -0.34 * sc, 0);
  addMesh(leg, new THREE.BoxGeometry(0.13 * sc, 0.06 * sc, 0.2 * sc), boot, 0, -0.48 * sc, 0.04 * sc);
  parent.add(leg);
  return leg;
}

function addSpots(parent: THREE.Object3D, sc: number, count: number): void {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    addMesh(
      parent,
      new THREE.SphereGeometry(0.025 * sc, 6, 6),
      mat('#33691E', { emissive: '#1B5E20', emissiveIntensity: 0.15 }),
      Math.cos(a) * 0.22 * sc,
      0.15 * sc + Math.sin(a * 2) * 0.08 * sc,
      Math.sin(a) * 0.18 * sc
    );
  }
}

function buildGrunt(sc: number): AlienRig {
  const g = new THREE.Group() as AlienRig;
  const skin = mat('#7CB342', { emissive: '#33691E', emissiveIntensity: 0.18, roughness: 0.55 });
  const belly = mat('#C5E1A5');
  const vest = mat('#558B2F', { roughness: 0.75 });
  const boot = mat('#1B5E20');

  // Lean body — capsule torso + round belly (not stacked blobs)
  addMesh(g, new THREE.CapsuleGeometry(0.16 * sc, 0.38 * sc, 6, 10), skin, 0, 0.52 * sc, 0);
  addMesh(g, new THREE.SphereGeometry(0.22 * sc, 12, 10), belly, 0, 0.48 * sc, 0.06 * sc);
  addMesh(g, new THREE.BoxGeometry(0.34 * sc, 0.28 * sc, 0.12 * sc), vest, 0, 0.58 * sc, -0.02 * sc);

  const head = new THREE.Group();
  head.position.y = 0.82 * sc;
  g.add(head);
  addMesh(head, new THREE.SphereGeometry(0.28 * sc, 14, 12), skin, 0, 0.22 * sc, 0);
  head.scale.set(1.05, 0.95, 1.1);
  addSpots(head, sc, 5);
  addAlienFace(head, sc, 'triple', '#76FF03');
  const mouth = addMouth(head, sc, 0.16);

  const antenna = new THREE.Group();
  antenna.position.y = 0.48 * sc;
  addMesh(antenna, new THREE.CylinderGeometry(0.015 * sc, 0.02 * sc, 0.22 * sc, 6), skin, 0, 0.12 * sc, 0);
  addMesh(antenna, new THREE.SphereGeometry(0.05 * sc, 8, 8), mat('#FFEB3B', { emissive: '#FFC107', emissiveIntensity: 1 }), 0, 0.26 * sc, 0);
  head.add(antenna);

  // Package steal sack
  addMesh(g, new THREE.SphereGeometry(0.14 * sc, 10, 8), mat('#FF8F00', { emissive: '#FF6F00', emissiveIntensity: 0.4 }), -0.28 * sc, 0.62 * sc, -0.08 * sc);
  addMesh(g, new THREE.CylinderGeometry(0.02 * sc, 0.02 * sc, 0.2 * sc, 4), mat('#5D4037'), -0.22 * sc, 0.72 * sc, 0);

  const limbs: LimbSet = {
    leftArm: addArm(g, -1, sc, skin, true),
    rightArm: addArm(g, 1, sc, skin, true),
    leftLeg: addLeg(g, -1, sc, skin, boot),
    rightLeg: addLeg(g, 1, sc, skin, boot),
    mouth,
    head,
  };
  g.userData = { limbs, bobPhase: Math.random() * 6, antenna };
  return g;
}

function buildRaider(sc: number): AlienRig {
  const g = new THREE.Group() as AlienRig;
  const skin = mat('#689F38', { emissive: '#33691E', emissiveIntensity: 0.22 });
  const armor = mat('#37474F', { metalness: 0.65, roughness: 0.35 });
  const armorGlow = mat('#FF5252', { emissive: '#D50000', emissiveIntensity: 0.55 });
  const boot = mat('#212121', { metalness: 0.4 });

  addMesh(g, new THREE.CapsuleGeometry(0.18 * sc, 0.48 * sc, 6, 10), skin, 0, 0.58 * sc, 0);
  addMesh(g, new THREE.BoxGeometry(0.38 * sc, 0.32 * sc, 0.2 * sc), armor, 0, 0.62 * sc, 0);
  for (const sx of [-1, 1]) {
    addMesh(g, new THREE.BoxGeometry(0.1 * sc, 0.14 * sc, 0.12 * sc), armorGlow, sx * 0.22 * sc, 0.78 * sc, 0.02 * sc);
  }

  const head = new THREE.Group();
  head.position.y = 0.98 * sc;
  g.add(head);
  addMesh(head, new THREE.SphereGeometry(0.22 * sc, 12, 10), skin, 0, 0.18 * sc, 0);
  head.scale.set(0.85, 1.2, 0.8);
  addMesh(head, new THREE.ConeGeometry(0.06 * sc, 0.22 * sc, 4), armor, -0.18 * sc, 0.42 * sc, 0);
  addMesh(head, new THREE.ConeGeometry(0.06 * sc, 0.22 * sc, 4), armor, 0.18 * sc, 0.42 * sc, 0);
  addMesh(head, new THREE.BoxGeometry(0.32 * sc, 0.08 * sc, 0.1 * sc), armor, 0, 0.08 * sc, 0.14 * sc);
  addAlienFace(head, sc, 'dual', '#FF1744');
  const mouth = addMouth(head, sc, 0.12, '#0A0000');
  mouth.scale.x = 0.75;

  // Energy blade on arm
  addMesh(g, new THREE.BoxGeometry(0.04 * sc, 0.04 * sc, 0.45 * sc), mat('#00E5FF', { emissive: '#00B0FF', emissiveIntensity: 1.2 }), 0.38 * sc, 0.42 * sc, 0.15 * sc);

  const limbs: LimbSet = {
    leftArm: addArm(g, -1, sc, skin, true, true),
    rightArm: addArm(g, 1, sc, skin, true, true),
    leftLeg: addLeg(g, -1, sc, skin, boot),
    rightLeg: addLeg(g, 1, sc, skin, boot),
    mouth,
    head,
  };
  g.userData = { limbs, bobPhase: Math.random() * 6 };
  return g;
}

function buildBoss(sc: number): AlienRig {
  const g = new THREE.Group() as AlienRig;
  const skin = mat('#6A1B9A', { emissive: '#4A148C', emissiveIntensity: 0.4 });
  const robe = mat('#311B92', { roughness: 0.8 });
  const gold = mat('#FFD54F', { emissive: '#FFA000', emissiveIntensity: 0.45, metalness: 0.5 });
  const boot = mat('#1A0033');

  addMesh(g, new THREE.CylinderGeometry(0.42 * sc, 0.55 * sc, 0.75 * sc, 14), robe, 0, 0.48 * sc, 0);
  addMesh(g, new THREE.TorusGeometry(0.5 * sc, 0.06 * sc, 8, 24), gold, 0, 0.48 * sc, 0);
  addMesh(g, new THREE.CapsuleGeometry(0.22 * sc, 0.35 * sc, 6, 10), skin, 0, 0.92 * sc, 0);

  const head = new THREE.Group();
  head.position.y = 1.18 * sc;
  g.add(head);
  addMesh(head, new THREE.SphereGeometry(0.42 * sc, 16, 14), skin, 0, 0.32 * sc, 0);
  head.scale.set(1.15, 1, 1.05);
  addMesh(head, new THREE.TorusGeometry(0.38 * sc, 0.04 * sc, 6, 16), gold, 0, 0.55 * sc, 0);
  for (const sx of [-1, 0, 1]) {
    addMesh(head, new THREE.ConeGeometry(0.05 * sc, 0.18 * sc, 4), gold, sx * 0.16 * sc, 0.62 * sc, 0);
  }
  addAlienFace(head, sc, 'boss', '#FF1744');
  const mouth = addMouth(head, sc, 0.28, '#12000A');
  addMesh(head, new THREE.BoxGeometry(0.5 * sc, 0.06 * sc, 0.04 * sc), mat('#4A148C'), 0, -0.12 * sc, 0.4 * sc);

  // Cape
  addMesh(g, new THREE.BoxGeometry(0.9 * sc, 0.55 * sc, 0.06 * sc), mat('#4A148C', { emissive: '#311B92', emissiveIntensity: 0.2 }), 0, 0.55 * sc, -0.18 * sc);

  const limbs: LimbSet = {
    leftArm: addArm(g, -1.15, sc, skin, true, true),
    rightArm: addArm(g, 1.15, sc, skin, true, true),
    leftLeg: addLeg(g, -1.1, sc, skin, boot),
    rightLeg: addLeg(g, 1.1, sc, skin, boot),
    mouth,
    head,
  };
  addArm(g, -1.35, sc, skin, true, true);
  addArm(g, 1.35, sc, skin, true, true);
  g.userData = { limbs, bobPhase: Math.random() * 6 };
  return g;
}

function buildUFO(sc: number): THREE.Group {
  const g = new THREE.Group();
  addMesh(
    g,
    new THREE.CylinderGeometry(0.5 * sc, 0.72 * sc, 0.16 * sc, 24),
    mat('#546E7A', { metalness: 0.85, roughness: 0.2, emissive: '#00E676', emissiveIntensity: 0.3 }),
    0,
    2.15 * sc,
    0
  );
  addMesh(
    g,
    new THREE.TorusGeometry(0.62 * sc, 0.04 * sc, 8, 32),
    mat('#00E676', { emissive: '#69F0AE', emissiveIntensity: 0.9 }),
    0,
    2.08 * sc,
    0
  );
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    addMesh(
      g,
      new THREE.SphereGeometry(0.05 * sc, 8, 8),
      mat('#FFEB3B', { emissive: '#FFC107', emissiveIntensity: 1 }),
      Math.cos(a) * 0.55 * sc,
      2.06 * sc,
      Math.sin(a) * 0.55 * sc
    );
  }
  addMesh(
    g,
    new THREE.SphereGeometry(0.28 * sc, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    mat('#80DEEA', { transparent: true, opacity: 0.75, emissive: '#00BCD4', emissiveIntensity: 0.65 }),
    0,
    2.28 * sc,
    0
  );

  const pilot = buildGrunt(0.4 * sc);
  pilot.position.set(0, 2.08 * sc, 0);
  g.add(pilot);

  const beam = addMesh(
    g,
    new THREE.CylinderGeometry(0.03 * sc, 0.38 * sc, 1.5 * sc, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: '#69F0AE', transparent: true, opacity: 0.25, side: THREE.DoubleSide }),
    0,
    1.25 * sc,
    0,
    false
  );
  beam.userData.isBeam = true;
  return g;
}

export function buildAlien(type: 'pickpocket' | 'rival' | 'drone' | 'boss', sc: number): THREE.Group {
  switch (type) {
    case 'pickpocket':
      return buildGrunt(sc);
    case 'rival':
      return buildRaider(sc);
    case 'boss':
      return buildBoss(sc);
    case 'drone':
      return buildUFO(sc);
  }
}

export function animateAlienRig(rig: THREE.Group, time: number, active: boolean): void {
  const data = (rig as AlienRig).userData;
  if (!data?.limbs) return;

  const { limbs, bobPhase, antenna } = data;
  const t = time * (active ? 10 : 4) + bobPhase;
  const swing = active ? 0.55 : 0.2;

  limbs.leftArm.rotation.x = Math.sin(t) * swing;
  limbs.rightArm.rotation.x = -Math.sin(t) * swing;
  limbs.leftLeg.rotation.x = -Math.sin(t) * swing * 0.8;
  limbs.rightLeg.rotation.x = Math.sin(t) * swing * 0.8;

  if (limbs.head) limbs.head.rotation.y = Math.sin(time * 2 + bobPhase) * (active ? 0.22 : 0.08);
  if (limbs.mouth) {
    limbs.mouth.scale.y = 1 + Math.abs(Math.sin(time * 8 + bobPhase)) * (active ? 0.85 : 0.3);
  }
  if (antenna) antenna.rotation.z = Math.sin(time * 5 + bobPhase) * 0.15;

  rig.position.y = Math.sin(time * (active ? 8 : 3) + bobPhase) * (active ? 0.07 : 0.025);
}

export function animateUFO(rig: THREE.Group, time: number): void {
  rig.position.y = Math.sin(time * 4) * 0.18;
  rig.rotation.y = time * 0.8;
  rig.traverse((c) => {
    if (c instanceof THREE.Mesh && c.userData.isBeam) {
      c.material.opacity = 0.18 + Math.sin(time * 6) * 0.14;
    }
  });
}
