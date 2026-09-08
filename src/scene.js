import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const GRID_SIZE = 32;

export class Scene {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x222428);
    this.scene.fog = new THREE.Fog(0x222428, 40, 90);

    const w = container.clientWidth || 800;
    const h = container.clientHeight || 600;
    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
    this.camera.position.set(14, 12, 14);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.12;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.02;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 80;

    // Licht
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const dir = new THREE.DirectionalLight(0xffffff, 1.6);
    dir.position.set(12, 24, 10);
    this.scene.add(dir);
    const dir2 = new THREE.DirectionalLight(0xffffff, 0.5);
    dir2.position.set(-10, 12, -12);
    this.scene.add(dir2);

    // Grid + Boden
    this.gridGroup = new THREE.Group();
    this.scene.add(this.gridGroup);
    this.buildGrid();

    // Blöcke
    this.blocksGroup = new THREE.Group();
    this.scene.add(this.blocksGroup);

    // Preview
    this.previewGroup = new THREE.Group();
    this.scene.add(this.previewGroup);

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);

    this._animate = () => {
      requestAnimationFrame(this._animate);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    this._animate();
  }

  buildGrid() {
    const grid = new THREE.GridHelper(GRID_SIZE, GRID_SIZE, 0x5a5f66, 0x33373d);
    grid.position.y = 0;
    this.gridGroup.add(grid);

    const planeGeo = new THREE.PlaneGeometry(GRID_SIZE, GRID_SIZE);
    planeGeo.rotateX(-Math.PI / 2);
    const planeMat = new THREE.MeshBasicMaterial({ color: 0x2a2d33, transparent: true, opacity: 0.6 });
    this.groundPlane = new THREE.Mesh(planeGeo, planeMat);
    this.groundPlane.position.y = -0.02;
    this.groundPlane.name = 'ground';
    this.gridGroup.add(this.groundPlane);
  }

  resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  addBlockMesh(block, geometry, color) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05 });
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.position.set(block.x, block.y, block.z);
    mesh.userData.blockId = block.id;
    this.blocksGroup.add(mesh);
    return mesh;
  }

  removeBlockMesh(blockId) {
    const mesh = this.blocksGroup.children.find((m) => m.userData.blockId === blockId);
    if (mesh) {
      this.blocksGroup.remove(mesh);
      mesh.material.dispose();
    }
  }

  clearBlockMeshes() {
    for (const m of [...this.blocksGroup.children]) {
      this.blocksGroup.remove(m);
      m.material.dispose();
    }
  }

  // Highlight für ausgewählte Blöcke
  setSelectionHighlight(ids) {
    for (const m of this.blocksGroup.children) {
      const selected = ids.has(m.userData.blockId);
      if (m.material.emissive) {
        // Auffälliges orange Leuchten für ausgewählte Blöcke
        m.material.emissive.setHex(selected ? 0xff8c1a : 0x000000);
        m.material.emissiveIntensity = selected ? 0.6 : 0;
      }
    }
  }

  setPreview(meshes, position) {
    // meshes: Array von { geometry, color }
    for (const m of [...this.previewGroup.children]) {
      this.previewGroup.remove(m);
      m.geometry.dispose();
      m.material.dispose();
    }
    if (!position) return;
    for (const item of meshes) {
      const mat = new THREE.MeshStandardMaterial({
        color: item.color,
        transparent: true,
        opacity: 0.45,
        roughness: 0.8,
      });
      const mesh = new THREE.Mesh(item.geometry, mat);
      mesh.position.copy(item.offset || new THREE.Vector3());
      this.previewGroup.add(mesh);
    }
    this.previewGroup.position.set(position.x, position.y, position.z);
    this.previewGroup.visible = true;
  }

  hidePreview() {
    this.previewGroup.visible = false;
  }

  // Transluzentes Rechteck für das Flächenfüllen
  setFillPreview(x1, z1, x2, z2, y, height) {
    this.clearFillPreview();
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minZ = Math.min(z1, z2);
    const maxZ = Math.max(z1, z2);
    const w = maxX - minX + 1;
    const d = maxZ - minZ + 1;
    const h = Math.max(0.1, height);
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshBasicMaterial({ color: 0x3b6ea5, transparent: true, opacity: 0.28, depthWrite: false });
    this.fillPreview = new THREE.Mesh(geo, mat);
    this.fillPreview.position.set(minX + w / 2, y + h / 2, minZ + d / 2);
    this.scene.add(this.fillPreview);
  }

  clearFillPreview() {
    if (this.fillPreview) {
      this.scene.remove(this.fillPreview);
      this.fillPreview.geometry.dispose();
      this.fillPreview.material.dispose();
      this.fillPreview = null;
    }
  }

  _setPointer(clientX, clientY) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
  }

  // Liefert die Ziel-Zelle für die Platzierung: { x, y, z } oder null.
  // Klick auf Block -> benachbarte Zelle (Stapeln). Klick auf Boden -> Y=0.
  raycastPlacement(clientX, clientY) {
    this._setPointer(clientX, clientY);
    const blockHits = this.raycaster.intersectObjects(this.blocksGroup.children, false);
    if (blockHits.length > 0) {
      const hit = blockHits[0];
      const n = hit.face.normal;
      const p = hit.point;
      const s = 0.5;
      return {
        x: Math.floor(p.x + n.x * s),
        y: Math.floor(p.y + n.y * s),
        z: Math.floor(p.z + n.z * s),
      };
    }
    const groundHits = this.raycaster.intersectObject(this.groundPlane, false);
    if (groundHits.length > 0) {
      const p = groundHits[0].point;
      return { x: Math.floor(p.x), y: 0, z: Math.floor(p.z) };
    }
    return null;
  }

  // Liefert die id des Blocks unter dem Cursor oder null.
  raycastBlock(clientX, clientY) {
    this._setPointer(clientX, clientY);
    const hits = this.raycaster.intersectObjects(this.blocksGroup.children, false);
    if (hits.length > 0) return hits[0].object.userData.blockId;
    return null;
  }

  // Liefert die Boden-Zelle unter dem Cursor oder null.
  raycastGround(clientX, clientY) {
    this._setPointer(clientX, clientY);
    const hits = this.raycaster.intersectObject(this.groundPlane, false);
    if (hits.length > 0) {
      const p = hits[0].point;
      return { x: Math.floor(p.x), z: Math.floor(p.z) };
    }
    return null;
  }

  // Welt-Punkt in Bildschirm-Koordinaten (für Tests/Debug)
  projectToScreen(x, y, z) {
    const v = new THREE.Vector3(x, y, z);
    v.project(this.camera);
    const rect = this.renderer.domElement.getBoundingClientRect();
    return {
      x: (v.x + 1) / 2 * rect.width + rect.left,
      y: (-v.y + 1) / 2 * rect.height + rect.top,
    };
  }

  resetCamera() {
    this.camera.position.set(14, 12, 14);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  dispose() {
    window.removeEventListener('resize', this._onResize);
    this.renderer.dispose();
  }
}
