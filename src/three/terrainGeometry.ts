import * as THREE from "three";
import type {
  EarlyWarningAssessment,
  EarlyWarningSeverity,
  EnvironmentalScenario,
  Region,
  RegionRiskSummary,
  TerrainClass,
  VisualizationMode,
} from "../types";
import { type HeightFieldParams, sampleHeight, sampleTerrain } from "./terrainMath";

export const WORLD_SIZE = 22;
export const SEGMENTS = 84;
export const HEIGHT_SCALE = 4.4;

export function heightFieldParams(region: Region): HeightFieldParams {
  return {
    seed: region.terrainSeed,
    ridgeCount: region.ridgeCount,
    hasValley: region.hasValley,
    worldSize: WORLD_SIZE,
  };
}

function normalColor(h: number, slopeDeg: number, out: THREE.Color) {
  // Natural palette: valley floor (deep green) -> lush mid forest ->
  // sunlit upper meadow -> rock band -> ridge caps (pale stone)
  const deep = new THREE.Color("#28502f");
  const mid = new THREE.Color("#3c7d47");
  const meadow = new THREE.Color("#63a558");
  const rock = new THREE.Color("#ab9a78");
  const cap = new THREE.Color("#eee7d6");

  let c: THREE.Color;
  if (h < 0.14) c = deep.clone().lerp(mid, h / 0.14);
  else if (h < 0.62) c = mid.clone().lerp(meadow, (h - 0.14) / 0.48);
  else if (h < 0.85) c = meadow.clone().lerp(rock, (h - 0.62) / 0.23);
  else c = rock.clone().lerp(cap, (h - 0.85) / 0.15);

  // Steep faces read as bare rock/scree regardless of elevation band
  if (slopeDeg > 34) {
    const scree = new THREE.Color("#a89878");
    c = c.clone().lerp(scree, Math.min(0.8, (slopeDeg - 34) / 28));
  }
  out.copy(c);
}

function elevationColor(h: number, out: THREE.Color) {
  const stops: [number, string][] = [
    [0, "#284b6e"],
    [0.25, "#3f8f8a"],
    [0.5, "#8fb768"],
    [0.75, "#e0b45a"],
    [1, "#d65c4d"],
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i];
    const [t1, c1] = stops[i + 1];
    if (h >= t0 && h <= t1) {
      const t = (h - t0) / (t1 - t0);
      out.copy(new THREE.Color(c0).lerp(new THREE.Color(c1), t));
      return;
    }
  }
  out.set(stops[stops.length - 1][1]);
}

function slopeColor(slopeDeg: number, out: THREE.Color) {
  const flat = new THREE.Color("#5fae6e");
  const moderate = new THREE.Color("#e6b463");
  const steep = new THREE.Color("#d65c4d");
  const t = Math.min(1, slopeDeg / 45);
  if (t < 0.5) out.copy(flat.clone().lerp(moderate, t / 0.5));
  else out.copy(moderate.clone().lerp(steep, (t - 0.5) / 0.5));
}

const ASPECT_HUES: Record<string, number> = {
  N: 0.58,
  NE: 0.44,
  E: 0.3,
  SE: 0.16,
  S: 0.02,
  SW: 0.86,
  W: 0.72,
  NW: 0.64,
};

function aspectColor(aspect: string, slopeDeg: number, out: THREE.Color) {
  const hue = ASPECT_HUES[aspect] ?? 0.5;
  const sat = 0.55;
  const light = slopeDeg < 4 ? 0.82 : 0.58;
  out.setHSL(hue, sat, light);
}

export interface BuiltTerrain {
  geometry: THREE.BufferGeometry;
}

export function buildTerrainGeometry(
  region: Region,
  mode: VisualizationMode
): BuiltTerrain {
  const params = heightFieldParams(region);
  const geometry = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, SEGMENTS, SEGMENTS);
  geometry.rotateX(-Math.PI / 2);

  const posAttr = geometry.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(posAttr.count * 3);
  const color = new THREE.Color();

  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);
    const h = sampleHeight(x, z, params);
    posAttr.setY(i, h * HEIGHT_SCALE);

    if (mode === "normal") {
      const sample = sampleTerrain(x, z, region, params);
      normalColor(h, sample.slopeDeg, color);
    } else if (mode === "elevation") {
      elevationColor(h, color);
    } else if (mode === "slope") {
      const sample = sampleTerrain(x, z, region, params);
      slopeColor(sample.slopeDeg, color);
    } else {
      const sample = sampleTerrain(x, z, region, params);
      aspectColor(sample.aspect, sample.slopeDeg, color);
    }

    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  return { geometry };
}

export function terrainHeightAt(x: number, z: number, region: Region): number {
  const params = heightFieldParams(region);
  return sampleHeight(x, z, params) * HEIGHT_SCALE;
}

export function findExtremum(
  compare: (a: number, b: number) => boolean,
  metric: (x: number, z: number) => number,
  gridSize = 40
): { x: number; z: number; value: number } {
  let best = { x: 0, z: 0, value: metric(0, 0) };
  const half = WORLD_SIZE / 2 - 1;
  for (let i = 0; i <= gridSize; i++) {
    for (let j = 0; j <= gridSize; j++) {
      const x = -half + (i / gridSize) * half * 2;
      const z = -half + (j / gridSize) * half * 2;
      const value = metric(x, z);
      if (compare(value, best.value)) best = { x, z, value };
    }
  }
  return best;
}

export function findHighestPoint(region: Region) {
  const params = heightFieldParams(region);
  return findExtremum((a, b) => a > b, (x, z) => sampleHeight(x, z, params));
}

export function findSteepestPoint(region: Region) {
  const params = heightFieldParams(region);
  return findExtremum((a, b) => a > b, (x, z) => sampleTerrain(x, z, region, params).slopeDeg);
}

// ============================================================================
// Demo "regional risk" heuristic
// Purely arithmetic over the same procedural height field used everywhere else
// in the app (see terrainMath.sampleTerrain). No external data, no model,
// no live inputs — a transparent, explainable stand-in for a future real
// terrain-intelligence pipeline. See src/types/index.ts#RegionRiskSummary.
// ============================================================================

/** Same "steep" threshold already used by the Spot the Steep Slope mission. */
const STEEP_SLOPE_THRESHOLD_DEG = 30;

export function assessRegionRisk(region: Region, gridSize = 28): RegionRiskSummary {
  const params = heightFieldParams(region);
  const half = WORLD_SIZE / 2 - 1;

  let slopeSum = 0;
  let maxSlopeDeg = 0;
  let steepCount = 0;
  let total = 0;
  const classCounts = new Map<TerrainClass, number>();

  for (let i = 0; i <= gridSize; i++) {
    for (let j = 0; j <= gridSize; j++) {
      const x = -half + (i / gridSize) * half * 2;
      const z = -half + (j / gridSize) * half * 2;
      const sample = sampleTerrain(x, z, region, params);

      slopeSum += sample.slopeDeg;
      if (sample.slopeDeg > maxSlopeDeg) maxSlopeDeg = sample.slopeDeg;
      if (sample.slopeDeg > STEEP_SLOPE_THRESHOLD_DEG) steepCount += 1;
      classCounts.set(sample.terrainClass, (classCounts.get(sample.terrainClass) ?? 0) + 1);
      total += 1;
    }
  }

  const avgSlopeDeg = slopeSum / total;
  const steepFractionPct = (steepCount / total) * 100;

  let dominantClass: TerrainClass = "Slope";
  let dominantCount = -1;
  for (const [cls, count] of classCounts) {
    if (count > dominantCount) {
      dominantCount = count;
      dominantClass = cls;
    }
  }

  // Transparent, explainable blend: mostly how much of the area is steep,
  // moderated by the average slope across the whole prepared area.
  const score = Math.round(
    Math.min(100, Math.max(0, steepFractionPct * 0.6 + (Math.min(avgSlopeDeg, 45) / 45) * 100 * 0.4))
  );
  const tier = score < 35 ? "Low" : score < 65 ? "Moderate" : "Elevated";

  return {
    score,
    tier,
    steepFractionPct,
    avgSlopeDeg,
    maxSlopeDeg,
    dominantClass,
  };
}

// ============================================================================
// Demo "early warning" fusion
// Combines the terrain-only heuristic above with a selected, fixed demo
// EnvironmentalScenario (see src/data/environmentalScenarios.ts). Still plain,
// transparent arithmetic — no machine learning, no live rainfall/soil/seismic
// feed, and not a validated forecast. Extends assessRegionRisk() rather than
// replacing it: the terrain score is unchanged and is simply amplified by a
// simulated environmental factor.
// ============================================================================

/**
 * DEMO NORMALIZATION CEILING — not a real-world rainfall danger threshold.
 * 150 mm/day is only the ceiling this prototype uses to map the fixed demo
 * rainfall values onto a 0-1 range; it is not sourced from any hydrology or
 * hazard standard.
 */
const RAINFALL_NORMALIZATION_CEILING_MM = 150;

const EARLY_WARNING_GUIDANCE: Record<EarlyWarningSeverity, string> = {
  Low: "Conditions are typical for this terrain. Keep up routine preparedness — know your nearest shelter and evacuation route.",
  Elevated:
    "Rising simulated rainfall and soil saturation are amplifying this terrain's risk. Avoid steep slopes and streambeds, and review your shelter route.",
  High: "Terrain and simulated conditions align for significantly elevated landslide risk. Avoid steep or saturated ground, stay alert, and know your nearest shelter now.",
};

export function fuseEarlyWarning(
  terrainRisk: RegionRiskSummary,
  scenario: EnvironmentalScenario
): EarlyWarningAssessment {
  const latestDayRainfallMm = scenario.rainfallTimelineMm[scenario.rainfallTimelineMm.length - 1] ?? 0;

  // normalizedRecentRainfall = clamp(latestDayRainfallMm / 150, 0, 1)
  const normalizedRecentRainfall = Math.min(1, Math.max(0, latestDayRainfallMm / RAINFALL_NORMALIZATION_CEILING_MM));
  const soilFactor = scenario.soilMoisturePct / 100;

  // Blended 0-1 simulated environmental pressure: soil saturation weighted
  // slightly higher than the latest day's rainfall, since sustained
  // saturation is the more direct demo proxy for slope instability.
  const environmentalFactor = soilFactor * 0.6 + normalizedRecentRainfall * 0.4;

  // Amplifies (never reduces) the terrain-only score — environmental
  // conditions can only add to terrain-driven risk in this demo model.
  const amplification = 1 + environmentalFactor * 1.5;

  const fusedScore = Math.round(Math.min(100, Math.max(0, terrainRisk.score * amplification)));
  const severity: EarlyWarningSeverity = fusedScore < 40 ? "Low" : fusedScore < 70 ? "Elevated" : "High";

  return {
    fusedScore,
    severity,
    terrainScore: terrainRisk.score,
    environmentalFactorPct: Math.round(environmentalFactor * 100),
    amplification,
    guidance: EARLY_WARNING_GUIDANCE[severity],
  };
}
