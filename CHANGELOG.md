# Changelog

All notable milestones for the DisasterReady SIH26001 prototype (web app +
Unity Preparedness Simulator). Format loosely follows
[Keep a Changelog](https://keepachangelog.com/).

Git version control was only established for this project on **2026-09-02**, from
the current working state of both the `disasterready` (web) and
`unityprojects/DisasterReady` (Unity) folders. Entries below for v0.1–v0.7 describe
functionality that already existed in that working state; they are not backed by
individual historical commits, since none existed before this point. No dates are
claimed for milestones that predate git initialization beyond "already implemented
as of the initial baseline commit."

## [Unreleased]

### v0.8 — Simulator Visual / Game-Feel Polish (in progress)
Unity-side only; the web app is unchanged.
- Replaced the placeholder capsule player with a procedurally built low-poly
  humanoid (torso, head, arms, legs, backpack, shoes) plus a lightweight
  sine-wave-driven walk/idle animator (no imported rig or animation clips).
- Building variety: alternate roof styles, per-building rotation, procedural
  windows and doors.
- Broadleaf tree variant, rock clusters, decorative fences, and a welcome
  signpost near player spawn.
- Camera tuning (start pitch/distance/target offset) for a more readable
  third-person framing.
- Procedural audio cues: footsteps, mission-complete chime, result-screen
  fanfare — all synthesized at runtime, so nothing can go missing and cause a
  console error.
- Fixed a real rendering regression found during this pass: two fence runs
  both created a material asset named `FenceWood`; the second creation deleted
  and recreated the `.mat` asset, which invalidated the first fence's already-
  assigned material reference and made it render magenta ("missing material").
  Fixed by making `SharedAssetUtility.CreateColorMaterial` update an existing
  material asset in place instead of deleting and recreating it.
- WebGL rebuild and full end-to-end regression (Windows Editor + WebGL +
  React ↔ Unity integration) for this pass: pending / in progress.

## v0.7 — Web ↔ Unity Integration
- Unity WebGL build wired into `disasterready/public/unity-sim`.
- Missions screen gained a "Launch Preparedness Simulator" entry that opens the
  Unity WebGL build in a popup window (`window.open`, not an iframe) with launch
  parameters.
- `Assets/Plugins/WebGL/WebGLBridge.jslib` posts the simulator's completion
  result back to the opening window via `window.postMessage`; the web app's
  `useUnitySimulator` hook listens for it and surfaces the result on the
  Missions screen.
- Popup-blocked case handled gracefully in the web app (falls back to a
  "blocked" status rather than failing silently).
- A previously observed URP Unlit shader stripping issue in WebGL builds was
  fixed via the project's Always Included Shaders list.

## v0.6 — Unity Preparedness Simulator
- New Unity 6 (URP) project: procedurally generated Aizawl-inspired terrain,
  buildings, and player character — entirely code-generated
  (`SceneBuilder.cs` + `EnvironmentBuilder.cs`), no imported 3D assets.
- Three preparedness missions (highest ground / emergency shelter / hospital).
- Scripted simulated emergency sequence: environmental shift, siren, an
  objective-aware safe-direction heuristic guide, and an emergency objective.
- Preparedness result panel with a deterministic score based on missions
  completed.
- Explicit "SIMULATED EMERGENCY — DEMONSTRATION ONLY" labeling throughout.

## v0.5 — Monitoring
- Multi-site Monitoring board across all demo regions: summary strip (sites
  monitored, full-site coverage, highest active severity, active simulated
  alerts) plus per-site cards with their own scenario picker and fused score
  for the full site, and an honest "terrain only" card for pilot sites.

## v0.4 — Offline PWA
- Real installable PWA via `vite-plugin-pwa` (Workbox `generateSW`): precaches
  the built app shell (JS/CSS/HTML/icons) plus runtime-cached Google Fonts.
- Offline Data screen: per-layer storage breakdown and status driven by the
  actual service worker cache, not a UI mock.
- Global offline-mode toggle (sidebar / Settings) that switches app state so
  the terrain explorer and missions keep working against cached data, with a
  toast/banner confirming simulated network loss.

## v0.3 — Early Warning
- Early Warning screen implementing the SIH26001 conceptual pipeline: terrain-
  derived factors combined with a picker for a simulated rainfall/soil-moisture
  scenario (Dry / Normal / Heavy Rain / Prolonged Monsoon) via a transparent
  fusion formula, producing a Low/Elevated/High severity with guidance.
- Crossing into High severity fires a full-screen simulated alert, explicitly
  labeled "demonstration only" (no real SMS/push/dispatch).
- Every layer explicitly labeled as terrain data, simulated demo data, or
  derived demo assessment; pilot sites show an honest "not yet enabled" notice
  instead of a fabricated score.

## v0.2 — Terrain Intelligence
- Interactive procedural low-poly 3D terrain (Three.js / React Three Fiber) on
  the Explore screen — demo terrain data, not real GIS/DEM — with orbit/pan/
  zoom camera, click-to-inspect elevation/slope/aspect, POI markers, and
  Normal/Elevation/Slope/Aspect visualization modes.
- "Find the High Ground" / "Spot the Steep Slope" missions playable directly
  inside the 3D terrain (browser-only, predating the Unity simulator).

## v0.1 — Foundation
- React + TypeScript + Vite + Tailwind CSS v4 app shell.
- Overview, Prepare Region, Offline Data, Explore, Missions, Monitoring, Early
  Warning, Settings screens scaffolded.
- Four demo regions with an honest Full-site / Pilot-site distinction; Aizawl,
  Mizoram as the primary full site.
- Local mock data models for regions, POIs, and missions (`src/types`,
  `src/data`) — no backend, no auth, no real GIS data.

## Planned / not yet started

- **v1.0 — SIH Demo Release**: hardened build for live demo/judging. Requires,
  at minimum: WebGL rebuild + full regression pass for v0.8 above, a pass over
  this README/CHANGELOG for accuracy against whatever state is shipped, and a
  decision on whether the Unity and web repositories are presented as one
  combined submission or two linked repositories.
