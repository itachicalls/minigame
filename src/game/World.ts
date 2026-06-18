import * as THREE from 'three';
import type { DistrictTheme } from '../types';
import { addMesh, mat, disposeObject3D } from './ModelUtils';
import { IS_MOBILE, WORLD_AHEAD, WORLD_BEHIND, freezeStatic } from './platform';

type AnimProp = {
  obj: THREE.Object3D;
  worldZ: number;
  kind: 'bob' | 'spin' | 'flicker' | 'cloud';
  speed: number;
  baseY: number;
  phase: number;
  light?: THREE.PointLight;
};

export class World {
  scene: THREE.Scene;
  private rootMeshes: THREE.Object3D[] = [];
  private animProps: AnimProp[] = [];
  private roadTexture!: THREE.CanvasTexture;
  private skyTexture: THREE.CanvasTexture | null = null;
  private playerZ = 0;
  private cullTimer = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  build(theme: DistrictTheme, levelLength: number): void {
    this.clear();

    this.buildSky(theme);
    this.scene.fog = new THREE.FogExp2(theme.fog, IS_MOBILE ? 0.016 : theme.id <= 2 ? 0.008 : 0.012);

    // Grass field
    const grass = addMesh(
      this.scene,
      new THREE.PlaneGeometry(50, levelLength + 140),
      mat(theme.ground, { roughness: 1 }),
      0,
      0,
      levelLength / 2,
      false
    );
    grass.rotation.x = -Math.PI / 2;
    grass.position.y = -0.02;
    grass.receiveShadow = !IS_MOBILE;
    grass.userData.isTerrain = true;
    this.rootMeshes.push(grass);

    // Sidewalks
    for (const x of [-5.2, 5.2]) {
      const walk = addMesh(
        this.scene,
        new THREE.PlaneGeometry(3.5, levelLength + 140),
        mat('#B0BEC5', { roughness: 0.95 }),
        x,
        0,
        levelLength / 2,
        false
      );
      walk.rotation.x = -Math.PI / 2;
      walk.position.y = 0.015;
      walk.receiveShadow = !IS_MOBILE;
      walk.userData.isTerrain = true;
      this.rootMeshes.push(walk);
    }

    // Textured road
    this.roadTexture = this.makeRoadTexture();
    this.roadTexture.wrapS = this.roadTexture.wrapT = THREE.RepeatWrapping;
    this.roadTexture.repeat.set(1, (levelLength + 140) / 8);
    const road = addMesh(
      this.scene,
      new THREE.PlaneGeometry(9.5, levelLength + 140),
      new THREE.MeshStandardMaterial({ map: this.roadTexture, roughness: 0.88, metalness: 0.05 }),
      0,
      0,
      levelLength / 2,
      false
    );
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0.025;
    road.receiveShadow = !IS_MOBILE;
    road.userData.isTerrain = true;
    this.rootMeshes.push(road);

    // Curbs with emissive edge
    for (const x of [-3.4, 3.4]) {
      const curb = addMesh(this.scene, new THREE.BoxGeometry(0.35, 0.18, levelLength + 140), mat('#ECEFF1'), x, 0.09, levelLength / 2, false);
      addMesh(curb, new THREE.BoxGeometry(0.08, 0.2, levelLength + 140), mat('#FFD54F', { emissive: '#FFC107', emissiveIntensity: 0.2 }), x > 0 ? -0.16 : 0.16, 0, 0, false);
      curb.userData.isTerrain = true;
      this.rootMeshes.push(curb);
    }

    const rng = seededRandom(theme.id * 1337 + levelLength);

    // Clouds
    const cloudCount = IS_MOBILE ? 5 : 14;
    for (let i = 0; i < cloudCount; i++) {
      const cloud = this.makeCloud(rng);
      const cz = rng() * (levelLength + 60);
      cloud.position.set((rng() - 0.5) * 40, 18 + rng() * 14, cz);
      this.scene.add(cloud);
      this.rootMeshes.push(cloud);
      this.animProps.push({ obj: cloud, worldZ: cz, kind: 'cloud', speed: 0.15 + rng() * 0.2, baseY: cloud.position.y, phase: rng() * 10 });
    }

    // Buildings, props, alien crash sites
    const propStep = IS_MOBILE ? 16 : 8;
    const propJitter = IS_MOBILE ? 8 : 8;
    for (let z = 0; z < levelLength + 50; z += propStep + Math.floor(rng() * propJitter)) {
      for (const side of [-1, 1]) {
        const roll = rng();
        if (roll > 0.18) {
          const building = this.makeBuilding(theme, rng);
          building.position.set(side * (8 + rng() * 5), 0, z + rng() * 5);
          building.rotation.y = side * 0.08;
          freezeStatic(building);
          this.scene.add(building);
          this.rootMeshes.push(building);
        }
        if (roll > 0.55 && theme.id <= 2 && !IS_MOBILE) {
          const tree = this.makeTree(rng);
          tree.position.set(side * (10 + rng() * 3), 0, z + rng() * 4);
          freezeStatic(tree);
          this.scene.add(tree);
          this.rootMeshes.push(tree);
        }
        if (rng() > 0.72) {
          const prop = rng() > 0.5 ? this.makeStreetLamp() : this.makeMailbox();
          const pz = z + rng() * 3;
          prop.position.set(side * (6.2 + rng()), 0, pz);
          freezeStatic(prop);
          this.scene.add(prop);
          this.rootMeshes.push(prop);
          if (prop.userData.flicker) {
            this.animProps.push({
              obj: prop,
              worldZ: pz,
              kind: 'flicker',
              speed: 4 + rng() * 3,
              baseY: 0,
              phase: rng() * 6,
              light: prop.userData.flickerLight as THREE.PointLight | undefined,
            });
          }
        }
        if (!IS_MOBILE && rng() > 0.88) {
          const crash = this.makeAlienCrash();
          crash.position.set(side * (7 + rng() * 2), 0, z);
          freezeStatic(crash);
          this.scene.add(crash);
          this.rootMeshes.push(crash);
          this.animProps.push({ obj: crash.children[1] as THREE.Mesh, worldZ: z, kind: 'bob', speed: 2, baseY: 0.12, phase: rng() * 5 });
        }
      }
    }

    // Start / finish arches
    this.addMilestoneArch(8, '#66BB6A', 'START');
    this.addMilestoneArch(levelLength - 5, '#FFD54F', 'ZONE');

    this.setupLighting(theme, levelLength);
  }

  private buildSky(theme: DistrictTheme): void {
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, theme.sky);
    grad.addColorStop(0.55, theme.skyBottom);
    grad.addColorStop(1, theme.fog);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 4, 512);
    this.scene.background = new THREE.CanvasTexture(canvas);
    this.skyTexture = this.scene.background as THREE.CanvasTexture;
  }

  private makeRoadTexture(): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#37474F';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 4) {
      ctx.fillStyle = y % 8 === 0 ? '#455A64' : '#37474F';
      ctx.fillRect(0, y, 256, 4);
    }
    ctx.strokeStyle = '#FFEB3B';
    ctx.lineWidth = 4;
    ctx.setLineDash([18, 14]);
    ctx.beginPath();
    ctx.moveTo(128, 0);
    ctx.lineTo(128, 256);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#FFF';
    ctx.fillRect(8, 0, 10, 256);
    ctx.fillRect(238, 0, 10, 256);
    return new THREE.CanvasTexture(c);
  }

  private makeCloud(rng: () => number): THREE.Group {
    const g = new THREE.Group();
    const cloudMat = mat('#FFFFFF', { transparent: true, opacity: 0.85, roughness: 1 });
    for (let i = 0; i < 5; i++) {
      const puff = addMesh(g, new THREE.SphereGeometry(1.2 + rng() * 1.5, 10, 8), cloudMat, (i - 2) * 1.1, 0.2 + rng() * 0.5, (rng() - 0.5) * 0.8, false);
      puff.scale.y = 0.55;
    }
    return g;
  }

  private makeBuilding(theme: DistrictTheme, rng: () => number): THREE.Group {
    const g = new THREE.Group();
    const h = 6 + rng() * 12;
    const w = 4 + rng() * 4;
    const d = 5 + rng() * 5;
    const wallColor = new THREE.Color().setHSL(theme.buildingHue + rng() * 0.07, 0.38, 0.34 + theme.id * 0.04);
    addMesh(g, new THREE.BoxGeometry(w, h, d), mat(wallColor.getStyle()), 0, h / 2, 0);

    const roof = addMesh(
      g,
      new THREE.ConeGeometry(Math.max(w, d) * 0.65, 2.2, 4),
      mat(theme.id >= 4 ? '#4A148C' : '#BF360C', { roughness: 0.8 }),
      0,
      h + 1,
      0
    );
    roof.rotation.y = Math.PI / 4;

    const door = addMesh(g, new THREE.BoxGeometry(1.1, 1.8, 0.12), mat('#3E2723'), 0, 0.9, d / 2 + 0.02);
    addMesh(g, new THREE.BoxGeometry(1.4, 0.25, 0.6), mat(theme.id >= 3 ? '#78909C' : '#FF8A65', { emissive: '#FF6E40', emissiveIntensity: 0.15 }), 0, 2.8, d / 2 + 0.35);

    for (let row = 1; row < h / 2.2; row++) {
      for (let col = -1; col <= 1; col += 2) {
        if (rng() > 0.25) {
          addMesh(
            g,
            new THREE.PlaneGeometry(0.55, 0.75),
            mat(theme.id >= 4 ? '#E1BEE7' : '#FFF9C4', {
              emissive: theme.id >= 4 ? '#AB47BC' : '#FFF176',
              emissiveIntensity: theme.id >= 4 ? 0.9 : 0.2 + rng() * 0.2,
            }),
            col * w * 0.28,
            row * 2,
            d / 2 + 0.03
          );
        }
      }
    }
    return g;
  }

  private makeTree(rng: () => number): THREE.Group {
    const g = new THREE.Group();
    addMesh(g, new THREE.CylinderGeometry(0.18, 0.26, 1.6, 8), mat('#5D4037'), 0, 0.8, 0);
    addMesh(g, new THREE.ConeGeometry(1.3, 2.8, 8), mat('#43A047', { emissive: '#2E7D32', emissiveIntensity: 0.08 }), 0, 2.6, 0);
    addMesh(g, new THREE.ConeGeometry(0.9, 1.8, 8), mat('#66BB6A'), 0, 3.5, 0);
    return g;
  }

  private makeStreetLamp(): THREE.Group {
    const g = new THREE.Group();
    g.userData.flicker = true;
    addMesh(g, new THREE.CylinderGeometry(0.08, 0.1, 3.5, 8), mat('#455A64', { metalness: 0.6 }), 0, 1.75, 0);
    addMesh(g, new THREE.SphereGeometry(0.22, 10, 10), mat('#FFFDE7', { emissive: '#FFD54F', emissiveIntensity: IS_MOBILE ? 1.6 : 1.2 }), 0, 3.6, 0);
    if (!IS_MOBILE) {
      const light = new THREE.PointLight(0xFFD54F, 0.6, 12);
      light.position.set(0, 3.6, 0);
      g.add(light);
      g.userData.flickerLight = light;
    }
    return g;
  }

  private makeMailbox(): THREE.Group {
    const g = new THREE.Group();
    addMesh(g, new THREE.BoxGeometry(0.5, 1.1, 0.45), mat('#1565C0'), 0, 0.55, 0);
    addMesh(g, new THREE.CylinderGeometry(0.04, 0.04, 0.55, 6), mat('#78909C', { metalness: 0.7 }), 0, 1.15, 0.15);
    return g;
  }

  private makeAlienCrash(): THREE.Group {
    const g = new THREE.Group();
    addMesh(g, new THREE.CylinderGeometry(0.9, 1.1, 0.15, 12), mat('#607D8B', { metalness: 0.7, emissive: '#00E676', emissiveIntensity: 0.3 }), 0, 0.08, 0);
    addMesh(g, new THREE.SphereGeometry(0.55, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('#80DEEA', { transparent: true, opacity: 0.6 }), 0, 0.15, 0);
    const goo = addMesh(g, new THREE.CircleGeometry(1.1, 16), mat('#76FF03', { emissive: '#33691E', emissiveIntensity: 0.5, transparent: true, opacity: 0.65 }), 0, 0.02, 0, false);
    goo.rotation.x = -Math.PI / 2;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      addMesh(g, new THREE.BoxGeometry(0.25, 0.08, 0.25), mat('#CFD8DC', { metalness: 0.5 }), Math.cos(a) * 0.9, 0.04, Math.sin(a) * 0.9);
    }
    return g;
  }

  private addMilestoneArch(z: number, color: string, label: string): void {
    const g = new THREE.Group();
    g.position.set(0, 0, z);
    for (const x of [-4.5, 4.5]) {
      addMesh(g, new THREE.CylinderGeometry(0.2, 0.22, 5, 10), mat('#ECEFF1'), x, 2.5, 0);
    }
    addMesh(g, new THREE.BoxGeometry(10, 0.35, 0.35), mat(color, { emissive: color, emissiveIntensity: 0.35 }), 0, 4.8, 0);
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 28px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText(label, 128, 42);
    const tex = new THREE.CanvasTexture(canvas);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 0.9), new THREE.MeshBasicMaterial({ map: tex }));
    sign.position.set(0, 5.5, 0);
    g.add(sign);
    this.scene.add(g);
    this.rootMeshes.push(g);
  }

  private setupLighting(theme: DistrictTheme, levelLength: number): void {
    const hemi = new THREE.HemisphereLight(theme.sky, theme.ground, theme.ambient * 0.9);
    hemi.name = 'hemi';
    this.scene.add(hemi);

    const ambient = new THREE.AmbientLight(0xffffff, theme.ambient * 0.35);
    ambient.name = 'ambient';
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfff0d4, theme.sun * (IS_MOBILE ? 1.15 : 1));
    sun.position.set(20, 45, -25);
    sun.castShadow = !IS_MOBILE;
    if (!IS_MOBILE) {
      sun.shadow.mapSize.set(1024, 1024);
      sun.shadow.camera.near = 1;
      sun.shadow.camera.far = 250;
      sun.shadow.camera.left = -35;
      sun.shadow.camera.right = 35;
      sun.shadow.camera.top = 35;
      sun.shadow.camera.bottom = -35;
    }
    sun.name = 'sun';
    this.scene.add(sun);
    this.scene.add(sun.target);

    if (theme.id >= 4 && !IS_MOBILE) {
      const neon = new THREE.PointLight(0xff00ff, 2.5, 55);
      neon.position.set(0, 12, levelLength * 0.45);
      neon.name = 'neon';
      this.scene.add(neon);
    }
  }

  setPlayerZ(z: number, dt: number): void {
    this.playerZ = z;
    this.cullTimer += dt;
    if (this.cullTimer < (IS_MOBILE ? 0.12 : 0.08)) return;
    this.cullTimer = 0;

    const minZ = z - WORLD_BEHIND;
    const maxZ = z + WORLD_AHEAD;
    for (const m of this.rootMeshes) {
      if (m.userData.isTerrain) continue;
      const mz = m.position.z;
      m.visible = mz >= minZ && mz <= maxZ;
    }
  }

  /** Move shadow sun with the player so the shadow frustum stays tight on desktop */
  followSun(playerX: number, playerZ: number): void {
    const sun = this.scene.getObjectByName('sun') as THREE.DirectionalLight | undefined;
    if (!sun || !sun.castShadow) return;
    sun.position.set(playerX + 18, 42, playerZ - 22);
    sun.target.position.set(playerX, 0, playerZ + 35);
    sun.target.updateMatrixWorld();
  }

  update(time: number, playerZ = this.playerZ): void {
    if (this.roadTexture) {
      this.roadTexture.offset.y = -time * 0.15;
    }
    const animRange = IS_MOBILE ? 45 : 65;
    for (const p of this.animProps) {
      if (Math.abs(p.worldZ - playerZ) > animRange) continue;
      switch (p.kind) {
        case 'bob':
          p.obj.position.y = p.baseY + Math.sin(time * p.speed + p.phase) * 0.06;
          break;
        case 'spin':
          p.obj.rotation.y = time * p.speed;
          break;
        case 'cloud':
          p.obj.position.x += Math.sin(time * 0.1 + p.phase) * 0.008;
          p.obj.position.y = p.baseY + Math.sin(time * p.speed + p.phase) * 0.4;
          break;
        case 'flicker':
          if (p.light) p.light.intensity = 0.45 + Math.sin(time * p.speed + p.phase) * 0.25;
          break;
      }
    }
  }

  private clear(): void {
    for (const m of this.rootMeshes) {
      this.scene.remove(m);
      disposeObject3D(m);
    }
    this.rootMeshes = [];
    this.animProps = [];
    if (this.roadTexture) this.roadTexture.dispose();
    if (this.skyTexture) {
      this.skyTexture.dispose();
      this.skyTexture = null;
    }
    for (const name of ['hemi', 'ambient', 'sun', 'neon']) {
      const obj = this.scene.getObjectByName(name);
      if (obj) this.scene.remove(obj);
    }
  }
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
