import * as THREE from 'three';

type Particle = {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
};

export class ParticleSystem {
  private particles: Particle[] = [];
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  burst(x: number, y: number, z: number, color: string, count = 12, speed = 4): void {
    for (let i = 0; i < count; i++) {
      const geo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * speed,
        Math.random() * speed * 0.8 + 1,
        (Math.random() - 0.5) * speed
      );
      this.scene.add(mesh);
      this.particles.push({ mesh, vel, life: 0.6 + Math.random() * 0.4, maxLife: 1 });
    }
  }

  collectBurst(x: number, z: number): void {
    this.burst(x, 1, z, '#FFD54F', 8, 3);
    this.burst(x, 1.2, z, '#FF9800', 6, 2);
  }

  hitBurst(x: number, z: number): void {
    this.burst(x, 1, z, '#EF5350', 10, 5);
  }

  gateBurst(x: number, z: number, color: string): void {
    this.burst(x, 2, z, color, 16, 6);
  }

  update(dt: number): void {
    const alive: Particle[] = [];
    for (const p of this.particles) {
      p.life -= dt;
      p.vel.y -= 12 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      const alpha = Math.max(0, p.life / p.maxLife);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = alpha;
      p.mesh.scale.setScalar(alpha);
      if (p.life > 0) alive.push(p);
      else {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        const mat = p.mesh.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat.dispose();
      }
    }
    this.particles = alive;
  }

  clear(): void {
    for (const p of this.particles) {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      const mat = p.mesh.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat.dispose();
    }
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
