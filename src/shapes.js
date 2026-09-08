import * as THREE from 'three';
import { shapeMap } from './shapeDefs.js';

const geoCache = new Map();

function buildBaseGeometry(def) {
  if (def.type === 'box') {
    const { pos, size } = def.box;
    const geo = new THREE.BoxGeometry(size[0], size[1], size[2]);
    geo.translate(pos[0] + size[0] / 2, pos[1] + size[1] / 2, pos[2] + size[2] / 2);
    return geo;
  }
  if (def.type === 'prism') {
    const shape = new THREE.Shape();
    def.profile.forEach((p, i) => {
      if (i === 0) shape.moveTo(p[0], p[1]);
      else shape.lineTo(p[0], p[1]);
    });
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: def.depth, bevelEnabled: false });
    return geo;
  }
  throw new Error('Unbekannter Form-Typ: ' + def.type);
}

// Liefert { geometry, footprint } für eine Form mit gegebener Drehung.
// Die Geometrie liegt im lokalen Raum, Bounding-Box von (0,0,0) bis footprint.
// rotY: 0-3 (90°-Schritte um Y, horizontal)
// rotX: 0-3 (90°-Schritte um X, vertikal)
export function getRotatedGeometry(shapeId, rotY = 0, rotX = 0) {
  const key = `${shapeId}_${rotY % 4}_${rotX % 4}`;
  if (geoCache.has(key)) return geoCache.get(key);
  const def = shapeMap[shapeId];
  if (!def) throw new Error('Unbekannte Form: ' + shapeId);

  let geo = buildBaseGeometry(def);
  const fp = def.footprint;
  // Um das Zentrum des Footprints drehen, danach neu an (0,0,0) ausrichten
  geo.translate(-fp.x / 2, -fp.y / 2, -fp.z / 2);
  if (rotY % 4) geo.rotateY((rotY % 4) * (Math.PI / 2));
  if (rotX % 4) geo.rotateX((rotX % 4) * (Math.PI / 2));
  geo.computeBoundingBox();
  const min = geo.boundingBox.min.clone();
  geo.translate(-min.x, -min.y, -min.z);
  geo.computeBoundingBox();
  const max = geo.boundingBox.max;
  const footprint = {
    x: Math.max(1, Math.round(max.x)),
    y: Math.max(1, Math.round(max.y)),
    z: Math.max(1, Math.round(max.z)),
  };
  const result = { geometry: geo, footprint };
  geoCache.set(key, result);
  return result;
}

export function getShapeColor(shapeId) {
  return shapeMap[shapeId]?.color || '#888888';
}
