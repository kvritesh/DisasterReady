import type { CompassDirection, Region, TerrainClass } from "../types";

// ============================================================================
// Deterministic procedural terrain height field.
// Not real elevation data — a stylized fbm + ridge/valley shaping function
// seeded per region so the "DEMO TERRAIN MODEL" is stable and repeatable.
// ============================================================================

function hash2(x: number, y: number, seed: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
  return s - Math.floor(s);
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function valueNoise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;

  const tl = hash2(xi, yi, seed);
  const tr = hash2(xi + 1, yi, seed);
  const bl = hash2(xi, yi + 1, seed);
  const br = hash2(xi + 1, yi + 1, seed);

  const u = smoothstep(xf);
  const v = smoothstep(yf);

  const top = tl + (tr - tl) * u;
  const bottom = bl + (br - bl) * u;
  return top + (bottom - top) * v;
}

function fbm(x: number, y: number, seed: number, octaves = 5): number {
  let total = 0;
  let amplitude = 0.55;
  let frequency = 1;
  let max = 0;
  for (let i = 0; i < octaves; i++) {
    total += valueNoise(x * frequency, y * frequency, seed + i * 11.3) * amplitude;
    max += amplitude;
    amplitude *= 0.5;
    frequency *= 2.05;
  }
  return total / max;
}

export interface HeightFieldParams {
  seed: number;
  ridgeCount: number;
  hasValley: boolean;
  worldSize: number;
}

/**
 * Returns a normalized height 0..1 for a world-space (x, z) coordinate,
 * where x,z are in range [-worldSize/2, worldSize/2].
 */
export function sampleHeight(x: number, z: number, params: HeightFieldParams): number {
  const { seed, ridgeCount, hasValley, worldSize } = params;
  const nx = x / worldSize; // -0.5..0.5
  const nz = z / worldSize;

  // Base rolling terrain — gentle, low-amplitude undulation
  let h = fbm(nx * 2.6 + 4.2, nz * 2.6 + 4.2, seed, 4);

  // Ridge shaping: broad, soft ridges running roughly along z, offset by seed
  let ridgeSum = 0;
  for (let i = 0; i < ridgeCount; i++) {
    const phase = (i / ridgeCount) * Math.PI * 2 + seed;
    const ridgeAxis = Math.sin(nz * Math.PI * 1.3 + phase) * 0.5;
    const dist = Math.abs(nx - ridgeAxis * 0.55);
    const ridge = Math.exp(-dist * dist * 5.5) * (0.42 - i * 0.06);
    ridgeSum += Math.max(ridge, 0);
  }
  h = h * 0.4 + ridgeSum * 0.48;

  // Valley carve: a wide, gentle meandering channel through the middle
  if (hasValley) {
    const meander = Math.sin(nz * Math.PI * 1.1 + seed * 0.5) * 0.22;
    const distToValley = Math.abs(nx - meander);
    const valley = Math.exp(-distToValley * distToValley * 7);
    h = h * (1 - valley * 0.5);
  }

  // Edge falloff so the diorama reads as an island sitting on its base
  const edge = Math.max(Math.abs(nx), Math.abs(nz)) * 2; // 0 center .. 1 edge
  const falloff = smoothstep(1 - Math.min(Math.max((edge - 0.72) / 0.28, 0), 1));
  h *= falloff;

  return Math.max(0, Math.min(1, h));
}

export function heightToElevationM(h: number, region: Region): number {
  return region.elevationMinM + h * (region.elevationMaxM - region.elevationMinM);
}

const DIRECTIONS: CompassDirection[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

/** angle in radians, 0 = +Z (north), clockwise */
export function angleToCompass(angleRad: number): CompassDirection {
  let deg = (angleRad * 180) / Math.PI;
  deg = ((deg % 360) + 360) % 360;
  const idx = Math.round(deg / 45) % 8;
  return DIRECTIONS[idx];
}

export interface TerrainSample {
  elevationM: number;
  slopeDeg: number;
  aspect: CompassDirection;
  terrainClass: TerrainClass;
  heightNorm: number;
}

/** Real-world meters represented by one unit of world space, derived from the
 * region's footprint so slope works out to plausible degrees instead of raw
 * scene units. Treats the prepared area as roughly square. */
function metersPerWorldUnit(region: Region, worldSize: number): number {
  const realWorldSizeM = Math.sqrt(region.areaKm2 * 1_000_000);
  return realWorldSizeM / worldSize;
}

export function sampleTerrain(x: number, z: number, region: Region, params: HeightFieldParams): TerrainSample {
  const eps = params.worldSize * 0.022;
  const epsMeters = eps * metersPerWorldUnit(region, params.worldSize);
  const h = sampleHeight(x, z, params);
  const hx1 = sampleHeight(x - eps, z, params);
  const hx2 = sampleHeight(x + eps, z, params);
  const hz1 = sampleHeight(x, z - eps, params);
  const hz2 = sampleHeight(x, z + eps, params);

  const elevRange = region.elevationMaxM - region.elevationMinM;
  const dHdx = ((hx2 - hx1) * elevRange) / (2 * epsMeters);
  const dHdz = ((hz2 - hz1) * elevRange) / (2 * epsMeters);

  const slopeRad = Math.atan(Math.sqrt(dHdx * dHdx + dHdz * dHdz));
  const slopeDeg = Math.min(58, (slopeRad * 180) / Math.PI);

  // aspect = downhill direction
  const aspectAngle = Math.atan2(-dHdx, -dHdz);
  const aspect = angleToCompass(aspectAngle);

  let terrainClass: TerrainClass;
  if (h > 0.4) terrainClass = "Ridgeline";
  else if (slopeDeg > 26) terrainClass = "Slope";
  else if (region.hasValley && h < 0.14) terrainClass = "Valley Floor";
  else if (slopeDeg < 6 && h > 0.3 && h < 0.7) terrainClass = "Plateau";
  else terrainClass = "Streambed";

  return {
    elevationM: heightToElevationM(h, region),
    slopeDeg,
    aspect,
    terrainClass,
    heightNorm: h,
  };
}

// Seeded PRNG for stable prop placement (mulberry32)
export function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
