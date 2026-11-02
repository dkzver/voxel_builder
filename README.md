# Лунная База

Browser-based 3D lunar exploration prototype (HTML/CSS/JavaScript + Three.js).

## Stage 01 — lunar world and rover

Implemented in `stage/01-lunar-world-rover`:
- Third-person 3D camera and a blockout lunar rover.
- Procedural low-poly rocky landscape and collectible mineral deposits.
- Keyboard rover driving, mouse camera look, basic energy and ore HUD.
- Main menu, pause menu, and adjustable mouse sensitivity / rover speed.

## Controls
- `W` / `S` — forward / reverse
- `A` / `D` — steering
- Mouse — camera look (click the canvas to lock pointer)
- `E` — mine nearby mineral node
- `Esc` — pause / resume

## Run locally
The project uses ES modules and imports Three.js from jsDelivr CDN. Start a local static server in repository root:

```bash
python -m http.server 8000
```

Open `http://localhost:8000` in a modern browser. Internet connection is needed for the CDN dependency.

## Roadmap
- Stage 01: playable rover and lunar environment blockout.
- Stage 02: base construction and interactive modules.
- Stage 03: resource inventory, mining tools, crafting and progression.
- Stage 04: persistence, polish and validation.

This is an initial playable prototype, not yet the full feature-complete game.