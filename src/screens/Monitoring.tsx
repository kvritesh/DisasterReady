import { useMemo, useState } from "react";
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

export function Monitoring({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  const { alerts } = useApp();
  const fullRegions = useMemo(() => REGIONS.filter((r) => r.status === "full"), []);
  const pilotCount = REGIONS.length - fullRegions.length;

  // Per-site scenario selection lives here (not inside each card) so the
  // summary strip above the board can reflect every site's current picked
  // scenario at once — this is the same fuseEarlyWarning() pipeline used on
  // the single-site Early Warning screen, just run once per full site.
  const [scenarioIds, setScenarioIds] = useState<Record<RegionId, EnvironmentalScenarioId>>(() =>
    Object.fromEntries(REGIONS.map((r) => [r.id, DEFAULT_ENVIRONMENTAL_SCENARIO_ID])) as Record<RegionId, EnvironmentalScenarioId>
  );
  const setScenarioFor = (id: RegionId, scenarioId: EnvironmentalScenarioId) =>
    setScenarioIds((prev) => ({ ...prev, [id]: scenarioId }));

  const fullAssessments = useMemo(
    () =>
      fullRegions.map((region) => {
        const risk = assessRegionRisk(region);
        const scenario = getEnvironmentalScenario(scenarioIds[region.id] ?? DEFAULT_ENVIRONMENTAL_SCENARIO_ID);
        return fuseEarlyWarning(risk, scenario);
      }),
    [fullRegions, scenarioIds]
  );

  const highestSeverity: EarlyWarningSeverity | null = fullAssessments.some((a) => a.severity === "High")
    ? "High"
    : fullAssessments.some((a) => a.severity === "Elevated")
      ? "Elevated"
      : fullAssessments.length > 0
        ? "Low"
        : null;

  const activeAlertCount = Object.keys(alerts).length;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 md:px-10 md:py-10">
      <ScreenHeader
        eyebrow="Multi-site overview"
        title="Monitoring"
        subtitle="A compact board across every configured site — procedural terrain baseline for all four, plus a live fused early-warning assessment for the fully demonstrated site."
        actions={
          <>
            <Badge tone="forest">{fullRegions.length} full</Badge>
            <Badge tone="amber">{pilotCount} pilot</Badge>
          </>
        }
      />

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Sites monitored" value={REGIONS.length} detail="Across the NER demo" tone="stone" icon={<Radar size={15} />} />
        <StatTile
          label="Full-site coverage"
          value={`${fullRegions.length} / ${REGIONS.length}`}
          detail="Fused assessment enabled"
          tone="forest"
          icon={<Mountain size={15} />}
        />
        <StatTile
          label="Highest active severity"
          value={highestSeverity ?? "—"}
          detail={highestSeverity ? "Across full sites, current scenarios" : "No full sites configured"}
          tone={highestSeverity ? SEVERITY_TONE[highestSeverity] : "stone"}
          icon={<Gauge size={15} />}
        />
        <StatTile
          label="Active simulated alerts"
          value={activeAlertCount}
          detail={activeAlertCount > 0 ? "Awaiting acknowledgement" : "None right now"}
          tone={activeAlertCount > 0 ? "danger" : "forest"}
          icon={<Siren size={15} />}
        />
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4">
        <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-600" />
        <div>
          <p className="text-sm font-extrabold uppercase tracking-wide text-amber-700">Demo monitoring board — not a live multi-site sensor network</p>
          <p className="mt-1 text-[13px] leading-relaxed text-amber-800/90">
            Every card and the summary strip above are computed on this device from procedural demo terrain, not
            fetched from any server or sensor. Pilot sites intentionally show terrain analysis only — no
            rainfall/soil-moisture scenario data exists for them, so no fused early-warning score is shown or
            invented for them.
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
  const { setRegion } = useApp();
  const isFull = region.status === "full";
  const scenario = useMemo(() => getEnvironmentalScenario(scenarioId), [scenarioId]);
  const risk = useMemo(() => assessRegionRisk(region), [region]);
  const assessment = useMemo(() => (isFull ? fuseEarlyWarning(risk, scenario) : null), [isFull, risk, scenario]);
  useHighSeverityAlert(region.id, region.name, assessment);
  const openSite = () => {
    setRegion(region.id);
    onNavigate("safety");
  };
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-base font-extrabold text-stone-900">{region.name}</p>
          <p className="text-xs text-stone-400">{region.state}</p>
        </div>
        <Badge tone={isFull ? "forest" : "amber"}>{isFull ? "Full site" : "Pilot"}</Badge>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Mountain size={14} className="text-stone-400" />
          <span className="text-[11px] font-bold uppercase tracking-wide text-stone-400">Terrain</span>
        </div>
        <Badge tone={RISK_TONE[risk.tier]}>{risk.tier}</Badge>
        <span className="text-[11px] text-stone-400">{risk.score} / 100</span>
      </div>
      {isFull && assessment ? (
        <>
          <div className="rounded-xl border border-stone-100 bg-stone-50/60 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide text-stone-400">
                <CloudRain size={12} /> Scenario
              </span>
              <Badge tone="amber">Simulated</Badge>
            </div>
            <ScenarioPicker value={scenarioId} onChange={onScenarioChange} compact />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-stone-100 bg-stone-50/60 p-3">
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-wide text-stone-400">Fused severity</p>
              <p className="font-display text-2xl font-extrabold text-stone-900 tabular">{assessment.fusedScore}</p>
            </div>
            <Badge tone={SEVERITY_TONE[assessment.severity]}>{assessment.severity}</Badge>
          </div>
          <p className="text-[11px] leading-relaxed text-stone-400">
            Last assessed: just now, on this device — derived demo assessment, not a validated forecast.
          </p>
        </>
      ) : (
        <p className="rounded-xl border border-stone-100 bg-stone-50/60 p-3 text-[12px] leading-relaxed text-stone-500">
          Terrain intelligence only. Environmental monitoring (rainfall/soil-moisture scenarios) is not yet enabled
          for this site, so no fused early-warning score is shown here.
        </p>
      )}
      <button
        onClick={openSite}
        className="mt-1 flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-600 transition-colors hover:bg-stone-100"
      >
        <Radar size={13} />
        {isFull ? "View full early-warning assessment" : "View terrain detail"}
        <ArrowRight size={13} />
      </button>
    </Card>
  );
}
