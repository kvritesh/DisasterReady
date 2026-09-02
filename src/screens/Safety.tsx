import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  CloudRain,
  Compass,
  Droplets,
  Gauge,
  Mountain,
  TrendingUp,
  Waves,
  Zap,
} from "lucide-react";
import { Badge, Card, ProgressBar, RadialProgress, ScreenHeader } from "../components/ui/primitives";
import { ScenarioPicker } from "../components/ui/ScenarioPicker";
import { useApp } from "../state/AppContext";
import { assessRegionRisk, fuseEarlyWarning, heightFieldParams } from "../three/terrainGeometry";
import { sampleTerrain } from "../three/terrainMath";
import { DEFAULT_ENVIRONMENTAL_SCENARIO_ID, ENVIRONMENTAL_SCENARIOS, getEnvironmentalScenario } from "../data/environmentalScenarios";
import { useHighSeverityAlert } from "../hooks/useHighSeverityAlert";
import type { EarlyWarningSeverity, EnvironmentalScenarioId, RiskTier, TerrainPoint } from "../types";

const RISK_TONE: Record<RiskTier, "forest" | "amber" | "danger"> = {
  Low: "forest",
  Moderate: "amber",
  Elevated: "danger",
};

const SEVERITY_TONE: Record<EarlyWarningSeverity, "forest" | "amber" | "danger"> = {
  Low: "forest",
  Elevated: "amber",
  High: "danger",
};

/** Same demo normalization ceiling used by fuseEarlyWarning() — not a real rainfall danger threshold. */
const RAINFALL_CEILING_MM = 150;

export function Safety() {
  const { region, lastPoint } = useApp();
  const [scenarioId, setScenarioId] = useState<EnvironmentalScenarioId>(DEFAULT_ENVIRONMENTAL_SCENARIO_ID);
  const scenario = useMemo(() => getEnvironmentalScenario(scenarioId), [scenarioId]);

  // Default reading before the user has clicked anywhere in the Explorer —
  // sampled from this region's own procedural terrain (never a hardcoded
  // elevation), so it always falls inside the region's real elevation range.
  const defaultPoint = useMemo<TerrainPoint>(() => {
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

  const point = lastPoint ?? defaultPoint;
  const highRisk = point.slopeDeg > 28;

  const isFull = region.status === "full";
  const risk = useMemo(() => assessRegionRisk(region), [region]);

  // Pilot sites never get a fused environmental assessment — there is no
  // simulated scenario data behind them, so fabricating a severity number
  // for one would be dishonest. See PHASE C / data/regions.ts#RegionStatus.
  const assessment = useMemo(
    () => (isFull ? fuseEarlyWarning(risk, scenario) : null),
    [isFull, risk, scenario]
  );

  // Fires a simulated warning event the moment this site's fused assessment
  // crosses into High severity — see PHASE B / hooks/useHighSeverityAlert.
  // Pilot sites pass a null assessment, so this is always a no-op for them.
  useHighSeverityAlert(region.id, region.name, assessment);

  // Cheap, deterministic — used only to draw the "as conditions worsen" strip
  // below. Every scenario is re-fused against the same terrain risk so a
  // judge can see the progression without switching the picker themselves.
  // Empty for pilot sites, for the same reason as `assessment` above.
  const scenarioProgression = useMemo(
    () => (isFull ? ENVIRONMENTAL_SCENARIOS.map((s) => ({ scenario: s, assessment: fuseEarlyWarning(risk, s) })) : []),
    [isFull, risk]
  );

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 md:px-10 md:py-10">
      <ScreenHeader
        eyebrow="Early-warning workflow"
        title="Early Warning"
        subtitle="Terrain characteristics combined with a simulated rainfall + soil-moisture scenario to demonstrate the SIH26001 early-warning pipeline."
        actions={
          <Badge tone={isFull ? "forest" : "amber"}>{isFull ? "Full site" : "Pilot site"}</Badge>
        }
      />

      {!isFull && (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4">
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-stone-400" />
          <div>
            <p className="text-sm font-extrabold uppercase tracking-wide text-stone-600">
              Pilot site — environmental monitoring not yet enabled
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-stone-500">
              {region.name} has the same procedural terrain-derived analysis below (Zone A) as {" "}
              <span className="font-bold">Aizawl</span>. It does not yet have simulated rainfall/soil-moisture
              scenario data, so this prototype intentionally does not show a fused early-warning score or
              severity for it — that would mean presenting a number with nothing real or simulated behind it.
              Aizawl is the only fully demonstrated early-warning site in this prototype.
            </p>
          </div>
        </div>
      )}

      {isFull && (
      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4">
        <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-600" />
        <div>
          <p className="text-sm font-extrabold uppercase tracking-wide text-amber-700">
            Demonstration heuristic — not a validated early-warning forecast
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-amber-800/90">
            This screen demonstrates the early-warning concept end to end: procedural terrain analysis, plus a
            rainfall and soil-moisture scenario you pick from a fixed set of demo presets — not live weather,
            not live sensors, not a machine-learning model. It does not predict real landslide events and
            should not be treated as a validated hazard forecast.
          </p>
        </div>
      </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Zone A — terrain-derived factors (unchanged heuristic, extended not replaced) */}
      {/* ---------------------------------------------------------------- */}
      <Card className="mt-6 flex flex-col gap-5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Mountain size={16} className="text-stone-400" />
            <p className="font-display text-sm font-extrabold text-stone-900">Terrain-derived factors</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={RISK_TONE[risk.tier]}>{risk.tier} terrain risk</Badge>
            <Badge tone="stone">Terrain data</Badge>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <FactorRow
            label="Terrain baseline score"
            value={`${risk.score} / 100`}
            note="Same heuristic used across the app"
          />
          <FactorRow
            label="Steep terrain coverage"
            value={`${risk.steepFractionPct.toFixed(0)}% of area > 30°`}
            note="Weighted 60% of the terrain score"
          />
          <FactorRow label="Average slope" value={`${risk.avgSlopeDeg.toFixed(0)}°`} note="Weighted 40% of the terrain score" />
          <FactorRow label="Dominant terrain" value={risk.dominantClass} note="Most common class in sampled area" />
        </div>
        <p className="text-[12px] leading-relaxed text-stone-400">
          Computed from {region.name}'s procedural demo terrain — the identical terrain shown in the Explorer.
          No real elevation, satellite, or DEM data backs this; it is a transparent, explainable stand-in for a
          future real terrain-intelligence layer.
        </p>
      </Card>

      {!isFull && (
        <Card className="mt-6 flex flex-col gap-3 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CloudRain size={16} className="text-stone-300" />
              <p className="font-display text-sm font-extrabold text-stone-900">Simulated environmental inputs</p>
            </div>
            <Badge tone="stone">Not available — pilot site</Badge>
          </div>
          <p className="text-[13px] leading-relaxed text-stone-500">
            No demo rainfall or soil-moisture scenario is configured for {region.name} yet, so there is nothing
            here to show honestly. This is deliberate — a fused early-warning score without simulated
            environmental data behind it would be fabricated. See Aizawl for the full workflow.
          </p>
        </Card>
      )}

      {isFull && assessment && (
      <>
      {/* ---------------------------------------------------------------- */}
      {/* Zone B — simulated environmental inputs */}
      {/* ---------------------------------------------------------------- */}
      <Card className="mt-6 flex flex-col gap-5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CloudRain size={16} className="text-sky-500" />
            <p className="font-display text-sm font-extrabold text-stone-900">Simulated environmental inputs</p>
          </div>
          <Badge tone="amber">Simulated demo data</Badge>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-400">
            Pick a demo scenario — fixed presets, not a live feed
          </p>
          <ScenarioPicker value={scenarioId} onChange={setScenarioId} />
          <p className="mt-2 text-[12px] leading-relaxed text-stone-400">{scenario.description}</p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide text-stone-400">
                <CloudRain size={12} /> Rainfall — last 5 demo days
              </span>
              <span className="font-display text-sm font-extrabold text-stone-800 tabular">
                {scenario.rainfallTimelineMm[scenario.rainfallTimelineMm.length - 1]} mm latest
              </span>
            </div>
            <RainfallSparkline values={scenario.rainfallTimelineMm} />
            <p className="mt-1.5 text-[10.5px] leading-snug text-stone-400">
              Bars scaled against a fixed {RAINFALL_CEILING_MM} mm/day demo normalization ceiling — a
              modeling constant for this prototype, not a real-world rainfall danger threshold.
            </p>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide text-stone-400">
                <Droplets size={12} /> Soil saturation
              </span>
              <span className="font-display text-sm font-extrabold text-stone-800 tabular">{scenario.soilMoisturePct}%</span>
            </div>
            <ProgressBar
              value={scenario.soilMoisturePct}
              tone={scenario.soilMoisturePct < 35 ? "forest" : scenario.soilMoisturePct < 70 ? "amber" : "danger"}
            />
            <p className="mt-1.5 text-[10.5px] leading-snug text-stone-400">
              Fixed demo soil-saturation reading, 0–100. Not a live sensor value.
            </p>
          </div>
        </div>
      </Card>

      {/* ---------------------------------------------------------------- */}
      {/* Zone C — fused early-warning assessment */}
      {/* ---------------------------------------------------------------- */}
      <Card className="mt-6 flex flex-col gap-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-stone-400" />
            <p className="font-display text-sm font-extrabold text-stone-900">Fused early-warning assessment</p>
          </div>
          <Badge tone="stone">Derived demo assessment</Badge>
        </div>

        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <div className="flex flex-col items-center gap-2.5 md:w-52 md:shrink-0">
            <RadialProgress
              value={assessment.fusedScore}
              size={140}
              strokeWidth={12}
              label={
                <span className="font-display text-[34px] font-extrabold leading-none text-stone-900 tabular">
                  {assessment.fusedScore}
                </span>
              }
              sublabel={<span className="mt-1 text-[9.5px] font-bold uppercase tracking-wider text-stone-400">Fused score / 100</span>}
            />
            <Badge tone={SEVERITY_TONE[assessment.severity]}>{assessment.severity} — early warning</Badge>
          </div>

          <div className="flex-1">
            <div className="mb-3 flex items-center gap-2">
              <TrendingUp size={15} className="text-stone-400" />
              <p className="text-xs font-bold uppercase tracking-wide text-stone-400">
                Why this fused score — {region.name}, {scenario.label} scenario
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <FactorRow label="Terrain baseline" value={`${assessment.terrainScore} / 100`} note="From terrain-derived factors above" />
              <FactorRow label="Environmental factor" value={`${assessment.environmentalFactorPct}%`} note="Blended rainfall + soil pressure" />
              <FactorRow label="Amplification applied" value={`×${assessment.amplification.toFixed(2)}`} note="Terrain baseline × this multiplier" />
            </div>
            <p className="mt-4 rounded-xl border border-stone-100 bg-stone-50/60 p-3 text-[13px] leading-relaxed text-stone-600">
              {assessment.guidance}
            </p>
          </div>
        </div>

        <div>
          <p className="mb-2.5 text-xs font-bold uppercase tracking-wide text-stone-400">
            How worsening simulated conditions raise this score
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {scenarioProgression.map(({ scenario: s, assessment: a }) => (
              <div
                key={s.id}
                className={
                  "rounded-xl border p-3 text-center transition-colors " +
                  (s.id === scenarioId ? "border-forest-300 bg-forest-50" : "border-stone-100 bg-stone-50/60")
                }
              >
                <p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">{s.label}</p>
                <p className="mt-1 font-display text-lg font-extrabold text-stone-800 tabular">{a.fusedScore}</p>
                <Badge tone={SEVERITY_TONE[a.severity]} className="mt-1">
                  {a.severity}
                </Badge>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-stone-400">
            Same terrain, four fixed demo scenarios — illustrating how the fused score and severity respond as
            simulated rainfall and soil saturation worsen. Not a real time-series forecast.
          </p>
        </div>
      </Card>
      </>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="flex flex-col gap-6 p-6">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-stone-400">Current location</p>
            <p className="font-display text-base font-extrabold text-stone-900">
              {region.name} · {point.terrainClass}
            </p>
            <p className="text-xs text-stone-400">Sampled from your last terrain selection</p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric icon={<Mountain size={16} />} label="Elevation" value={`${Math.round(point.elevationM).toLocaleString()} m`} />
            <Metric icon={<Gauge size={16} />} label="Slope" value={`${point.slopeDeg.toFixed(0)}°`} tone={highRisk ? "danger" : "forest"} />
            <Metric icon={<Compass size={16} />} label="Aspect" value={point.aspect} />
            <Metric icon={<ArrowDown size={16} />} label="Flow potential" value={highRisk ? "Elevated" : "Low"} tone={highRisk ? "danger" : "forest"} />
          </div>

          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-stone-400">Simplified terrain-flow heuristic</p>
            <FlowDiagram highRisk={highRisk} />
          </div>
        </Card>

        <Card className="flex flex-col gap-4 p-6">
          <div className="flex items-center gap-2">
            <Waves size={16} className="text-sky-500" />
            <p className="font-display text-sm font-extrabold text-stone-900">How this assessment works</p>
          </div>
          <ul className="flex flex-col gap-3 text-[13px] leading-relaxed text-stone-500">
            <li>
              <span className="font-bold text-stone-700">Terrain:</span> a transparent slope/steepness heuristic
              computed directly from this region's procedural terrain — the same terrain you explore in 3D.
            </li>
            <li>
              <span className="font-bold text-stone-700">Simulated environment:</span> a fixed rainfall + soil-
              moisture demo preset you choose amplifies the terrain baseline — not live weather or sensor data.
            </li>
            <li>
              <span className="font-bold text-stone-700">Fusion:</span> plain arithmetic (terrain score ×
              environmental amplification), not a machine-learning model, producing a Low / Elevated / High
              severity with matching guidance.
            </li>
            <li>
              <span className="font-bold text-stone-700">Scope:</span> not a validated hazard forecast — a full
              deployment would pair this with real DEM-derived flow accumulation and live rainfall/soil/seismic
              feeds.
            </li>
          </ul>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Badge tone="stone">Demo terrain model</Badge>
            <Badge tone="stone">Not a validated prediction</Badge>
          </div>
        </Card>
      </div>
    </div>
  );
}

function RainfallSparkline({ values }: { values: number[] }) {
  return (
    <div className="flex h-16 gap-1.5 rounded-xl border border-stone-100 bg-stone-50/60 p-2.5">
      {values.map((mm, i) => {
        const pct = Math.min(100, Math.max(4, (mm / RAINFALL_CEILING_MM) * 100));
        return (
          <div key={i} className="flex h-full flex-1 flex-col justify-end">
            <div
              className="w-full rounded-t-sm bg-sky-400/70 transition-[height] duration-500"
              style={{ height: `${pct}%` }}
              title={`${mm} mm`}
            />
          </div>
        );
      })}
    </div>
  );
}

function FactorRow({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border border-stone-100 bg-stone-50/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10.5px] font-bold uppercase tracking-wide text-stone-400">{label}</span>
        <span className="font-display text-sm font-extrabold text-stone-800 tabular">{value}</span>
      </div>
      <p className="mt-1 text-[10.5px] leading-snug text-stone-400">{note}</p>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  tone = "stone",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "forest" | "danger" | "stone";
}) {
  const toneClass = tone === "forest" ? "text-forest-600" : tone === "danger" ? "text-danger-600" : "text-stone-800";
  return (
    <div className="rounded-xl border border-stone-100 bg-stone-50/60 p-3.5">
      <div className="flex items-center gap-1.5 text-stone-400">
        {icon}
        <span className="text-[10.5px] font-bold uppercase tracking-wide">{label}</span>
      </div>
      <p className={`mt-1.5 font-display text-lg font-extrabold tabular ${toneClass}`}>{value}</p>
    </div>
  );
}

function FlowDiagram({ highRisk }: { highRisk: boolean }) {
  const steps = [
    { label: "Slope", sub: "Steep face detected" },
    { label: "Valley", sub: "Converging drainage" },
    { label: "Potential flow direction", sub: highRisk ? "Elevated attention" : "Nominal" },
  ];
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-stone-100 bg-gradient-to-b from-stone-50 to-cream-100 p-5">
      {steps.map((s, i) => (
        <div key={s.label}>
          <div className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold ${
                highRisk && i === 2 ? "bg-danger-500/15 text-danger-600" : "bg-forest-100 text-forest-600"
              }`}
            >
              {i + 1}
            </span>
            <div>
              <p className="text-sm font-bold text-stone-800">{s.label}</p>
              <p className="text-[11px] text-stone-400">{s.sub}</p>
            </div>
          </div>
          {i < steps.length - 1 && (
            <div className="flex justify-center py-1">
              <ArrowDown size={14} className="text-stone-300" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
