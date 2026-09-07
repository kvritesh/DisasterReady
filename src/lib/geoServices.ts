// ============================================================================
// Free, key-less geographic data sources for Flood Evacuation:
//   - Overpass API      -> nearby candidate destinations (OpenStreetMap data)
//   - Open-Elevation    -> elevation lookups
//   - OSRM demo server  -> walking route + distance/duration
//
// All three are public, free, shared instances with no authentication and
// no billing account — and, being shared public infrastructure, they can be
// slow, rate-limited, or briefly down. Every export here is independently
// fault-tolerant (timeout + catch, resolves to a "no data" value rather
// than throwing) so one flaky service degrades just that one part of the
// pipeline instead of the whole feature — see useFloodEvacuation.ts, which
// falls back to demo data per source exactly as it did for the old Google
// version of this file (googleMapsQueries.ts, now unused).
// ============================================================================

import type { CandidateType, EvacuationCandidate, LatLng, RouteInfo } from "../types/evacuation";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const OPEN_ELEVATION_URL = "https://api.open-elevation.com/api/v1/lookup";
const OSRM_FOOT_URL = "https://router.project-osrm.org/route/v1/foot";

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      },
      (err) => {
        window.clearTimeout(timeoutId);
        reject(err);
      }
    );
  });
}

// ----------------------------------------------------------------------------
// Overpass API — nearby candidate destinations
// ----------------------------------------------------------------------------

const OVERPASS_TAG_TO_CANDIDATE: Record<string, CandidateType> = {
  hospital: "hospital",
  clinic: "hospital",
  school: "school",
  college: "school",
  university: "school",
  townhall: "public_facility",
  community_centre: "public_facility",
  place_of_worship: "public_facility",
};

function buildOverpassQuery(location: LatLng, radiusM: number): string {
  const tags = Object.keys(OVERPASS_TAG_TO_CANDIDATE);
  const clauses = tags.map((tag) => `node["amenity"="${tag}"](around:${radiusM},${location.lat},${location.lng});`).join("\n  ");
  return `[out:json][timeout:10];\n(\n  ${clauses}\n);\nout center 24;`;
}

/**
 * Queries OpenStreetMap (via the public Overpass API) for nearby hospitals,
 * schools/colleges, and public facilities. Returns [] — never throws — if
 * Overpass is unreachable, rate-limited, or times out; caller falls back to
 * demo candidates. Deliberately a small, fixed tag list and a capped result
 * count (24) — this is a "handful of candidates," not a full OSM export.
 */
export async function nearbySearchCandidatesOSM(location: LatLng, radiusM = 3000): Promise<EvacuationCandidate[]> {
  try {
    const query = buildOverpassQuery(location, radiusM);
    const res = await withTimeout(
      fetch(OVERPASS_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: query,
      }),
      12_000,
      "Overpass query"
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { elements?: Array<{ type: string; id: number; lat: number; lon: number; tags?: Record<string, string> }> };
    const elements = data.elements ?? [];
    const candidates: EvacuationCandidate[] = [];
    for (const el of elements) {
      if (typeof el.lat !== "number" || typeof el.lon !== "number") continue;
      const amenity = el.tags?.amenity;
      const type = (amenity && OVERPASS_TAG_TO_CANDIDATE[amenity]) || "other_elevated";
      const name = el.tags?.name || `Unnamed ${amenity ?? "location"}`;
      candidates.push({
        id: `osm-${el.type}-${el.id}`,
        name,
        type,
        location: { lat: el.lat, lng: el.lon },
        source: "osm",
        osmId: `${el.type}/${el.id}`,
      });
    }
    return candidates;
  } catch {
    return [];
  }
}

// ----------------------------------------------------------------------------
// Open-Elevation — elevation lookups
// ----------------------------------------------------------------------------

/**
 * Elevation lookup for a batch of points, in the same order they were
 * passed in, via the free public Open-Elevation API. A point that fails
 * (or the whole batch, if the service is down/rate-limited) comes back as
 * `undefined` rather than throwing — this public instance is known to be
 * slow or occasionally unavailable, so callers must treat it as best-effort.
 */
export async function getElevationsOSM(locations: LatLng[]): Promise<(number | undefined)[]> {
  if (locations.length === 0) return [];
  try {
    const res = await withTimeout(
      fetch(OPEN_ELEVATION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locations: locations.map((l) => ({ latitude: l.lat, longitude: l.lng })) }),
      }),
      10_000,
      "Open-Elevation lookup"
    );
    if (!res.ok) return locations.map(() => undefined);
    const data = (await res.json()) as { results?: Array<{ latitude: number; longitude: number; elevation: number }> };
    const results = data.results ?? [];
    return locations.map((_, i) => (typeof results[i]?.elevation === "number" ? results[i].elevation : undefined));
  } catch {
    return locations.map(() => undefined);
  }
}

// ----------------------------------------------------------------------------
// OSRM public demo server — walking route
// ----------------------------------------------------------------------------

/**
 * A walking route between two points via the free OSRM public demo server,
 * or null if one couldn't be computed. Never throws. Note: this is OSRM's
 * shared demo instance (router.project-osrm.org) — fine for a preparedness
 * demo/MVP, but explicitly not intended for production traffic volumes.
 */
export async function getWalkingRouteOSRM(origin: LatLng, destination: LatLng): Promise<RouteInfo | null> {
  try {
    const url = `${OSRM_FOOT_URL}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
    const res = await withTimeout(fetch(url), 10_000, "OSRM route request");
    if (!res.ok) return null;
    const data = (await res.json()) as {
      code: string;
      routes?: Array<{ distance: number; duration: number; geometry: { coordinates: [number, number][] } }>;
    };
    if (data.code !== "Ok" || !data.routes?.[0]) return null;
    const route = data.routes[0];
    const path = route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
    const minutes = Math.round(route.duration / 60);
    return {
      mode: "WALKING",
      distanceMeters: route.distance,
      durationSeconds: route.duration,
      distanceText: route.distance < 1000 ? `${Math.round(route.distance)} m` : `${(route.distance / 1000).toFixed(1)} km`,
      durationText: `${minutes} min`,
      isLiveRoute: true,
      path,
    };
  } catch {
    return null;
  }
}
