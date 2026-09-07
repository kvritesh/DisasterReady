// ============================================================================
// Minimal Leaflet loader — loads Leaflet (JS + CSS) from a public CDN, once.
//
// No API key, no billing account, nothing to configure: OpenStreetMap tiles
// and the Leaflet library are free and open. This mirrors the shape of the
// old googleMapsLoader.ts (now unused — see the migration note in
// googleMapsLoader.ts) so the rest of the app's fallback logic barely had
// to change, but there is no "isConfigured" concept here — Leaflet is
// always usable; the only failure mode is the CDN script not loading
// (offline, CDN down), which is handled the same defensive way.
// ============================================================================

// Leaflet's full type surface would need @types/leaflet, which isn't
// installed (loading from a CDN rather than npm to avoid any install step).
// Typed loosely as `any` at this boundary, same approach as the old Google
// Maps loader.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LeafletNamespace = any;

declare global {
  interface Window {
    L?: LeafletNamespace;
  }
}

const LEAFLET_VERSION = "1.9.4";
const LEAFLET_JS = `https://cdnjs.cloudflare.com/ajax/libs/leaflet/${LEAFLET_VERSION}/leaflet.js`;
const LEAFLET_CSS = `https://cdnjs.cloudflare.com/ajax/libs/leaflet/${LEAFLET_VERSION}/leaflet.css`;

let loadPromise: Promise<LeafletNamespace> | null = null;

function ensureCss() {
  if (document.querySelector(`link[data-leaflet-css]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = LEAFLET_CSS;
  link.setAttribute("data-leaflet-css", "true");
  document.head.appendChild(link);
}

/**
 * Loads Leaflet (once) and resolves with the global `L` namespace. Rejects
 * — never hangs — if the CDN script fails to load within 10s (offline, CDN
 * blocked). Callers should catch this and fall back to a data-only view
 * rather than surface it as a hard error — see EvacuationMap.tsx.
 */
export function loadLeaflet(): Promise<LeafletNamespace> {
  if (loadPromise) return loadPromise;

  if (window.L) {
    loadPromise = Promise.resolve(window.L);
    return loadPromise;
  }

  ensureCss();

  loadPromise = new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error("Leaflet script load timed out"));
    }, 10_000);

    const script = document.createElement("script");
    script.src = LEAFLET_JS;
    script.async = true;
    script.onload = () => {
      window.clearTimeout(timeoutId);
      if (window.L) resolve(window.L);
      else reject(new Error("Leaflet script loaded but window.L is missing"));
    };
    script.onerror = () => {
      window.clearTimeout(timeoutId);
      reject(new Error("Failed to load the Leaflet script from the CDN (offline or blocked)"));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
