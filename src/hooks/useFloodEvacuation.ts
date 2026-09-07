// ============================================================================
// Flood Evacuation — orchestration hook.
//
// Given a user location (real GPS or the labeled demo location), runs the
// full analysis pipeline: nearby candidate destinations (Overpass API, else
// demo) -> elevation for user + candidates (Open-Elevation, else demo) ->
// a walking route to the nearest few candidates (OSRM, else estimated) ->
// deterministic scoring -> ranked recommendation.
//
// Every external call is free and key-less (see src/lib/geoServices.ts) but
// each is also a shared public instance that can be slow, rate-limited, or
// briefly down — every call degrades independently, so one flaky service
// never blocks the feature: it just means more of the result comes from
// clearly-labeled demo data instead of live data. `dataSources` in the
// result tells the UI exactly which parts were live vs. demo so it can be
// honest about it.
// ============================================================================

import { useCallback, useState } from "react";
import type { EvacuationStatus, RouteInfo, ScoredCandidate, UserLocation } from "../types/evacuation";
import { DEMO_CANDIDATES, DEMO_USER_LOCATION } from "../data/evacuationDemo";
import { haversineDistanceM, scoreAndRankCandidates } from "../lib/evacuationScoring";
import { getElevationsOSM, getWalkingRouteOSRM, nearbySearchCandidatesOSM } from "../lib/geoServices";

export interface DataSourceFlags {
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
      liveUserElevation: false,
      liveCandidates: false,
      liveCandidateElevations: false,
      liveRoutes: false,
    };

    let user: UserLocation = { ...base };
    let candidates = DEMO_CANDIDATES.map((c) => ({ ...c }));

    // User elevation (Open-Elevation)
    try {
      const [elev] = await getElevationsOSM([{ lat: user.lat, lng: user.lng }]);
      if (typeof elev === "number") {
        user = { ...user, elevationM: Math.round(elev) };
        flags.liveUserElevation = true;
      }
    } catch {
      // falls through — user.elevationM stays undefined, scoring handles it
    }

    // Nearby candidates (Overpass)
    try {
      const found = await nearbySearchCandidatesOSM({ lat: user.lat, lng: user.lng }, CANDIDATE_RADIUS_M);
      if (found.length > 0) {
        candidates = found;
        flags.liveCandidates = true;
      }
    } catch {
      // stays on demo candidates
    }

    // Candidate elevations (Open-Elevation) — only for whichever candidates don't already have one
    try {
      const missing = candidates.filter((c) => typeof c.elevationM !== "number");
      if (missing.length > 0) {
        const elevations = await getElevationsOSM(missing.map((c) => c.location));
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

    // Fill in the demo user elevation only when we're genuinely using the
    // demo location and didn't get a live reading for it.
    if (!flags.liveUserElevation && user.source === "demo") {
      user = { ...user, elevationM: DEMO_USER_LOCATION.elevationM };
    }

    // Straight-line distance for every candidate, then routes for the nearest few only
    // (keeps this to a handful of OSRM requests, not one per candidate).
    const withDistance = candidates.map((c) => ({
      ...c,
      straightLineDistanceM: haversineDistanceM(user, c.location),
    }));
    const nearest = [...withDistance].sort((a, b) => a.straightLineDistanceM - b.straightLineDistanceM).slice(0, ROUTE_CANDIDATE_LIMIT);

    const routesByCandidateId = new Map<string, RouteInfo | null>();
    try {
      await Promise.all(
        nearest.map(async (c) => {
          const route = await getWalkingRouteOSRM({ lat: user.lat, lng: user.lng }, c.location);
          routesByCandidateId.set(c.id, route);
          if (route) flags.liveRoutes = true;
        })
      );
    } catch {
      // no routes at all this run — scoring falls back to distance-based accessibility
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
