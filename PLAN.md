# Voxel Building Tool — Plan

Building-Tool für 7dtd-Designs (Browser, lokal). Nur Design- & Test-Tool, kein 7dtd-Export.

## Status: ✅ Implementiert & getestet
Alle 3 Phasen sind umgesetzt. Headless-Test (`npm test`) läuft fehlerfrei durch:
Platzieren, Y/X-Drehung, Auswahl (Raycast), Löschen, Undo/Redo, Flächenfüllen, Baugruppen.

**Start:** `npm run dev` → http://localhost:5173 · **Build:** `npm run build` → `dist/`

### Bedienung (kurz)
- **Klick** = platzieren (auf Boden oder an Blockfläche = stapeln)
- **Strg+Klick** = Block auswählen (wird orange markiert) · **Strg+Ziehen** = Fläche füllen / Blöcke markieren
- **←/→** = Y-Drehung · **↑/↓** = X-Drehung (Preview oder ausgewählter Block)
- **⟲ Reset** = Drehung des gewählten Blocks zurücksetzen (oder der Form-Vorschau, falls keiner gewählt)
- **Entf** = Auswahl löschen · **Strg+Z / Strg+Shift+Z** = Undo/Redo
- **Baugruppen:** Blöcke mit Strg+Klick markieren → Button „⧉ Gruppe (n)" → Name eingeben.
  Gruppe in der Palette anklicken = nutzen, Rechtsklick = löschen. Pfeiltasten drehen die Gruppe.
- **Neue Form:** Eintrag in `src/shapeDefs.js` (Box oder Prisma) — erscheint automatisch in der Palette.

### Features (Stand)
- **3D-Vorschau** jeder Form in der Palette (eigener Renderer, `src/preview.js`).
- **Sichtbare Auswahl:** gewählte Blöcke leuchten orange; Button zeigt Anzahl „⧉ Gruppe (n)".
- **Reset** mit Toast-Feedback in allen Fällen.
- **Gruppen-Hinweis** in der Palette, solange keine Gruppe existiert.

## Bestätigte Entscheidungen
- **Ziel:** Nur Design- & Test-Tool (kein 7dtd-Export).
- **Technik:** Vite + Vanilla JS (ES-Module) + Three.js. Kein Framework-Overhead, Three.js lokal gebündelt (offline), Dev-Server, Build zu statischen Dateien.
- **Koordinaten:** Y ist hoch (wie 7dtd/Minecraft), Bauen auf der X-Z-Ebene.
- **Baugruppen:** Einfach (Elemente bündeln, als Ganzes platzieren & drehen).

## Projektstruktur
```
voxeleditor/
  index.html
  package.json
  vite.config.js
  src/
    main.js        # Einstieg: Scene, Kamera, Renderer, UI verdrahten
    scene.js       # Three.js-Scene, Licht, Grid/Boden
    shapes.js      # Geometrie-Generierung (Boxen, Prismen)
    shapeDefs.js   # datengetriebene Form-Definitionen (erweiterbar)
    editor.js      # Kernlogik: platzieren, auswählen, löschen, drehen, füllen
    groups.js      # Baugruppen
    state.js       # State + Undo/Redo
    ui.js          # Panels: Formen-Palette, Baugruppen-Fenster, Toolbar
```

## Formensystem (datengetrieben & erweiterbar)
Jede Form = JSON-artige Definition in `shapeDefs.js`; das Tool lädt sie und generiert die Geometrie. Neue Form = neuer Eintrag, kein Code (analog 7dtd).

**Modell:** Jede Form ist ein Prisma = 2D-Profil, das entlang einer Achse über die volle Voxel-Länge durchläuft (kein Beschnitt).

**Start-Formen:**
| ID | Name | Geometrie | Footprint (Voxel) |
|----|------|-----------|-------------------|
| `cube` | Kubus | Box 1×1×1 | 1×1×1 |
| `half` | Halbkubus | flache Box 1×1×0.5 (Stufe) | 1×1×1 |
| `slope` | Schräge | Dreiecks-Prisma, Steigung 1 über 1 Block (45°) | 1×1×1 |
| `ramp2` | Rampe 2 | Dreiecks-Prisma, Steigung 1 über 2 Blöcke | 2×1×1 |
| `ramp4` | Rampe 4 | Steigung 1 über 4 Blöcke | 4×1×1 |
| `ramp6` | Rampe 6 | Steigung 1 über 6 Blöcke | 6×1×1 |

## Funktionen nach Phasen
- **Phase 1 (MVP):** 3D-Ansicht (Orbit-Kamera), Grid/Boden, Formen-Palette, Platzieren (Klick), Pfeiltasten-Drehung, Löschen, Undo/Redo.
- **Phase 2:** Mehrfachauswahl + Löschen (Strg+Ziehen, Klick zum Hinzufügen), Flächenfüllen (Strg+Maus ziehen → Raster aufziehen → füllen), Reset (Position neutral).
- **Phase 3:** Baugruppen-Fenster — Elemente bündeln, als ein Baustein im Hauptfenster platzieren, Gruppe ganz drehen.

## Steuerung
- **Klick:** Form platzieren.
- **Pfeil ←/→:** 90°-Drehung um Y (horizontal, „Würfeldrehung").
- **Pfeil ↑/↓:** 90°-Drehung um eine horizontale Achse (vertikal).
- **Strg + Maus ziehen:** Bereich auswählen / Fläche füllen.
- **Klick (Strg gedrückt / Baustein gewählt):** weiteren Block hinzufügen.
- **Entf:** Auswahl entfernen. **Reset-Taste:** Position neutral. **Strg+Z / Strg+Shift+Z:** Undo/Redo.

## Bestätigte Klärungen
1. Rampen = Steigung 1 Block über N Blöcke (flacher je mehr Blöcke).
2. Vertikale Drehung (↑/↓) = 90° um horizontale Achse.
3. 6 Start-Formen wie Tabelle.
4. Überlappung → verweigern (nicht platzieren).
