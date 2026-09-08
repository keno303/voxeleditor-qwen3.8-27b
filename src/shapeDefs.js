// Datengetriebene Form-Definitionen.
// Neue Form = neuer Eintrag in diesem Array (kein Code nötig).
//
// Koordinatenkonvention: Y ist hoch. Lokaler Raum jeder Form:
//   Bounding-Box von (0,0,0) bis footprint.
//
// type 'box':
//   box = { pos:[x,y,z], size:[w,h,d] }  (Box innerhalb des Footprints)
// type 'prism':
//   profile = [[x,y], ...]  (2D-Polygon in der X-Y-Ebene)
//   depth   = Extrusionslänge entlang Z (läuft vollständig durch)

export const shapeDefs = [
  {
    id: 'cube',
    name: 'Kubus',
    color: '#9aa0a6',
    type: 'box',
    footprint: { x: 1, y: 1, z: 1 },
    box: { pos: [0, 0, 0], size: [1, 1, 1] },
  },
  {
    id: 'half',
    name: 'Halbkubus',
    color: '#b0b6bd',
    type: 'box',
    footprint: { x: 1, y: 1, z: 1 },
    box: { pos: [0, 0, 0], size: [1, 0.5, 1] },
  },
  {
    id: 'slope',
    name: 'Schräge',
    color: '#c2c8cf',
    type: 'prism',
    footprint: { x: 1, y: 1, z: 1 },
    profile: [[0, 0], [1, 0], [0, 1]],
    depth: 1,
  },
  {
    id: 'ramp2',
    name: 'Rampe 2',
    color: '#d3d8de',
    type: 'prism',
    footprint: { x: 2, y: 1, z: 1 },
    profile: [[0, 0], [2, 0], [0, 1]],
    depth: 1,
  },
  {
    id: 'ramp4',
    name: 'Rampe 4',
    color: '#e2e6ea',
    type: 'prism',
    footprint: { x: 4, y: 1, z: 1 },
    profile: [[0, 0], [4, 0], [0, 1]],
    depth: 1,
  },
  {
    id: 'ramp6',
    name: 'Rampe 6',
    color: '#f0f2f4',
    type: 'prism',
    footprint: { x: 6, y: 1, z: 1 },
    profile: [[0, 0], [6, 0], [0, 1]],
    depth: 1,
  },
];

export const shapeMap = Object.fromEntries(shapeDefs.map((s) => [s.id, s]));
