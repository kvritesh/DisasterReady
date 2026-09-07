// ============================================================================
// DisasterReady — Flood Evacuation feature types
//
// This feature is additive and deliberately does not touch the existing
// terrain/mission/early-warning type models in src/types/index.ts. It has
// its own small contract, same spirit as src/types/simulator.ts.
//
// Built entirely on free, key-less geographic services — OpenStreetMap tiles
// (Leaflet), the Overpass API (candidate destinations), Open-Elevation
// (elevation), and the OSRM public demo routing server (walking routes).
// No Google Maps Platform, no API key, no billing account required. Every
// one of those live calls can fail (rate limit, timeout, public-instance
// downtime) and independently falls back to clearly-labeled local demo data
// — see src/data/evacuationDemo.ts and src/hooks/useFloodEvacuation.ts.
// ============================================================================

export interface LatLng {
  lat: number;
  lng: number;
}

/** Where the user's location came from. Always shown honestly in the UI. */
export type LocationSource = "gps" | "demo";

export interface UserLocation {
  lat: number;
  lng: number;
  accuracyM?: number;
  source: LocationSource;
  /** Human-readable label, e.g. "Your location" or "Demo location — Aizawl". */
  label: string;
  /** Elevation in meters, when available (from the Elevation API or demo data). */
  elevationM?: number;
}

export type GeolocationErrorKind = "denied" | "unavailable" | "timeout" | "unsupported";

/**
 * Broad category for a candidate evacuation destination. Deliberately not
 * "official shelter" unless the data source actually says so — see
 * src/data/evacuationDemo.ts and PHASE 6 of the brief this feature was built
 * from: don't label arbitrary places as official shelters.
 */
export type CandidateType = "hospital" | "school" | "shelter" | "public_facility" | "other_elevated";

/** Where a candidate destination's data came from. */
export type CandidateSource = "osm" | "demo";

export interface EvacuationCandidate {
  id: string;
  name: string;
  type: CandidateType;
  location: LatLng;
  source: CandidateSource;
  /** OpenStreetMap element id ("node/12345"), when the candidate came from a live Overpass query. */
  osmId?: string;
  /** Meters. Undefined until Open-Elevation (or demo data) fills it in. */
  elevationM?: number;
  /** Straight-line meters from the user location. */
  straightLineDistanceM?: number;
}

export interface RouteInfo {
  mode: "WALKING" | "DRIVING";
  distanceMeters: number;
  durationSeconds: number;
  distanceText: string;
  durationText: string;
  /** true when this came from a live OSRM route; false when estimated from straight-line distance. */
  isLiveRoute: boolean;
  /** [lat, lng] path, only present for a live route (used to draw it on the Leaflet map). */
  path?: LatLng[];
}

/** Transparent sub-scores that add up to ScoredCandidate.score. Every field documented in evacuationScoring.ts. */
export interface ScoreBreakdown {
  elevationScore: number;
  distanceScore: number;
  accessibilityScore: number;
  suitabilityScore: number;
  hazardScore: number;
}

export interface ScoredCandidate extends EvacuationCandidate {
  score: number;
  breakdown: ScoreBreakdown;
  /** Plain-language reasons shown under "Why this recommendation?" in the UI. */
  reasons: string[];
  route: RouteInfo | null;
}

export type MapLoadState = "idle" | "loading" | "ready" | "unavailable";

/** Overall status of the evacuation analysis pipeline, surfaced in the UI. */
export type EvacuationStatus = "idle" | "locating" | "analyzing" | "ready" | "error";
