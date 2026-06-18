import * as THREE from 'three';

export function mat(color: string, opts: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.65, ...opts });
}

export function addMesh(
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  material: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
  castShadow = true
): THREE.Mesh {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = castShadow;
  m.receiveShadow = true;
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
