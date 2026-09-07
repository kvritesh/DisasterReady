// ============================================================================
// Flood Evacuation — demo/fallback data.
//
// Used whenever live Google data isn't available: no VITE_GOOGLE_MAPS_API_KEY
// configured, geolocation permission denied/unavailable, or a live Places/
// Elevation/Directions call fails for any reason (bad key, billing not
// enabled, quota, offline, ...). Every value here is a constructed demo
// number, not a measurement — the UI must always label it "Demo" when it's
// in use. See src/hooks/useFloodEvacuation.ts for how this plugs in.
//
// Centered on Aizawl, Mizoram (the app's one "full" demo region — see
// src/data/regions.ts) so this feature reads as part of the same product,
// not a bolted-on generic map demo.
// ============================================================================

import type { CandidateType, EvacuationCandidate, UserLocation } from "../types/evacuation";

/** Approximate real-world coordinates for central Aizawl — used only as a labeled demo location, not a claim of precision. */
export const DEMO_USER_LOCATION: UserLocation = {
  lat: 23.7271,
  lng: 92.7176,
  source: "demo",
  label: "Demo location — Aizawl, Mizoram",
  elevationM: 1132,
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

// Deliberately generic, honestly-categorized demo candidates rather than
// asserting specific real buildings are official flood shelters (see PHASE 6
// of the brief this was built from). Coordinates are plausible offsets
// around central Aizawl, not surveyed locations. Elevation values are
// constructed to be plausible for Aizawl's ridge-and-valley terrain
// (roughly 780–1150m per src/data/regions.ts), not measured.
export const DEMO_CANDIDATES: EvacuationCandidate[] = [
  {
    id: "demo-candidate-1",
    name: "Civil Hospital Grounds (demo)",
    type: "hospital",
    location: { lat: 23.7367, lng: 92.7186 },
    source: "demo",
    elevationM: 1168,
  },
  {
    id: "demo-candidate-2",
    name: "Ridge Public Ground (demo)",
    type: "public_facility",
    location: { lat: 23.7305, lng: 92.7267 },
    source: "demo",
    elevationM: 1181,
  },
  {
    id: "demo-candidate-3",
    name: "Hillside Secondary School (demo)",
    type: "school",
    location: { lat: 23.7212, lng: 92.7132 },
    source: "demo",
    elevationM: 1149,
  },
  {
    id: "demo-candidate-4",
    name: "Community Assembly Hall (demo)",
    type: "shelter",
    location: { lat: 23.7241, lng: 92.7241 },
    source: "demo",
    elevationM: 1120,
  },
  {
    id: "demo-candidate-5",
    name: "Lower Bazaar Health Centre (demo)",
    type: "hospital",
    location: { lat: 23.7238, lng: 92.7095 },
    source: "demo",
    elevationM: 1058,
  },
  {
    id: "demo-candidate-6",
    name: "Riverside Ground (demo)",
    type: "other_elevated",
    location: { lat: 23.7189, lng: 92.7208 },
    source: "demo",
    elevationM: 1091,
  },
];
