import * as THREE from 'three';
import type { EnemyType } from '../types';
import { buildAlien, animateAlienRig, animateUFO } from './AlienModels';
import { disposeObject3D } from './ModelUtils';

export type EnemyEntity = {
  mesh: THREE.Group;
  type: EnemyType;
  count: number;
  z: number;
  active: boolean;
  defeated: boolean;
  hp: number;
  maxHp: number;
  approach: number;
  hpBar: THREE.Sprite;
  ring: THREE.Mesh;
  rigs: THREE.Group[];
};

const ALIEN_NAMES: Record<EnemyType, string> = {
  pickpocket: 'Alien Grunts',
  rival: 'Alien Raiders',
  drone: 'UFO Scouts',
  boss: 'Alien Commander',
};

const SCALE: Record<EnemyType, number> = {
  pickpocket: 1.15,
  rival: 1.3,
  drone: 1.05,
  boss: 2.0,
};

export function createEnemy(scene: THREE.Scene, type: EnemyType, count: number, z: number): EnemyEntity {
  const group = new THREE.Group();
  group.position.set(0, 0, z);

  const rigs: THREE.Group[] = [];
  const spread = Math.min(count, 20);
  const sc = SCALE[type];

  for (let i = 0; i < spread; i++) {
    const alien = buildAlien(type, sc);
    const cols = Math.min(5, Math.ceil(Math.sqrt(spread)));
    const row = Math.floor(i / cols);
    const col = i % cols;
    alien.position.set(
      (col - (cols - 1) / 2) * 1.05 * sc,
      0,
      (row - Math.floor(spread / cols) / 2) * 0.85
    );
    alien.rotation.y = (Math.random() - 0.5) * 0.4;
    rigs.push(alien);
    group.add(alien);
  }

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(3.2, 3.55, 40),
    new THREE.MeshBasicMaterial({ color: '#76FF03', transparent: true, opacity: 0.55, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  group.add(ring);

  const innerRing = new THREE.Mesh(
    new THREE.RingGeometry(2.5, 2.65, 32),
    new THREE.MeshBasicMaterial({ color: '#B2FF59', transparent: true, opacity: 0.35, side: THREE.DoubleSide })
  );
  innerRing.rotation.x = -Math.PI / 2;
  innerRing.position.y = 0.06;
  group.add(innerRing);

  const warning = makeLabel(type, count);
  warning.scale.set(5.2, 1.3, 1);
  warning.position.set(0, type === 'boss' ? 5.2 : type === 'drone' ? 4.2 : 3.6, 0);
  group.add(warning);

  const hpBar = makeHpBar();
  hpBar.position.set(0, type === 'boss' ? 5.8 : type === 'drone' ? 4.8 : 4.2, 0);
  group.add(hpBar);

  scene.add(group);

  const hpMult = type === 'boss' ? 4 : type === 'rival' ? 1.5 : 1;
  const hp = count * hpMult;

  return {
    mesh: group,
    type,
    count,
    z,
    active: false,
    defeated: false,
    hp,
    maxHp: hp,
    approach: 0,
    hpBar,
    ring,
    rigs,
  };
}

function makeLabel(type: EnemyType, count: number): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(20,60,10,0.92)';
  ctx.beginPath();
  ctx.roundRect(8, 8, 496, 112, 12);
  ctx.fill();
  ctx.strokeStyle = '#76FF03';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = '#CCFF90';
  ctx.font = 'bold 34px Segoe UI';
  ctx.textAlign = 'center';
  ctx.fillText(`${ALIEN_NAMES[type]} x${count}`, 256, 52);
  ctx.font = '22px Segoe UI';
  ctx.fillStyle = '#A5D6A7';
  ctx.fillText('Wants the package!', 256, 92);

  const tex = new THREE.CanvasTexture(canvas);
  return new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
}

function makeHpBar(): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#333';
  ctx.fillRect(0, 0, 256, 32);
  ctx.fillStyle = '#76FF03';
  ctx.fillRect(4, 4, 248, 24);
  const tex = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sprite.scale.set(4.2, 0.55, 1);
  sprite.userData.canvas = canvas;
  sprite.userData.ctx = ctx;
  return sprite;
}

export function updateHpBar(enemy: EnemyEntity): void {
  const sprite = enemy.hpBar;
  const canvas = sprite.userData.canvas as HTMLCanvasElement;
  const ctx = sprite.userData.ctx as CanvasRenderingContext2D;
  const pct = Math.max(0, enemy.hp / enemy.maxHp);
  ctx.fillStyle = '#222';
  ctx.fillRect(0, 0, 256, 32);
  ctx.fillStyle = pct > 0.3 ? '#76FF03' : '#FF1744';
  ctx.fillRect(4, 4, 248 * pct, 24);
  (sprite.material as THREE.SpriteMaterial).map!.needsUpdate = true;
}

export function updateEnemyVisuals(enemy: EnemyEntity, time: number, playerZ: number): void {
  if (enemy.defeated) return;

  const pulse = 1 + Math.sin(time * 6) * 0.1;
  enemy.ring.scale.set(pulse, pulse, 1);
  (enemy.ring.material as THREE.MeshBasicMaterial).opacity = 0.35 + Math.sin(time * 8) * 0.25;

  for (const rig of enemy.rigs) {
    if (enemy.type === 'drone') animateUFO(rig, time + rig.position.x);
    else animateAlienRig(rig, time + rig.position.x, enemy.active);
  }

  if (enemy.active && !enemy.defeated) {
    const targetZ = playerZ + 5;
    enemy.mesh.position.z += (targetZ - enemy.mesh.position.z) * 0.04;
  }
}

export function clashCombat(
  enemy: EnemyEntity,
  convoy: number,
  dt: number,
  turretDps: number
): { convoyLoss: number; done: boolean } {
  if (enemy.defeated) return { convoyLoss: 0, done: true };

  const rate = enemy.type === 'boss' ? 2.5 : 3.5;
  const clash = Math.min(convoy, enemy.hp, rate * dt);
  const enemyDamage = clash + turretDps * dt;
  const hitBack = enemy.type === 'boss' ? 2.5 : enemy.type === 'rival' ? 1.8 : 1.2;
  const convoyLoss = convoy > 0 ? Math.min(convoy, hitBack * dt) : 0;

  enemy.hp -= enemyDamage;
  updateHpBar(enemy);

  if (enemy.hp <= 0) {
    enemy.hp = 0;
    enemy.defeated = true;
    enemy.mesh.visible = false;
    return { convoyLoss, done: true };
  }
  return { convoyLoss, done: false };
}

export function disposeEnemy(enemy: EnemyEntity, scene: THREE.Scene): void {
  scene.remove(enemy.mesh);
  disposeObject3D(enemy.mesh);
}
