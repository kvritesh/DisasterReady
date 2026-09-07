// ============================================================================
// Flood Evacuation — orchestration hook.
//
// Given a user location (real GPS or the labeled demo location), runs the
// full analysis pipeline: load Google Maps (if configured) -> user
// elevation -> nearby candidate destinations (Places, else demo) ->
// candidate elevations -> a walking route to the nearest few candidates ->
// deterministic scoring -> ranked recommendation.
//
// Every external call degrades independently — see googleMapsQueries.ts —
// so a missing/invalid API key, unconfigured billing, or a quota error
// never blocks the feature: it just means more of the result comes from
// clearly-labeled demo data instead of live data. `dataSources` in the
// result tells the UI exactly which parts were live vs. demo so it can be
// honest about it (see PHASE 10/11 of the brief this was built from).
// ============================================================================

import { useCallback, useState } from "react";
import type { EvacuationStatus, RouteInfo, ScoredCandidate, UserLocation } from "../types/evacuation";
import { DEMO_CANDIDATES, DEMO_USER_LOCATION } from "../data/evacuationDemo";
import { haversineDistanceM, scoreAndRankCandidates } from "../lib/evacuationScoring";
import { isGoogleMapsConfigured, loadGoogleMaps } from "../lib/googleMapsLoader";
import { getElevations, getWalkingRoute, nearbySearchCandidates } from "../lib/googleMapsQueries";

export interface DataSourceFlags {
  /** Whether the Google Maps JS API loaded successfully at all this run. */
  mapsAvailable: boolean;
  liveUserElevation: boolean;
  liveCandidates: boolean;
  liveCandidateElevations: boolean;
  liveRoutes: boolean;
}

export interface FloodEvacuationResult {
  user: UserLocation;
  candidates: ScoredCandidate[];
  recommended: ScoredCandidate | null;
  dataSources: DataSourceFlags;
}

const ROUTE_CANDIDATE_LIMIT = 4;
const CANDIDATE_RADIUS_M = 3000;

export function useFloodEvacuation() {
  const [status, setStatus] = useState<EvacuationStatus>("idle");
  const [result, setResult] = useState<FloodEvacuationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const analyze = useCallback(async (base: Pick<UserLocation, "lat" | "lng" | "source" | "label" | "accuracyM">) => {
    setStatus("analyzing");
    setErrorMessage(null);

    const flags: DataSourceFlags = {
      mapsAvailable: false,
      liveUserElevation: false,
      liveCandidates: false,
      liveCandidateElevations: false,
      liveRoutes: false,
    };

    let user: UserLocation = { ...base };
    let candidates = DEMO_CANDIDATES.map((c) => ({ ...c }));

    try {
      if (isGoogleMapsConfigured()) {
        const google = await loadGoogleMaps();
        flags.mapsAvailable = true;

        // User elevation (live)
        try {
          const [elev] = await getElevations(google, [{ lat: user.lat, lng: user.lng }]);
          if (typeof elev === "number") {
            user = { ...user, elevationM: Math.round(elev) };
            flags.liveUserElevation = true;
          }
        } catch {
          // fall through — user.elevationM stays undefined, scoring handles it
        }

        // Nearby candidates (live)
        try {
          const found = await nearbySearchCandidates(google, { lat: user.lat, lng: user.lng }, CANDIDATE_RADIUS_M);
          if (found.length > 0) {
            candidates = found;
            flags.liveCandidates = true;
          }
        } catch {
          // stays on demo candidates
        }

        // Candidate elevations (live) — only for whichever candidates don't already have one
        try {
          const missing = candidates.filter((c) => typeof c.elevationM !== "number");
          if (missing.length > 0) {
            const elevations = await getElevations(
              google,
              missing.map((c) => c.location)
            );
            let any = false;
            missing.forEach((c, i) => {
              const e = elevations[i];
              if (typeof e === "number") {
                c.elevationM = Math.round(e);
                any = true;
              }
            });
            if (any) flags.liveCandidateElevations = true;
          }
        } catch {
          // candidates keep whatever elevation they already had (demo values, or none)
        }
      }
    } catch {
      // Google Maps didn't load at all (no key, network, invalid key, billing) —
      // flags.mapsAvailable stays false and everything above stays on demo data.
    }

    // Fill in the demo user elevation only when we're genuinely using the
    // demo location and didn't get a live reading for it.
    if (!flags.liveUserElevation && user.source === "demo") {
      user = { ...user, elevationM: DEMO_USER_LOCATION.elevationM };
    }

    // Straight-line distance for every candidate, then routes for the nearest few only
    // (keeps this to a handful of Directions requests, not one per candidate).
    const withDistance = candidates.map((c) => ({
      ...c,
      straightLineDistanceM: haversineDistanceM(user, c.location),
    }));
    const nearest = [...withDistance].sort((a, b) => a.straightLineDistanceM - b.straightLineDistanceM).slice(0, ROUTE_CANDIDATE_LIMIT);

    const routesByCandidateId = new Map<string, RouteInfo | null>();
    if (flags.mapsAvailable) {
      try {
        const google = await loadGoogleMaps();
        await Promise.all(
          nearest.map(async (c) => {
            const route = await getWalkingRoute(google, { lat: user.lat, lng: user.lng }, c.location);
            routesByCandidateId.set(c.id, route);
            if (route) flags.liveRoutes = true;
          })
        );
      } catch {
        // no routes at all this run — scoring falls back to distance-based accessibility
      }
    }

    const scored = scoreAndRankCandidates(user, withDistance, routesByCandidateId);

    setResult({
      user,
      candidates: scored,
      recommended: scored[0] ?? null,
      dataSources: flags,
    });
    setStatus("ready");
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setResult(null);
    setErrorMessage(null);
  }, []);

  return { status, result, errorMessage, analyze, reset };
}
