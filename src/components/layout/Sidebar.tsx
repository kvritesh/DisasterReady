import clsx from "clsx";
import { Download, Home, Map, MountainSnow, Package, Radar, Settings, ShieldAlert, Target, Waves, Wifi, WifiOff } from "lucide-react";
import { Badge } from "../ui/primitives";
import { TopographicPattern } from "../ui/TopographicPattern";
import { useApp } from "../../state/AppContext";
import type { ScreenId } from "../../App";

// Ordered to mirror the intended demo narrative: prepare a region, cache it
// offline, explore the terrain, complete missions inside it, then move to
// the monitoring board and the single-site early-warning assessment before
// settings/dev tools. Purely a navigation ordering change — no new screens,
// no removed screens.
//
// Exported flat so other Ultra chrome (the TopBar's screen search) can reuse
// the exact same real navigation targets instead of inventing its own list.
export const NAV_ITEMS: { id: ScreenId; label: string; icon: typeof Home }[] = [
  { id: "overview", label: "Overview", icon: Home },
  { id: "prepare", label: "Prepare Region", icon: Download },
  { id: "offline", label: "Offline Data", icon: Package },
  { id: "explore", label: "Explore", icon: Map },
  { id: "missions", label: "Missions", icon: Target },
  { id: "flood-evacuation", label: "Flood Evacuation", icon: Waves },
  { id: "monitoring", label: "Monitoring", icon: Radar },
  { id: "safety", label: "Early Warning", icon: ShieldAlert },
  { id: "settings", label: "Settings", icon: Settings },
];

// Same screens as NAV_ITEMS, just grouped for the Ultra sidebar's clearer
// information hierarchy — PREPARE / ASSESS / RESPOND / PRACTICE, with
// Overview kept as a standalone top-level item and Settings its own group.
// No routes added or removed; this is purely a presentational regrouping.
const NAV_GROUPS: { label: string; items: typeof NAV_ITEMS }[] = [
  {
    label: "Prepare",
    items: [
      { id: "prepare", label: "Prepare Region", icon: Download },
      { id: "offline", label: "Offline Data", icon: Package },
    ],
  },
  {
    label: "Assess",
    items: [
      { id: "explore", label: "Explore Terrain", icon: Map },
      { id: "monitoring", label: "Monitoring", icon: Radar },
      { id: "safety", label: "Early Warning", icon: ShieldAlert },
    ],
  },
  {
    label: "Respond",
    items: [{ id: "flood-evacuation", label: "Flood Evacuation", icon: Waves }],
  },
  {
    label: "Practice",
    items: [{ id: "missions", label: "Missions", icon: Target }],
  },
  {
    label: "Settings",
    items: [{ id: "settings", label: "Settings", icon: Settings }],
  },
];

export function Sidebar({
  screen,
  onNavigate,
}: {
  screen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
}) {
  const { region, progress, connectivity, toggleConnectivity, uiMode } = useApp();

  if (uiMode === "ultra") {
    return (
      <aside className="relative flex h-full w-[248px] shrink-0 flex-col overflow-hidden border-r border-forest-950/40 bg-forest-950 px-4 py-5 text-cream-50">
        <TopographicPattern className="text-forest-100 opacity-[0.05]" />

        <div className="relative mb-6 flex items-center gap-2.5 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest-500 text-cream-50 shadow-[0_4px_14px_-2px_rgba(59,107,71,0.65)]">
            <MountainSnow size={20} strokeWidth={2.4} />
          </div>
          <div>
            <p className="font-display text-[15px] font-extrabold leading-none text-cream-50">DisasterReady</p>
            <p className="mt-1 text-[10.5px] font-medium leading-none text-forest-300/70">Ultra experience</p>
          </div>
        </div>

        <button
          onClick={() => onNavigate("overview")}
          className={clsx(
            "relative mb-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all",
            screen === "overview"
              ? "bg-forest-600/90 text-cream-50 shadow-[0_0_0_1px_rgba(116,168,125,0.35),0_4px_16px_-4px_rgba(59,107,71,0.7)]"
              : "text-stone-300/80 hover:bg-forest-900/60 hover:text-cream-100"
          )}
        >
          <Home size={17} strokeWidth={2.3} className={screen === "overview" ? "text-cream-50" : "text-forest-400"} />
          Overview
        </button>

        <nav className="relative flex flex-1 flex-col gap-4 overflow-y-auto pr-0.5">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-forest-400/60">
                {group.label}
              </p>
              <div className="flex flex-col gap-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = screen === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onNavigate(item.id)}
                      className={clsx(
                        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all",
                        active
                          ? "bg-forest-600/90 text-cream-50 shadow-[0_0_0_1px_rgba(116,168,125,0.35),0_4px_16px_-4px_rgba(59,107,71,0.7)]"
                          : "text-stone-300/70 hover:bg-forest-900/60 hover:text-cream-100"
                      )}
                    >
                      <Icon
                        size={17}
                        strokeWidth={2.3}
                        className={active ? "text-cream-50" : "text-forest-400/80 group-hover:text-forest-300"}
                      />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="relative mt-3 flex flex-col gap-3 pt-4">
          <div className="rounded-2xl border border-forest-400/15 bg-forest-900/60 p-3.5 backdrop-blur">
            <p className="text-[10.5px] font-bold uppercase tracking-wide text-forest-300/60">Preparedness score</p>
            <div className="mt-1.5 flex items-end justify-between">
              <span className="font-display text-2xl font-extrabold text-forest-200 tabular">
                {progress.preparednessScore}
                <span className="text-sm text-forest-400/60">%</span>
              </span>
              <span className="mb-0.5 text-[11px] font-semibold text-forest-400/60">Lv {progress.level}</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-forest-950/70">
              <div
                className="h-full rounded-full bg-forest-400 shadow-[0_0_8px_rgba(116,168,125,0.6)] transition-all duration-700"
                style={{ width: `${progress.preparednessScore}%` }}
              />
            </div>
          </div>

          <button
            onClick={toggleConnectivity}
            className={clsx(
              "flex items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-left transition-colors",
              connectivity === "connected"
                ? "border-forest-400/20 bg-forest-900/50 hover:bg-forest-900/80"
                : "border-danger-500/30 bg-danger-500/10 hover:bg-danger-500/15"
            )}
            title="Toggle offline simulation"
          >
            {connectivity === "connected" ? (
              <Wifi size={15} className="text-forest-300" />
            ) : (
              <WifiOff size={15} className="text-danger-400" />
            )}
            <div>
              <p className={clsx("text-[11.5px] font-bold leading-none", connectivity === "connected" ? "text-forest-200" : "text-danger-400")}>
                {connectivity === "connected" ? "Connected" : "Offline mode"}
              </p>
              <p className="mt-1 text-[10px] leading-none text-forest-400/50">
                {connectivity === "connected" ? "Tap to simulate offline" : "Using cached data"}
              </p>
            </div>
          </button>

          <div className="rounded-2xl bg-forest-900/70 px-3.5 py-3 text-cream-50 backdrop-blur">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-forest-400/60">Selected region</p>
              <Badge tone={region.status === "full" ? "forest" : "amber"} className="!px-1.5 !py-0.5 !text-[8.5px]">
                {region.status === "full" ? "Full" : "Pilot"}
              </Badge>
            </div>
            <p className="font-display text-sm font-bold leading-tight">{region.name}</p>
            <p className="text-[11px] text-forest-400/60">{region.areaKm2} km² prepared</p>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex h-full w-[248px] shrink-0 flex-col border-r border-stone-200/70 bg-cream-50/70 px-4 py-5">
      <div className="mb-6 flex items-center gap-2.5 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest-600 text-cream-50 shadow-[0_4px_10px_-2px_rgba(46,83,57,0.5)]">
          <MountainSnow size={20} strokeWidth={2.4} />
        </div>
        <div>
          <p className="font-display text-[15px] font-extrabold leading-none text-stone-900">DisasterReady</p>
          <p className="mt-1 text-[10.5px] font-medium leading-none text-stone-400">
            Preparedness starts before the disaster.
          </p>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = screen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={clsx(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all",
                active
                  ? "bg-forest-600 text-cream-50 shadow-[0_4px_12px_-4px_rgba(46,83,57,0.5)]"
                  : "text-stone-600 hover:bg-stone-100"
              )}
            >
              <Icon size={17} strokeWidth={2.3} className={active ? "text-cream-50" : "text-stone-400 group-hover:text-forest-600"} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3 pt-4">
        <div className="rounded-2xl border border-stone-200 bg-white/70 p-3.5">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-stone-400">Preparedness score</p>
          <div className="mt-1.5 flex items-end justify-between">
            <span className="font-display text-2xl font-extrabold text-forest-700 tabular">
              {progress.preparednessScore}
              <span className="text-sm text-stone-400">%</span>
            </span>
            <span className="mb-0.5 text-[11px] font-semibold text-stone-400">Lv {progress.level}</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-stone-200">
            <div
              className="h-full rounded-full bg-forest-500 transition-all duration-700"
              style={{ width: `${progress.preparednessScore}%` }}
            />
          </div>
        </div>

        <button
          onClick={toggleConnectivity}
          className={clsx(
            "flex items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-left transition-colors",
            connectivity === "connected"
              ? "border-forest-200 bg-forest-50 hover:bg-forest-100"
              : "border-danger-500/30 bg-danger-500/10 hover:bg-danger-500/15"
          )}
          title="Toggle offline simulation"
        >
          {connectivity === "connected" ? (
            <Wifi size={15} className="text-forest-600" />
          ) : (
            <WifiOff size={15} className="text-danger-600" />
          )}
          <div>
            <p className={clsx("text-[11.5px] font-bold leading-none", connectivity === "connected" ? "text-forest-700" : "text-danger-600")}>
              {connectivity === "connected" ? "Connected" : "Offline mode"}
            </p>
            <p className="mt-1 text-[10px] leading-none text-stone-400">
              {connectivity === "connected" ? "Tap to simulate offline" : "Using cached data"}
            </p>
          </div>
        </button>

        <div className="rounded-2xl bg-stone-900 px-3.5 py-3 text-cream-50">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">Selected region</p>
            <Badge tone={region.status === "full" ? "forest" : "amber"} className="!px-1.5 !py-0.5 !text-[8.5px]">
              {region.status === "full" ? "Full" : "Pilot"}
            </Badge>
          </div>
          <p className="font-display text-sm font-bold leading-tight">{region.name}</p>
          <p className="text-[11px] text-stone-400">{region.areaKm2} km² prepared</p>
        </div>
      </div>
    </aside>
  );
}
