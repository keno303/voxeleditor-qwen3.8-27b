// Zentrales Datenmodell + Undo/Redo-Historie.

export class State {
  constructor() {
    this.blocks = new Map(); // id -> block
    this.groups = new Map(); // id -> group
    this.nextBlockId = 1;
    this.nextGroupId = 1;
    this.undoStack = [];
    this.redoStack = [];
    this.onChange = null; // Callback nach Änderungen
  }

  snapshot() {
    return {
      blocks: [...this.blocks.values()].map((b) => ({ ...b, footprint: { ...b.footprint } })),
      groups: [...this.groups.values()].map((g) => ({
        ...g,
        blocks: g.blocks.map((b) => ({ ...b, footprint: { ...b.footprint } })),
      })),
      nextBlockId: this.nextBlockId,
      nextGroupId: this.nextGroupId,
    };
  }

  restore(snap) {
    this.blocks = new Map(snap.blocks.map((b) => [b.id, { ...b, footprint: { ...b.footprint } }]));
    this.groups = new Map(
      snap.groups.map((g) => [
        g.id,
        { ...g, blocks: g.blocks.map((b) => ({ ...b, footprint: { ...b.footprint } })) },
      ])
    );
    this.nextBlockId = snap.nextBlockId;
    this.nextGroupId = snap.nextGroupId;
    if (this.onChange) this.onChange();
  }

  pushHistory() {
    this.undoStack.push(this.snapshot());
    if (this.undoStack.length > 100) this.undoStack.shift();
    this.redoStack = [];
  }

  undo() {
    if (this.undoStack.length === 0) return false;
    this.redoStack.push(this.snapshot());
    this.restore(this.undoStack.pop());
    return true;
  }

  redo() {
    if (this.redoStack.length === 0) return false;
    this.undoStack.push(this.snapshot());
    this.restore(this.redoStack.pop());
    return true;
  }

  canUndo() {
    return this.undoStack.length > 0;
  }
  canRedo() {
    return this.redoStack.length > 0;
  }

  addBlock(block) {
    block.id = this.nextBlockId++;
    this.blocks.set(block.id, block);
    return block;
  }

  removeBlock(id) {
    this.blocks.delete(id);
  }

  removeBlocks(ids) {
    for (const id of ids) this.blocks.delete(id);
  }

  getBlock(id) {
    return this.blocks.get(id);
  }

  allBlocks() {
    return [...this.blocks.values()];
  }

  // Prüft, ob der Footprint bei (x,y,z) mit einem vorhandenen Block kollidiert.
  isOccupied(x, y, z, footprint, ignoreId = null) {
    for (const b of this.blocks.values()) {
      if (b.id === ignoreId) continue;
      const ox = x < b.x + b.footprint.x && b.x < x + footprint.x;
      const oy = y < b.y + b.footprint.y && b.y < y + footprint.y;
      const oz = z < b.z + b.footprint.z && b.z < z + footprint.z;
      if (ox && oy && oz) return true;
    }
    return false;
  }
}
