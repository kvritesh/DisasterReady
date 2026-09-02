import { ENVIRONMENTAL_SCENARIOS } from "../../data/environmentalScenarios";
import type { EnvironmentalScenarioId } from "../../types";

/**
 * Fixed-preset picker for the demo environmental scenarios (Dry / Normal /
 * Heavy Rain / Prolonged Monsoon). Pure presentation — the caller owns the
 * selected id and re-derives whatever it needs (fuseEarlyWarning, etc).
 * Shared by the single-site Early Warning screen and the multi-site
 * Monitoring board so both stay visually and behaviorally identical.
 */
export function ScenarioPicker({
  value,
  onChange,
  compact = false,
}: {
  value: EnvironmentalScenarioId;
  onChange: (id: EnvironmentalScenarioId) => void;
  /** Tighter padding/text for use inside a Monitoring card. */
  compact?: boolean;
}) {
  return (
    <div
      className={
        "grid grid-cols-2 gap-1.5 rounded-xl border border-stone-200 bg-stone-50/60 sm:grid-cols-4 " +
        (compact ? "p-1" : "p-1.5")
      }
    >
      {ENVIRONMENTAL_SCENARIOS.map((s) => (
        <button
          key={s.id}
          onClick={() => onChange(s.id)}
          className={
            (compact ? "rounded-md px-2 py-1.5 text-[10.5px] " : "rounded-lg px-3 py-2 text-xs ") +
            "font-bold transition-colors " +
            (s.id === value ? "bg-forest-600 text-cream-50" : "bg-white text-stone-500 hover:bg-stone-100")
          }
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
