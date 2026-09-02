import type { EnvironmentalScenario, EnvironmentalScenarioId } from "../types";

// ============================================================================
// Fixed, deterministic demo environmental presets.
// These are NOT live weather, NOT sensor readings, and NOT fetched from any
// API — every number below is a hardcoded illustrative value chosen so the
// four presets read as a clear dry → prolonged-monsoon progression. See
// three/terrainGeometry.ts#fuseEarlyWarning for how they combine with the
// terrain-only heuristic into the Early Warning screen's fused score.
// ============================================================================

export const ENVIRONMENTAL_SCENARIOS: EnvironmentalScenario[] = [
  {
    id: "dry",
    label: "Dry",
    description: "Little to no rainfall in the last 5 demo days; soil is largely unsaturated.",
    rainfallTimelineMm: [0, 0, 1, 0, 0],
    soilMoisturePct: 12,
  },
  {
    id: "normal",
    label: "Normal",
    description: "Typical light seasonal rainfall; soil moisture at a moderate baseline.",
    rainfallTimelineMm: [3, 6, 4, 7, 5],
    soilMoisturePct: 28,
  },
  {
    id: "heavy-rain",
    label: "Heavy Rain",
    description: "Several days of intensifying rainfall have raised soil saturation noticeably.",
    rainfallTimelineMm: [10, 22, 35, 48, 42],
    soilMoisturePct: 60,
  },
  {
    id: "prolonged-monsoon",
    label: "Prolonged Monsoon",
    description: "Sustained, worsening monsoon rainfall over multiple days; soil is near-saturated.",
    rainfallTimelineMm: [35, 55, 70, 95, 140],
    soilMoisturePct: 97,
  },
];

export const DEFAULT_ENVIRONMENTAL_SCENARIO_ID: EnvironmentalScenarioId = "normal";

export function getEnvironmentalScenario(id: string): EnvironmentalScenario {
  return ENVIRONMENTAL_SCENARIOS.find((s) => s.id === id) ?? ENVIRONMENTAL_SCENARIOS[1];
}
