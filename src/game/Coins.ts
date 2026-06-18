import * as THREE from 'three';
import { IS_MOBILE, isNearZ } from './platform';

export type CoinEntity = {
  mesh: THREE.Mesh;
  z: number;
  x: number;
  collected: boolean;
};

const COIN_GEO = new THREE.CylinderGeometry(0.25, 0.25, 0.08, IS_MOBILE ? 8 : 12);
const COIN_MAT = new THREE.MeshLambertMaterial({
  color: '#FFD54F',
  emissive: '#FFA000',
  emissiveIntensity: 0.5,
});

export function createCoinLine(
  scene: THREE.Scene,
  z: number,
  count: number,
  _spread = 3
): CoinEntity[] {
  const coins: CoinEntity[] = [];
  const lanes = [-3.2, -1.6, 0, 1.6, 3.2];
  const spawnCount = IS_MOBILE ? Math.min(count, 3) : count;
  for (let i = 0; i < spawnCount; i++) {
    const x = lanes[Math.floor(Math.random() * lanes.length)];
    const mesh = new THREE.Mesh(COIN_GEO, COIN_MAT);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.set(x, 0.6, z + (i % 2) * 0.5);
    mesh.frustumCulled = true;
    scene.add(mesh);
    coins.push({ mesh, z: z + (i % 2) * 0.5, x, collected: false });
  }
  return coins;
}

export function updateCoins(coins: CoinEntity[], dt: number, time: number, playerZ: number): void {
  for (const c of coins) {
    if (c.collected || !isNearZ(c.z, playerZ)) continue;
    c.mesh.rotation.z += dt * 3;
    c.mesh.position.y = 0.6 + Math.sin(time * 5 + c.x) * 0.1;
  }
}

export function tryCollectCoin(
  coins: CoinEntity[],
  px: number,
  pz: number,
  radius: number
): number {
  let gained = 0;
  const r2 = radius * radius;
  for (const c of coins) {
    if (c.collected) continue;
    const dx = c.x - px;
    const dz = c.z - pz;
    if (dx * dx + dz * dz < r2) {
      c.collected = true;
      c.mesh.visible = false;
      gained += 5;
    }
  }
  return gained;
}

export function disposeCoins(coins: CoinEntity[], scene: THREE.Scene): void {
  for (const c of coins) {
    scene.remove(c.mesh);
  }
}
