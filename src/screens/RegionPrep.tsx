import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ChevronRight, Download, Loader2, MapPin } from "lucide-react";
import clsx from "clsx";
import { Badge, Button, Card, ProgressBar, ScreenHeader } from "../components/ui/primitives";
import { MiniTerrainPreview } from "../components/ui/MiniTerrainPreview";
import { REGIONS, LAYER_DEFINITIONS } from "../data/regions";
import { useApp } from "../state/AppContext";
import type { RegionId } from "../types";
import type { ScreenId } from "../App";

const STAGES = [
  "Preparing terrain...",
  "Downloading elevation...",
  "Processing terrain...",
  "Caching emergency POIs...",
  "Verifying package...",
];

export function RegionPrep({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  const { selectedRegionId, setRegion, region, offlinePackage, prepareOfflinePackage, pushToast } = useApp();
  const [preparing, setPreparing] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [percent, setPercent] = useState(0);
  const [done, setDone] = useState(offlinePackage.isReady);
  const timeouts = useRef<number[]>([]);

  useEffect(() => {
    const pending = timeouts.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  const handlePrepare = () => {
    setPreparing(true);
    setDone(false);
    setStageIndex(0);
    setPercent(0);

    const stageDurationMs = 820;
    STAGES.forEach((_, i) => {
      const t = window.setTimeout(() => setStageIndex(i), i * stageDurationMs);
      timeouts.current.push(t);
    });

    // smooth percent tick
    const totalMs = STAGES.length * stageDurationMs + 400;
    const tickMs = 60;
    let elapsed = 0;
    const interval = window.setInterval(() => {
      elapsed += tickMs;
      setPercent(Math.min(100, Math.round((elapsed / totalMs) * 100)));
      if (elapsed >= totalMs) {
        window.clearInterval(interval);
      }
    }, tickMs);

    const finalTimeout = window.setTimeout(() => {
      setPercent(100);
      setPreparing(false);
      setDone(true);
      prepareOfflinePackage();
      pushToast({ tone: "success", title: "Area ready for offline use", body: `${region.name} is cached on this device.` });
    }, totalMs);
    timeouts.current.push(finalTimeout);
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10 md:py-10">
      <ScreenHeader
        eyebrow="Region preparation"
        title="Prepare your area"
        subtitle="Download what you'll need when the network isn't there."
      />

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        {/* Region selector */}
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-stone-400">Choose a prepared region</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {REGIONS.map((r) => {
              const active = r.id === selectedRegionId;
              return (
                <button
                  key={r.id}
                  onClick={() => {
                    setRegion(r.id as RegionId);
                    setDone(r.id === offlinePackage.regionId && offlinePackage.isReady);
                  }}
                  className={clsx(
                    "group relative overflow-hidden rounded-2xl border text-left transition-all",
                    active
                      ? "border-forest-500 ring-2 ring-forest-400/40"
                      : "border-stone-200 hover:border-forest-300"
                  )}
                >
                  <div className="relative">
                    <MiniTerrainPreview seed={r.terrainSeed} gradient={r.thumbnailGradient} className="h-24 w-full" />
                    <div className="absolute left-2 top-2">
                      <Badge tone={r.status === "full" ? "forest" : "amber"}>
                        {r.status === "full" ? "Full site" : "Pilot"}
                      </Badge>
                    </div>
                  </div>
                  <div className="bg-white p-3.5">
                    <div className="flex items-center justify-between">
                      <p className="font-display text-sm font-bold text-stone-900">{r.name}</p>
                      {active && <CheckCircle2 size={16} className="text-forest-500" />}
                    </div>
                    <p className="text-xs text-stone-400">{r.state}</p>
                    {r.status === "pilot" && (
                      <p className="mt-1 text-[10.5px] leading-snug text-stone-400">
                        Terrain intelligence only — no emergency POIs or early warning yet
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected region detail */}
          <Card className="mt-6 p-6">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-forest-500" />
                <p className="font-display text-lg font-extrabold text-stone-900">{region.name.toUpperCase()}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge tone="stone">Demo region</Badge>
                <Badge tone={region.status === "full" ? "forest" : "amber"}>
                  {region.status === "full" ? "Full site" : "Pilot site"}
                </Badge>
              </div>
            </div>

            {region.status === "pilot" && (
              <div className="mb-5 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-[12.5px] leading-relaxed text-amber-800/90">
                {region.name} is a pilot site: terrain, elevation, and slope layers below are procedural demo
                data generated for this region (not real GIS/DEM data), but emergency POIs (hospitals/shelters)
                and the Early Warning fused assessment are not yet configured here — only Aizawl has those today.
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Detail label="Area" value={`${region.areaKm2} km²`} />
              <Detail label="Elevation" value={`${region.elevationMinM.toLocaleString()}–${region.elevationMaxM.toLocaleString()} m`} />
              <Detail label="Terrain resolution" value={`${region.terrainResolutionM} m`} />
              <Detail label="Offline package" value={`${region.estimatedPackageMb} MB`} />
            </div>

            <div className="mt-6">
              <p className="mb-2.5 text-xs font-bold uppercase tracking-wide text-stone-400">Layers included</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {LAYER_DEFINITIONS.map((l) => {
                  const unavailableForPilot =
                    region.status === "pilot" && (l.id === "shelters" || l.id === "hospitals" || l.id === "earlyWarning");
                  return (
                    <div
                      key={l.id}
                      className={clsx(
                        "flex items-center gap-1.5 text-[13px]",
                        unavailableForPilot ? "text-stone-300" : "text-stone-600"
                      )}
                    >
                      {unavailableForPilot ? (
                        <span className="h-[14px] w-[14px] shrink-0 rounded-full border border-stone-300" />
                      ) : (
                        <CheckCircle2 size={14} className="shrink-0 text-forest-500" />
                      )}
                      {l.label}
                      {unavailableForPilot && <span className="text-[10px] text-stone-300">(pilot)</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>

        {/* Prepare panel */}
        <Card className="flex h-fit flex-col gap-5 p-6">
          <p className="font-display text-base font-extrabold text-stone-900">Offline package</p>

          {!preparing && !done && (
            <>
              <p className="text-sm text-stone-500">
                Cache terrain, elevation, slope, POIs, roads, and missions for {region.name} so the app keeps
                working with no signal.
              </p>
              <Button size="lg" onClick={handlePrepare} icon={<Download size={18} />}>
                Prepare Offline
              </Button>
              <p className="text-center text-[11px] text-stone-400">Simulated download · {region.estimatedPackageMb} MB</p>
            </>
          )}

          {preparing && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2.5">
                <Loader2 size={18} className="animate-spin text-forest-500" />
                <p className="text-sm font-semibold text-stone-700">{STAGES[stageIndex]}</p>
              </div>
              <ProgressBar value={percent} />
              <p className="text-right text-xs font-bold tabular text-stone-400">{percent}%</p>
              <div className="flex flex-col gap-1.5">
                {STAGES.map((s, i) => (
                  <div key={s} className="flex items-center gap-2 text-xs">
                    {i < stageIndex ? (
                      <CheckCircle2 size={13} className="text-forest-500" />
                    ) : i === stageIndex ? (
                      <Loader2 size={13} className="animate-spin text-forest-400" />
                    ) : (
                      <span className="h-[13px] w-[13px] rounded-full border border-stone-300" />
                    )}
                    <span className={i <= stageIndex ? "text-stone-600" : "text-stone-300"}>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {done && !preparing && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-100 text-forest-600">
                <CheckCircle2 size={28} />
              </div>
              <div>
                <p className="font-display text-base font-extrabold text-forest-700">Area ready for offline use</p>
                <p className="mt-1 text-xs text-stone-400">
                  {region.estimatedPackageMb} MB cached · Last synced just now
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => onNavigate("explore")} icon={<ChevronRight size={14} />}>
                Explore terrain
              </Button>
              <button onClick={handlePrepare} className="text-[11px] font-semibold text-stone-400 hover:text-stone-600">
                Re-run preparation
              </button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10.5px] font-bold uppercase tracking-wide text-stone-400">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-stone-800">{value}</p>
    </div>
  );
}
