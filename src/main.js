import { Scene } from './scene.js';
import { State } from './state.js';
import { Editor } from './editor.js';
import { UI } from './ui.js';

const container = document.getElementById('viewport');
const scene = new Scene(container);
const state = new State();
const editor = new Editor(scene, state);
const ui = new UI(editor);
editor.ui = ui;

const dom = scene.renderer.domElement;

dom.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  editor.onPointerDown(e.clientX, e.clientY, e.ctrlKey || e.metaKey);
});
dom.addEventListener('pointermove', (e) => {
  editor.onPointerMove(e.clientX, e.clientY, e.ctrlKey || e.metaKey);
});
dom.addEventListener('pointerup', (e) => {
  if (e.button !== 0) return;
  editor.onPointerUp(e.clientX, e.clientY, e.ctrlKey || e.metaKey);
});
dom.addEventListener('pointerleave', () => {
  editor.lastPointer = null;
  scene.hidePreview();
  scene.clearFillPreview();
});

// Ctrl/Meta: OrbitControls deaktivieren (für Strg+Ziehen)
window.addEventListener('keydown', (e) => {
  if (e.key === 'Control' || e.key === 'Meta') scene.controls.enabled = false;

  if (e.key === 'ArrowLeft') { e.preventDefault(); editor.rotateActive('left'); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); editor.rotateActive('right'); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); editor.rotateActive('up'); }
  else if (e.key === 'ArrowDown') { e.preventDefault(); editor.rotateActive('down'); }
  else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); editor.deleteSelection(); }
  else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    if (e.shiftKey) editor.redo();
    else editor.undo();
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
    e.preventDefault();
    editor.redo();
  } else if (e.key.toLowerCase() === 'r' && !e.ctrlKey && !e.metaKey) {
    editor.resetSelected();
  } else if (e.key === 'Escape') {
    editor.selection.clear();
    editor.selectedBlockId = null;
    editor.refresh();
  }
});
window.addEventListener('keyup', (e) => {
  if (e.key === 'Control' || e.key === 'Meta') scene.controls.enabled = true;
});

// Initiale Preview in der Mitte
editor.updatePreview(container.clientWidth / 2, container.clientHeight / 2);
ui.updateRotationInfo(0, 0);

// 3D-Vorschauen für die Formen-Palette (asynchron)
ui.loadPreviews();

// Debug-Hooks (lokal)
window.__editor = editor;
window.__state = state;
window.__scene = scene;
