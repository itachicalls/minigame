import * as THREE from 'three';
import { addMesh, mat, disposeObject3D } from './ModelUtils';
import { IS_MOBILE, isNearZ } from './platform';

export type PowerUpKind =
  | 'slowmo'
  | 'fastshot'
  | 'invincible'
  | 'health'
  | 'turbo'
  | 'blur';

export type PowerUpEntity = {
  mesh: THREE.Group;
  x: number;
  z: number;
  kind: PowerUpKind;
  collected: boolean;
  bobPhase: number;
  isBad: boolean;
};

const POWER_THEME: Record<
  PowerUpKind,
  { color: string; emissive: string; label: string; bad: boolean }
> = {
  slowmo: { color: '#42A5F5', emissive: '#2196F3', label: 'SLOW-MO', bad: false },
  fastshot: { color: '#FF9800', emissive: '#FF6D00', label: 'FAST SHOT', bad: false },
  invincible: { color: '#AB47BC', emissive: '#E040FB', label: 'SHIELD', bad: false },
  health: { color: '#E53935', emissive: '#FF5252', label: 'HEALTH', bad: false },
  turbo: { color: '#FF5722', emissive: '#FF1744', label: 'TURBO TRAP', bad: true },
  blur: { color: '#7E57C2', emissive: '#B388FF', label: 'GHOST TRAP', bad: true },
};

export function createPowerUp(scene: THREE.Scene, kind: PowerUpKind, x: number, z: number): PowerUpEntity {
  const theme = POWER_THEME[kind];
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const ringColor = theme.bad ? '#FF1744' : theme.emissive;
  const base = addMesh(
    group,
    new THREE.CylinderGeometry(0.55, 0.65, 0.14, IS_MOBILE ? 12 : 18),
    mat(theme.color, {
      emissive: theme.emissive,
      emissiveIntensity: theme.bad ? 0.75 : 0.55,
      metalness: 0.25,
    }),
    0,
    0.1,
    0,
    false
  );
  base.rotation.y = Math.PI / 8;

  if (kind === 'slowmo') {
    addMesh(group, new THREE.TorusGeometry(0.35, 0.06, 6, 16), mat('#E3F2FD', { emissive: '#90CAF9', emissiveIntensity: 0.6 }), 0, 0.48, 0, false);
  } else if (kind === 'fastshot') {
    addMesh(group, new THREE.ConeGeometry(0.2, 0.45, 4), mat('#FFD54F', { emissive: '#FFC107', emissiveIntensity: 0.7 }), 0, 0.45, 0, false);
  } else if (kind === 'invincible') {
    addMesh(group, new THREE.OctahedronGeometry(0.28, 0), mat('#E1BEE7', { emissive: '#EA80FC', emissiveIntensity: 0.75 }), 0, 0.45, 0, false);
  } else if (kind === 'health') {
    addMesh(group, new THREE.SphereGeometry(0.22, 10, 10), mat('#FFEBEE', { emissive: '#FF5252', emissiveIntensity: 0.8 }), 0, 0.45, 0, false);
    addMesh(group, new THREE.BoxGeometry(0.08, 0.28, 0.06), mat('#FFFFFF', { emissive: '#FF5252', emissiveIntensity: 0.5 }), 0, 0.45, 0.02, false);
    addMesh(group, new THREE.BoxGeometry(0.28, 0.08, 0.06), mat('#FFFFFF', { emissive: '#FF5252', emissiveIntensity: 0.5 }), 0, 0.45, 0.02, false);
  } else if (kind === 'turbo') {
    addMesh(group, new THREE.ConeGeometry(0.18, 0.5, 3), mat('#FF3D00', { emissive: '#FF1744', emissiveIntensity: 0.9 }), 0, 0.45, 0, false);
    addMesh(group, new THREE.BoxGeometry(0.32, 0.06, 0.06), mat('#212121'), 0, 0.62, 0, false);
  } else {
    addMesh(group, new THREE.IcosahedronGeometry(0.26, 0), mat('#D1C4E9', { emissive: '#B388FF', emissiveIntensity: 0.65, transparent: true, opacity: 0.55 }), 0, 0.45, 0, false);
    addMesh(group, new THREE.RingGeometry(0.15, 0.22, 10), mat('#FF1744', { emissive: '#FF1744', emissiveIntensity: 0.8 }), 0, 0.45, 0, false);
  }

  const ring = addMesh(
    group,
    new THREE.RingGeometry(0.62, 0.82, IS_MOBILE ? 14 : 20),
    new THREE.MeshBasicMaterial({ color: ringColor, transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
    0,
    0.03,
    0,
    false
  );
  ring.rotation.x = -Math.PI / 2;

  if (theme.bad) {
    addMesh(
      group,
      new THREE.RingGeometry(0.85, 0.92, 12),
      new THREE.MeshBasicMaterial({ color: '#FF1744', transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
      0,
      0.02,
      0,
      false
    ).rotation.x = -Math.PI / 2;
  }

  const beacon = addMesh(
    group,
    new THREE.CylinderGeometry(0.04, 0.04, 0.9, 6),
    new THREE.MeshBasicMaterial({ color: ringColor, transparent: true, opacity: 0.7 }),
    0,
    0.55,
    0,
    false
  );
  beacon.position.y = 0.55;

  scene.add(group);
  return { mesh: group, x, z, kind, collected: false, bobPhase: Math.random() * 6, isBad: theme.bad };
}

export function updatePowerUps(pickups: PowerUpEntity[], time: number, playerZ: number): void {
  for (const p of pickups) {
    if (p.collected || !isNearZ(p.z, playerZ, IS_MOBILE ? 65 : 85)) continue;
    p.mesh.position.y = 0.15 + Math.sin(time * 3 + p.bobPhase) * 0.14;
    p.mesh.rotation.y = time * 2.2;
    const ring = p.mesh.children.find((c) => c instanceof THREE.Mesh && c.geometry instanceof THREE.RingGeometry);
    if (ring) ring.scale.setScalar(1 + Math.sin(time * 5 + p.bobPhase) * 0.08);
  }
}

export function tryCollectPowerUp(
  pickups: PowerUpEntity[],
  px: number,
  pz: number,
  radius: number
): PowerUpKind | null {
  for (const p of pickups) {
    if (p.collected) continue;
    const dx = p.x - px;
    const dz = p.z - pz;
    if (dx * dx + dz * dz < radius * radius) {
      p.collected = true;
      p.mesh.visible = false;
      return p.kind;
    }
  }
  return null;
}

export function randomPowerUpKind(): PowerUpKind {
  const roll = Math.random();
  if (roll < 0.08) return 'health';
  if (roll < 0.15) return 'turbo';
  if (roll < 0.22) return 'blur';
  const good: PowerUpKind[] = ['slowmo', 'fastshot', 'invincible'];
  return good[Math.floor(Math.random() * good.length)];
}

export function disposePowerUps(pickups: PowerUpEntity[], scene: THREE.Scene): void {
  for (const p of pickups) {
    scene.remove(p.mesh);
    disposeObject3D(p.mesh);
  }
}

export const POWER_LABELS: Record<PowerUpKind, string> = {
  slowmo: 'Slow-Mo!',
  fastshot: 'Fast Shot!',
  invincible: 'Invincible!',
  health: '❤ +1 Health!',
  turbo: '⚠ Overdrive — too fast!',
  blur: '⚠ Ghosted — hard to see!',
};

export function isBadPowerUp(kind: PowerUpKind): boolean {
  return POWER_THEME[kind].bad;
}
