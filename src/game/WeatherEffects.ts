import * as THREE from 'three';
import { IS_MOBILE, IS_VERY_LOW_PERF } from './platform';

export type WeatherMode = 'clear' | 'rain' | 'mist' | 'dust' | 'ash';

type WeatherProfile = {
  mode: WeatherMode;
  color: string;
  mistColor: string;
  fallSpeed: number;
  wind: number;
  /** Baseline intensity for this district (0–1). */
  base: number;
};

function profileForDistrict(districtId: number): WeatherProfile {
  switch (districtId) {
    case 1:
    case 2:
      return { mode: 'rain', color: '#B3E5FC', mistColor: '#78909C', fallSpeed: 22, wind: 0.6, base: 0.08 };
    case 3:
      return { mode: 'dust', color: '#FFCC80', mistColor: '#FFE0B2', fallSpeed: 4, wind: 1.4, base: 0.22 };
    case 4:
      return { mode: 'mist', color: '#A5D6A7', mistColor: '#80CBC4', fallSpeed: 2, wind: 0.3, base: 0.28 };
    case 5:
      return { mode: 'rain', color: '#90A4AE', mistColor: '#546E7A', fallSpeed: 28, wind: 0.9, base: 0.62 };
    case 6:
      return { mode: 'rain', color: '#CE93D8', mistColor: '#311B92', fallSpeed: 20, wind: 0.5, base: 0.35 };
    case 7:
      return { mode: 'ash', color: '#FF8A80', mistColor: '#4A0000', fallSpeed: 6, wind: 0.8, base: 0.4 };
    default:
      return { mode: 'clear', color: '#B3E5FC', mistColor: '#78909C', fallSpeed: 18, wind: 0.5, base: 0 };
  }
}

/** Weather intensity from district + day/night cycle + slow atmospheric variation. */
export function computeWeatherIntensity(districtId: number, night: number, time: number): number {
  const p = profileForDistrict(districtId);
  let intensity = p.base;

  if (districtId <= 2) {
    // Suburbs/downtown: dry bright day, cinematic drizzle/storm at night.
    intensity = Math.max(intensity, Math.max(0, night - 0.32) * 0.92);
  } else if (districtId === 3) {
    intensity = p.base + Math.sin(time * 0.25) * 0.08 + night * 0.12;
  } else if (districtId === 4) {
    intensity = p.base + night * 0.35 + Math.sin(time * 0.18 + 1) * 0.1;
  } else if (districtId === 5) {
    intensity = 0.5 + night * 0.38 + Math.sin(time * 0.35) * 0.12;
  } else if (districtId === 6) {
    intensity = p.base + Math.max(0, night - 0.2) * 0.55;
  } else if (districtId === 7) {
    intensity = p.base + night * 0.25;
  }

  // Slow rolling fronts — weather visibly shifts during a run.
  intensity += Math.max(0, Math.sin(time * 0.11 + districtId * 1.7) * 0.14);
  return Math.min(1, Math.max(0, intensity));
}

export class WeatherEffects {
  private root = new THREE.Group();
  private rain: THREE.Points | null = null;
  private rainGeo: THREE.BufferGeometry | null = null;
  private rainVel: Float32Array | null = null;
  private profile: WeatherProfile = profileForDistrict(1);
  private intensity = 0;
  private count = 0;

  constructor(private scene: THREE.Scene) {
    this.scene.add(this.root);
    this.root.name = 'weather';
  }

  build(districtId: number, _levelLength: number): void {
    this.clear();
    this.profile = profileForDistrict(districtId);
    this.count = IS_VERY_LOW_PERF ? 55 : IS_MOBILE ? 90 : 160;
    if (this.profile.mode === 'clear') return;

    const positions = new Float32Array(this.count * 3);
    this.rainVel = new Float32Array(this.count);
    for (let i = 0; i < this.count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 28;
      positions[i * 3 + 1] = Math.random() * 16 + 2;
      positions[i * 3 + 2] = Math.random() * 40 - 10;
      this.rainVel[i] = 0.7 + Math.random() * 0.6;
    }
    this.rainGeo = new THREE.BufferGeometry();
    this.rainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const rainMat = new THREE.PointsMaterial({
      color: this.profile.color,
      size: this.profile.mode === 'dust' || this.profile.mode === 'ash' ? (IS_MOBILE ? 0.14 : 0.18) : IS_MOBILE ? 0.08 : 0.1,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: this.profile.mode === 'mist' ? THREE.NormalBlending : THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    this.rain = new THREE.Points(this.rainGeo, rainMat);
    this.root.add(this.rain);
  }

  getIntensity(): number {
    return this.intensity;
  }

  getMode(): WeatherMode {
    return this.profile.mode;
  }

  update(
    time: number,
    dt: number,
    playerZ: number,
    playerX: number,
    night: number,
    districtId: number
  ): void {
    this.profile = profileForDistrict(districtId);
    this.intensity = computeWeatherIntensity(districtId, night, time);
    this.root.position.set(playerX * 0.15, 0, playerZ);

    if (!this.rain || !this.rainGeo || !this.rainVel) return;
    const rm = this.rain.material as THREE.PointsMaterial;
    const particleOpacity =
      this.profile.mode === 'rain' || this.profile.mode === 'ash'
        ? this.intensity * (IS_MOBILE ? 0.55 : 0.72)
        : this.profile.mode === 'mist'
          ? this.intensity * (IS_MOBILE ? 0.22 : 0.3)
          : this.intensity * (IS_MOBILE ? 0.35 : 0.48);
    rm.opacity += (particleOpacity - rm.opacity) * Math.min(1, dt * 4);
    rm.color.set(this.profile.color);
    this.rain.visible = rm.opacity > 0.03;

    const attr = this.rainGeo.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const fall = this.profile.fallSpeed * dt;
    const wind = this.profile.wind * dt;
    const spreadX = 28;
    const spreadZ = 42;

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      if (this.profile.mode === 'mist') {
        arr[i3] += Math.sin(time * 0.4 + i) * wind * 0.3;
        arr[i3 + 1] += Math.sin(time * 0.25 + i * 0.1) * dt * 0.4;
        arr[i3 + 2] += Math.cos(time * 0.3 + i) * wind * 0.2;
      } else if (this.profile.mode === 'dust') {
        arr[i3] += wind * this.rainVel[i]!;
        arr[i3 + 1] += Math.sin(time * 2 + i) * dt * 0.15;
        arr[i3 + 2] -= fall * 0.15 * this.rainVel[i]!;
      } else {
        arr[i3] += wind * 0.35;
        arr[i3 + 1] -= fall * this.rainVel[i]!;
        arr[i3 + 2] -= fall * 1.8 * this.rainVel[i]!;
      }

      if (arr[i3 + 1] < 0.2) {
        arr[i3] = (Math.random() - 0.5) * spreadX;
        arr[i3 + 1] = 10 + Math.random() * 8;
        arr[i3 + 2] = (Math.random() - 0.5) * spreadZ;
      }
      if (Math.abs(arr[i3]) > spreadX * 0.55) arr[i3] *= -0.85;
      if (Math.abs(arr[i3 + 2]) > spreadZ * 0.55) arr[i3 + 2] *= -0.85;
    }
    attr.needsUpdate = true;
  }

  dispose(): void {
    this.clear();
    this.scene.remove(this.root);
  }

  private clear(): void {
    if (this.rain) {
      this.rainGeo?.dispose();
      (this.rain.material as THREE.Material).dispose();
      this.root.remove(this.rain);
      this.rain = null;
      this.rainGeo = null;
      this.rainVel = null;
    }
  }
}
