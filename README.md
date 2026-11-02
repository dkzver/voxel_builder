# Лунная База — автономный статичный проект

Browser-based lunar rover prototype using plain HTML, CSS, JavaScript and native WebGL.

## Offline / static mode
- No backend server, account service, or game server is needed.
- No external CDN or library import is used. Rendering is implemented directly using WebGL.
- The app can be hosted as static files (GitHub Pages, static hosting) or opened locally. For browser security, some browsers may restrict pointer lock or scripts when opening via file://; if that happens, use any local static file server. This server only serves files and is not a game backend.
- No network connection is required after obtaining the project files.

## Controls
- W / S — drive forward / reverse
- A / D — steer
- Mouse — camera look (click canvas to lock pointer)
- E — mine a nearby mineral deposit
- Esc — pause/resume

## Stage 01 contents
- Third-person rover blockout, simple WebGL rendering, lunar ground, rocks and mineral pickups
- HUD for speed, energy and collected resources
- Main menu, pause and adjustable settings

## Roadmap
- Stage 02: modular base placement and interactions
- Stage 03: inventory, mining tools, crafting and progression
- Stage 04: local save system (IndexedDB), polish and QA

This is an early playable prototype; it does not yet include the complete base-building or persistence features.