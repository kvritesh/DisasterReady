# DisasterReady — Web Prototype

Offline-first disaster preparedness and terrain-intelligence app, built as an interactive
web prototype for Smart India Hackathon team review.

> **This is a frontend prototype, not the final product.** The production app will be a
> stylized 3D preparedness game built in Unity. This prototype exists to demonstrate the
> product vision, UX, and terrain-intelligence concept — not to ship real GIS pipelines,
> a backend, or scientifically validated hazard predictions. All data is local mock data.

## Quick start

```bash
npm install
npm run dev
```

Open the printed local URL (usually `http://localhost:5173`) in a modern desktop browser.
Chrome or Edge is recommended for the best WebGL performance.

## What's in the demo

- **Overview** — preparedness score, terrain/POI/mission/offline status, region card
  with an explicit Full-site / Pilot-site badge.
- **Prepare Region** — pick one of the four demo regions and run the staged
  offline-preparation animation. Every region card and detail panel is honestly
  marked Full site or Pilot site, and pilot regions spell out exactly which layers
  (emergency POIs, early warning) aren't configured for them yet.
- **Offline Data** — the real, working offline package for the selected region: a
  per-layer storage breakdown and status, driven by an actual installable PWA service
  worker (see "Offline / PWA" below), not just a UI mock.
- **Explore** — the hero screen: an interactive procedural low-poly 3D terrain
  (Three.js / React Three Fiber) — demo terrain data, not real GIS/DEM data — with
  orbit/pan/zoom camera, click-to-inspect
  elevation/slope/aspect, POI markers, and Normal/Elevation/Slope/Aspect visualization
  modes.
- **Missions** — a small XP/level game layer. "Find the High Ground" and "Spot the
  Steep Slope" are fully playable inside the 3D terrain. Missions also has a
  "Launch Preparedness Simulator" entry that opens the Unity-built **Preparedness
  Simulator** (see below) in a popup window and displays its result when the run
  completes.
- **Monitoring** — a multi-site command board across all four regions at once: a
  summary strip (sites monitored, full-site coverage, highest active severity, active
  simulated alerts) plus a per-site card with its own scenario picker and fused
  score for the full site, and an honest "terrain only" card for each pilot site.
- **Early Warning** — demonstrates the full SIH26001 conceptual pipeline for the
  selected site: terrain-derived factors, a picker for a fixed simulated rainfall +
  soil-moisture demo scenario (Dry / Normal / Heavy Rain / Prolonged Monsoon), a
  transparent fusion formula that amplifies the terrain score by the simulated
  environmental factor, and a resulting Low/Elevated/High severity with matching
  guidance. Crossing into High severity fires a full-screen **simulated alert**
  (clearly labeled "demonstration only" — no SMS, push, or real dispatch is ever
  sent). Every layer is explicitly labeled terrain data, simulated demo data, or
  derived demo assessment, and pilot sites show an honest "not yet enabled" notice
  instead of a fabricated score.
- **Settings** — region, offline data, graphics quality, and developer tools
  (simulate offline, clear cache, terrain debug overlay, FPS counter).

A global **offline mode toggle** (sidebar, or Settings → Simulation tools) actually
switches app state — the terrain explorer and missions keep working with "cached" data,
with a toast and banner confirming the simulated network loss. Separately, the app is a
real installable **PWA**: `vite-plugin-pwa` precaches the built app shell via a
generated Workbox service worker, so a hard refresh with the device's network fully
disabled still loads the app (see "Offline / PWA" below) — this is genuine offline
capability, not simulated.

## Offline / PWA

This is genuine offline capability, not a UI simulation:

- `vite-plugin-pwa` generates a Workbox service worker (`generateSW`) that precaches
  the entire built app shell (JS/CSS/HTML/icons) after the first successful visit.
- Google Fonts (Plus Jakarta Sans, Manrope) are cached at runtime with a `CacheFirst`
  strategy so typography doesn't fall back to system fonts once offline.
- The app is installable (Web App Manifest + maskable icons) on desktop and mobile.
- To verify: load the app once online, then fully disable networking at the OS/browser
  level and hard-refresh the page — it still loads and every screen still works, since
  all demo data (terrain, POIs, missions) is already compiled into the cached bundle.

What this does **not** do: there is still no backend and no real server sync. The
"Last synchronized" timestamp and per-layer MB breakdown on the Offline Data screen
remain a simulated demo narrative layered on top of this real caching mechanism.

## Suggested demo flow (~5 minutes)

This mirrors the app's own sidebar ordering — prepare, cache, explore, complete
missions, then step back to the multi-site board before the single-site forecast:

1. **Overview** — note the preparedness score and the Full-site badge on the region card.
2. **Prepare Region** — show the four-region picker (one Full site, three honestly
   labeled Pilot sites), then run the staged offline-preparation animation for
   Aizawl, Mizoram (the default NER demo region for SIH26001).
3. **Offline Data** — show the cached per-layer breakdown, then demonstrate the real
   PWA offline reload (disable the network at the OS/browser level and hard-refresh —
   the app still loads from the installed service worker).
4. **Explore** — orbit the 3D diorama, click a hill to inspect elevation/slope/aspect,
   try the Elevation/Slope/Aspect visualization toggles.
5. **Missions** — start "Find the High Ground," click the highlighted ridge in the
   3D view, watch the XP/level-up celebration.
6. **Monitoring** — show the multi-site summary strip and board: Aizawl's live fused
   card next to the three pilot sites' honest "terrain only" cards.
7. **Early Warning** — on Aizawl, switch the simulated rainfall/soil-moisture scenario
   (Dry → Prolonged Monsoon) and watch the fused score, severity, and guidance visibly
   change; crossing into High severity fires the simulated alert modal. Point to the
   "not a validated forecast" disclaimer throughout.
8. **Take preparedness action** — dismiss the simulated alert and revisit Missions/
   Explore to show the loop closing: terrain awareness → monitoring → warning →
   action, all offline-capable.

## Tech stack

React + TypeScript + Vite + Tailwind CSS v4 + Three.js / React Three Fiber (+drei) +
Framer Motion + Lucide icons. No backend, no auth, no real GIS data — see
`src/types/index.ts` and `src/data/*` for the mock data models an eventual real API
would replace.

## Project structure

```
src/
  types/        Typed data models (Region, POI, Mission, UserProgress, ...)
  data/         Local mock data (regions, POIs, missions)
  state/        App-wide context (region, connectivity, XP/missions, offline package, simulated alerts)
  three/        Procedural terrain generation, geometry, props, markers, scene
  components/   Reusable UI primitives + layout (sidebar/shell) + shared widgets (ScenarioPicker, WarningAlert)
  screens/      The 8 top-level screens (Overview, Prepare Region, Offline Data, Explore,
                Missions, Monitoring, Early Warning, Settings)
```


## Flood Evacuation (free/open-source geographic stack)

Sidebar -> **Flood Evacuation**. A focused, honest MVP of a personalized flood
evacuation recommendation, built entirely on free, key-less geographic
services -- no Google Maps Platform, no API key, no billing account:

- **Map** -- [Leaflet](https://leafletjs.com/) + [OpenStreetMap](https://www.openstreetmap.org/copyright)
  tiles, loaded from a CDN (`src/lib/leafletLoader.ts`). Free, no key, always available.
- **Candidate destinations** -- the [Overpass API](https://overpass-api.de/)
  (a free public OpenStreetMap query service) for nearby hospitals, schools,
  and public facilities within ~3 km (`src/lib/geoServices.ts`).
- **Elevation** -- [Open-Elevation](https://open-elevation.com/)'s free public
  API.
- **Routing** -- the [OSRM](http://project-osrm.org/) public demo server, for
  a real walking route, distance, and duration.
- **Location** -- "Use My Location" (browser Geolocation API, no service
  involved) or "Use Demo Location" (a labeled sample point in Aizawl).
  Denied/unavailable/timeout/unsupported-browser cases are handled without
  breaking the rest of the app -- see `src/hooks/useGeolocation.ts`.
- **Scoring** -- unchanged: every candidate gets a transparent, deterministic
  0-100 score (elevation + distance + accessibility + suitability + hazard)
  -- see `src/lib/evacuationScoring.ts`. This part never depended on Google
  and didn't need to change for this migration.
- **Practice This Evacuation** -- reuses the existing Unity preparedness
  simulator integration unchanged (`useUnitySimulator`).
- **View Route** -- opens the same route in OpenStreetMap's own directions
  UI (`openstreetmap.org/directions`, itself OSRM-backed) in a new tab.

### Setup

None. There is no API key to configure -- `npm install && npm run dev` is
enough. `.env.example` is kept only as a placeholder in case a future
integration needs one.

### Why the migration happened

The original build of this feature used the Google Maps Platform (Maps JS,
Places, Elevation, Directions APIs), which requires a linked billing account
even for free-tier usage. That's a real barrier for a hackathon prototype, so
this was replaced end-to-end with equivalent free services. The deterministic
scoring engine and the Unity integration were untouched -- only the data
sourcing and map rendering changed.

### Demo mode and rate limits

Every one of Overpass, Open-Elevation, and OSRM is a **shared public
instance** with no authentication -- free, but also not guaranteed to be fast
or always up, and subject to fair-use rate limiting. Each call is
independently timeout-guarded and falls back to local demo data **per data
source, not all-or-nothing** -- e.g. a real GPS location with Overpass
unavailable still shows demo candidates scored against your real position.
Every card and badge in the UI says plainly whether it's showing live or demo
data; nothing fabricated is ever presented as real. See
`src/hooks/useFloodEvacuation.ts` for exactly how each source degrades, and
`src/lib/geoServices.ts` for the actual requests.

### Limitations

No real-time flood/hazard data source is wired up (hazard score is always
neutral). Candidate destinations are Overpass/OpenStreetMap results or
hand-picked demo points, not verified official shelters -- OSM data quality
varies by area. Elevation and routing numbers are real API output when live,
or fixed demo numbers when not -- never interpolated or guessed to look more
precise than they are. The OSRM and Open-Elevation public instances used here
are demo/community infrastructure, not something to depend on for real
emergency use. This is a preparedness/practice tool, not emergency dispatch
or a validated evacuation authority -- see the in-app disclaimer on the
screen itself.

## Unity Preparedness Simulator

Missions → "Launch Preparedness Simulator" opens a separate Unity WebGL build in a
popup window (`window.open`, same-origin, served from `public/unity-sim/`) — a small
third-person low-poly mini-game: explore a stylized, procedurally generated stand-in
for Aizawl, complete three preparedness missions, respond to a scripted simulated
emergency, and reach a safety objective using an on-screen directional heuristic. When
the run finishes, the Unity build posts its result back to this page via
`window.postMessage` (see `src/hooks/useUnitySimulator.ts`), and the Missions screen
displays it — completed missions, XP, and a preparedness score for that run.

This is a separate Unity project (`unityprojects/DisasterReady`, its own git
repository) built into `public/unity-sim/` — that folder is generated, not committed
here (see `.gitignore`); see the Unity project's own README for how to build it and
its architecture. As with the rest of the app: the terrain is stylized/procedural (not
real Aizawl GIS), and the emergency is scripted gameplay, not a real alert or a
validated evacuation route.

## Development timeline

Milestones reached so far; see `CHANGELOG.md` for the full list of what each one
actually includes. Version numbers below reflect the current working state, tracked in
git starting 2026-09-02 — earlier milestones are not backed by individual historical
commits, since git did not exist for this project before that date.

| Version | Milestone | Status |
| --- | --- | --- |
| v0.1 | Foundation (app shell, 8 screens, mock data) | Done |
| v0.2 | Terrain intelligence (3D terrain explorer + in-browser missions) | Done |
| v0.3 | Early warning (simulated scenario fusion + alerts) | Done |
| v0.4 | Offline capability (real installable PWA) | Done |
| v0.5 | Monitoring (multi-site board) | Done |
| v0.6 | Unity Preparedness Simulator (standalone) | Done |
| v0.7 | Web ↔ Unity integration (popup + postMessage) | Done |
| v0.8 | Simulator visual/game-feel polish | In progress |
| v1.0 | SIH demo release | Planned |
