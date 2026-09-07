// ============================================================================
// Flood Evacuation — deterministic scoring engine.
//
// Pure functions, no I/O. Given a user location, a candidate destination,
// its elevation (if known), and a route (if one was computed), produces a
// transparent score plus a human-readable breakdown for the "Why this
// recommendation?" UI. Same formula regardless of whether the inputs came
// from live data or demo data — only the inputs differ, never the math, so
// the score is honest about what it does and doesn't know.
//
// SafetyScore = elevationScore + distanceScore + accessibilityScore
//             + suitabilityScore + hazardScore, floored at 0
//             (elevation -30..+30, distance 0..25, accessibility 0..20,
//              suitability 8..15, hazard fixed at 5)
//
// Elevation is a *signed* score, not a floor-at-zero score: for a flood
// scenario, recommending a destination that is actually lower than the
// user is not "neutral," it's actively worse, so it must be able to pull a
// candidate's total score down (even negative) rather than just contribute
// nothing. See computeElevationScore() below — this was a real bug fix:
// a nearby hospital ~10m *lower* than the user was outranking a materially
// higher candidate, because the old formula floored elevation at 0 for any
// non-gain instead of penalizing it, letting distance/accessibility alone
// decide. See scripts/scoring-dev-check.mjs for worked-example regression cases.
//
// This is intentionally simple arithmetic — not a machine-learning model,
// not a validated hazard prediction. Transparent and explainable beats
// sophisticated and opaque.
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

// --- Elevation scoring constants -------------------------------------------
// Signed, asymmetric, and deliberately harsher on loss than it is generous
// on gain — for a FLOOD scenario specifically, going lower is a safety
// problem, not just "less good," so the penalty slope is steeper than the
// reward slope. Both segments are linear (simple, explainable, no cliffs
// at the boundaries) and meet at a small positive "roughly equal ground"
// baseline rather than zero, per requirement: neutral/slight-positive for
// ~equal elevation, not a hard floor.
export const ELEVATION_SCORE_MAX = 30;
export const ELEVATION_SCORE_MIN = -30;
/** Score at deltaM === 0 (candidate exactly level with the user). */
const ELEVATION_NEUTRAL_BASELINE = 3;
/** Meters of gain needed to reach the max +30 score. */
const ELEVATION_GAIN_CAP_M = 20;
/** Points lost per meter of elevation LOSS — steeper than the gain slope on purpose. */
const ELEVATION_LOSS_SLOPE = 1.8;

const GAIN_SLOPE = (ELEVATION_SCORE_MAX - ELEVATION_NEUTRAL_BASELINE) / ELEVATION_GAIN_CAP_M;

/**
 * Signed elevation sub-score for a flood scenario, as a function of
 * deltaM = candidateElevation - userElevation (meters).
 *
 *   deltaM >= +20   -> +30  (strong positive: meaningfully higher ground)
 *   deltaM  = 0     -> +3   (neutral/slight positive: roughly equal ground)
 *   deltaM  = -10   -> -15  (meaningful penalty: noticeably lower)
 *   deltaM <= -18.3 -> -30  (capped strong penalty: significantly lower)
 *
 * Exported and unit-tested directly — see scripts/scoring-dev-check.mjs — because
 * this is the exact function whose old (floor-at-zero) behavior caused a
 * lower candidate to wrongly outrank a higher one.
 */
export function computeElevationScore(deltaM: number): number {
  if (deltaM >= 0) {
    return clamp(ELEVATION_NEUTRAL_BASELINE + deltaM * GAIN_SLOPE, ELEVATION_NEUTRAL_BASELINE, ELEVATION_SCORE_MAX);
  }
  return clamp(ELEVATION_NEUTRAL_BASELINE + deltaM * ELEVATION_LOSS_SLOPE, ELEVATION_SCORE_MIN, ELEVATION_NEUTRAL_BASELINE);
}

function elevationReasonText(deltaM: number): string {
  if (deltaM >= 20) return `${deltaM} m higher than your current location — meaningfully reduces flood exposure`;
  if (deltaM >= 5) return `${deltaM} m higher than your current location`;
  if (deltaM > -5) return "Approximately the same elevation as your current location";
  if (deltaM > -20) return `${Math.abs(deltaM)} m LOWER than your current location — increases flood risk, penalized in scoring`;
  return `${Math.abs(deltaM)} m LOWER than your current location — significantly increases flood risk, heavily penalized`;
}

/**
 * Scores one candidate against the user's location. `route` is the live or
 * estimated route to this specific candidate (see useFloodEvacuation.ts) —
 * pass null if none could be computed at all.
 */
export function scoreCandidate(user: UserLocation, candidate: EvacuationCandidate, route: RouteInfo | null): ScoredCandidate {
  const straightLineM = candidate.straightLineDistanceM ?? haversineDistanceM(user, candidate.location);
  const reasons: string[] = [];

  // --- Elevation (signed, -30..+30 — see computeElevationScore) ---------
  let elevationScore: number;
  const hasElevation = typeof user.elevationM === "number" && typeof candidate.elevationM === "number";
  if (hasElevation) {
    const deltaM = Math.round((candidate.elevationM as number) - (user.elevationM as number));
    elevationScore = computeElevationScore(deltaM);
    reasons.push(elevationReasonText(deltaM));
  } else {
    elevationScore = 0; // true neutral — no elevation data available for this candidate, no bonus or penalty
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
  // Floored at 0 for display (the app documents this as a 0-100 score); the
  // breakdown above keeps the true, possibly-negative elevationScore so the
  // "why" is never hidden even when the total bottoms out at 0.
  const score = Math.max(0, Math.round(elevationScore + distanceScore + accessibilityScore + suitabilityScore + hazardScore));

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
