// ============================================================================
// Minimal Google Maps JavaScript API loader.
//
// Deliberately dependency-free (no @googlemaps/js-api-loader, no
// @types/google.maps) so this feature never depends on an npm install
// succeeding under time pressure. Just injects the standard Maps JS API
// <script> tag with a callback, once, and caches the resulting promise.
//
// Reads the API key from VITE_GOOGLE_MAPS_API_KEY (see .env.example). If
// that's not set, load() rejects immediately and every caller in this
// feature falls back to demo mode instead of hanging or throwing an
// unhandled error — see src/hooks/useFloodEvacuation.ts.
// ============================================================================

// The Maps JS API's real type surface is huge; typing it fully would need
// @types/google.maps, which isn't installed. It's typed loosely as `any` at
// this boundary; callers narrow what they need locally.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GoogleNamespace = any;

declare global {
  interface Window {
    google?: GoogleNamespace;
    __disasterready_gmaps_cb_main?: () => void;
  }
}

let loadPromise: Promise<GoogleNamespace> | null = null;

export function getGoogleMapsApiKey(): string | undefined {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  return key && key.trim().length > 0 ? key.trim() : undefined;
}

export function isGoogleMapsConfigured(): boolean {
  return Boolean(getGoogleMapsApiKey());
}

/**
 * Loads the Google Maps JavaScript API (once) and resolves with the global
 * `google` namespace (maps + places + geometry libraries already attached).
 * Rejects — never hangs — when no API key is configured, the script fails
 * to load (bad key, billing not enabled, network blocked, ...), or it
 * doesn't respond within 10s. Callers should catch this and fall back to
 * demo mode rather than surface it as a hard error.
 */
export function loadGoogleMaps(): Promise<GoogleNamespace> {
  if (loadPromise) return loadPromise;

  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    return Promise.reject(new Error("VITE_GOOGLE_MAPS_API_KEY is not configured"));
  }

  if (window.google?.maps) {
    loadPromise = Promise.resolve(window.google);
    return loadPromise;
  }

  loadPromise = new Promise((resolve, reject) => {
    const callbackName = "__disasterready_gmaps_cb_main" as const;

    const timeoutId = window.setTimeout(() => {
      window[callbackName] = undefined;
      reject(new Error("Google Maps script load timed out"));
    }, 10_000);

    window[callbackName] = () => {
      window.clearTimeout(timeoutId);
      window[callbackName] = undefined;
      resolve(window.google);
    };

    const script = document.createElement("script");
    const params = new URLSearchParams({
      key: apiKey,
      v: "weekly",
      libraries: "places,geometry",
      callback: callbackName,
      loading: "async",
    });
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.onerror = () => {
      window.clearTimeout(timeoutId);
      reject(new Error("Failed to load the Google Maps script (network, key, or billing issue)"));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
