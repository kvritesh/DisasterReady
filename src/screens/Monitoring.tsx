import { useMemo, useState } from "react";
import clsx from "clsx";
import { AlertTriangle, ArrowRight, CloudRain, Gauge, Mountain, Radar, Siren } from "lucide-react";
import { Badge, Card, ScreenHeader, StatTile } from "../components/ui/primitives";
import { ScenarioPicker } from "../components/ui/ScenarioPicker";
import { useApp } from "../state/AppContext";
import { useHighSeverityAlert } from "../hooks/useHighSeverityAlert";
import { assessRegionRisk, fuseEarlyWarning } from "../three/terrainGeometry";
import { DEFAULT_ENVIRONMENTAL_SCENARIO_ID, getEnvironmentalScenario } from "../data/environmentalScenarios";
import { REGIONS } from "../data/regions";
import type { ScreenId } from "../App";
import type { EarlyWarningSeverity, EnvironmentalScenarioId, Region, RegionId, RiskTier } from "../types";

const RISK_TONE: Record<RiskTier, "forest" | "amber" | "danger"> = { Low: "forest", Moderate: "amber", Elevated: "danger" };
const SEVERITY_TONE: Record<EarlyWarningSeverity, "forest" | "amber" | "danger"> = { Low: "forest", Elevated: "amber", High: "danger" };

// ----------------------------------------------------------------------------
// Sensible starting scenario per region for the demo board — chosen for a
// varied, presentation-friendly spread across the 4 fixed presets (see
// src/data/environmentalScenarios.ts). These are still fixed demo presets
// picked by a human, not any kind of live reading — the user can change any
// site's dropdown at any time, exactly like the single-site Early Warning
// screen already allows.
// ----------------------------------------------------------------------------
const DEFAULT_SCENARIO_BY_REGION: Record<RegionId, EnvironmentalScenarioId> = {
  "aizawl-mizoram": DEFAULT_ENVIRONMENTAL_SCENARIO_ID, // "normal" — unchanged from before
  "kodagu-hills": "dry",
  darjeeling: "heavy-rain",
  wayanad: "prolonged-monsoon",
};

export function Monitoring({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  const { alerts, uiMode } = useApp();
  const ultra = uiMode === "ultra";
  const fullRegions = useMemo(() => REGIONS.filter((r) => r.status === "full"), []);
  const pilotCount = REGIONS.length - fullRegions.length;

  // Per-site scenario selection lives here (not inside each card) so the
  // summary strip above the board can reflect every site's current picked
  // scenario at once — this is the same fuseEarlyWarning() pipeline used on
  // the single-site Early Warning screen, just run once per configured site.
  // Every site gets a fused assessment now (previously only "full" sites
  // did) — assessRegionRisk()/fuseEarlyWarning() themselves are unchanged;
  // this only affects which sites the Monitoring board chooses to render
  // the existing scenario/fused UI for.
  const [scenarioIds, setScenarioIds] = useState<Record<RegionId, EnvironmentalScenarioId>>(() => ({
    ...DEFAULT_SCENARIO_BY_REGION,
  }));
  const setScenarioFor = (id: RegionId, scenarioId: EnvironmentalScenarioId) =>
    setScenarioIds((prev) => ({ ...prev, [id]: scenarioId }));

  const allAssessments = useMemo(
    () =>
      REGIONS.map((region) => {
        const risk = assessRegionRisk(region);
        const scenario = getEnvironmentalScenario(scenarioIds[region.id] ?? DEFAULT_ENVIRONMENTAL_SCENARIO_ID);
        return fuseEarlyWarning(risk, scenario);
      }),
    [scenarioIds]
  );

  const highestSeverity: EarlyWarningSeverity | null = allAssessments.some((a) => a.severity === "High")
    ? "High"
    : allAssessments.some((a) => a.severity === "Elevated")
      ? "Elevated"
      : allAssessments.length > 0
        ? "Low"
        : null;

  const activeAlertCount = Object.keys(alerts).length;

  return (
    <div className={clsx("mx-auto max-w-5xl px-6 py-8 md:px-10 md:py-10", ultra && "bg-cream-100")}>
      <ScreenHeader
        eyebrow="Multi-site overview"
        title="Monitoring"
        subtitle="A compact board across every configured site — procedural terrain baseline plus a simulated, scenario-based fused early-warning assessment for all four sites."
        actions={
          <>
            <Badge tone="forest">{fullRegions.length} full</Badge>
            <Badge tone="amber">{pilotCount} pilot</Badge>
          </>
        }
      />

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="Sites monitored"
          value={REGIONS.length}
          detail="Across the NER demo"
          tone="stone"
          icon={<Radar size={15} />}
          className={ultra ? "!border-forest-400/15 !bg-forest-950/95 text-cream-50" : undefined}
        />
        <StatTile
          label="Full-site coverage"
          value={`${fullRegions.length} / ${REGIONS.length}`}
          detail="Complete offline dataset"
          tone="forest"
          icon={<Mountain size={15} />}
          className={ultra ? "!border-forest-400/15 !bg-forest-950/95 text-cream-50" : undefined}
        />
        <StatTile
          label="Highest active severity"
          value={highestSeverity ?? "—"}
          detail={highestSeverity ? "Across all 4 sites, current scenarios" : "No sites configured"}
          tone={highestSeverity ? SEVERITY_TONE[highestSeverity] : "stone"}
          icon={<Gauge size={15} />}
          className={ultra ? "!border-forest-400/15 !bg-forest-950/95 text-cream-50" : undefined}
        />
        <StatTile
          label="Active simulated alerts"
          value={activeAlertCount}
          detail={activeAlertCount > 0 ? "Awaiting acknowledgement" : "None right now"}
          tone={activeAlertCount > 0 ? "danger" : "forest"}
          icon={<Siren size={15} />}
          className={ultra ? "!border-forest-400/15 !bg-forest-950/95 text-cream-50" : undefined}
        />
      </div>

      <div
        className={clsx(
          "mt-5 flex items-start gap-3 rounded-2xl border p-4",
          ultra ? "border-amber-400/30 bg-amber-400/10" : "border-amber-400/40 bg-amber-400/10"
        )}
      >
        <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-600" />
        <div>
          <p className={clsx("text-sm font-extrabold uppercase tracking-wide", ultra ? "text-amber-300" : "text-amber-700")}>
            Demo monitoring board — not a live multi-site sensor network
          </p>
          <p className={clsx("mt-1 text-[13px] leading-relaxed", ultra ? "text-amber-100/80" : "text-amber-800/90")}>
            Every card and the summary strip above are computed on this device from procedural demo terrain plus a
            manually-selected environmental scenario preset (Dry / Normal / Heavy Rain / Prolonged Monsoon) — nothing
            here is fetched from a server or sensor. Change the dropdown on any card and its fused score recomputes
            instantly; the architecture is built so these scenario inputs could later be replaced by a real live
            feed, but none exists in this prototype today.
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
        {REGIONS.map((region) => (
          <MonitoringCard
            key={region.id}
            region={region}
            onNavigate={onNavigate}
            scenarioId={scenarioIds[region.id] ?? DEFAULT_ENVIRONMENTAL_SCENARIO_ID}
            onScenarioChange={(id) => setScenarioFor(region.id, id)}
          />
        ))}
      </div>
    </div>
  );
}

function MonitoringCard({
  region,
  onNavigate,
  scenarioId,
  onScenarioChange,
}: {
  region: Region;
  onNavigate: (screen: ScreenId) => void;
  scenarioId: EnvironmentalScenarioId;
  onScenarioChange: (id: EnvironmentalScenarioId) => void;
}) {
  const { setRegion, uiMode } = useApp();
  const ultra = uiMode === "ultra";
  const isFull = region.status === "full";
  const scenario = useMemo(() => getEnvironmentalScenario(scenarioId), [scenarioId]);
  const risk = useMemo(() => assessRegionRisk(region), [region]);
  // Every region now gets a fused assessment — assessRegionRisk() and
  // fuseEarlyWarning() are unchanged; only this board's decision to always
  // render the block (instead of gating it on region.status === "full") is
  // new. region.status still drives the "Full site"/"Pilot" badge below and
  // every other screen unaffected by this change.
  const assessment = useMemo(() => fuseEarlyWarning(risk, scenario), [risk, scenario]);
  useHighSeverityAlert(region.id, region.name, assessment);
  const openSite = () => {
    setRegion(region.id);
    onNavigate("safety");
  };
  return (
    <Card className={clsx("flex flex-col gap-4 p-5", ultra && "!border-forest-400/15 !bg-forest-950/95 text-cream-50")}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className={clsx("font-display text-base font-extrabold", ultra ? "text-cream-50" : "text-stone-900")}>{region.name}</p>
          <p className={clsx("text-xs", ultra ? "text-stone-400" : "text-stone-400")}>{region.state}</p>
        </div>
        <Badge tone={isFull ? "forest" : "amber"}>{isFull ? "Full site" : "Pilot"}</Badge>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Mountain size={14} className={ultra ? "text-forest-300" : "text-stone-400"} />
          <span className={clsx("text-[11px] font-bold uppercase tracking-wide", ultra ? "text-forest-400/70" : "text-stone-400")}>
            Terrain
          </span>
        </div>
        <Badge tone={RISK_TONE[risk.tier]}>{risk.tier}</Badge>
        <span className={clsx("text-[11px]", ultra ? "text-stone-400" : "text-stone-400")}>{risk.score} / 100</span>
      </div>

      <div className={clsx("rounded-xl border p-3", ultra ? "border-forest-400/15 bg-cream-50/95" : "border-stone-100 bg-stone-50/60")}>
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide text-stone-400">
            <CloudRain size={12} /> Scenario
          </span>
          <Badge tone="amber">Simulated</Badge>
        </div>
        <ScenarioPicker value={scenarioId} onChange={onScenarioChange} compact />
      </div>
      <div
        className={clsx(
          "flex items-center justify-between rounded-xl border p-3",
          ultra ? "border-forest-400/15 bg-forest-900/60" : "border-stone-100 bg-stone-50/60"
        )}
      >
        <div>
          <p className={clsx("text-[10.5px] font-bold uppercase tracking-wide", ultra ? "text-forest-400/70" : "text-stone-400")}>
            Fused severity
          </p>
          <p className={clsx("font-display text-2xl font-extrabold tabular", ultra ? "text-cream-50" : "text-stone-900")}>
            {assessment.fusedScore}
          </p>
        </div>
        <Badge tone={SEVERITY_TONE[assessment.severity]}>{assessment.severity}</Badge>
      </div>
      <p className={clsx("text-[11px] leading-relaxed", ultra ? "text-stone-400" : "text-stone-400")}>
        Last assessed: just now, on this device, from the scenario above — a simulated demo assessment, not a
        real-time sensor reading or a validated forecast.
      </p>

      <button
        onClick={openSite}
        className={clsx(
          "mt-1 flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors",
          ultra
            ? "border-forest-400/20 bg-forest-900/60 text-cream-50 hover:bg-forest-900/90"
            : "border-stone-200 bg-white text-stone-600 hover:bg-stone-100"
        )}
      >
        <Radar size={13} />
        View full early-warning assessment
        <ArrowRight size={13} />
      </button>
    </Card>
  );
}
