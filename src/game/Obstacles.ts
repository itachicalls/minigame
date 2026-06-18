import * as THREE from 'three';
import { addMesh, mat, disposeObject3D } from './ModelUtils';
import { isNearZ } from './platform';

export type ObstacleKind = 'barricade' | 'pod' | 'cones' | 'debris';

export type ObstacleEntity = {
  mesh: THREE.Group;
  x: number;
  z: number;
  kind: ObstacleKind;
  radius: number;
  hit: boolean;
};

function addReflectiveStripe(parent: THREE.Object3D, w: number, h: number, y: number, z: number): void {
  for (let i = 0; i < 3; i++) {
    addMesh(
      parent,
      new THREE.BoxGeometry(w, h, 0.02),
      mat(i % 2 === 0 ? '#FFEB3B' : '#212121', { emissive: i % 2 === 0 ? '#FFC107' : '#000', emissiveIntensity: i % 2 === 0 ? 0.35 : 0 }),
      0,
      y + i * (h + 0.02),
      z
    );
  }
}

export function createObstacle(scene: THREE.Scene, type: ObstacleKind, x: number, z: number): ObstacleEntity {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  switch (type) {
    case 'barricade': {
      const frame = mat('#FF6F00', { emissive: '#E65100', emissiveIntensity: 0.15, roughness: 0.6 });
      const leg = mat('#37474F', { metalness: 0.5 });
      // A-frame legs
      for (const sx of [-1, 1]) {
        const legG = new THREE.Group();
        legG.position.set(sx * 0.95, 0, 0);
        legG.rotation.z = sx * 0.12;
        addMesh(legG, new THREE.BoxGeometry(0.08, 1.05, 0.08), leg, 0, 0.52, 0);
        addMesh(legG, new THREE.BoxGeometry(0.12, 0.06, 0.12), mat('#FFD54F', { emissive: '#FFC107', emissiveIntensity: 0.5 }), 0, 1.02, 0);
        group.add(legG);
      }
      addMesh(group, new THREE.BoxGeometry(2.1, 0.08, 0.1), frame, 0, 0.95, 0);
      addMesh(group, new THREE.BoxGeometry(2.0, 0.75, 0.06), mat('#FFF', { roughness: 0.4 }), 0, 0.52, 0.04);
      addReflectiveStripe(group, 1.85, 0.14, 0.28, 0.08);
      addReflectiveStripe(group, 1.85, 0.14, 0.58, 0.08);
      addMesh(group, new THREE.BoxGeometry(0.35, 0.12, 0.08), mat('#212121'), 0, 0.82, 0.1);
      addMesh(group, new THREE.CylinderGeometry(0.04, 0.04, 0.08, 8), mat('#FF1744', { emissive: '#FF1744', emissiveIntensity: 0.8 }), -0.9, 1.0, 0.06);
      addMesh(group, new THREE.CylinderGeometry(0.04, 0.04, 0.08, 8), mat('#FF1744', { emissive: '#FF1744', emissiveIntensity: 0.8 }), 0.9, 1.0, 0.06);
      break;
    }
    case 'pod': {
      const shell = mat('#689F38', { emissive: '#33691E', emissiveIntensity: 0.25, roughness: 0.55 });
      const goo = mat('#76FF03', { emissive: '#64DD17', emissiveIntensity: 0.55, transparent: true, opacity: 0.75 });
      // Cracked egg pod
      addMesh(group, new THREE.SphereGeometry(0.58, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), shell, 0, 0.32, 0);
      addMesh(group, new THREE.SphereGeometry(0.38, 12, 10), mat('#AED581', { emissive: '#8BC34A', emissiveIntensity: 0.35 }), 0, 0.42, 0.05);
      for (const sx of [-1, 1]) {
        const shard = new THREE.Group();
        shard.position.set(sx * 0.35, 0.55, 0);
        shard.rotation.z = sx * 0.5;
        addMesh(shard, new THREE.BoxGeometry(0.25, 0.35, 0.06), shell, 0, 0, 0);
        group.add(shard);
      }
      // Goo puddle + tendrils
      const puddle = addMesh(group, new THREE.CircleGeometry(0.85, 20), goo, 0, 0.02, 0, false);
      puddle.rotation.x = -Math.PI / 2;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        addMesh(group, new THREE.CapsuleGeometry(0.04, 0.12, 4, 6), goo, Math.cos(a) * 0.55, 0.08, Math.sin(a) * 0.55);
      }
      addMesh(group, new THREE.SphereGeometry(0.08, 8, 8), mat('#FFEB3B', { emissive: '#FFC107', emissiveIntensity: 1 }), 0, 0.48, 0.1);
      break;
    }
    case 'cones': {
      for (const [ox, oz, rot] of [[-0.55, 0.1, 0.08], [0, 0, 0], [0.55, -0.1, -0.06]] as const) {
        const cone = new THREE.Group();
        cone.position.set(ox, 0, oz);
        cone.rotation.y = rot;
        addMesh(cone, new THREE.CylinderGeometry(0.24, 0.28, 0.07, 12), mat('#37474F'), 0, 0.035, 0);
        addMesh(cone, new THREE.ConeGeometry(0.22, 0.58, 12), mat('#FF9800', { emissive: '#F57C00', emissiveIntensity: 0.12 }), 0, 0.35, 0);
        for (let s = 0; s < 2; s++) {
          addMesh(cone, new THREE.TorusGeometry(0.18 - s * 0.06, 0.025, 6, 16), mat('#FFEB3B', { emissive: '#FFC107', emissiveIntensity: 0.4 }), 0, 0.22 + s * 0.14, 0, false);
        }
        group.add(cone);
      }
      addMesh(group, new THREE.BoxGeometry(1.6, 0.04, 0.5), mat('#546E7A', { metalness: 0.4 }), 0, 0.02, 0);
      break;
    }
    case 'debris': {
      const metal = mat('#546E7A', { metalness: 0.7, roughness: 0.35 });
      const alien = mat('#7CB342', { emissive: '#33691E', emissiveIntensity: 0.45, metalness: 0.2 });
      addMesh(group, new THREE.BoxGeometry(1.0, 0.2, 0.55), mat('#455A64', { metalness: 0.5 }), 0, 0.12, 0);
      addMesh(group, new THREE.BoxGeometry(0.5, 0.38, 0.42), metal, 0.42, 0.22, 0.18);
      addMesh(group, new THREE.TorusGeometry(0.32, 0.06, 6, 14), metal, -0.32, 0.1, -0.12);
      addMesh(group, new THREE.OctahedronGeometry(0.22, 0), alien, -0.15, 0.35, 0.22);
      addMesh(group, new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), mat('#00E676', { emissive: '#00E676', emissiveIntensity: 0.9 }), 0.2, 0.45, -0.1);
      // Smoke wisps
      for (let i = 0; i < 3; i++) {
        addMesh(
          group,
          new THREE.SphereGeometry(0.12 + i * 0.04, 8, 8),
          mat('#78909C', { transparent: true, opacity: 0.25 - i * 0.05 }),
          0.1 + i * 0.08,
          0.55 + i * 0.12,
          0.05,
          false
        );
      }
      break;
    }
  }

  scene.add(group);
  const radius = type === 'barricade' ? 1.15 : type === 'cones' ? 0.85 : 0.75;
  return { mesh: group, x, z, kind: type, radius, hit: false };
}

export function obstacleClearHeight(kind: ObstacleKind): number {
  const heights: Record<ObstacleKind, number> = {
    cones: 0.42,
    debris: 0.48,
    pod: 0.52,
    barricade: 0.82,
  };
  return heights[kind];
}

export function updateObstacles(obstacles: ObstacleEntity[], time: number, playerZ: number): void {
  for (const o of obstacles) {
    if (o.hit || !isNearZ(o.z, playerZ)) continue;
    if (o.kind === 'pod') {
      o.mesh.position.y = Math.sin(time * 3 + o.x) * 0.05;
      o.mesh.children.forEach((c, i) => {
        if (i > 1 && i < 4) c.rotation.z += Math.sin(time * 2 + i) * 0.002;
      });
    }
    if (o.kind === 'barricade') {
      o.mesh.rotation.y = Math.sin(time * 2 + o.x) * 0.015;
    }
    if (o.kind === 'debris') {
      o.mesh.children.forEach((c, i) => {
        if (i >= 5) c.position.y = 0.55 + i * 0.12 + Math.sin(time * 2 + o.z + i) * 0.04;
      });
    }
  }
}

export function disposeObstacles(obstacles: ObstacleEntity[], scene: THREE.Scene): void {
  for (const o of obstacles) {
    scene.remove(o.mesh);
    disposeObject3D(o.mesh);
  }
}
