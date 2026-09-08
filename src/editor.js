import * as THREE from 'three';
import { getRotatedGeometry, getShapeColor } from './shapes.js';
import { getGroupBlocks } from './groups.js';

const DRAG_THRESHOLD = 5; // px

export class Editor {
  constructor(scene, state) {
    this.scene = scene;
    this.state = state;
    this.ui = null;

    this.activeItem = { type: 'shape', id: 'cube' };
    this.previewRotY = 0;
    this.previewRotX = 0;
    this.selectedBlockId = null;
    this.selection = new Set();

    this.interaction = null; // null | 'fill' | 'select'
    this.fillStart = null;
    this.downPos = null;
    this.lastPointer = null;

    this.refresh();
  }

  // --- Aktives Element ---
  setActiveItem(type, id) {
    this.activeItem = { type, id };
    this.previewRotY = 0;
    this.previewRotX = 0;
    this.selectedBlockId = null;
    this.selection.clear();
    if (this.lastPointer) this.updatePreview(this.lastPointer.clientX, this.lastPointer.clientY);
    this.refresh();
  }

  // --- Platzierung ---
  placeAt(x, y, z) {
    if (this.activeItem.type === 'shape') {
      const { geometry, footprint } = getRotatedGeometry(this.activeItem.id, this.previewRotY, this.previewRotX);
      if (this.state.isOccupied(x, y, z, footprint)) {
        this.ui?.showToast('Belegt – Platzierung verweigert');
        return false;
      }
      this.state.pushHistory();
      this.state.addBlock({
        shapeId: this.activeItem.id, x, y, z,
        rotY: this.previewRotY, rotX: this.previewRotX,
        footprint: { ...footprint }, groupId: null,
      });
      this.refresh();
      return true;
    }
    if (this.activeItem.type === 'group') {
      return this.placeGroup(this.activeItem.id, x, y, z);
    }
    return false;
  }

  placeGroup(groupId, x, y, z) {
    const group = this.state.groups.get(groupId);
    if (!group) return false;
    const blocks = getGroupBlocks(group, this.previewRotY, this.previewRotX);
    for (const b of blocks) {
      if (this.state.isOccupied(x + b.dx, y + b.dy, z + b.dz, b.footprint)) {
        this.ui?.showToast('Belegt – Platzierung verweigert');
        return false;
      }
    }
    this.state.pushHistory();
    for (const b of blocks) {
      this.state.addBlock({
        shapeId: b.shapeId,
        x: x + b.dx, y: y + b.dy, z: z + b.dz,
        rotY: b.rotY, rotX: b.rotX,
        footprint: { ...b.footprint }, groupId: null,
      });
    }
    this.refresh();
    this.ui?.showToast(`Gruppe „${group.name}" platziert`);
    return true;
  }

  // --- Drehung ---
  rotateActive(dir) {
    if (this.selectedBlockId != null && this.state.getBlock(this.selectedBlockId)) {
      this.rotateBlock(this.selectedBlockId, dir);
    } else {
      this.rotatePreview(dir);
    }
  }

  rotatePreview(dir) {
    if (dir === 'left') this.previewRotY = (this.previewRotY + 3) % 4;
    else if (dir === 'right') this.previewRotY = (this.previewRotY + 1) % 4;
    else if (dir === 'up') this.previewRotX = (this.previewRotX + 1) % 4;
    else if (dir === 'down') this.previewRotX = (this.previewRotX + 3) % 4;
    this.ui?.updateRotationInfo(this.previewRotY, this.previewRotX);
    if (this.lastPointer) this.updatePreview(this.lastPointer.clientX, this.lastPointer.clientY);
  }

  // Zeigt die relevante Drehung an: ausgewählter Block, sonst die Form-Vorschau
  updateRotationInfo() {
    if (this.selectedBlockId != null) {
      const block = this.state.getBlock(this.selectedBlockId);
      if (block) {
        this.ui?.updateRotationInfo(block.rotY, block.rotX);
        return;
      }
    }
    this.ui?.updateRotationInfo(this.previewRotY, this.previewRotX);
  }

  rotateBlock(id, dir) {
    const block = this.state.getBlock(id);
    if (!block) return;
    const oldRotY = block.rotY;
    const oldRotX = block.rotX;
    if (dir === 'left') block.rotY = (block.rotY + 3) % 4;
    else if (dir === 'right') block.rotY = (block.rotY + 1) % 4;
    else if (dir === 'up') block.rotX = (block.rotX + 1) % 4;
    else if (dir === 'down') block.rotX = (block.rotX + 3) % 4;
    const { footprint } = getRotatedGeometry(block.shapeId, block.rotY, block.rotX);
    if (this.state.isOccupied(block.x, block.y, block.z, footprint, block.id)) {
      block.rotY = oldRotY;
      block.rotX = oldRotX;
      this.ui?.showToast('Drehung verweigert (Belegung)');
      return;
    }
    block.footprint = { ...footprint };
    this.state.pushHistory();
    this.ui?.updateRotationInfo(block.rotY, block.rotX);
    this.refresh();
  }

  // --- Auswahl & Löschen ---
  selectBlock(id, additive) {
    if (!additive) this.selection.clear();
    if (additive && this.selection.has(id)) {
      this.selection.delete(id);
    } else {
      this.selection.add(id);
    }
    this.selectedBlockId = id;
    this.refresh();
  }

  deleteSelection() {
    if (this.selection.size === 0) return;
    this.state.pushHistory();
    this.state.removeBlocks([...this.selection]);
    this.selection.clear();
    this.selectedBlockId = null;
    this.refresh();
  }

  resetSelected() {
    // 1) Wenn ein Block ausgewählt ist: seine Drehung zurücksetzen
    if (this.selectedBlockId != null) {
      const block = this.state.getBlock(this.selectedBlockId);
      if (block) {
        if (block.rotY === 0 && block.rotX === 0) {
          this.ui?.showToast('Block ist bereits neutral gedreht');
          return;
        }
        this.state.pushHistory();
        block.rotY = 0;
        block.rotX = 0;
        const { footprint } = getRotatedGeometry(block.shapeId, 0, 0);
        block.footprint = { ...footprint };
        this.refresh();
        this.updateRotationInfo();
        this.ui?.showToast('Drehung des Blocks neutral gesetzt');
        return;
      }
    }
    // 2) Andernfalls: Drehung der aktiven Form (Vorschau) zurücksetzen
    if (this.previewRotY !== 0 || this.previewRotX !== 0) {
      this.previewRotY = 0;
      this.previewRotX = 0;
      this.updateRotationInfo();
      if (this.lastPointer) this.updatePreview(this.lastPointer.clientX, this.lastPointer.clientY);
      this.ui?.showToast('Drehung der Form neutral gesetzt');
    } else {
      this.ui?.showToast('Nichts zu setzen – kein Block gewählt und Form ist bereits neutral');
    }
  }

  clearAll() {
    if (this.state.allBlocks().length === 0) return;
    this.state.pushHistory();
    this.state.removeBlocks(this.state.allBlocks().map((b) => b.id));
    this.selection.clear();
    this.selectedBlockId = null;
    this.refresh();
  }

  // --- Flächenfüllen ---
  fillRect(x1, z1, x2, z2, y = 0) {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minZ = Math.min(z1, z2);
    const maxZ = Math.max(z1, z2);
    const { footprint } = getRotatedGeometry(this.activeItem.id, this.previewRotY, this.previewRotX);
    this.state.pushHistory();
    let placed = 0;
    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        if (this.state.isOccupied(x, y, z, footprint)) continue;
        this.state.addBlock({
          shapeId: this.activeItem.id, x, y, z,
          rotY: this.previewRotY, rotX: this.previewRotX,
          footprint: { ...footprint }, groupId: null,
        });
        placed++;
      }
    }
    this.refresh();
    this.ui?.showToast(`${placed} Blöcke platziert`);
    return placed;
  }

  // --- Baugruppen ---
  createGroupFromSelection(name) {
    if (this.selection.size === 0) {
      this.ui?.showToast('Keine Blöcke ausgewählt (Strg+Klick)');
      return null;
    }
    const blocks = [...this.selection].map((id) => this.state.getBlock(id)).filter(Boolean);
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    for (const b of blocks) {
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      minZ = Math.min(minZ, b.z);
    }
    const group = {
      id: this.state.nextGroupId++,
      name: name || `Gruppe ${this.state.groups.size + 1}`,
      blocks: blocks.map((b) => ({
        shapeId: b.shapeId,
        dx: b.x - minX, dy: b.y - minY, dz: b.z - minZ,
        rotY: b.rotY, rotX: b.rotX,
        footprint: { ...b.footprint },
      })),
    };
    this.state.groups.set(group.id, group);
    this.selection.clear();
    this.selectedBlockId = null;
    this.refresh();
    this.ui?.refreshGroupList();
    this.ui?.showToast(`Gruppe „${group.name}" erstellt (${group.blocks.length} Blöcke)`);
    return group;
  }

  deleteGroup(groupId) {
    this.state.groups.delete(groupId);
    if (this.activeItem.type === 'group' && this.activeItem.id === groupId) {
      this.activeItem = { type: 'shape', id: 'cube' };
    }
    this.refresh();
    this.ui?.refreshGroupList();
  }

  // --- Preview ---
  buildPreviewMeshes() {
    if (this.activeItem.type === 'shape') {
      const { geometry } = getRotatedGeometry(this.activeItem.id, this.previewRotY, this.previewRotX);
      return [{ geometry, color: getShapeColor(this.activeItem.id), offset: new THREE.Vector3() }];
    }
    if (this.activeItem.type === 'group') {
      const group = this.state.groups.get(this.activeItem.id);
      if (!group) return [];
      return getGroupBlocks(group, this.previewRotY, this.previewRotX).map((b) => ({
        geometry: b.geometry,
        color: getShapeColor(b.shapeId),
        offset: new THREE.Vector3(b.dx, b.dy, b.dz),
      }));
    }
    return [];
  }

  updatePreview(clientX, clientY) {
    this.lastPointer = { clientX, clientY };
    if (this.interaction) return;
    const target = this.scene.raycastPlacement(clientX, clientY);
    if (!target) {
      this.scene.hidePreview();
      return;
    }
    this.scene.setPreview(this.buildPreviewMeshes(), target);
  }

  // --- Maus-Interaktion ---
  onPointerDown(clientX, clientY, ctrlKey) {
    this.downPos = { x: clientX, y: clientY };
    if (ctrlKey) {
      const blockId = this.scene.raycastBlock(clientX, clientY);
      if (blockId != null) {
        this.interaction = 'select';
        this.selectBlock(blockId, true);
      } else {
        const g = this.scene.raycastGround(clientX, clientY);
        if (g) {
          this.interaction = 'fill';
          this.fillStart = { x: g.x, z: g.z };
          this.scene.hidePreview();
        }
      }
    }
  }

  onPointerMove(clientX, clientY, ctrlKey) {
    if (this.interaction === 'fill') {
      const g = this.scene.raycastGround(clientX, clientY);
      if (g && this.fillStart) {
        const { footprint } = getRotatedGeometry(this.activeItem.id, this.previewRotY, this.previewRotX);
        this.scene.setFillPreview(this.fillStart.x, this.fillStart.z, g.x, g.z, 0, footprint.y);
      }
    } else if (this.interaction === 'select') {
      const blockId = this.scene.raycastBlock(clientX, clientY);
      if (blockId != null && !this.selection.has(blockId)) {
        this.selection.add(blockId);
        this.selectedBlockId = blockId;
        this.scene.setSelectionHighlight(this.selection);
      }
    } else {
      this.updatePreview(clientX, clientY);
    }
  }

  onPointerUp(clientX, clientY, ctrlKey) {
    const wasClick =
      this.downPos &&
      Math.abs(clientX - this.downPos.x) < DRAG_THRESHOLD &&
      Math.abs(clientY - this.downPos.y) < DRAG_THRESHOLD;

    if (this.interaction === 'fill') {
      const g = this.scene.raycastGround(clientX, clientY);
      this.scene.clearFillPreview();
      if (g && this.fillStart) {
        this.fillRect(this.fillStart.x, this.fillStart.z, g.x, g.z, 0);
      }
      this.interaction = null;
      this.fillStart = null;
    } else if (this.interaction === 'select') {
      this.interaction = null;
    } else if (wasClick && !ctrlKey) {
      const target = this.scene.raycastPlacement(clientX, clientY);
      if (target) this.placeAt(target.x, target.y, target.z);
    }

    this.downPos = null;
  }

  // --- Refresh ---
  refresh() {
    this.scene.clearBlockMeshes();
    for (const block of this.state.allBlocks()) {
      const { geometry } = getRotatedGeometry(block.shapeId, block.rotY, block.rotX);
      this.scene.addBlockMesh(block, geometry, getShapeColor(block.shapeId));
    }
    this.scene.setSelectionHighlight(this.selection);
    this.ui?.updateToolbar();
  }

  undo() {
    if (this.state.undo()) {
      this.selection.clear();
      this.selectedBlockId = null;
      this.refresh();
    }
  }

  redo() {
    if (this.state.redo()) {
      this.selection.clear();
      this.selectedBlockId = null;
      this.refresh();
    }
  }
}
