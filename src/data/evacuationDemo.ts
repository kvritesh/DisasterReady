// ============================================================================
// Flood Evacuation — demo/fallback data.
//
// Used whenever live OSM data isn't available: geolocation permission
// denied/unavailable, or a live Overpass/Open-Elevation/OSRM call fails for
// any reason (rate limit, timeout, offline, ...). Every value here is a
// constructed demo number, not a measurement — the UI must always label it
// "Demo" when it's in use. See src/hooks/useFloodEvacuation.ts for how this
// plugs in.
//
// PRESENTATION-SAFETY FIX: fallback candidates used to be a fixed list of
// coordinates around Aizawl, Mizoram, used unconditionally as the starting
// point in useFloodEvacuation.ts before live Overpass search (for whatever
// the user's REAL location is) had a chance to run. If that live search
// then failed or returned nothing (common for a shared, rate-limited public
// API), the screen never fell back to anything local — it silently kept
// showing the fixed Aizawl candidates, which could be thousands of km from
// a real user's actual location. `buildFallbackCandidates()` below fixes
// this at the root: fallback candidates are now generated as small offsets
// FROM WHATEVER ORIGIN IS PASSED IN, so they are always geographically
// local to the current user — real GPS location or the demo location —
// never a fixed distant point.
// ============================================================================

import type { CandidateType, EvacuationCandidate, UserLocation } from "../types/evacuation";

/** Approximate real-world coordinates for central Bengaluru — used only as a labeled demo location, not a claim of precision. */
export const DEMO_USER_LOCATION: UserLocation = {
  lat: 12.9716,
  lng: 77.5946,
  source: "demo",
  label: "Demo location — Bengaluru, Karnataka",
  elevationM: 920,
};

const TYPE_LABELS: Record<CandidateType, string> = {
  hospital: "Hospital",
  school: "School",
  shelter: "Shelter",
  public_facility: "Public facility",
  other_elevated: "Elevated public ground",
};

export function candidateTypeLabel(type: CandidateType): string {
  return TYPE_LABELS[type];
}

/**
 * Generic baseline elevation used only when the origin's own elevation isn't
 * known yet (fallback candidates are built before the live elevation lookup
 * runs — see useFloodEvacuation.ts). Roughly typical of a plains/plateau
 * Indian city; the point is a believable relative spread, not precision —
 * exactly like the original fixed Aizawl version this replaces.
 */
const GENERIC_BASELINE_ELEVATION_M = 900;

// Deliberately generic, honestly-categorized demo candidates rather than
// asserting specific real buildings are official flood shelters. Expressed
// as small offsets (lat/lng degrees, and an elevation delta) from an origin
// — NOT as fixed absolute coordinates — so they are always local to
// whatever origin they're built around. The offsets themselves (roughly
// 300m–1.1km, well inside the existing ~3km Overpass search radius) and
// elevation deltas are unchanged from the original Aizawl-only version;
// only the anchor point they're applied to has become a parameter.
const FALLBACK_CANDIDATE_OFFSETS: Array<{
  id: string;
  name: string;
  type: CandidateType;
  dLat: number;
  dLng: number;
  dElevationM: number;
}> = [
  { id: "demo-candidate-1", name: "Civil Hospital Grounds (demo)", type: "hospital", dLat: 0.0096, dLng: 0.001, dElevationM: 36 },
  { id: "demo-candidate-2", name: "Ridge Public Ground (demo)", type: "public_facility", dLat: 0.0034, dLng: 0.0091, dElevationM: 49 },
  { id: "demo-candidate-3", name: "Hillside Secondary School (demo)", type: "school", dLat: -0.0059, dLng: -0.0044, dElevationM: 17 },
  { id: "demo-candidate-4", name: "Community Assembly Hall (demo)", type: "shelter", dLat: -0.003, dLng: 0.0065, dElevationM: -12 },
  { id: "demo-candidate-5", name: "Lower Bazaar Health Centre (demo)", type: "hospital", dLat: -0.0033, dLng: -0.0081, dElevationM: -74 },
  { id: "demo-candidate-6", name: "Riverside Ground (demo)", type: "other_elevated", dLat: -0.0082, dLng: 0.0032, dElevationM: -41 },
];

/**
 * Builds fallback candidate destinations near a given origin — used by
 * useFloodEvacuation.ts as the starting point before live Overpass search
 * runs, and as what's left in place if that live search fails or returns
 * nothing. Always local to `origin` (whatever real GPS coordinates, or the
 * demo location, were passed in) — never a fixed distant location.
 */
export function buildFallbackCandidates(origin: { lat: number; lng: number; elevationM?: number }): EvacuationCandidate[] {
  const baseElevation = origin.elevationM ?? GENERIC_BASELINE_ELEVATION_M;
  return FALLBACK_CANDIDATE_OFFSETS.map((o) => ({
    id: o.id,
    name: o.name,
    type: o.type,
    location: { lat: origin.lat + o.dLat, lng: origin.lng + o.dLng },
    source: "demo",
    elevationM: baseElevation + o.dElevationM,
  }));
}

/** Fallback candidates around the demo location specifically — Bengaluru-local, matching DEMO_USER_LOCATION above. */
export const DEMO_CANDIDATES: EvacuationCandidate[] = buildFallbackCandidates(DEMO_USER_LOCATION);
