// ============================================================================
// Small promise-wrapped helpers around the legacy-but-still-supported
// Google Maps JS "places", "geometry" and core libraries: nearby candidate
// search, elevation lookups, and a walking route. Every export here is
// independently fault-tolerant — each rejects/returns null on its own
// rather than taking the rest of the pipeline down, so useFloodEvacuation
// can degrade one data source at a time instead of all-or-nothing. See
// PHASE 12 of the brief this was built from ("move to the next useful
// component instead of waiting").
// ============================================================================

import type { CandidateType, EvacuationCandidate, LatLng, RouteInfo } from "../types/evacuation";
import type { GoogleNamespace } from "./googleMapsLoader";

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    promise.then(
      (v) => {
        window.clearTimeout(t);
        resolve(v);
      },
      (e) => {
        window.clearTimeout(t);
        reject(e);
      }
    );
  });
}

let dummyAttributionNode: HTMLDivElement | null = null;
function getAttributionNode(): HTMLDivElement {
  if (!dummyAttributionNode) {
    dummyAttributionNode = document.createElement("div");
  }
  return dummyAttributionNode;
}

const PLACE_TYPE_TO_CANDIDATE: Record<string, CandidateType> = {
  hospital: "hospital",
  school: "school",
  primary_school: "school",
  secondary_school: "school",
  local_government_office: "public_facility",
  city_hall: "public_facility",
  community_center: "public_facility",
  stadium: "other_elevated",
  park: "other_elevated",
};

function classifyPlace(types: string[] | undefined): CandidateType {
  for (const t of types ?? []) {
    const mapped = PLACE_TYPE_TO_CANDIDATE[t];
    if (mapped) return mapped;
  }
  return "other_elevated";
}

/** One nearby-search request for a single Places "type". Resolves to [] on any failure — never rejects. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function nearbySearchOnce(google: GoogleNamespace, location: LatLng, radiusM: number, type: string): Promise<EvacuationCandidate[]> {
  return new Promise((resolve) => {
    try {
      const service = new google.maps.places.PlacesService(getAttributionNode());
      service.nearbySearch(
        { location, radius: radiusM, type },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (results: any[] | null, status: string) => {
          if (status !== google.maps.places.PlacesServiceStatus.OK || !results) {
            resolve([]);
            return;
          }
          const candidates: EvacuationCandidate[] = results
            .filter((r) => r.geometry?.location)
            .slice(0, 8)
            .map((r) => ({
              id: r.place_id ?? `${type}-${r.name}-${r.geometry.location.lat()}-${r.geometry.location.lng()}`,
              name: r.name ?? "Nearby location",
              type: classifyPlace(r.types),
              location: { lat: r.geometry.location.lat(), lng: r.geometry.location.lng() },
              source: "places" as const,
              placeId: r.place_id,
            }));
          resolve(candidates);
        }
      );
    } catch {
      resolve([]);
    }
  });
}

/**
 * Searches a small set of relevant place types near `location` and merges/
 * de-dupes the results. Returns [] (never throws) if Places is unavailable
 * for any reason — caller falls back to demo candidates.
 */
export async function nearbySearchCandidates(google: GoogleNamespace, location: LatLng, radiusM = 3000): Promise<EvacuationCandidate[]> {
  const types = ["hospital", "school", "local_government_office"];
  const batches = await Promise.all(types.map((t) => withTimeout(nearbySearchOnce(google, location, radiusM, t), 8000, "Places search").catch(() => [])));
  const seen = new Set<string>();
  const merged: EvacuationCandidate[] = [];
  for (const batch of batches) {
    for (const c of batch) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      merged.push(c);
    }
  }
  return merged;
}

/**
 * Elevation lookup for a batch of points, in the same order they were
 * passed in. A point that fails individually comes back as `undefined`
 * rather than failing the whole batch.
 */
export async function getElevations(google: GoogleNamespace, locations: LatLng[]): Promise<(number | undefined)[]> {
  if (locations.length === 0) return [];
  try {
    const service = new google.maps.ElevationService();
    const response = await withTimeout(
      new Promise<{ results: { elevation: number }[] }>((resolve, reject) => {
        service.getElevationForLocations(
          { locations },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (results: any[] | null, status: string) => {
            if (status !== google.maps.ElevationStatus.OK || !results) {
              reject(new Error(`Elevation status: ${status}`));
              return;
            }
            resolve({ results });
          }
        );
      }),
      8000,
      "Elevation lookup"
    );
    return locations.map((_, i) => response.results[i]?.elevation);
  } catch {
    return locations.map(() => undefined);
  }
}

/** A walking route between two points, or null if one couldn't be computed. Never throws. */
export async function getWalkingRoute(google: GoogleNamespace, origin: LatLng, destination: LatLng): Promise<RouteInfo | null> {
  try {
    const service = new google.maps.DirectionsService();
    const result = await withTimeout(
      new Promise<GoogleNamespace>((resolve, reject) => {
        service.route(
          { origin, destination, travelMode: google.maps.TravelMode.WALKING },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (result: any, status: string) => {
            if (status !== "OK" || !result?.routes?.[0]) {
              reject(new Error(`Directions status: ${status}`));
              return;
            }
            resolve(result);
          }
        );
      }),
      8000,
      "Directions request"
    );
    const leg = result.routes[0].legs[0];
    if (!leg) return null;
    return {
      mode: "WALKING",
      distanceMeters: leg.distance?.value ?? 0,
      durationSeconds: leg.duration?.value ?? 0,
      distanceText: leg.distance?.text ?? "",
      durationText: leg.duration?.text ?? "",
      isLiveRoute: true,
      encodedPolyline: result.routes[0].overview_polyline,
    };
  } catch {
    return null;
  }
}
