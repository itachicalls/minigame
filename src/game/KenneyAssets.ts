import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { IS_MOBILE } from './platform';

const COMMERCIAL_GLB = '/assets/kenney/city-kit-commercial/Models/GLB%20format/';
const NATURE_OBJ = '/assets/kenney/nature-kit/Models/OBJ%20format/';
const MODULAR_OBJ = '/assets/kenney/modular-buildings/Models/OBJ%20format/';

/** CC0 — Kenney.nl (city-kit-commercial, nature-kit, modular-buildings) */

const COMMERCIAL_BUILDINGS = [
  'building-a.glb',
  'building-b.glb',
  'building-c.glb',
  'building-d.glb',
  'building-e.glb',
  'building-f.glb',
  'building-g.glb',
  'building-h.glb',
  'building-i.glb',
  'building-j.glb',
  'building-k.glb',
  'building-l.glb',
  'building-m.glb',
  'building-n.glb',
  'low-detail-building-a.glb',
  'low-detail-building-b.glb',
  'low-detail-building-c.glb',
  'low-detail-building-d.glb',
  'low-detail-building-e.glb',
  'low-detail-building-f.glb',
  'building-skyscraper-a.glb',
  'building-skyscraper-b.glb',
  'building-skyscraper-c.glb',
  'building-skyscraper-d.glb',
] as const;

const COMMERCIAL_SKYLINE = [
  'low-detail-building-g.glb',
  'low-detail-building-h.glb',
  'low-detail-building-i.glb',
  'low-detail-building-j.glb',
  'low-detail-building-k.glb',
  'low-detail-building-l.glb',
  'low-detail-building-m.glb',
  'low-detail-building-n.glb',
  'low-detail-building-wide-a.glb',
  'low-detail-building-wide-b.glb',
  'building-skyscraper-e.glb',
] as const;

const DOWNTOWN_TOWERS = [
  'building-sample-tower-a',
  'building-sample-tower-b',
  'building-sample-tower-c',
  'building-sample-tower-d',
] as const;

const SUBURBAN_HOUSES = ['building-sample-house-a', 'building-sample-house-b', 'building-sample-house-c'] as const;

const DESERT_PROPS = ['cactus_tall', 'cactus_short', 'rock_largeA', 'rock_largeB', 'rock_smallFlatA', 'rock_tallA'] as const;

const JUNGLE_PROPS = [
  'tree_palm',
  'tree_palmTall',
  'tree_palmDetailedTall',
  'tree_detailed',
  'tree_pineRoundA',
  'tree_pineRoundC',
  'plant_bushLarge',
  'plant_bushDetailed',
] as const;

type Template = {
  scene: THREE.Object3D;
  height: number;
};

type DistrictStyle = {
  buildings: Template[];
  skyline: Template[];
  props: Template[];
};

function profileForDistrict(districtId: number): number | null {
  if (districtId >= 1 && districtId <= 4) return districtId;
  return null;
}

class KenneyAssets {
  private commercialBuildings: Template[] = [];
  private commercialSkyline: Template[] = [];
  private downtownTowers: Template[] = [];
  private suburbanHouses: Template[] = [];
  private desertProps: Template[] = [];
  private jungleProps: Template[] = [];
  private loadTask: Promise<void> | null = null;

  readyFor(districtId: number): boolean {
    const p = profileForDistrict(districtId);
    if (!p) return false;
    if (!this.commercialBuildings.length) return false;
    if (p === 2) return this.downtownTowers.length > 0 || this.commercialBuildings.length > 0;
    if (p === 3) return this.desertProps.length > 0;
    if (p === 4) return this.jungleProps.length > 0;
    return true;
  }

  preload(): Promise<void> {
    if (this.loadTask) return this.loadTask;
    this.loadTask = this.loadAll();
    return this.loadTask;
  }

  /** Cheap existence probe so we never fire dozens of 404s for absent packs. */
  private async exists(url: string): Promise<boolean> {
    try {
      const res = await fetch(url, { method: 'HEAD' });
      return res.ok;
    } catch {
      return false;
    }
  }

  private async loadAll(): Promise<void> {
    // Commercial GLBs are the backbone for districts 1-4; if they aren't present
    // the whole pack is treated as absent and we render the procedural city.
    const hasGlb = await this.exists(COMMERCIAL_GLB + COMMERCIAL_BUILDINGS[0]);
    if (!hasGlb) return;
    const hasObjTextures = await this.exists(NATURE_OBJ + 'Textures/colormap.png');

    const gltf = new GLTFLoader();
    const loadGlb = async (file: string): Promise<Template | null> => {
      try {
        const data = await gltf.loadAsync(COMMERCIAL_GLB + file);
        const scene = data.scene;
        scene.traverse((c) => {
          if (c instanceof THREE.Mesh) {
            c.castShadow = false;
            c.receiveShadow = false;
          }
        });
        const box = new THREE.Box3().setFromObject(scene);
        const size = box.getSize(new THREE.Vector3());
        if (size.y < 0.01) return null;
        return { scene, height: size.y };
      } catch {
        return null;
      }
    };

    const loadObj = async (base: string, name: string, solidColor?: string): Promise<Template | null> => {
      try {
        const mtlLoader = new MTLLoader();
        mtlLoader.setPath(base);
        const materials = await mtlLoader.loadAsync(`${name}.mtl`);
        materials.preload();
        const objLoader = new OBJLoader();
        objLoader.setMaterials(materials);
        objLoader.setPath(base);
        const scene = await objLoader.loadAsync(`${name}.obj`);
        if (solidColor) this.applySolidMaterial(scene, solidColor);
        scene.traverse((c) => {
          if (c instanceof THREE.Mesh) {
            c.castShadow = false;
            c.receiveShadow = false;
          }
        });
        const box = new THREE.Box3().setFromObject(scene);
        const size = box.getSize(new THREE.Vector3());
        if (size.y < 0.01) return null;
        return { scene, height: size.y };
      } catch {
        return null;
      }
    };

    const glbResults = await Promise.all([
      ...COMMERCIAL_BUILDINGS.map(loadGlb),
      ...COMMERCIAL_SKYLINE.map(loadGlb),
    ]);
    this.commercialBuildings = glbResults.slice(0, COMMERCIAL_BUILDINGS.length).filter((t): t is Template => t !== null);
    this.commercialSkyline = glbResults.slice(COMMERCIAL_BUILDINGS.length).filter((t): t is Template => t !== null);

    if (!hasObjTextures) return;
    const towerColor = '#78909C';
    const houseColor = '#BCAAA4';
    const [towers, houses, desert, jungle] = await Promise.all([
      Promise.all(DOWNTOWN_TOWERS.map((n) => loadObj(MODULAR_OBJ, n, towerColor))),
      Promise.all(SUBURBAN_HOUSES.map((n) => loadObj(MODULAR_OBJ, n, houseColor))),
      Promise.all(DESERT_PROPS.map((n) => loadObj(NATURE_OBJ, n))),
      Promise.all(JUNGLE_PROPS.map((n) => loadObj(NATURE_OBJ, n))),
    ]);
    this.downtownTowers = towers.filter((t): t is Template => t !== null);
    this.suburbanHouses = houses.filter((t): t is Template => t !== null);
    this.desertProps = desert.filter((t): t is Template => t !== null);
    this.jungleProps = jungle.filter((t): t is Template => t !== null);
  }

  private applySolidMaterial(root: THREE.Object3D, color: string): void {
    root.traverse((c) => {
      if (c instanceof THREE.Mesh) {
        c.material = new THREE.MeshStandardMaterial({ color, roughness: 0.86, metalness: 0.08 });
      }
    });
  }

  private styleForDistrict(districtId: number, mood: number): {
    colorMul: number;
    tint: THREE.Color;
    emissive: THREE.Color;
    emissiveI: number;
  } {
    const night = Math.min(1, mood);
    switch (districtId) {
      case 2:
        return {
          colorMul: 0.62 + night * 0.14,
          tint: new THREE.Color('#90A4AE'),
          emissive: new THREE.Color('#FFB74D'),
          emissiveI: 0.06 + night * 0.2,
        };
      case 3:
        return {
          colorMul: 0.78 + night * 0.08,
          tint: new THREE.Color('#D4A574'),
          emissive: new THREE.Color('#FF9800'),
          emissiveI: 0.03 + night * 0.1,
        };
      case 4:
        return {
          colorMul: 0.72 + night * 0.1,
          tint: new THREE.Color('#558B2F'),
          emissive: new THREE.Color('#69F0AE'),
          emissiveI: 0.04 + night * 0.12,
        };
      default:
        return {
          colorMul: 0.68 + night * 0.12,
          tint: new THREE.Color('#ffffff'),
          emissive: new THREE.Color('#FFB74D'),
          emissiveI: 0.04 + night * 0.18,
        };
    }
  }

  private poolForDistrict(districtId: number, skyline: boolean): Template[] {
    if (skyline) {
      if (districtId === 2 && this.downtownTowers.length) return this.downtownTowers;
      return this.commercialSkyline.length ? this.commercialSkyline : this.commercialBuildings;
    }
    const pools: Template[] = [...this.commercialBuildings];
    if (districtId === 2) pools.push(...this.downtownTowers);
    if (districtId === 1 || districtId === 3) pools.push(...this.suburbanHouses);
    return pools;
  }

  private cloneTemplate(
    template: Template,
    targetHeight: number,
    roadSide: number,
    districtId: number,
    mood: number,
    prop = false
  ): THREE.Group {
    const g = new THREE.Group();
    const model = template.scene.clone(true);
    g.add(model);

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const scale = targetHeight / (size.y || template.height);
    model.scale.setScalar(scale);

    box.setFromObject(model);
    model.position.x -= (box.min.x + box.max.x) / 2;
    model.position.y -= box.min.y;
    model.position.z -= (box.min.z + box.max.z) / 2;
    if (!prop) {
      model.rotation.y = roadSide > 0 ? -Math.PI / 2 : Math.PI / 2;
    } else {
      model.rotation.y = (roadSide > 0 ? 1 : -1) * (0.2 + Math.random() * 0.6);
    }

    const style = this.styleForDistrict(districtId, mood);
    model.traverse((c) => {
      if (!(c instanceof THREE.Mesh)) return;
      const mats = Array.isArray(c.material) ? c.material : [c.material];
      const cloned = mats.map((m) => {
        if (!(m instanceof THREE.MeshStandardMaterial)) return m;
        const mat = m.clone();
        mat.color.multiplyScalar(style.colorMul).lerp(style.tint, districtId === 3 ? 0.28 : districtId === 4 ? 0.18 : 0.08);
        mat.emissive = mat.emissive.clone().lerp(style.emissive, 0.35);
        mat.emissiveIntensity = style.emissiveI;
        mat.metalness = Math.min(mat.metalness, 0.22);
        mat.roughness = Math.max(mat.roughness, 0.78);
        return mat;
      });
      c.material = cloned.length === 1 ? cloned[0]! : cloned;
    });

    return g;
  }

  instantiateBuilding(districtId: number, rng: () => number, roadSide: number, mood = 0.5): THREE.Group | null {
    const pool = this.poolForDistrict(districtId, false);
    if (!pool.length) return null;
    const template = pool[Math.floor(rng() * pool.length)]!;
    const h =
      districtId === 2
        ? 9 + rng() * 14
        : districtId === 3
          ? 5 + rng() * 6
          : districtId === 4
            ? 6 + rng() * 8
            : 7 + rng() * 10;
    return this.cloneTemplate(template, h, roadSide, districtId, mood);
  }

  instantiateSkyline(districtId: number, rng: () => number, roadSide: number, mood = 0.5): THREE.Group | null {
    const pool = this.poolForDistrict(districtId, true);
    if (!pool.length) return null;
    const template = pool[Math.floor(rng() * pool.length)]!;
    const h = 14 + rng() * (districtId === 2 ? 20 : 16);
    return this.cloneTemplate(template, h, roadSide, districtId, mood);
  }

  instantiateProp(districtId: number, rng: () => number, roadSide: number): THREE.Group | null {
    const pool = districtId === 3 ? this.desertProps : districtId === 4 ? this.jungleProps : [];
    if (!pool.length) return null;
    const template = pool[Math.floor(rng() * pool.length)]!;
    const h =
      districtId === 3
        ? 1.2 + rng() * 2.8
        : districtId === 4
          ? 2.5 + rng() * 5.5
          : 2;
    return this.cloneTemplate(template, h, roadSide, districtId, 0.35, true);
  }

  skylineStep(): number {
    return IS_MOBILE ? 40 : 34;
  }
}

export const kenneyAssets = new KenneyAssets();

/** @deprecated use kenneyAssets */
export const kenneyCityKit = {
  get ready() {
    return kenneyAssets.readyFor(1);
  },
  preload: () => kenneyAssets.preload(),
  instantiateBuilding: (rng: () => number, roadSide: number, mood?: number) =>
    kenneyAssets.instantiateBuilding(1, rng, roadSide, mood),
  instantiateSkyline: (rng: () => number, roadSide: number, mood?: number) =>
    kenneyAssets.instantiateSkyline(1, rng, roadSide, mood),
};
