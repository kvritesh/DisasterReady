import { useMemo, useRef, useState } from "react";
import { Bell, ChevronDown, MapPin, Search, Wifi, WifiOff } from "lucide-react";
import clsx from "clsx";
import { useApp } from "../../state/AppContext";
import { NAV_ITEMS } from "./Sidebar";
import type { ScreenId } from "../../App";

/**
 * Ultra-only premium context bar. Desktop-only (App.tsx renders it only when
 * uiMode === "ultra" and hides it below md:) — the existing mobile top bar
 * already covers small widths in both modes, so this never duplicates it.
 *
 * Everything here drives real app state/navigation:
 *  - Search filters the app's actual screens (NAV_ITEMS, the same list the
 *    sidebar navigates with) — no fake search engine or invented results.
 *  - Region pill navigates to the real "prepare" (region change) screen.
 *  - Connectivity pill reads/toggles the real connectivity simulation.
 *  - Notification bell reflects real simulated High-severity alerts from
 *    AppContext (alerts) and opens the real Early Warning screen — it does
 *    not fabricate a count or a feed.
 *  - Preparedness chip shows the real score/level, same source as the
 *    sidebar card.
 */
export function TopBar({ screen, onNavigate }: { screen: ScreenId; onNavigate: (screen: ScreenId) => void }) {
  const { region, progress, connectivity, toggleConnectivity, alerts } = useApp();
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const alertCount = Object.keys(alerts).length;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return NAV_ITEMS.filter((item) => item.label.toLowerCase().includes(q) || item.id.includes(q)).slice(0, 6);
  }, [query]);

  const runSearch = (targetId?: ScreenId) => {
    const target = targetId ?? matches[0]?.id;
    if (target) {
      onNavigate(target);
      setQuery("");
      inputRef.current?.blur();
    }
  };

  return (
    <div className="relative z-10 hidden items-center gap-3 border-b border-forest-950/10 bg-cream-50/90 px-6 py-3 backdrop-blur md:flex">
      {/* Search — filters real app screens, nothing invented */}
      <div className="relative w-full max-w-xs">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => window.setTimeout(() => setSearchFocused(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "Enter") runSearch();
            if (e.key === "Escape") {
              setQuery("");
              inputRef.current?.blur();
            }
          }}
          placeholder="Jump to a screen…"
          aria-label="Search DisasterReady screens"
          className="w-full rounded-xl border border-stone-200 bg-white/80 py-2 pl-9 pr-3 text-[13px] font-medium text-stone-700 placeholder:text-stone-400 focus:border-forest-400 focus:outline-none focus:ring-2 focus:ring-forest-400/20"
        />
        {searchFocused && matches.length > 0 && (
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] overflow-hidden rounded-xl border border-stone-200 bg-white shadow-[var(--shadow-lift)]">
            {matches.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => runSearch(item.id)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] font-semibold text-stone-700 hover:bg-forest-50"
                >
                  <Icon size={14} className="text-forest-500" />
                  {item.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Region selector — real navigation to the region-change screen */}
        <button
          onClick={() => onNavigate("prepare")}
          className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white/70 px-3 py-1.5 text-[12.5px] font-bold text-stone-700 transition-colors hover:border-forest-300 hover:bg-forest-50"
        >
          <MapPin size={13} className="text-forest-500" />
          {region.name}
          <ChevronDown size={13} className="text-stone-400" />
        </button>

        {/* Connectivity — real simulated state, real toggle */}
        <button
          onClick={toggleConnectivity}
          title="Toggle offline simulation"
          className={clsx(
            "flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[12.5px] font-bold transition-colors",
            connectivity === "connected"
              ? "border-forest-200 bg-forest-50 text-forest-700 hover:bg-forest-100"
              : "border-danger-500/30 bg-danger-500/10 text-danger-600 hover:bg-danger-500/15"
          )}
        >
          {connectivity === "connected" ? <Wifi size={13} /> : <WifiOff size={13} />}
          {connectivity === "connected" ? "Live" : "Offline"}
        </button>

        {/* Notifications — reflects real simulated high-severity alert state */}
        <button
          onClick={() => onNavigate("safety")}
          title={alertCount > 0 ? "High-severity simulated alert active" : "No active alerts"}
          className="relative flex h-8 w-8 items-center justify-center rounded-xl border border-stone-200 bg-white/70 text-stone-500 transition-colors hover:border-forest-300 hover:bg-forest-50 hover:text-forest-600"
        >
          <Bell size={15} />
          {alertCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-cream-50 bg-danger-500" />
          )}
        </button>

        {/* Preparedness context — same real score/level as the sidebar card */}
        <button
          onClick={() => onNavigate(screen === "overview" ? "missions" : "overview")}
          className="flex items-center gap-2 rounded-xl border border-forest-200 bg-forest-50 px-3 py-1.5 text-[12.5px] font-bold text-forest-700 hover:bg-forest-100"
        >
          <span className="tabular">{progress.preparednessScore}%</span>
          <span className="h-3 w-px bg-forest-300/60" />
          <span>Lv {progress.level}</span>
        </button>
      </div>
    </div>
  );
}
