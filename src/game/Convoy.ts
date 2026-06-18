import * as THREE from 'three';
import { addMesh, mat, disposeObject3D } from './ModelUtils';

export class Convoy {
  private group: THREE.Group;
  private units: THREE.Group[] = [];
  count = 0;

  constructor(private scene: THREE.Scene) {
    this.group = new THREE.Group();
    scene.add(this.group);
  }

  setCount(n: number): void {
    this.count = Math.max(0, n);
    while (this.units.length < this.count) {
      this.units.push(this.buildHelper());
    }
    while (this.units.length > this.count) {
      const g = this.units.pop()!;
      this.group.remove(g);
      disposeObject3D(g);
    }
    this.layout();
  }

  private buildHelper(): THREE.Group {
    const helper = new THREE.Group();
    const vest = mat('#FF6F00', { emissive: '#E65100', emissiveIntensity: 0.2 });
    const skin = mat('#FFCC80');

    addMesh(helper, new THREE.CapsuleGeometry(0.14, 0.26, 4, 8), mat('#37474F'), 0, 0.38, 0);
    addMesh(helper, new THREE.CapsuleGeometry(0.15, 0.28, 4, 8), vest, 0, 0.52, 0);
    addMesh(helper, new THREE.BoxGeometry(0.22, 0.18, 0.1), mat('#5D4037'), 0, 0.52, -0.1);
    addMesh(helper, new THREE.SphereGeometry(0.15, 10, 8), skin, 0, 0.82, 0.02);
    addMesh(helper, new THREE.BoxGeometry(0.28, 0.06, 0.05), mat('#FFD54F'), 0, 0.94, 0.04);
    for (const sx of [-0.05, 0.05]) {
      addMesh(helper, new THREE.SphereGeometry(0.025, 6, 6), mat('#111'), sx, 0.84, 0.1);
    }
    addMesh(helper, new THREE.BoxGeometry(0.06, 0.02, 0.02), mat('#FF8A65'), 0, 0.78, 0.12);
    this.group.add(helper);
    return helper;
  }

  private layout(): void {
    const cols = Math.ceil(Math.sqrt(Math.max(1, this.count)));
    this.units.forEach((helper, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      helper.position.set((col - (cols - 1) / 2) * 0.55, 0, -(row + 1) * 0.58);
    });
  }

  update(playerX: number, playerZ: number, _dt: number): void {
    this.group.position.set(playerX, 0, playerZ);
    this.units.forEach((helper, i) => {
      helper.rotation.y = Math.sin(Date.now() * 0.004 + i) * 0.12;
      helper.position.y = Math.sin(Date.now() * 0.007 + i * 0.6) * 0.035;
      helper.rotation.z = Math.sin(Date.now() * 0.005 + i) * 0.04;
    });
  }

  dispose(): void {
    for (const g of this.units) disposeObject3D(g);
    this.units = [];
    this.scene.remove(this.group);
  }
}
