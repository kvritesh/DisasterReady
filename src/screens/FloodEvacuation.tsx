// ============================================================================
// Flood Evacuation screen.
//
// User flow: choose a location (their own GPS, or a clearly labeled demo
// location) -> DisasterReady scores nearby candidate destinations on a
// transparent, deterministic formula (see src/lib/evacuationScoring.ts) ->
// shows a recommended evacuation point with its reasoning -> lets the user
// open the route in OpenStreetMap, or practice the decision in the existing
// Unity preparedness simulator.
//
// Built entirely on free, key-less geographic services — OpenStreetMap /
// Leaflet, Overpass, Open-Elevation, OSRM — see src/lib/geoServices.ts and
// src/lib/leafletLoader.ts. No Google Maps Platform, no API key, no billing
// account. Every live call can fail (these are shared public instances)
// and independently falls back to clearly-labeled local demo data — see
// src/hooks/useFloodEvacuation.ts and src/data/evacuationDemo.ts. The UI
// always labels which one is in use; it never presents demo data as live.
//
// uiMode === "ultra" below is PRESENTATION ONLY — every value rendered
// (recommended.score/elevationM/straightLineDistanceM/route/reasons, the
// data-source badges) comes from the exact same evacuation/geolocation
// hooks as Simple mode. Nothing here changes scoring, routing, or the
// underlying geo pipeline.
// ============================================================================

import { useEffect } from "react";
import clsx from "clsx";
import {
  AlertTriangle,
  Compass,
  Gamepad2,
  Info,
  Loader2,
  LocateFixed,
  Mountain,
  Navigation,
  Route as RouteIcon,
  Waves,
} from "lucide-react";
import { Badge, Button, Card, ScreenHeader } from "../components/ui/primitives";
import { TopographicPattern } from "../components/ui/TopographicPattern";
import { EvacuationMap } from "../components/evacuation/EvacuationMap";
import { useGeolocation } from "../hooks/useGeolocation";
import { useFloodEvacuation } from "../hooks/useFloodEvacuation";
import { useUnitySimulator } from "../hooks/useUnitySimulator";
import { useApp } from "../state/AppContext";
import { DEMO_USER_LOCATION, candidateTypeLabel } from "../data/evacuationDemo";
import type { ScoredCandidate } from "../types/evacuation";

// OpenStreetMap's own directions UI (no key, runs on the free OSRM-backed
// router behind openstreetmap.org) — opens a walking route in a new tab,
// mirroring what "View Route in Google Maps" used to do.
function osmDirectionsUrl(candidate: ScoredCandidate, origin: { lat: number; lng: number }) {
  const params = new URLSearchParams({
    engine: "fossgis_osrm_foot",
    route: `${origin.lat},${origin.lng};${candidate.location.lat},${candidate.location.lng}`,
  });
  return `https://www.openstreetmap.org/directions?${params.toString()}`;
}

function ScoreReasonList({ candidate, ultra }: { candidate: ScoredCandidate; ultra: boolean }) {
  return (
    <ul className="mt-3 flex flex-col gap-1.5">
      {candidate.reasons.map((reason, i) => (
        <li
          key={i}
          className={clsx("flex items-start gap-2 text-[12.5px] leading-snug", ultra ? "text-stone-300" : "text-stone-600")}
        >
          <span className={clsx("mt-1.5 h-1 w-1 shrink-0 rounded-full", ultra ? "bg-forest-400" : "bg-forest-500")} />
          {reason}
        </li>
      ))}
    </ul>
  );
}

export function FloodEvacuation() {
  const { region, uiMode } = useApp();
  const ultra = uiMode === "ultra";
  const geolocation = useGeolocation();
  const evacuation = useFloodEvacuation();
  const simulator = useUnitySimulator();

  // Once GPS resolves, immediately kick off analysis.
  useEffect(() => {
    if (geolocation.state.status === "success") {
      evacuation.analyze({
        lat: geolocation.state.location.lat,
        lng: geolocation.state.location.lng,
        accuracyM: geolocation.state.location.accuracyM,
        source: "gps",
        label: "Your location",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geolocation.state]);

  const useDemoLocation = () => {
    evacuation.analyze(DEMO_USER_LOCATION);
  };

  const recommended = evacuation.result?.recommended ?? null;
  const others = (evacuation.result?.candidates ?? []).filter((c) => c.id !== recommended?.id).slice(0, 3);
  const sources = evacuation.result?.dataSources;

  return (
    <div className={clsx("mx-auto max-w-6xl px-6 py-8 md:px-10 md:py-10", ultra && "bg-cream-100")}>
      <ScreenHeader
        eyebrow="Flood preparedness"
        title="Flood Evacuation"
        subtitle="Find a recommended evacuation point based on your location, elevation, distance, and accessibility."
        actions={<Badge tone="forest" icon={<Waves size={12} />}>OpenStreetMap · free, no API key</Badge>}
      />

      <Card className={clsx("mt-5 flex items-start gap-3 p-4", ultra && "!border-forest-400/15 !bg-forest-950/95 text-cream-50")}>
        <Info size={16} className={clsx("mt-0.5 shrink-0", ultra ? "text-forest-300" : "text-stone-400")} />
        <p className={clsx("text-[12.5px] leading-relaxed", ultra ? "text-stone-300" : "text-stone-500")}>
          These are{" "}
          <strong className={ultra ? "text-cream-50" : "text-stone-700"}>recommended</strong> evacuation points, based on
          available geographic, elevation, accessibility and hazard information — not a guarantee of safety, and not a live
          flood forecast. During an actual emergency, follow official local emergency instructions.
        </p>
      </Card>

      {/* Location controls */}
      <Card className={clsx("mt-5 p-6", ultra && "!border-forest-400/15 !bg-forest-950/95 text-cream-50")}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div
              className={clsx(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                ultra ? "bg-forest-500 text-cream-50" : "bg-forest-600 text-cream-50"
              )}
            >
              <LocateFixed size={19} />
            </div>
            <div>
              <p className={clsx("font-display text-[15px] font-bold", ultra ? "text-cream-50" : "text-stone-900")}>
                Where are you evacuating from?
              </p>
              <p className={clsx("mt-1 max-w-md text-[13px] leading-relaxed", ultra ? "text-stone-400" : "text-stone-500")}>
                Use your current GPS location, or try the demo with a sample location in Bengaluru.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={geolocation.requestLocation}
              disabled={geolocation.state.status === "locating" || evacuation.status === "analyzing"}
              icon={geolocation.state.status === "locating" ? <Loader2 size={14} className="animate-spin" /> : <LocateFixed size={14} />}
            >
              {geolocation.state.status === "locating" ? "Locating…" : "Use My Location"}
            </Button>
            <Button size="sm" variant="secondary" onClick={useDemoLocation} disabled={evacuation.status === "analyzing"} icon={<Compass size={14} />}>
              Use Demo Location
            </Button>
          </div>
        </div>

        {geolocation.state.status === "error" && (
          <div
            className={clsx(
              "mt-4 flex items-center gap-3 rounded-2xl border p-4",
              ultra ? "border-amber-400/30 bg-amber-400/10" : "border-amber-400/40 bg-amber-400/5"
            )}
          >
            <AlertTriangle size={18} className="shrink-0 text-amber-500" />
            <div>
              <p className={clsx("text-[13px] font-semibold", ultra ? "text-cream-50" : "text-stone-800")}>{geolocation.state.message}</p>
              <p className={clsx("text-[12px]", ultra ? "text-stone-400" : "text-stone-500")}>
                Try &ldquo;Use Demo Location&rdquo; instead to see the feature with a sample location.
              </p>
            </div>
          </div>
        )}

        {evacuation.status === "analyzing" && (
          <p className={clsx("mt-4 flex items-center gap-2 text-[12.5px] font-semibold", ultra ? "text-stone-300" : "text-stone-500")}>
            <Loader2 size={14} className="animate-spin" /> Analyzing nearby candidate destinations…
          </p>
        )}

        {evacuation.result && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone={evacuation.result.user.source === "gps" ? "forest" : "amber"}>{evacuation.result.user.label}</Badge>
            <Badge tone={sources?.liveCandidates ? "forest" : "stone"}>
              {sources?.liveCandidates ? "Live nearby destinations" : "Demo candidate destinations"}
            </Badge>
            <Badge tone={sources?.liveRoutes ? "forest" : "stone"}>{sources?.liveRoutes ? "Live route" : "Estimated route"}</Badge>
          </div>
        )}
      </Card>

      {evacuation.result && (
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-5">
          <Card
            className={clsx(
              "p-2 lg:col-span-3",
              ultra && "relative overflow-hidden !border-forest-400/15 !bg-forest-950/95"
            )}
          >
            {ultra && <TopographicPattern className="text-forest-100 opacity-[0.04]" />}
            {/*
              PRESENTATION-SAFETY FIX: this wrapper must carry h-full.
              EvacuationMap.tsx's own outer element uses `h-full` (plus a
              min-h-[280px] floor) to size itself against its parent — that
              only resolves to a real pixel height because this Card is a
              CSS Grid item that stretches to the row's height (grid's
              default align-items: stretch). A plain wrapper div with no
              height of its own breaks that percentage-height chain (a
              `height: auto` parent makes a `height: 100%` child resolve to
              auto too), collapsing the actual Leaflet map container to 0px
              tall — invisible, regardless of Leaflet/tiles loading fine.
            */}
            <div className="relative h-full">
              <EvacuationMap user={evacuation.result.user} candidates={evacuation.result.candidates} recommended={recommended} />
            </div>
          </Card>

          <div className="flex flex-col gap-4 lg:col-span-2">
            {recommended ? (
              <Card
                className={clsx(
                  "relative overflow-hidden p-6",
                  ultra ? "!border-forest-400/20 !bg-forest-950 text-cream-50 shadow-[var(--shadow-lift)]" : ""
                )}
              >
                {ultra && <TopographicPattern className="text-forest-100 opacity-[0.05]" />}
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <Badge
                      tone="forest"
                      className={ultra ? "!border-forest-400/30 !bg-forest-400/15 !text-forest-200" : undefined}
                    >
                      Recommended evacuation point
                    </Badge>
                    <span className={clsx("font-display text-lg font-extrabold tabular", ultra ? "text-forest-300" : "text-forest-700")}>
                      {recommended.score}/100
                    </span>
                  </div>
                  <p className={clsx("mt-2 font-display text-lg font-bold", ultra ? "text-cream-50" : "text-stone-900")}>
                    {recommended.name}
                  </p>
                  <p className={clsx("text-[12px] font-semibold uppercase tracking-wide", ultra ? "text-forest-400/70" : "text-stone-400")}>
                    {candidateTypeLabel(recommended.type)}
                  </p>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className={clsx("rounded-xl p-2.5 text-center", ultra ? "bg-forest-900/70" : "bg-cream-100")}>
                      <Mountain size={14} className={clsx("mx-auto", ultra ? "text-forest-300" : "text-forest-600")} />
                      <p className={clsx("mt-1 text-[13px] font-bold tabular", ultra ? "text-cream-50" : "text-stone-800")}>
                        {typeof recommended.elevationM === "number" && typeof evacuation.result.user.elevationM === "number"
                          ? `${Math.round(recommended.elevationM - evacuation.result.user.elevationM)} m`
                          : "—"}
                      </p>
                      <p className={clsx("text-[10px]", ultra ? "text-forest-400/60" : "text-stone-400")}>elevation</p>
                    </div>
                    <div className={clsx("rounded-xl p-2.5 text-center", ultra ? "bg-forest-900/70" : "bg-cream-100")}>
                      <Navigation size={14} className={clsx("mx-auto", ultra ? "text-forest-300" : "text-forest-600")} />
                      <p className={clsx("mt-1 text-[13px] font-bold tabular", ultra ? "text-cream-50" : "text-stone-800")}>
                        {recommended.straightLineDistanceM !== undefined
                          ? recommended.straightLineDistanceM < 1000
                            ? `${Math.round(recommended.straightLineDistanceM)} m`
                            : `${(recommended.straightLineDistanceM / 1000).toFixed(1)} km`
                          : "—"}
                      </p>
                      <p className={clsx("text-[10px]", ultra ? "text-forest-400/60" : "text-stone-400")}>distance</p>
                    </div>
                    <div className={clsx("rounded-xl p-2.5 text-center", ultra ? "bg-forest-900/70" : "bg-cream-100")}>
                      <RouteIcon size={14} className={clsx("mx-auto", ultra ? "text-forest-300" : "text-forest-600")} />
                      <p className={clsx("mt-1 text-[13px] font-bold tabular", ultra ? "text-cream-50" : "text-stone-800")}>
                        {recommended.route ? `${Math.round(recommended.route.durationSeconds / 60)} min` : "—"}
                      </p>
                      <p className={clsx("text-[10px]", ultra ? "text-forest-400/60" : "text-stone-400")}>walking</p>
                    </div>
                  </div>

                  <p className={clsx("mt-4 text-[11px] font-bold uppercase tracking-wide", ultra ? "text-forest-400/70" : "text-stone-400")}>
                    Why this location?
                  </p>
                  <ScoreReasonList candidate={recommended} ultra={ultra} />

                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={ultra ? "outline" : "secondary"}
                      className={ultra ? "!border-forest-400/30 !text-cream-50 hover:!bg-forest-900/60" : undefined}
                      icon={<Navigation size={14} />}
                      onClick={() => window.open(osmDirectionsUrl(recommended, evacuation.result!.user), "_blank", "noopener,noreferrer")}
                    >
                      View Route in OpenStreetMap
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={region.status !== "full"}
                      icon={<Gamepad2 size={14} />}
                      onClick={() => simulator.launch(region.id)}
                    >
                      Practice This Evacuation
                    </Button>
                  </div>
                  <p className={clsx("mt-3 text-[11px] leading-relaxed", ultra ? "text-forest-400/60" : "text-stone-400")}>
                    Practice launches the existing Unity preparedness simulator — a general evacuation-decision exercise for{" "}
                    {region.name}, not an exact simulation of your route or neighborhood.
                  </p>

                  {simulator.status === "completed" && simulator.result && (
                    <div
                      className={clsx(
                        "mt-3 rounded-xl border p-3 text-[12px]",
                        ultra ? "border-forest-400/20 bg-forest-900/60 text-stone-300" : "border-forest-600/20 bg-forest-600/5 text-stone-600"
                      )}
                    >
                      Simulator result: {simulator.result.preparednessScore}/100 · {simulator.result.missionsCompleted}/
                      {simulator.result.missionsTotal} missions
                    </div>
                  )}
                </div>
              </Card>
            ) : (
              <Card className={clsx("p-6 text-[13px]", ultra ? "!border-forest-400/15 !bg-forest-950/95 text-stone-300" : "text-stone-500")}>
                No candidate destinations could be evaluated.
              </Card>
            )}

            {others.length > 0 && (
              <Card className={clsx("p-5", ultra && "!border-forest-400/15 !bg-forest-950/95 text-cream-50")}>
                <p className={clsx("text-[11px] font-bold uppercase tracking-wide", ultra ? "text-forest-400/70" : "text-stone-400")}>
                  Other candidates considered
                </p>
                <div className="mt-3 flex flex-col gap-2.5">
                  {others.map((c) => (
                    <div
                      key={c.id}
                      className={clsx(
                        "flex items-center justify-between gap-3 rounded-xl px-3 py-2.5",
                        ultra ? "bg-forest-900/60" : "bg-cream-100"
                      )}
                    >
                      <div className="min-w-0">
                        <p className={clsx("truncate text-[13px] font-semibold", ultra ? "text-cream-50" : "text-stone-800")}>{c.name}</p>
                        <p className={clsx("text-[11px]", ultra ? "text-forest-400/60" : "text-stone-400")}>{candidateTypeLabel(c.type)}</p>
                      </div>
                      <span className={clsx("shrink-0 text-[13px] font-extrabold tabular", ultra ? "text-forest-300" : "text-stone-500")}>
                        {c.score}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {!evacuation.result && geolocation.state.status === "idle" && (
        <Card className={clsx("mt-5 flex flex-col items-center gap-3 p-10 text-center", ultra && "!border-forest-400/15 !bg-forest-950/95")}>
          <Waves size={28} className={ultra ? "text-forest-300" : "text-forest-400"} />
          <p className={clsx("max-w-sm text-[13px]", ultra ? "text-stone-300" : "text-stone-500")}>
            Choose a starting location above to see a recommended evacuation point, its reasoning, and a route.
          </p>
        </Card>
      )}
    </div>
  );
}
