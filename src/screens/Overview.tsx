import { useMemo } from "react";
import { ArrowRight, CheckCircle2, Compass, Layers, Package, ShieldAlert, Target, WifiOff } from "lucide-react";
import { Badge, Button, Card, RadialProgress, StatTile } from "../components/ui/primitives";
import { MiniTerrainPreview } from "../components/ui/MiniTerrainPreview";
import { useApp } from "../state/AppContext";
import { assessRegionRisk } from "../three/terrainGeometry";
import { poisForRegion } from "../data/pois";
import type { RiskTier } from "../types";
import type { ScreenId } from "../App";

const RISK_TONE: Record<RiskTier, { badge: "forest" | "amber" | "danger"; iconBg: string; iconText: string }> = {
  Low: { badge: "forest", iconBg: "bg-forest-100", iconText: "text-forest-600" },
  Moderate: { badge: "amber", iconBg: "bg-amber-400/15", iconText: "text-amber-600" },
  Elevated: { badge: "danger", iconBg: "bg-danger-500/10", iconText: "text-danger-600" },
};

export function Overview({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  const { region, progress, offlinePackage, toggleConnectivity, connectivity } = useApp();
  const risk = useMemo(() => assessRegionRisk(region), [region]);
  const tone = RISK_TONE[risk.tier];
  const isFull = region.status === "full";
  const poiCount = useMemo(() => poisForRegion(region.id).length, [region.id]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning." : hour < 18 ? "Good afternoon." : "Good evening.";

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10 md:py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[30px] font-extrabold leading-tight text-stone-900 md:text-[34px]">
            {greeting}
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-[15px] text-stone-500">
            <CheckCircle2 size={16} className="text-forest-500" />
            Your area is prepared.
          </p>
        </div>
        <Badge tone="stone">Demo build · Local mock data</Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
        {/* Score card */}
        <Card className="flex flex-col items-center justify-center gap-1 p-8 text-center">
          <RadialProgress
            value={progress.preparednessScore}
            label={
              <span className="font-display text-[44px] font-extrabold leading-none text-stone-900 tabular">
                {progress.preparednessScore}
              </span>
            }
            sublabel={<span className="mt-1 text-[10.5px] font-bold uppercase tracking-wider text-stone-400">Preparedness score</span>}
          />
          <p className="mt-5 text-sm text-stone-500">
            Level <span className="font-bold text-stone-700">{progress.level}</span> · {progress.xp} / {progress.xpToNextLevel} XP
          </p>
          <div className="mt-1 h-1.5 w-40 overflow-hidden rounded-full bg-stone-200">
            <div
              className="h-full rounded-full bg-forest-500 transition-all duration-700"
              style={{ width: `${(progress.xp / progress.xpToNextLevel) * 100}%` }}
            />
          </div>
        </Card>

        {/* Stat grid */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatTile label="Terrain" value="100%" detail="Ready" tone="forest" icon={<Layers size={16} />} />
          <StatTile
            label="Emergency POIs"
            value={poiCount > 0 ? "100%" : "0%"}
            detail={poiCount > 0 ? `Cached · ${poiCount} sites` : "Not available (pilot site)"}
            tone={poiCount > 0 ? "sky" : "amber"}
            icon={<Compass size={16} />}
          />
          <StatTile
            label="Missions"
            value={`${progress.missionsCompleted} / ${progress.missionsTotal}`}
            detail="Complete"
            tone="amber"
            icon={<Target size={16} />}
          />
          <StatTile
            label="Offline"
            value={offlinePackage.isReady ? "Ready" : "Not ready"}
            detail={offlinePackage.isReady ? "Available anytime" : "Prepare to enable"}
            tone={offlinePackage.isReady ? "forest" : "danger"}
            icon={<Package size={16} />}
          />

          {/* Region card spans full width */}
          <Card className="col-span-2 flex flex-col overflow-hidden p-0 md:col-span-4 md:flex-row">
            <div className="relative h-36 md:h-auto md:w-72 md:shrink-0">
              <MiniTerrainPreview
                seed={region.terrainSeed}
                gradient={region.thumbnailGradient}
                className="h-full w-full"
                showMarker
              />
              <div className="absolute left-3 top-3 flex gap-1.5">
                <Badge tone="forest">Cached</Badge>
                <Badge tone={isFull ? "forest" : "amber"}>{isFull ? "Full site" : "Pilot site"}</Badge>
              </div>
            </div>
            <div className="flex flex-1 flex-col justify-center gap-3 p-6">
              <div>
                <p className="font-display text-xl font-extrabold text-stone-900">{region.name}</p>
                <p className="text-sm text-stone-500">
                  {region.areaKm2} km² prepared area · Terrain data cached
                  {!isFull && " · emergency POIs & early warning not yet enabled here"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => onNavigate("explore")} icon={<ArrowRight size={14} />}>
                  Continue exploring
                </Button>
                <Button size="sm" variant="secondary" onClick={() => onNavigate("prepare")}>
                  Change region
                </Button>
                <Button
                  size="sm"
                  variant={connectivity === "offline" ? "danger" : "outline"}
                  onClick={toggleConnectivity}
                  icon={<WifiOff size={14} />}
                >
                  {connectivity === "offline" ? "Exit offline test" : "Test offline mode"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Card className="mt-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tone.iconBg} ${tone.iconText}`}>
            <ShieldAlert size={19} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-display text-[15px] font-bold text-stone-900">Regional risk snapshot</p>
              <Badge tone={tone.badge}>{risk.tier} risk</Badge>
            </div>
            <p className="mt-0.5 text-[12.5px] text-stone-400">
              {region.name}, {region.state} · terrain-derived demo heuristic, not a validated forecast
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RiskChip label="Elevation" value={`${region.elevationMinM.toLocaleString()}–${region.elevationMaxM.toLocaleString()} m`} />
          <RiskChip label="Steep terrain" value={`${Math.round(risk.steepFractionPct)}%`} />
          <RiskChip label="Dominant terrain" value={risk.dominantClass} />
          <Badge tone="stone">Demo data</Badge>
        </div>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickLink
          title="Preparedness Missions"
          desc="2 missions ready to demo. Earn XP by exploring this procedural demo terrain's shape."
          cta="Open Missions"
          onClick={() => onNavigate("missions")}
        />
        <QuickLink
          title="Monitoring"
          desc="See every configured site at once — terrain baseline for all four, live fused score for the full site."
          cta="Open Monitoring"
          onClick={() => onNavigate("monitoring")}
        />
        <QuickLink
          title="Early Warning"
          desc="Run this terrain's early-warning risk assessment and see what feeds the score."
          cta="View Early Warning"
          onClick={() => onNavigate("safety")}
        />
        <QuickLink
          title="Offline Storage"
          desc={`${offlinePackage.totalMb.toFixed(1)} MB cached on this device across 6 layers.`}
          cta="Manage Offline Data"
          onClick={() => onNavigate("offline")}
        />
      </div>
    </div>
  );
}

function RiskChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50/70 px-3 py-1.5">
      <p className="text-[9px] font-bold uppercase tracking-wide text-stone-400">{label}</p>
      <p className="text-[12.5px] font-bold text-stone-800">{value}</p>
    </div>
  );
}

function QuickLink({
  title,
  desc,
  cta,
  onClick,
}: {
  title: string;
  desc: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <p className="font-display text-[15px] font-bold text-stone-900">{title}</p>
      <p className="flex-1 text-[13px] leading-relaxed text-stone-500">{desc}</p>
      <button
        onClick={onClick}
        className="flex items-center gap-1 self-start text-[13px] font-bold text-forest-600 hover:text-forest-700"
      >
        {cta} <ArrowRight size={14} />
      </button>
    </Card>
  );
}
