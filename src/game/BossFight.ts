import * as THREE from 'three';
import { addMesh, disposeObject3D, mat } from './ModelUtils';
import { buildChibiSpecies, animateAlienRig, pickSpeciesForTier, type ChibiSpecies } from './AlienModels';
import { IS_MOBILE, isNearZ } from './platform';

export type BossProjectile = {
  mesh: THREE.Mesh;
  x: number;
  z: number;
  vx: number;
  vz: number;
  life: number;
};

export type BossFightEntity = {
  mesh: THREE.Group;
  alien: THREE.Group;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  defeated: boolean;
  shootCd: number;
  minionCd: number;
  species: ChibiSpecies;
  projectiles: BossProjectile[];
  hpBar: THREE.Mesh;
  arenaRing: THREE.Mesh;
};

const BOSS_SCALE = IS_MOBILE ? 2.35 : 2.75;

function spawnProjectile(scene: THREE.Scene, boss: BossFightEntity, tx: number, tz: number): void {
  const dx = tx - boss.x;
  const dz = tz - boss.z;
  const len = Math.hypot(dx, dz) || 1;
  const speed = IS_MOBILE ? 19 : 22;
  const mesh = addMesh(
    scene,
    new THREE.SphereGeometry(0.22, IS_MOBILE ? 8 : 10, IS_MOBILE ? 8 : 10),
    mat('#FF3D00', { emissive: '#FF6D00', emissiveIntensity: 1.1, roughness: 0.35 }),
    boss.x,
    0.85,
    boss.z - 0.4,
    false
  );
  boss.projectiles.push({
    mesh,
    x: boss.x,
    z: boss.z - 0.4,
    vx: (dx / len) * speed,
    vz: (dz / len) * speed,
    life: 4,
  });
}

export function createBossFight(scene: THREE.Scene, z: number): BossFightEntity {
  const species = pickSpeciesForTier('boss');
  const mesh = new THREE.Group();
  mesh.position.set(0, 0, z);

  const arenaRing = addMesh(
    mesh,
    new THREE.RingGeometry(3.8, 4.35, IS_MOBILE ? 24 : 32),
    new THREE.MeshBasicMaterial({
      color: '#FFD54F',
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    0,
    0.03,
    0,
    false
  );
  arenaRing.rotation.x = -Math.PI / 2;

  const alien = buildChibiSpecies(species, BOSS_SCALE, 'boss');
  alien.rotation.y = Math.PI;
  mesh.add(alien);

  const hpBarBg = addMesh(
    mesh,
    new THREE.PlaneGeometry(2.4, 0.18),
    new THREE.MeshBasicMaterial({ color: '#1a1020', transparent: true, opacity: 0.75 }),
    0,
    2.15 * BOSS_SCALE,
    0.2,
    false
  );
  hpBarBg.rotation.y = Math.PI;

  const hpBar = addMesh(
    mesh,
    new THREE.PlaneGeometry(2.3, 0.12),
    new THREE.MeshBasicMaterial({ color: '#FF1744' }),
    0,
    2.15 * BOSS_SCALE,
    0.22,
    false
  );
  hpBar.rotation.y = Math.PI;

  scene.add(mesh);

  const maxHp = IS_MOBILE ? 22 : 28;
  return {
    mesh,
    alien,
    x: 0,
    z,
    hp: maxHp,
    maxHp,
    alive: true,
    defeated: false,
    shootCd: 1.2,
    minionCd: 4.5,
    species,
    projectiles: [],
    hpBar,
    arenaRing,
  };
}

export function updateBossFight(
  boss: BossFightEntity,
  scene: THREE.Scene,
  dt: number,
  time: number,
  playerX: number,
  playerZ: number,
  onMinionWave?: () => void,
  onShoot?: () => void
): void {
  if (!boss.alive || boss.defeated) return;
  if (!isNearZ(boss.z, playerZ, IS_MOBILE ? 95 : 120)) {
    boss.mesh.visible = false;
    return;
  }
  boss.mesh.visible = true;

  const face = Math.atan2(playerX - boss.x, playerZ - boss.z);
  boss.alien.rotation.y = face + Math.PI;
  animateAlienRig(boss.alien, time, true);

  const pulse = 1 + Math.sin(time * 4) * 0.04;
  boss.alien.scale.setScalar(pulse);

  const hpMat = boss.hpBar.material as THREE.MeshBasicMaterial;
  const ratio = Math.max(0, boss.hp / boss.maxHp);
  boss.hpBar.scale.x = ratio;
  boss.hpBar.position.x = -(1 - ratio) * 1.15;
  hpMat.color.set(ratio > 0.45 ? '#FF1744' : '#FF9100');

  const ringMat = boss.arenaRing.material as THREE.MeshBasicMaterial;
  ringMat.opacity = 0.22 + Math.sin(time * 3) * 0.06;

  boss.shootCd -= dt;
  if (boss.shootCd <= 0) {
    boss.shootCd = IS_MOBILE ? 2.1 : 1.75;
    spawnProjectile(scene, boss, playerX, playerZ);
    const spread = [-1.4, 0, 1.4];
    if (boss.hp < boss.maxHp * 0.55) {
      for (const off of spread) {
        spawnProjectile(scene, boss, playerX + off, playerZ);
      }
    } else {
      spawnProjectile(scene, boss, playerX + (Math.random() - 0.5) * 2.4, playerZ);
    }
    onShoot?.();
  }

  boss.minionCd -= dt;
  if (boss.minionCd <= 0) {
    boss.minionCd = IS_MOBILE ? 7 : 5.5;
    onMinionWave?.();
  }

  for (let i = boss.projectiles.length - 1; i >= 0; i--) {
    const p = boss.projectiles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.z += p.vz * dt;
    p.mesh.position.set(p.x, 0.85 + Math.sin(time * 8 + p.x) * 0.05, p.z);
    const m = p.mesh.material as THREE.MeshStandardMaterial;
    m.emissiveIntensity = 0.9 + Math.sin(time * 12) * 0.25;
    if (p.life <= 0 || p.z < playerZ - 12) {
      scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      m.dispose();
      boss.projectiles.splice(i, 1);
    }
  }
}

export function bossProjectileHitsPlayer(
  boss: BossFightEntity,
  playerX: number,
  playerZ: number,
  jumpY: number,
  isSliding: boolean
): boolean {
  if (!boss.alive || boss.defeated) return false;
  if (jumpY > 0.75 || isSliding) return false;
  for (let i = boss.projectiles.length - 1; i >= 0; i--) {
    const p = boss.projectiles[i];
    if (Math.abs(p.x - playerX) < 0.72 && Math.abs(p.z - playerZ) < 0.95) {
      return true;
    }
  }
  return false;
}

export function damageBoss(boss: BossFightEntity, amount: number): boolean {
  if (!boss.alive || boss.defeated) return false;
  boss.hp -= amount;
  if (boss.hp <= 0) {
    boss.hp = 0;
    boss.defeated = true;
    boss.alive = false;
    return true;
  }
  return false;
}

export function bossHitRadius(): number {
  return 2.1;
}

export function disposeBossFight(boss: BossFightEntity, scene: THREE.Scene): void {
  for (const p of boss.projectiles) {
    scene.remove(p.mesh);
    p.mesh.geometry.dispose();
    (p.mesh.material as THREE.Material).dispose();
  }
  boss.projectiles = [];
  scene.remove(boss.mesh);
  disposeObject3D(boss.mesh);
}
