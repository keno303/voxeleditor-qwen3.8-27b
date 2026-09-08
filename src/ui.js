import { shapeDefs, shapeMap } from './shapeDefs.js';
import { renderShapePreviews } from './preview.js';

export class UI {
  constructor(editor) {
    this.editor = editor;
    this.el = {
      shapeList: document.getElementById('shape-list'),
      groupList: document.getElementById('group-list'),
      activeShapeName: document.getElementById('active-shape-name'),
      rotInfo: document.getElementById('rot-info'),
      hud: document.getElementById('hud'),
      toast: document.getElementById('toast'),
      btnUndo: document.getElementById('btn-undo'),
      btnRedo: document.getElementById('btn-redo'),
      btnReset: document.getElementById('btn-reset'),
      btnDelete: document.getElementById('btn-delete'),
      btnClear: document.getElementById('btn-clear'),
      btnGroups: document.getElementById('btn-groups'),
    };
    this._toastTimer = null;
    this._previews = {};
    this.buildShapePalette();
    this.bindToolbar();
    this.refreshGroupList();
    this.updateToolbar();
  }

  // 3D-Vorschauen asynchron erzeugen, damit der Start nicht blockiert
  async loadPreviews() {
    this._previews = renderShapePreviews(shapeDefs.map((d) => d.id));
    for (const item of this.el.shapeList.children) {
      const id = item.dataset.shapeId;
      const img = item.querySelector('.preview');
      if (img && this._previews[id]) img.src = this._previews[id];
    }
  }

  buildShapePalette() {
    this.el.shapeList.innerHTML = '';
    for (const def of shapeDefs) {
      const item = document.createElement('div');
      item.className = 'shape-item';
      item.dataset.shapeId = def.id;
      const img = document.createElement('img');
      img.className = 'preview';
      img.alt = def.name;
      img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72"><rect width="72" height="72" fill="${def.color}" opacity="0.25"/></svg>`
      );
      const name = document.createElement('div');
      name.className = 'name';
      name.textContent = def.name;
      item.appendChild(img);
      item.appendChild(name);
      item.addEventListener('click', () => {
        this.editor.setActiveItem('shape', def.id);
        this.updateActiveShape();
        this.updateRotationInfo(0, 0);
      });
      this.el.shapeList.appendChild(item);
    }
    this.updateActiveShape();
  }

  updateActiveShape() {
    const { type, id } = this.editor.activeItem;
    for (const item of this.el.shapeList.children) {
      item.classList.toggle('active', type === 'shape' && item.dataset.shapeId === id);
    }
    for (const item of this.el.groupList.children) {
      item.classList.toggle('active', type === 'group' && String(item.dataset.groupId) === String(id));
    }
    if (type === 'shape') {
      this.el.activeShapeName.textContent = shapeMap[id] ? shapeMap[id].name : id;
    } else {
      const group = this.editor.state.groups.get(id);
      this.el.activeShapeName.textContent = group ? group.name : id;
    }
  }

  refreshGroupList() {
    this.el.groupList.innerHTML = '';
    const groups = [...this.editor.state.groups.values()];
    if (groups.length === 0) {
      const hint = document.createElement('div');
      hint.className = 'group-hint';
      hint.textContent = 'Noch keine Gruppen. Blöcke mit Strg+Klick markieren, dann „⧉ Gruppe" klicken.';
      this.el.groupList.appendChild(hint);
    }
    for (const group of groups) {
      const item = document.createElement('div');
      item.className = 'group-item';
      item.dataset.groupId = group.id;
      const label = document.createElement('div');
      label.textContent = group.name;
      const meta = document.createElement('div');
      meta.style.cssText = 'font-size:11px;color:#888;';
      meta.textContent = `${group.blocks.length} Blöcke · Klick: nutzen · Rechtsklick: löschen`;
      item.appendChild(label);
      item.appendChild(meta);
      item.addEventListener('click', () => {
        this.editor.setActiveItem('group', group.id);
        this.updateActiveShape();
        this.updateRotationInfo(0, 0);
      });
      item.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.editor.deleteGroup(group.id);
      });
      this.el.groupList.appendChild(item);
    }
    this.updateActiveShape();
  }

  bindToolbar() {
    this.el.btnUndo.addEventListener('click', () => this.editor.undo());
    this.el.btnRedo.addEventListener('click', () => this.editor.redo());
    this.el.btnReset.addEventListener('click', () => this.editor.resetSelected());
    this.el.btnDelete.addEventListener('click', () => this.editor.deleteSelection());
    this.el.btnClear.addEventListener('click', () => {
      if (confirm('Wirklich alle Blöcke löschen?')) this.editor.clearAll();
    });
    this.el.btnGroups.addEventListener('click', () => {
      if (this.editor.selection.size === 0) {
        this.showToast('Zuerst Blöcke mit STRG+Klick markieren, dann hier klicken.');
        return;
      }
      const name = prompt('Name für neue Baugruppe (' + this.editor.selection.size + ' Blöcke):', `Gruppe ${this.editor.state.groups.size + 1}`);
      if (name !== null) this.editor.createGroupFromSelection(name.trim() || undefined);
    });
  }

  updateToolbar() {
    this.el.btnUndo.disabled = !this.editor.state.canUndo();
    this.el.btnRedo.disabled = !this.editor.state.canRedo();
    const sel = this.editor.selection.size;
    this.el.btnGroups.textContent = sel > 0 ? `⧉ Gruppe (${sel})` : '⧉ Gruppe';
    this.el.btnDelete.disabled = sel === 0;
    this.updateActiveShape();
    this.updateHud();
  }

  updateRotationInfo(rotY, rotX) {
    this.el.rotInfo.textContent = `Y:${rotY * 90}° X:${rotX * 90}°`;
  }

  updateHud() {
    const count = this.editor.state.allBlocks().length;
    const sel = this.editor.selection.size;
    const selLine = sel > 0
      ? `<span style="color:#ffb454">Auswahl: ${sel} Blöcke</span>`
      : 'Auswahl: 0';
    this.el.hud.innerHTML =
      `Blöcke: ${count} · ${selLine}<br>` +
      `Klick: platzieren · <b>Strg+Klick: auswählen</b><br>` +
      `<b>Strg+Ziehen</b>: Fläche füllen / Blöcke markieren<br>` +
      `←/→: Y-Drehung · ↑/↓: X-Drehung · R: Reset<br>` +
      `Entf: löschen · Strg+Z / Strg+Shift+Z: Undo/Redo`;
  }

  showToast(msg) {
    this.el.toast.textContent = msg;
    this.el.toast.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => this.el.toast.classList.remove('show'), 2200);
  }
}
