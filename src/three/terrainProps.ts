import type { Region } from "../types";
import { heightFieldParams, terrainHeightAt, WORLD_SIZE } from "./terrainGeometry";
import { mulberry32, sampleTerrain } from "./terrainMath";

export interface PropPlacement {
  x: number;
  z: number;
  y: number;
  scale: number;
  rotation: number;
  variant: number;
}

export interface PropSet {
  trees: PropPlacement[];
  buildings: PropPlacement[];
  rocks: PropPlacement[];
}

const half = WORLD_SIZE / 2 - 1.4;

export function generatePropPlacements(region: Region): PropSet {
  const rand = mulberry32(Math.floor(region.terrainSeed * 10007) + 1);
  const params = heightFieldParams(region);

  const trees: PropPlacement[] = [];
  const buildings: PropPlacement[] = [];
  const rocks: PropPlacement[] = [];

  let attempts = 0;
  while (trees.length < 24 && attempts < 400) {
    attempts++;
    const x = (rand() * 2 - 1) * half;
    const z = (rand() * 2 - 1) * half;
    const s = sampleTerrain(x, z, region, params);
    if (s.heightNorm < 0.08 || s.heightNorm > 0.82) continue;
    if (s.slopeDeg > 38) continue;
    trees.push({
      x,
      z,
      y: terrainHeightAt(x, z, region),
      scale: 1.35 + rand() * 0.75,
      rotation: rand() * Math.PI * 2,
      variant: Math.floor(rand() * 3),
    });
  }

  attempts = 0;
  while (buildings.length < 7 && attempts < 500) {
    attempts++;
    const x = (rand() * 2 - 1) * half * 0.75;
    const z = (rand() * 2 - 1) * half * 0.75;
    const s = sampleTerrain(x, z, region, params);
    if (s.slopeDeg > 14 || s.heightNorm > 0.5 || s.heightNorm < 0.1) continue;
    // avoid clustering too tightly
    if (buildings.some((b) => Math.hypot(b.x - x, b.z - z) < 2.6)) continue;
    buildings.push({
      x,
      z,
      y: terrainHeightAt(x, z, region),
      scale: 1.5 + rand() * 0.55,
      rotation: Math.round(rand() * 4) * (Math.PI / 2),
      variant: Math.floor(rand() * 3),
    });
  }

  attempts = 0;
  while (rocks.length < 10 && attempts < 300) {
    attempts++;
    const x = (rand() * 2 - 1) * half;
    const z = (rand() * 2 - 1) * half;
    const s = sampleTerrain(x, z, region, params);
    if (s.heightNorm < 0.05) continue;
    rocks.push({
      x,
      z,
      y: terrainHeightAt(x, z, region),
      scale: 0.9 + rand() * 1.2,
      rotation: rand() * Math.PI * 2,
      variant: Math.floor(rand() * 2),
    });
  }

  return { trees, buildings, rocks };
}

export interface PathPoint {
  x: number;
  z: number;
  y: number;
}

/** A gently winding trail across the terrain, sampled onto the heightfield. */
export function generateTrail(region: Region, from: [number, number], to: [number, number], wobbleSeed: number): PathPoint[] {
  const rand = mulberry32(Math.floor(wobbleSeed * 999) + 3);
  const points: PathPoint[] = [];
  const steps = 28;
  const wobbleAmp = 1.4;
  const wobblePhase = rand() * Math.PI * 2;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const bx = from[0] + (to[0] - from[0]) * t;
    const bz = from[1] + (to[1] - from[1]) * t;
    const wobble = Math.sin(t * Math.PI * 3 + wobblePhase) * wobbleAmp * Math.sin(t * Math.PI);
    const x = bx + wobble;
    const z = bz;
    points.push({ x, z, y: terrainHeightAt(x, z, region) + 0.05 });
  }
  return points;
}
