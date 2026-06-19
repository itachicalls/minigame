import * as THREE from 'three';
import { IS_MOBILE } from './platform';

type Particle = {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  active: boolean;
};

const MAX_PARTICLES = IS_MOBILE ? 24 : 40;
const SHARED_GEO = new THREE.BoxGeometry(0.12, 0.12, 0.12);

export class ParticleSystem {
  private particles: Particle[] = [];
  private scene: THREE.Scene;
  private materials = new Map<string, THREE.MeshBasicMaterial>();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const mat = this.getMaterial('#ffffff');
      const mesh = new THREE.Mesh(SHARED_GEO, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.particles.push({
        mesh,
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 1,
        active: false,
      });
    }
  }

  private getMaterial(color: string): THREE.MeshBasicMaterial {
    let m = this.materials.get(color);
    if (!m) {
      m = new THREE.MeshBasicMaterial({ color, transparent: true });
      this.materials.set(color, m);
    }
    return m;
  }

  burst(x: number, y: number, z: number, color: string, count = 12, speed = 4): void {
    const cap = IS_MOBILE ? Math.min(count, 8) : count;
    let spawned = 0;
    for (const p of this.particles) {
      if (spawned >= cap) break;
      if (p.active) continue;
      p.active = true;
      p.mesh.visible = true;
      p.mesh.material = this.getMaterial(color);
      p.mesh.position.set(x, y, z);
      p.mesh.scale.setScalar(1);
      p.vel.set(
        (Math.random() - 0.5) * speed,
        Math.random() * speed * 0.8 + 1,
        (Math.random() - 0.5) * speed
      );
      p.maxLife = 0.6 + Math.random() * 0.4;
      p.life = p.maxLife;
      spawned++;
    }
  }

  collectBurst(x: number, z: number): void {
    this.burst(x, 1, z, '#FFD54F', 6, 3);
    if (!IS_MOBILE) this.burst(x, 1.2, z, '#FF9800', 4, 2);
  }

  hitBurst(x: number, z: number): void {
    this.burst(x, 1, z, '#EF5350', IS_MOBILE ? 6 : 10, 5);
  }

  gateBurst(x: number, z: number, color: string): void {
    this.burst(x, 2, z, color, IS_MOBILE ? 10 : 16, 6);
  }

  update(dt: number): void {
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life -= dt;
      p.vel.y -= 12 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      const alpha = Math.max(0, p.life / p.maxLife);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = alpha;
      p.mesh.scale.setScalar(alpha);
      if (p.life <= 0) {
        p.active = false;
        p.mesh.visible = false;
      }
    }
  }

  clear(): void {
    for (const p of this.particles) {
      p.active = false;
      p.mesh.visible = false;
    }
  }

  dispose(): void {
    this.clear();
    for (const p of this.particles) this.scene.remove(p.mesh);
    SHARED_GEO.dispose();
    this.materials.forEach((m) => m.dispose());
    this.materials.clear();
    this.particles = [];
  }
}

export class CameraShake {
  intensity = 0;

  shake(amount: number): void {
    this.intensity = Math.max(this.intensity, amount);
  }

  apply(camera: THREE.PerspectiveCamera, basePos: THREE.Vector3, baseLook: THREE.Vector3): void {
    if (this.intensity > 0.001) {
      camera.position.x = basePos.x + (Math.random() - 0.5) * this.intensity;
      camera.position.y = basePos.y + (Math.random() - 0.5) * this.intensity * 0.5;
      camera.position.z = basePos.z + (Math.random() - 0.5) * this.intensity * 0.3;
      this.intensity *= 0.88;
    } else {
      camera.position.copy(basePos);
    }
    camera.lookAt(baseLook);
  }
}
