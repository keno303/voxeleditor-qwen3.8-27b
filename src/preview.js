import * as THREE from 'three';
import { getRotatedGeometry, getShapeColor } from './shapes.js';

// Rendert jede Form einmalig in ein kleines Canvas und liefert Data-URLs.
// Ein gemeinsamer Renderer wird erzeugt und wieder verworfen (keine extra Kontexte).
export function renderShapePreviews(shapeIds, size = 72) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(2);
  renderer.setSize(size, size, false);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(1.5, 2.5, 1.5);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x8899ff, 0.5);
  fill.position.set(-1.5, 1, -1);
  scene.add(fill);

  const previews = {};
  for (const id of shapeIds) {
    const { geometry } = getRotatedGeometry(id, 0, 0);
    const material = new THREE.MeshStandardMaterial({
      color: getShapeColor(id),
      roughness: 0.55,
      metalness: 0.15,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    geometry.computeBoundingBox();
    const bb = geometry.boundingBox;
    const center = new THREE.Vector3();
    bb.getCenter(center);
    const dim = new THREE.Vector3();
    bb.getSize(dim);
    const maxDim = Math.max(dim.x, dim.y, dim.z, 0.001);
    const dist = maxDim * 2.3;
    camera.position.set(center.x + dist, center.y + dist * 0.75, center.z + dist);
    camera.lookAt(center);

    renderer.render(scene, camera);
    previews[id] = canvas.toDataURL('image/png');

    scene.remove(mesh);
    material.dispose();
    // Geometrie NICT entsorgen (wird in shapes.js gecacht)
  }
  renderer.dispose();
  return previews;
}
