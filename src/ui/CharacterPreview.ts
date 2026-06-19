import * as THREE from 'three';
import { getCharacter, type MailmanId } from '../data/characters';
import { createMailmanMesh } from '../game/MailmanModel';
import { disposeObject3D } from '../game/ModelUtils';

const PREVIEW_SIZE = 128;
const cache = new Map<MailmanId, string>();
let renderer: THREE.WebGLRenderer | null = null;

function getRenderer(): THREE.WebGLRenderer {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, preserveDrawingBuffer: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }
  return renderer;
}

export function renderCharacterPreview(id: MailmanId): string {
  const cached = cache.get(id);
  if (cached) return cached;

  const character = getCharacter(id);
  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
  camera.position.set(0.15, 1.15, 3.35);
  camera.lookAt(0, 1.05, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.15);
  key.position.set(2.5, 5, 4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x9ecbff, 0.55);
  fill.position.set(-2.5, 2, 3);
  scene.add(fill);

  const { mesh } = createMailmanMesh(character);
  mesh.rotation.y = -0.42;
  scene.add(mesh);

  const r = getRenderer();
  r.setSize(PREVIEW_SIZE, PREVIEW_SIZE, false);
  r.render(scene, camera);

  const url = r.domElement.toDataURL('image/png');
  cache.set(id, url);

  disposeObject3D(mesh);
  return url;
}

export function mountCharacterPreview(container: HTMLElement, id: MailmanId): void {
  const img = document.createElement('img');
  img.className = 'character-preview-img';
  img.alt = getCharacter(id).name;
  img.width = PREVIEW_SIZE;
  img.height = PREVIEW_SIZE;
  img.decoding = 'async';
  img.src = renderCharacterPreview(id);
  container.replaceChildren(img);
}
