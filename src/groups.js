import { getRotatedGeometry } from './shapes.js';

// Berechnet die Blöcke einer Gruppe unter Berücksichtigung der Gruppengruppen-Drehung.
// Liefert Array von { shapeId, dx, dy, dz, rotY, rotX, footprint, geometry }.
// Die Gruppe wird so normalisiert, dass ihre unterste Ecke bei (0,0,0) liegt.
export function getGroupBlocks(group, gRotY = 0, gRotX = 0) {
  let blocks = group.blocks.map((b) => ({ ...b }));
  const ry = ((gRotY % 4) + 4) % 4;
  const rx = ((gRotX % 4) + 4) % 4;

  if (ry || rx) {
    blocks = blocks.map((b) => {
      let { dx, dy, dz } = b;
      if (ry === 1) { const t = dx; dx = dz; dz = -t; }
      else if (ry === 2) { dx = -dx; dz = -dz; }
      else if (ry === 3) { const t = dx; dx = -dz; dz = t; }
      if (rx === 1) { const t = dy; dy = dz; dz = -t; }
      else if (rx === 2) { dy = -dy; dz = -dz; }
      else if (rx === 3) { const t = dy; dy = -dz; dz = t; }
      return { ...b, dx, dy, dz, rotY: (b.rotY + ry) % 4, rotX: (b.rotX + rx) % 4 };
    });
  }

  // Neu normalisieren: min-Ecke nach (0,0,0)
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  for (const b of blocks) {
    minX = Math.min(minX, b.dx);
    minY = Math.min(minY, b.dy);
    minZ = Math.min(minZ, b.dz);
  }
  for (const b of blocks) {
    b.dx -= minX;
    b.dy -= minY;
    b.dz -= minZ;
    const { geometry, footprint } = getRotatedGeometry(b.shapeId, b.rotY, b.rotX);
    b.geometry = geometry;
    b.footprint = footprint;
  }
  return blocks;
}
