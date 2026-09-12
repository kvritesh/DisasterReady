import { useState } from "react";
import {
  Activity,
  Bell,
  Bug,
  Gauge,
  Info,
  MapPin,
  Package,
  RefreshCcw,
  Sparkles,
  Trash2,
  WifiOff,
} from "lucide-react";
import clsx from "clsx";
import { Badge, Button, Card, ScreenHeader } from "../components/ui/primitives";
import { useApp } from "../state/AppContext";
import type { GraphicsQuality, UiMode } from "../types";
import type { ScreenId } from "../App";

function SettingsRow({
  icon,
  title,
  desc,
  control,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-stone-100 py-4 last:border-0">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-500">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-stone-800">{title}</p>
          <p className="max-w-sm text-xs text-stone-400">{desc}</p>
        </div>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

function Switch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={clsx(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors",
        on ? "bg-forest-500" : "bg-stone-300"
      )}
    >
      <span
        className={clsx(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
          on ? "translate-x-5" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

const QUALITY_OPTIONS: { id: GraphicsQuality; label: string }[] = [
  { id: "performance", label: "Performance" },
  { id: "balanced", label: "Balanced" },
  { id: "high", label: "High" },
];

const UI_MODE_OPTIONS: { id: UiMode; label: string }[] = [
  { id: "simple", label: "Simple" },
  { id: "ultra", label: "Ultra" },
];

const UI_MODE_DESCRIPTIONS: Record<UiMode, string> = {
  simple: "Lightweight interface optimized for clarity and performance.",
  ultra: "Enhanced visual interface with immersive terrain presentation and richer interface effects.",
};

export function Settings({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  const {
    region,
    connectivity,
    toggleConnectivity,
    graphicsQuality,
    setGraphicsQuality,
    notificationsEnabled,
    toggleNotifications,
    debugTerrain,
    toggleDebugTerrain,
    showPerformance,
    togglePerformance,
    deleteOfflinePackage,
    offlinePackage,
    pushToast,
    resetDemo,
    uiMode,
    setUiMode,
  } = useApp();
  const [resetConfirm, setResetConfirm] = useState(false);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 md:px-10 md:py-10">
      <ScreenHeader eyebrow="Configuration" title="Settings" subtitle="Tune the prototype and inspect its data status." />

      <Card className="mt-6 p-6">
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-stone-400">General</p>
        <SettingsRow
          icon={<MapPin size={16} />}
          title="Region"
          desc={`${region.name} — ${region.areaKm2} km² prepared`}
          control={
            <Button size="sm" variant="secondary" onClick={() => onNavigate("prepare")}>
              Change
            </Button>
          }
        />
        <SettingsRow
          icon={<Package size={16} />}
          title="Offline data"
          desc={offlinePackage.isReady ? `${offlinePackage.totalMb.toFixed(1)} MB cached` : "No package cached"}
          control={
            <Button size="sm" variant="secondary" onClick={() => onNavigate("offline")}>
              Manage
            </Button>
          }
        />
        <SettingsRow
          icon={<Bell size={16} />}
          title="Notifications"
          desc="Mission and preparedness reminders"
          control={<Switch on={notificationsEnabled} onToggle={toggleNotifications} />}
        />
        <SettingsRow
          icon={<Gauge size={16} />}
          title="Graphics quality"
          desc="Affects terrain detail in the Explorer"
          control={
            <div className="flex overflow-hidden rounded-lg border border-stone-200">
              {QUALITY_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setGraphicsQuality(opt.id)}
                  className={clsx(
                    "px-3 py-1.5 text-xs font-bold transition-colors",
                    graphicsQuality === opt.id ? "bg-forest-600 text-cream-50" : "bg-white text-stone-500 hover:bg-stone-50"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          }
        />
        <SettingsRow
          icon={<Sparkles size={16} />}
          title="Interface experience"
          desc={UI_MODE_DESCRIPTIONS[uiMode]}
          control={
            <div className="flex overflow-hidden rounded-lg border border-stone-200">
              {UI_MODE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setUiMode(opt.id)}
                  className={clsx(
                    "px-3 py-1.5 text-xs font-bold transition-colors",
                    uiMode === opt.id ? "bg-forest-600 text-cream-50" : "bg-white text-stone-500 hover:bg-stone-50"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          }
        />
      </Card>

      <Card className="mt-6 p-6">
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-stone-400">Simulation tools</p>
        <SettingsRow
          icon={<WifiOff size={16} />}
          title="Connectivity"
          desc={connectivity === "connected" ? "Simulate loss of network" : "Currently simulating offline"}
          control={
            <Button size="sm" variant={connectivity === "offline" ? "danger" : "secondary"} onClick={toggleConnectivity}>
              {connectivity === "connected" ? "Go offline" : "Reconnect"}
            </Button>
          }
        />
      </Card>

      <Card className="mt-6 p-6">
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-stone-400">Developer tools</p>
        <SettingsRow
          icon={<Bug size={16} />}
          title="Show terrain debug"
          desc="Overlay wireframe + sample point coordinates in Explorer"
          control={<Switch on={debugTerrain} onToggle={toggleDebugTerrain} />}
        />
        <SettingsRow
          icon={<Activity size={16} />}
          title="Show performance"
          desc="Overlay FPS meter in Explorer"
          control={<Switch on={showPerformance} onToggle={togglePerformance} />}
        />
        <SettingsRow
          icon={<Trash2 size={16} />}
          title="Clear cached data"
          desc="Removes the offline package from this device"
          control={
            <Button
              size="sm"
              variant="danger"
              disabled={!offlinePackage.isReady}
              onClick={() => {
                deleteOfflinePackage();
                pushToast({ tone: "danger", title: "Cache cleared", body: "Offline package removed." });
              }}
            >
              Clear
            </Button>
          }
        />
        <SettingsRow
          icon={<RefreshCcw size={16} />}
          title="Reset demo state"
          desc="Restore missions, XP, and offline package to their starting demo values"
          control={
            !resetConfirm ? (
              <Button size="sm" variant="outline" onClick={() => setResetConfirm(true)}>
                Reset
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    resetDemo();
                    setResetConfirm(false);
                    onNavigate("overview");
                  }}
                >
                  Confirm
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setResetConfirm(false)}>
                  Cancel
                </Button>
              </div>
            )
          }
        />
      </Card>

      <Card className="mt-6 flex items-start gap-3 p-6">
        <Info size={18} className="mt-0.5 shrink-0 text-sky-500" />
        <div>
          <p className="text-sm font-bold text-stone-800">About DisasterReady</p>
          <p className="mt-1 text-[13px] leading-relaxed text-stone-500">
            This is a frontend web prototype built for Smart India Hackathon demonstration purposes. All
            terrain, POI, and mission data is local mock data — no backend, GIS pipeline, or live emergency
            services are connected. The production system will be built in Unity as a stylized 3D
            preparedness game sharing this same terrain-intelligence concept.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge tone="stone">v0.1.0 — Prototype</Badge>
            <Badge tone="stone">No backend</Badge>
            <Badge tone="stone">Local mock data</Badge>
          </div>
        </div>
      </Card>
    </div>
  );
}
