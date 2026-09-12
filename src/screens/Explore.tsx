import { useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import {
  Compass as CompassIcon,
  Gauge,
  Layers,
  Map as MapIcon,
  MapPin,
  Mountain,
  Navigation,
  Stethoscope,
  Target,
  Tent,
  Waves,
  Wifi,
  X,
} from "lucide-react";
import clsx from "clsx";
import { ActionCard, Badge } from "../components/ui/primitives";
import { useApp } from "../state/AppContext";
import { poisForRegion } from "../data/pois";
import { TerrainScene } from "../three/TerrainScene";
import { findHighestPoint, findSteepestPoint, heightFieldParams } from "../three/terrainGeometry";
import { sampleTerrain } from "../three/terrainMath";
import type { POI, TerrainPoint, VisualizationMode } from "../types";
import type { ScreenId } from "../App";

// Icons are purely decorative labels for the same four real visualization
// modes — the underlying VisualizationMode value and TerrainScene behavior
// are identical regardless of which icon set is shown.
const MODES: { id: VisualizationMode; label: string; icon: typeof Layers }[] = [
  { id: "normal", label: "Normal", icon: Layers },
  { id: "elevation", label: "Elevation", icon: Mountain },
  { id: "slope", label: "Steepness", icon: Gauge },
  { id: "aspect", label: "Aspect", icon: Navigation },
];

const STEEPNESS_LEGEND: { color: string; label: string }[] = [
  { color: "#5fae6e", label: "Lower slope" },
  { color: "#e6b463", label: "Moderate slope" },
  { color: "#d65c4d", label: "Steep terrain" },
];

export function Explore({ onNavigate }: { onNavigate?: (screen: ScreenId) => void }) {
  const {
    region,
    missions,
    activeMissionId,
    missionTargetHint,
    completeMission,
    cancelMission,
    visitPoi,
    setTerrainPoint,
    pushToast,
    connectivity,
    debugTerrain,
    showPerformance,
    uiMode,
  } = useApp();

  const ultra = uiMode === "ultra";

  const [mode, setMode] = useState<VisualizationMode>("normal");
  const [selectedPoint, setSelectedPoint] = useState<{ x: number; z: number } | null>(null);
  const [terrainInfo, setTerrainInfo] = useState<TerrainPoint | null>(null);
  const [selectedPoi, setSelectedPoi] = useState<POI | null>(null);

  const controlsRef = useRef<any>(null);
  const compassRef = useRef<HTMLDivElement | null>(null);

  const pois = useMemo(() => poisForRegion(region.id), [region.id]);
  const activeMission = missions.find((m) => m.id === activeMissionId) ?? null;

  const highGroundTarget = useMemo(() => findHighestPoint(region), [region]);
  const steepTarget = useMemo(() => findSteepestPoint(region), [region]);

  // Default HUD reading before the user has clicked anywhere — sampled from
  // this region's own procedural terrain (never a hardcoded elevation), so it
  // always falls inside the region's real elevationMinM/elevationMaxM range.
  const defaultStat = useMemo<TerrainPoint>(() => {
    const params = heightFieldParams(region);
    const sample = sampleTerrain(0, 0, region, params);
    return {
      x: 0,
      z: 0,
      elevationM: sample.elevationM,
      slopeDeg: sample.slopeDeg,
      aspect: sample.aspect,
      terrainClass: sample.terrainClass,
    };
  }, [region]);

  const missionTarget = useMemo(() => {
    if (!activeMission) return null;
    if (activeMission.interactionKind === "find-high-ground") {
      return { x: highGroundTarget.x, z: highGroundTarget.z, label: "Highest ground" };
    }
    if (activeMission.interactionKind === "find-steep-slope") {
      return { x: steepTarget.x, z: steepTarget.z, label: "Steep face (30°+)" };
    }
    return null;
  }, [activeMission, highGroundTarget, steepTarget]);

  const highlightedPoiId = useMemo(() => {
    if (!activeMission) return null;
    if (activeMission.interactionKind === "find-shelter") return pois.find((p) => p.type === "shelter")?.id ?? null;
    if (activeMission.interactionKind === "find-hospital") return pois.find((p) => p.type === "hospital")?.id ?? null;
    return null;
  }, [activeMission, pois]);

  const handleSelectPoint = (point: { x: number; z: number }) => {
    setSelectedPoi(null);
    setSelectedPoint(point);
    const params = heightFieldParams(region);
    const sample = sampleTerrain(point.x, point.z, region, params);
    const info: TerrainPoint = {
      x: point.x,
      z: point.z,
      elevationM: sample.elevationM,
      slopeDeg: sample.slopeDeg,
      aspect: sample.aspect,
      terrainClass: sample.terrainClass,
    };
    setTerrainInfo(info);
    setTerrainPoint(info);

    if (activeMission?.interactionKind === "find-high-ground") {
      // Forgiving band near the region's true highest sampled point, so the
      // mission is always completable regardless of a region's overall relief.
      if (sample.heightNorm >= highGroundTarget.value - 0.07) {
        completeMission(activeMission.id);
      } else {
        pushToast({ tone: "info", title: "Not quite the summit", body: "Try the highlighted ridge." });
      }
    } else if (activeMission?.interactionKind === "find-steep-slope") {
      if (sample.slopeDeg > 30) {
        completeMission(activeMission.id);
      } else {
        pushToast({ tone: "info", title: `Only ${sample.slopeDeg.toFixed(0)}° here`, body: "Look for a steeper face." });
      }
    }
  };

  const handleSelectPoi = (poi: POI) => {
    setSelectedPoint(null);
    setSelectedPoi(poi);
    visitPoi(poi.id);

    if (activeMission?.interactionKind === "find-shelter" && poi.type === "shelter") {
      completeMission(activeMission.id);
    } else if (activeMission?.interactionKind === "find-hospital" && poi.type === "hospital") {
      completeMission(activeMission.id);
    }
  };

  const stat = terrainInfo ?? defaultStat;

  return (
    <div className="relative h-full w-full overflow-hidden bg-cream-100">
      {/* Camera position chosen so the default view looks across the
          terrain's ridgelines (which run roughly north-south, i.e. along Z)
          rather than down their length — a "down the length" view
          foreshortens ridges into a blur; a broadside view shows their
          rise-and-fall silhouette immediately, without needing to orbit.
          This <Canvas>/<TerrainScene> is identical in Simple and Ultra —
          only the DOM overlay chrome around it differs below. */}
      <Canvas shadows camera={{ position: [20, 16, 14], fov: 42 }} className="!absolute !inset-0">
        <TerrainScene
          region={region}
          mode={mode}
          pois={pois}
          selectedPoint={selectedPoint}
          onSelectPoint={handleSelectPoint}
          onSelectPoi={handleSelectPoi}
          missionTarget={missionTarget}
          highlightedPoiId={highlightedPoiId}
          debugTerrain={debugTerrain}
          showPerformance={showPerformance}
          controlsRef={controlsRef}
          compassRef={compassRef}
          contourLines={ultra}
        />
      </Canvas>

      {/* Top-left region + live stats HUD */}
      {ultra ? (
        <div className="pointer-events-none absolute left-4 top-4 sm:left-6 sm:top-6">
          <div className="pointer-events-auto w-[264px] rounded-2xl border border-forest-400/15 bg-forest-950/90 p-4 text-cream-50 shadow-[var(--shadow-lift)] backdrop-blur">
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <MapPin size={13} className="text-forest-300" />
              <span className="text-[13px] font-extrabold uppercase tracking-wide">{region.name}</span>
              {region.status === "pilot" && (
                <Badge tone="amber" className="!px-1.5 !py-0.5 !text-[8px]">
                  Pilot
                </Badge>
              )}
              {connectivity === "offline" && (
                <Badge tone="danger" className="!px-1.5 !py-0.5 !text-[8px]">
                  Offline
                </Badge>
              )}
            </div>
            <p className="mb-3 line-clamp-2 text-[11.5px] leading-snug text-stone-400">{region.description}</p>
            <div className="grid grid-cols-3 gap-1.5">
              <UltraStat icon={<Mountain size={12} />} label="Elevation" value={`${Math.round(stat.elevationM).toLocaleString()} m`} />
              <UltraStat icon={<Gauge size={12} />} label="Slope" value={`${stat.slopeDeg.toFixed(0)}°`} />
              <UltraStat icon={<Navigation size={12} />} label="Aspect" value={stat.aspect} />
            </div>
            {onNavigate && (
              <button
                onClick={() => onNavigate("prepare")}
                className="mt-3 text-[10.5px] font-semibold text-forest-300 hover:text-forest-200"
              >
                Change region
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="pointer-events-none absolute left-4 top-4 flex flex-col gap-2 sm:left-6 sm:top-6">
          <div className="pointer-events-auto flex items-center gap-2 rounded-2xl bg-stone-900/85 px-3.5 py-2 text-cream-50 backdrop-blur">
            <MapPin size={14} className="text-forest-300" />
            <span className="text-xs font-extrabold uppercase tracking-wide">{region.name}</span>
            {region.status === "pilot" && (
              <span className="ml-1 rounded-full bg-amber-400/20 px-2 py-0.5 text-[9.5px] font-bold uppercase text-amber-300">
                Pilot
              </span>
            )}
            {connectivity === "offline" && (
              <span className="ml-1 flex items-center gap-1 rounded-full bg-danger-600 px-2 py-0.5 text-[9.5px] font-bold uppercase">
                Offline
              </span>
            )}
            {onNavigate && (
              <button
                onClick={() => onNavigate("prepare")}
                className="ml-1 text-[10.5px] font-semibold text-forest-300 hover:text-forest-200"
              >
                Change
              </button>
            )}
          </div>
          <div className="pointer-events-auto grid grid-cols-3 gap-1.5">
            <HudStat icon={<Mountain size={12} />} label="Elevation" value={`${Math.round(stat.elevationM).toLocaleString()} m`} />
            <HudStat icon={<Gauge size={12} />} label="Slope" value={`${stat.slopeDeg.toFixed(0)}°`} />
            <HudStat icon={<Navigation size={12} />} label="Aspect" value={stat.aspect} />
          </div>
        </div>
      )}

      {/* Visualization mode toggle — same MODES/setMode as Simple; Ultra just
          looks like an integrated GIS control (icons + refined chrome). */}
      <div className="pointer-events-auto absolute right-4 top-4 flex flex-col items-end gap-1.5 sm:right-6 sm:top-6">
        <div
          className={clsx(
            "flex overflow-hidden rounded-xl border p-1 backdrop-blur",
            ultra ? "border-forest-400/15 bg-forest-950/90" : "border-stone-200/60 bg-stone-900/85"
          )}
        >
          {MODES.map((m) => {
            const Icon = m.icon;
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={clsx(
                  "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-colors",
                  active
                    ? ultra
                      ? "bg-forest-500/90 text-cream-50 shadow-[0_0_0_1px_rgba(116,168,125,0.3)]"
                      : "bg-forest-500 text-cream-50"
                    : ultra
                      ? "text-stone-400 hover:text-cream-100"
                      : "text-stone-300 hover:text-cream-50"
                )}
              >
                <Icon size={11} />
                {m.label}
              </button>
            );
          })}
        </div>
        {mode === "slope" ? (
          <SteepnessLegend ultra={ultra} />
        ) : (
          mode !== "normal" && <Badge tone="amber">Demo terrain model</Badge>
        )}
      </div>

      {/* Compass */}
      <div className="pointer-events-none absolute bottom-6 right-6 flex flex-col items-center gap-1">
        <div className="relative h-14 w-14 rounded-full border border-stone-300/70 bg-white/85 shadow-md backdrop-blur">
          <div ref={compassRef} className="absolute inset-0">
            <span className="absolute left-1/2 top-1 -translate-x-1/2 text-[10px] font-extrabold text-danger-600">N</span>
            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-bold text-stone-400">S</span>
            <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[9px] font-bold text-stone-400">W</span>
            <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] font-bold text-stone-400">E</span>
          </div>
          <CompassIcon size={16} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-stone-400" />
        </div>
      </div>

      {ultra ? (
        <>
          {/* Subtle contextual guidance — same message as Simple, quieter styling, never covers the terrain */}
          <div className="pointer-events-none absolute bottom-[124px] left-6 hidden sm:block">
            <div className="rounded-xl border border-forest-400/10 bg-forest-950/70 px-3 py-1.5 text-[10.5px] font-medium text-forest-300/80 backdrop-blur">
              Drag to orbit · Scroll to zoom · Click terrain to inspect
            </div>
          </div>
          {pois.length === 0 && (
            <div className="pointer-events-none absolute bottom-[124px] right-6 hidden max-w-[260px] sm:block">
              <div className="rounded-xl border border-amber-400/25 bg-amber-950/80 px-3 py-2 text-[10.5px] font-medium leading-snug text-amber-200 backdrop-blur">
                No emergency POI data (hospitals/shelters) configured for {region.name} yet — this is a pilot site.
                Terrain here is the same procedural demo model used everywhere; only Aizawl has POI data in this
                prototype.
              </div>
            </div>
          )}

          {/* Real working navigation — same three destinations described in
              the product brief, wired to the same onNavigate the rest of
              the app uses (no decorative/no-op buttons). */}
          {onNavigate && (
            <div className="pointer-events-auto absolute bottom-6 left-6 right-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <ActionCard
                variant="ultra"
                icon={<MapIcon size={16} />}
                title="Explore Terrain"
                description="Inspect elevation, slope and aspect across this region."
                onClick={() => onNavigate("explore")}
              />
              <ActionCard
                variant="ultra"
                icon={<Waves size={16} />}
                title="Find Safer Ground"
                description="Compare evacuation routes and shelter suitability."
                onClick={() => onNavigate("flood-evacuation")}
              />
              <ActionCard
                variant="ultra"
                icon={<Target size={16} />}
                title="Complete Missions"
                description="Earn XP and raise your preparedness score."
                onClick={() => onNavigate("missions")}
              />
            </div>
          )}
        </>
      ) : (
        <div className="pointer-events-none absolute bottom-6 left-6 hidden flex-col gap-1.5 sm:flex">
          <div className="rounded-xl bg-stone-900/70 px-3 py-2 text-[10.5px] font-medium text-stone-200 backdrop-blur">
            Drag to orbit · Scroll to zoom · Click terrain to inspect
          </div>
          <div className="rounded-xl bg-stone-900/70 px-3 py-2 text-[10.5px] font-medium text-forest-300 backdrop-blur">
            Explore terrain → spot safer ground → complete missions
          </div>
          {pois.length === 0 && (
            <div className="max-w-[260px] rounded-xl border border-amber-400/30 bg-amber-950/80 px-3 py-2 text-[10.5px] font-medium leading-snug text-amber-200 backdrop-blur">
              No emergency POI data (hospitals/shelters) configured for {region.name} yet — this is a pilot
              site. Terrain here is the same procedural demo model used everywhere; only Aizawl has POI data in
              this prototype.
            </div>
          )}
        </div>
      )}

      {/* Mission banner */}
      {activeMission && (
        <div className="pointer-events-auto absolute left-1/2 top-4 w-[92%] max-w-md -translate-x-1/2 sm:top-6">
          <div className="flex items-center gap-3 rounded-2xl border border-amber-400/50 bg-amber-50/95 px-4 py-3 shadow-[var(--shadow-lift)] backdrop-blur">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/20 text-amber-600">
              <Navigation size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-extrabold text-amber-800">{activeMission.title}</p>
              <p className="truncate text-[11.5px] text-amber-700/80">{missionTargetHint}</p>
            </div>
            <button
              onClick={cancelMission}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-amber-600 hover:bg-amber-400/15"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Terrain info panel */}
      {terrainInfo && !selectedPoi && (
        <div
          className={clsx(
            "pointer-events-auto absolute left-1/2 w-[92%] max-w-sm -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0",
            ultra ? "bottom-[124px] sm:bottom-40" : "bottom-6 sm:bottom-24"
          )}
        >
          <div
            className={clsx(
              "rounded-2xl border p-4 shadow-[var(--shadow-lift)] backdrop-blur",
              ultra ? "border-forest-400/15 bg-forest-950/90 text-cream-50" : "border-stone-200 bg-white/95"
            )}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className={clsx("text-xs font-extrabold uppercase tracking-wide", ultra ? "text-forest-300/70" : "text-stone-500")}>
                Terrain information
              </p>
              <button
                onClick={() => setTerrainInfo(null)}
                className={ultra ? "text-stone-500 hover:text-cream-100" : "text-stone-300 hover:text-stone-500"}
              >
                <X size={15} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <InfoRow ultra={ultra} label="Elevation" value={`${Math.round(terrainInfo.elevationM).toLocaleString()} m`} />
              <InfoRow ultra={ultra} label="Slope" value={`${terrainInfo.slopeDeg.toFixed(0)}°`} />
              <InfoRow ultra={ultra} label="Aspect" value={terrainInfo.aspect} />
              <InfoRow ultra={ultra} label="Terrain" value={terrainInfo.terrainClass} />
            </div>
            <div
              className={clsx(
                "mt-3 flex items-center gap-1.5 border-t pt-3 text-xs font-bold",
                ultra ? "border-forest-400/10 text-forest-300" : "border-stone-100 text-forest-600"
              )}
            >
              <Wifi size={12} /> Offline: Available
            </div>
          </div>
        </div>
      )}

      {/* POI info card */}
      {selectedPoi && (
        <div
          className={clsx(
            "pointer-events-auto absolute left-1/2 w-[92%] max-w-sm -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0",
            ultra ? "bottom-[124px] sm:bottom-40" : "bottom-6 sm:bottom-24"
          )}
        >
          <div
            className={clsx(
              "rounded-2xl border p-4 shadow-[var(--shadow-lift)] backdrop-blur",
              ultra ? "border-forest-400/15 bg-forest-950/90 text-cream-50" : "border-stone-200 bg-white/95"
            )}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={clsx(
                    "flex h-10 w-10 items-center justify-center rounded-xl",
                    ultra ? "bg-forest-400/15 text-forest-300" : "bg-forest-100 text-forest-600"
                  )}
                >
                  {selectedPoi.type === "hospital" ? <Stethoscope size={18} /> : <Tent size={18} />}
                </div>
                <div>
                  <p className="font-display text-sm font-extrabold">{selectedPoi.name}</p>
                  <p className={clsx("text-xs", ultra ? "text-stone-400" : "text-stone-400")}>{selectedPoi.subtitle}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPoi(null)}
                className={ultra ? "text-stone-500 hover:text-cream-100" : "text-stone-300 hover:text-stone-500"}
              >
                <X size={15} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <InfoRow ultra={ultra} label="Distance" value={`${selectedPoi.distanceM} m`} />
              {selectedPoi.capacity && <InfoRow ultra={ultra} label="Capacity" value={`${selectedPoi.capacity} people`} />}
            </div>
            <div
              className={clsx(
                "mt-3 flex items-center justify-between border-t pt-3",
                ultra ? "border-forest-400/10" : "border-stone-100"
              )}
            >
              <div className={clsx("flex items-center gap-1.5 text-xs font-bold", ultra ? "text-forest-300" : "text-forest-600")}>
                <Wifi size={12} /> Offline info available
              </div>
              <Badge tone="stone">Demo data</Badge>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SteepnessLegend({ ultra }: { ultra?: boolean }) {
  return (
    <div
      className={clsx(
        "w-56 rounded-xl border p-3 backdrop-blur",
        ultra ? "border-forest-400/15 bg-forest-950/90" : "border-stone-200/60 bg-stone-900/85"
      )}
    >
      <p className={clsx("mb-2 text-[9.5px] font-bold uppercase tracking-wide", ultra ? "text-forest-400/60" : "text-stone-400")}>
        Steepness indicator · demo heuristic
      </p>
      <div className="flex flex-col gap-1.5">
        {STEEPNESS_LEGEND.map((row) => (
          <div key={row.label} className="flex items-center gap-2 text-[11px] font-semibold text-stone-200">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
            {row.label}
          </div>
        ))}
      </div>
      <p className={clsx("mt-2 text-[10px] leading-snug", ultra ? "text-forest-400/50" : "text-stone-400")}>
        Illustrative terrain-risk indicator, not an authoritative safety map.
      </p>
    </div>
  );
}

function HudStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl bg-stone-900/80 px-2.5 py-1.5 text-cream-50 backdrop-blur">
      <span className="flex items-center gap-1 text-[8.5px] font-bold uppercase tracking-wide text-stone-400">
        {icon}
        {label}
      </span>
      <span className="text-[12.5px] font-extrabold tabular">{value}</span>
    </div>
  );
}

// Ultra's version of HudStat, laid out inside the floating context card
// instead of as freestanding pills. Same values, denser presentation.
function UltraStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center rounded-lg bg-forest-900/60 px-2 py-1.5">
      <span className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-wide text-forest-400/70">
        {icon}
        {label}
      </span>
      <span className="text-[12px] font-extrabold tabular text-cream-50">{value}</span>
    </div>
  );
}

function InfoRow({ label, value, ultra }: { label: string; value: string; ultra?: boolean }) {
  return (
    <div>
      <p className={clsx("text-[10px] font-bold uppercase tracking-wide", ultra ? "text-forest-400/60" : "text-stone-400")}>{label}</p>
      <p className={clsx("font-display font-bold", ultra ? "text-cream-50" : "text-stone-800")}>{value}</p>
    </div>
  );
}
