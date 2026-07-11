import * as THREE from 'three';
import { IS_MOBILE, IS_VERY_LOW_PERF } from './platform';

const standardCache = new Map<string, THREE.MeshStandardMaterial>();
const lambertCache = new Map<string, THREE.MeshLambertMaterial>();

function matKey(color: string, opts: Partial<THREE.MeshStandardMaterialParameters>): string {
  return [
    color,
    opts.roughness ?? 0.65,
    opts.metalness ?? 0,
    opts.emissive ?? '',
    opts.emissiveIntensity ?? 0,
    opts.transparent ? 1 : 0,
    opts.opacity ?? 1,
  ].join('|');
}

export function mat(color: string, opts: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.Material {
  if (IS_VERY_LOW_PERF) {
    const key = matKey(color, opts);
    let m = lambertCache.get(key);
    if (!m) {
      m = new THREE.MeshLambertMaterial({
        color,
        emissive: opts.emissive ? new THREE.Color(opts.emissive as string) : undefined,
        emissiveIntensity: opts.emissiveIntensity ?? 0,
        transparent: opts.transparent,
        opacity: opts.opacity ?? 1,
      });
      lambertCache.set(key, m);
    }
    return m;
  }
  const key = matKey(color, opts);
  let m = standardCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: 0.65, ...opts });
    standardCache.set(key, m);
  }
  return m;
}

export function addMesh(
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  material: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
  castShadow = !IS_MOBILE
): THREE.Mesh {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = castShadow;
  m.receiveShadow = !IS_MOBILE;
  m.frustumCulled = true;
  parent.add(m);
  return m;
}

export type LimbSet = {
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  mouth?: THREE.Mesh;
  head?: THREE.Object3D;
};

export function disposeObject3D(obj: THREE.Object3D): void {
  obj.traverse((c) => {
    if (c instanceof THREE.Mesh) {
      c.geometry.dispose();
    }
    if (c instanceof THREE.Sprite) {
      (c.material as THREE.SpriteMaterial).map?.dispose();
      c.material.dispose();
    }
  });
}

export function clearMatCache(): void {
  standardCache.forEach((m) => m.dispose());
  standardCache.clear();
  lambertCache.forEach((m) => m.dispose());
  lambertCache.clear();
}
