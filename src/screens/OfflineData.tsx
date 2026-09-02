import { useState } from "react";
import { CheckCircle2, CloudOff, Database, HardDrive, Trash2 } from "lucide-react";
import { Badge, Button, Card, ProgressBar, ScreenHeader } from "../components/ui/primitives";
import { useApp } from "../state/AppContext";
import type { ScreenId } from "../App";

const LAYER_COLORS: Record<string, string> = {
  elevation: "sky",
  slope: "amber",
  shelters: "forest",
  hospitals: "danger",
  roads: "stone",
  missions: "forest",
  earlyWarning: "amber",
};

const OFFLINE_CAPABILITIES = [
  "3D terrain & elevation",
  "Hospitals & shelters (POIs)",
  "Preparedness missions",
  "Early warning heuristic",
];

const PILOT_UNAVAILABLE_LAYER_IDS = new Set(["shelters", "hospitals", "earlyWarning"]);

export function OfflineData({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  const { region, offlinePackage, deleteOfflinePackage, pushToast } = useApp();
  const [confirming, setConfirming] = useState(false);
  const isFull = region.status === "full";

  const cachedMb = offlinePackage.layers
    .filter((l) => l.cached && !(!isFull && PILOT_UNAVAILABLE_LAYER_IDS.has(l.id)))
    .reduce((s, l) => s + l.sizeMb, 0);
  const maxLayerMb = Math.max(...offlinePackage.layers.map((l) => l.sizeMb));

  const handleDelete = () => {
    deleteOfflinePackage();
    pushToast({ tone: "danger", title: "Offline package deleted", body: `${region.name} data removed from this device.` });
    setConfirming(false);
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 md:px-10 md:py-10">
      <ScreenHeader
        eyebrow="Device storage"
        title="Offline Storage"
        subtitle="Everything below stays on this device — no connection required."
      />

      <Card className="mt-6 flex flex-col gap-2.5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-stone-400">Fully available with zero connectivity</p>
          <Badge tone={isFull ? "forest" : "amber"}>{isFull ? "Full site" : "Pilot site"}</Badge>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {OFFLINE_CAPABILITIES.map((c) => {
            const unavailable = !isFull && (c === "Hospitals & shelters (POIs)" || c === "Early warning heuristic");
            return (
              <div
                key={c}
                className={
                  "flex items-center gap-2 rounded-xl border px-3 py-2 text-[13px] font-semibold " +
                  (unavailable
                    ? "border-stone-100 bg-stone-50/40 text-stone-300"
                    : "border-stone-100 bg-stone-50/60 text-stone-700")
                }
              >
                {unavailable ? (
                  <span className="h-[15px] w-[15px] shrink-0 rounded-full border border-stone-300" />
                ) : (
                  <CheckCircle2 size={15} className="shrink-0 text-forest-500" />
                )}
                {c}
                {unavailable && <span className="text-[10px] font-normal text-stone-300">(pilot — not yet enabled)</span>}
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="mt-6 flex flex-col gap-5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-600 text-cream-50">
              <HardDrive size={20} />
            </div>
            <div>
              <p className="font-display text-base font-extrabold text-stone-900">{region.name}</p>
              <p className="text-xs text-stone-400">
                {offlinePackage.isReady ? `${offlinePackage.totalMb.toFixed(1)} MB on device` : "No package cached"}
              </p>
            </div>
          </div>
          <Badge tone={offlinePackage.isReady ? "forest" : "danger"}>
            {offlinePackage.isReady ? "100% ready" : "Not ready"}
          </Badge>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-stone-400">
            <span>Storage used</span>
            <span className="tabular">{cachedMb.toFixed(1)} MB / {region.estimatedPackageMb} MB</span>
          </div>
          <ProgressBar value={cachedMb} max={region.estimatedPackageMb} tone="forest" />
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-stone-100 pt-4 text-xs sm:grid-cols-3">
          <div>
            <p className="text-stone-400">Last synchronized</p>
            <p className="mt-0.5 font-bold text-stone-700">{offlinePackage.lastSyncedAt ?? "Never"}</p>
          </div>
          <div>
            <p className="text-stone-400">Data source</p>
            <p className="mt-0.5 font-bold text-stone-700">Local device storage</p>
          </div>
          <div>
            <p className="text-stone-400">Terrain resolution</p>
            <p className="mt-0.5 font-bold text-stone-700">{region.terrainResolutionM} m / pixel</p>
          </div>
        </div>
      </Card>

      <p className="mb-3 mt-6 text-xs font-bold uppercase tracking-wide text-stone-400">Cached layers</p>
      <div className="flex flex-col gap-2.5">
        {offlinePackage.layers.map((layer) => {
          const pilotUnavailable = !isFull && PILOT_UNAVAILABLE_LAYER_IDS.has(layer.id);
          return (
            <Card key={layer.id} className="flex items-center gap-4 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-500">
                <Database size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between text-sm">
                  <span className={pilotUnavailable ? "font-semibold text-stone-400" : "font-semibold text-stone-800"}>
                    {layer.label}
                  </span>
                  <span className="tabular text-xs font-bold text-stone-400">{layer.sizeMb} MB</span>
                </div>
                <div className="mt-1.5">
                  <ProgressBar
                    value={pilotUnavailable ? 0 : layer.cached ? layer.sizeMb : 0}
                    max={maxLayerMb}
                    tone={pilotUnavailable ? "stone" : (LAYER_COLORS[layer.id] as "forest" | "sky" | "amber" | "danger" | "stone") ?? "forest"}
                  />
                </div>
              </div>
              <Badge tone={pilotUnavailable ? "amber" : layer.cached ? "forest" : "stone"}>
                {pilotUnavailable ? "Pilot — N/A" : layer.cached ? "Cached" : "Missing"}
              </Badge>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6 flex flex-col items-start justify-between gap-3 p-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <CloudOff size={18} className="text-danger-500" />
          <div>
            <p className="text-sm font-bold text-stone-800">Delete offline package</p>
            <p className="text-xs text-stone-400">Frees {region.estimatedPackageMb} MB. You can re-prepare anytime.</p>
          </div>
        </div>
        {!confirming ? (
          <Button variant="danger" size="sm" icon={<Trash2 size={14} />} onClick={() => setConfirming(true)} disabled={!offlinePackage.isReady}>
            Delete offline package
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-stone-500">Are you sure?</span>
            <Button variant="danger" size="sm" onClick={handleDelete}>
              Confirm delete
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        )}
      </Card>

      {!offlinePackage.isReady && (
        <div className="mt-4 flex justify-center">
          <Button variant="secondary" onClick={() => onNavigate("prepare")}>
            Re-prepare this region
          </Button>
        </div>
      )}
    </div>
  );
}
