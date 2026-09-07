// ============================================================================
// Flood Evacuation — deterministic scoring engine.
//
// Pure functions, no I/O. Given a user location, a candidate destination,
// its elevation (if known), and a route (if one was computed), produces a
// transparent 0-100 score plus a human-readable breakdown for the "Why this
// recommendation?" UI. Same formula regardless of whether the inputs came
// from live Google data or demo data — only the inputs differ, never the
// math, so the score is honest about what it does and doesn't know.
//
// SafetyScore = elevationScore + distanceScore + accessibilityScore
//             + suitabilityScore + hazardScore   (max 30 + 25 + 20 + 15 + 10 = 100)
//
// This is intentionally simple arithmetic — not a machine-learning model,
// not a validated hazard prediction. See PHASE 4/11 of the brief this was
// built from: transparent and explainable beats sophisticated and opaque.
// ============================================================================

import type { CandidateType, EvacuationCandidate, RouteInfo, ScoreBreakdown, ScoredCandidate, UserLocation } from "../types/evacuation";
import { candidateTypeLabel } from "../data/evacuationDemo";

const EARTH_RADIUS_M = 6_371_000;

export function haversineDistanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

const SUITABILITY_BY_TYPE: Record<CandidateType, number> = {
  hospital: 15,
  shelter: 15,
  school: 12,
  public_facility: 10,
  other_elevated: 8,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Scores one candidate against the user's location. `route` is the live or
 * estimated route to this specific candidate (see useFloodEvacuation.ts) —
 * pass null if none could be computed at all.
 */
export function scoreCandidate(user: UserLocation, candidate: EvacuationCandidate, route: RouteInfo | null): ScoredCandidate {
  const straightLineM = candidate.straightLineDistanceM ?? haversineDistanceM(user, candidate.location);
  const reasons: string[] = [];

  // --- Elevation (max 30) ---------------------------------------------
  let elevationScore: number;
  const hasElevation = typeof user.elevationM === "number" && typeof candidate.elevationM === "number";
  if (hasElevation) {
    const deltaM = Math.round((candidate.elevationM as number) - (user.elevationM as number));
    elevationScore = clamp(deltaM, 0, 60) * (30 / 60);
    reasons.push(
      deltaM > 0
        ? `${deltaM} m higher than your current location`
        : deltaM === 0
          ? "Approximately the same elevation as your current location"
          : `${Math.abs(deltaM)} m lower than your current location`
    );
  } else {
    elevationScore = 15; // neutral midpoint — no elevation data available for this candidate
    reasons.push("Elevation data not available for this candidate — assumed neutral");
  }

  // --- Distance (max 25) ------------------------------------------------
  const distanceKm = straightLineM / 1000;
  const distanceScore = clamp(1 - distanceKm / 5, 0, 1) * 25;
  reasons.push(`${distanceKm < 1 ? `${Math.round(straightLineM)} m` : `${distanceKm.toFixed(1)} km`} away (straight-line)`);

  // --- Accessibility (max 20) -------------------------------------------
  let accessibilityScore: number;
  if (route) {
    const minutes = route.durationSeconds / 60;
    accessibilityScore = clamp(1 - minutes / 60, 0, 1) * 20;
    const modeLabel = route.mode === "WALKING" ? "walking" : "driving";
    reasons.push(
      `${route.isLiveRoute ? "" : "Estimated: "}approximately ${Math.round(minutes)} min ${modeLabel} via an available route`
    );
  } else {
    // No route could be computed at all — fall back to the same distance
    // curve so a candidate isn't unfairly zeroed out just because routing
    // was unavailable (see PHASE 7: show the candidate and explain, don't hide it).
    accessibilityScore = clamp(1 - distanceKm / 5, 0, 1) * 20;
    reasons.push("Route could not be calculated — accessibility estimated from straight-line distance");
  }

  // --- Suitability (max 15) ----------------------------------------------
  const suitabilityScore = SUITABILITY_BY_TYPE[candidate.type];
  reasons.push(`Identified as a ${candidateTypeLabel(candidate.type).toLowerCase()} — a suitable evacuation destination type`);

  // --- Hazard (max 10) -----------------------------------------------------
  // No live flood/hazard data source is wired up in this MVP. Rather than
  // fabricate a number, every candidate gets the same neutral half-credit
  // and the UI says so plainly — see PHASE 4/11 of the brief.
  const hazardScore = 5;
  reasons.push("No live hazard data available for this candidate — neutral score applied");

  const breakdown: ScoreBreakdown = { elevationScore, distanceScore, accessibilityScore, suitabilityScore, hazardScore };
  const score = Math.round(elevationScore + distanceScore + accessibilityScore + suitabilityScore + hazardScore);

  return {
    ...candidate,
    straightLineDistanceM: straightLineM,
    score,
    breakdown,
    reasons,
    route,
  };
}

/** Scores every candidate and returns them sorted best-first. */
export function scoreAndRankCandidates(
  user: UserLocation,
  candidates: EvacuationCandidate[],
  routesByCandidateId: Map<string, RouteInfo | null>
): ScoredCandidate[] {
  return candidates
    .map((c) => scoreCandidate(user, c, routesByCandidateId.get(c.id) ?? null))
    .sort((a, b) => b.score - a.score);
}
