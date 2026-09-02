import { useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import {
  Compass as CompassIcon,
  Gauge,
  Layers,
  MapPin,
  Mountain,
  Navigation,
  Stethoscope,
  Tent,
  Wifi,
  X,
} from "lucide-react";
import clsx from "clsx";
import { Badge } from "../components/ui/primitives";
import { useApp } from "../state/AppContext";
import { poisForRegion } from "../data/pois";
import { TerrainScene } from "../three/TerrainScene";
import { findHighestPoint, findSteepestPoint, heightFieldParams } from "../three/terrainGeometry";
import { sampleTerrain } from "../three/terrainMath";
import type { POI, TerrainPoint, VisualizationMode } from "../types";
import type { ScreenId } from "../App";

const MODES: { id: VisualizationMode; label: string }[] = [
  { id: "normal", label: "Normal" },
  { id: "elevation", label: "Elevation" },
  { id: "slope", label: "Steepness" },
  { id: "aspect", label: "Aspect" },
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
  } = useApp();

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

  return (
    <div className="relative h-full w-full overflow-hidden bg-cream-100">
      <Canvas shadows camera={{ position: [12.5, 9.5, 14], fov: 42 }} className="!absolute !inset-0">
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
        />
      </Canvas>

      {/* Top-left region + live stats HUD */}
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
          <HudStat icon={<Mountain size={12} />} label="Elevation" value={`${Math.round((terrainInfo ?? defaultStat).elevationM).toLocaleString()} m`} />
          <HudStat icon={<Gauge size={12} />} label="Slope" value={`${(terrainInfo ?? defaultStat).slopeDeg.toFixed(0)}°`} />
          <HudStat icon={<Navigation size={12} />} label="Aspect" value={(terrainInfo ?? defaultStat).aspect} />
        </div>
      </div>

      {/* Visualization mode toggle */}
      <div className="pointer-events-auto absolute right-4 top-4 flex flex-col items-end gap-1.5 sm:right-6 sm:top-6">
        <div className="flex overflow-hidden rounded-xl border border-stone-200/60 bg-stone-900/85 p-1 backdrop-blur">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={clsx(
                "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-colors",
                mode === m.id ? "bg-forest-500 text-cream-50" : "text-stone-300 hover:text-cream-50"
              )}
            >
              <Layers size={11} />
              {m.label}
            </button>
          ))}
        </div>
        {mode === "slope" ? (
          <SteepnessLegend />
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

      {/* Controls hint + Explore → Preparedness connection */}
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
        <div className="pointer-events-auto absolute bottom-6 left-1/2 w-[92%] max-w-sm -translate-x-1/2 sm:bottom-24 sm:left-auto sm:right-6 sm:translate-x-0">
          <div className="rounded-2xl border border-stone-200 bg-white/95 p-4 shadow-[var(--shadow-lift)] backdrop-blur">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-extrabold uppercase tracking-wide text-stone-500">Terrain information</p>
              <button onClick={() => setTerrainInfo(null)} className="text-stone-300 hover:text-stone-500">
                <X size={15} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <InfoRow label="Elevation" value={`${Math.round(terrainInfo.elevationM).toLocaleString()} m`} />
              <InfoRow label="Slope" value={`${terrainInfo.slopeDeg.toFixed(0)}°`} />
              <InfoRow label="Aspect" value={terrainInfo.aspect} />
              <InfoRow label="Terrain" value={terrainInfo.terrainClass} />
            </div>
            <div className="mt-3 flex items-center gap-1.5 border-t border-stone-100 pt-3 text-xs font-bold text-forest-600">
              <Wifi size={12} /> Offline: Available
            </div>
          </div>
        </div>
      )}

      {/* POI info card */}
      {selectedPoi && (
        <div className="pointer-events-auto absolute bottom-6 left-1/2 w-[92%] max-w-sm -translate-x-1/2 sm:bottom-24 sm:left-auto sm:right-6 sm:translate-x-0">
          <div className="rounded-2xl border border-stone-200 bg-white/95 p-4 shadow-[var(--shadow-lift)] backdrop-blur">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-100 text-forest-600">
                  {selectedPoi.type === "hospital" ? <Stethoscope size={18} /> : <Tent size={18} />}
                </div>
                <div>
                  <p className="font-display text-sm font-extrabold text-stone-900">{selectedPoi.name}</p>
                  <p className="text-xs text-stone-400">{selectedPoi.subtitle}</p>
                </div>
              </div>
              <button onClick={() => setSelectedPoi(null)} className="text-stone-300 hover:text-stone-500">
                <X size={15} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <InfoRow label="Distance" value={`${selectedPoi.distanceM} m`} />
              {selectedPoi.capacity && <InfoRow label="Capacity" value={`${selectedPoi.capacity} people`} />}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-forest-600">
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

function SteepnessLegend() {
  return (
    <div className="w-56 rounded-xl border border-stone-200/60 bg-stone-900/85 p-3 backdrop-blur">
      <p className="mb-2 text-[9.5px] font-bold uppercase tracking-wide text-stone-400">
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
      <p className="mt-2 text-[10px] leading-snug text-stone-400">
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">{label}</p>
      <p className="font-display font-bold text-stone-800">{value}</p>
    </div>
  );
}
