// ============================================================================
// DisasterReady — Flood Evacuation feature types
//
// This feature is additive and deliberately does not touch the existing
// terrain/mission/early-warning type models in src/types/index.ts. It has
// its own small contract, same spirit as src/types/simulator.ts.
//
// Everything here mirrors what a real Google Maps Platform integration
// would return; in demo mode (no VITE_GOOGLE_MAPS_API_KEY configured, or a
// live call fails for any reason) the same shapes are filled with clearly
// labeled local demo data instead. See src/data/evacuationDemo.ts and
// src/hooks/useFloodEvacuation.ts.
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
export type CandidateSource = "places" | "demo";

export interface EvacuationCandidate {
  id: string;
  name: string;
  type: CandidateType;
  location: LatLng;
  source: CandidateSource;
  /** Google Places place_id, when the candidate came from a live Places search. */
  placeId?: string;
  /** Meters. Undefined until the Elevation API (or demo data) fills it in. */
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
  /** true when this came from a live Directions request; false when estimated from straight-line distance. */
  isLiveRoute: boolean;
  /** Encoded polyline path, only present for a live route (used to draw it on the map). */
  encodedPolyline?: string;
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

export type GoogleMapsLoadState = "idle" | "loading" | "ready" | "unavailable";

/** Overall status of the evacuation analysis pipeline, surfaced in the UI. */
export type EvacuationStatus = "idle" | "locating" | "analyzing" | "ready" | "error";
