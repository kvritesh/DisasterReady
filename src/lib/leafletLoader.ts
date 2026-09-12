// ============================================================================
// Leaflet loader.
//
// PRESENTATION-SAFETY FIX: Leaflet used to be loaded at runtime from a CDN
// (script + stylesheet injected into <head> on first use). That had a real
// race condition — the loader resolved as soon as the JS <script> fired its
// onload, WITHOUT waiting for the separately-injected CSS <link> to finish
// loading. Leaflet's map/tile panes need leaflet.css in place before they're
// built (pane positioning, tile visibility-on-load, etc.) — if the CSS lags
// behind the JS even slightly (a very plausible, network-timing-dependent
// race, not something that always reproduces), EvacuationMap.tsx would
// initialize successfully (no error, no rejected promise, no "unavailable"
// fallback — window.L was genuinely present) but render a blank/broken map,
// because the map's DOM existed without its required styling.
//
// FIX: Leaflet (JS + its CSS) is now a normal bundled npm dependency
// (`leaflet` + `@types/leaflet`), imported directly, instead of being
// fetched from a CDN at runtime. Vite bundles leaflet.css as part of this
// module's own import graph, so it is guaranteed to be applied before any
// component that imports this loader ever calls L.map(...) — the entire
// class of load-order races this file used to have is now structurally
// impossible. This also removes the CDN itself as a point of failure on
// presentation day (flaky venue wifi, cdnjs being blocked, etc.) — only the
// OSM tile image requests still need network, exactly as before.
//
// loadLeaflet() keeps its exact original signature/behavior
// (`Promise<LeafletNamespace>`, resolves once, never rejects in practice
// now) so EvacuationMap.tsx — and every other caller — needed zero changes.
// ============================================================================

import * as LeafletModule from "leaflet";
import "leaflet/dist/leaflet.css";

// Loaded synchronously via the static imports above; see the module-level
// comment. Kept loosely typed as `any` (same as before) so this stays a
// drop-in replacement for the old CDN-sourced `window.L` value — nothing
// downstream (EvacuationMap.tsx) has to change how it uses this.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LeafletNamespace = any;

const L: LeafletNamespace = LeafletModule;

/**
 * Resolves with the Leaflet namespace. Bundled via npm (see above), so this
 * no longer depends on any CDN being reachable and effectively cannot fail —
 * kept as a Promise-returning function purely so every existing caller
 * (EvacuationMap.tsx) keeps working unmodified.
 */
export function loadLeaflet(): Promise<LeafletNamespace> {
  return Promise.resolve(L);
}
