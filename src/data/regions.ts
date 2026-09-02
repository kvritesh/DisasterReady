import type { Region, TerrainLayer } from "../types";

export const REGIONS: Region[] = [
  {
    id: "aizawl-mizoram",
    name: "Aizawl",
    state: "Mizoram",
    areaKm2: 2.1,
    elevationMinM: 780,
    elevationMaxM: 1150,
    terrainResolutionM: 10,
    estimatedPackageMb: 17.8,
    description:
      "Mizoram's capital, built along a steep ridge in India's landslide-prone Northeast — the primary demo region for this SIH landslide early-warning prototype (SIH26001, NER).",
    terrainSeed: 15.2,
    ridgeCount: 2,
    hasValley: true,
    thumbnailGradient: ["#3f7a52", "#1a2e20"],
    status: "full",
  },
  {
    id: "kodagu-hills",
    name: "Kodagu Hills",
    state: "Karnataka",
    areaKm2: 2.3,
    elevationMinM: 900,
    elevationMaxM: 1370,
    terrainResolutionM: 10,
    estimatedPackageMb: 21.1,
    description: "Rolling coffee-estate hills in the Western Ghats, prone to monsoon slope saturation.",
    terrainSeed: 7.1,
    ridgeCount: 4,
    hasValley: true,
    thumbnailGradient: ["#3b6b47", "#16261b"],
    status: "pilot",
  },
  {
    id: "darjeeling",
    name: "Darjeeling",
    state: "West Bengal",
    areaKm2: 1.5,
    elevationMinM: 1800,
    elevationMaxM: 2260,
    terrainResolutionM: 10,
    estimatedPackageMb: 16.7,
    description: "Terraced tea-garden slopes on steep ridgelines above the Ranjit valley.",
    terrainSeed: 19.8,
    ridgeCount: 2,
    hasValley: true,
    thumbnailGradient: ["#4f8759", "#24422f"],
    status: "pilot",
  },
  {
    id: "wayanad",
    name: "Wayanad",
    state: "Kerala",
    areaKm2: 2.6,
    elevationMinM: 700,
    elevationMaxM: 1100,
    terrainResolutionM: 10,
    estimatedPackageMb: 23.6,
    description: "Plateau forest terrain with seasonal streambeds and dense tree cover.",
    terrainSeed: 3.6,
    ridgeCount: 3,
    hasValley: false,
    thumbnailGradient: ["#74a87d", "#2e5339"],
    status: "pilot",
  },
];

export const LAYER_DEFINITIONS: TerrainLayer[] = [
  { id: "elevation", label: "Elevation", sizeMb: 3.1 },
  { id: "slope", label: "Slope", sizeMb: 1.2 },
  { id: "shelters", label: "Emergency shelters", sizeMb: 0.2 },
  { id: "hospitals", label: "Hospitals", sizeMb: 0.2 },
  { id: "roads", label: "Roads & trails", sizeMb: 1.8 },
  { id: "missions", label: "Preparedness missions", sizeMb: 0.1 },
  { id: "earlyWarning", label: "Early warning heuristic", sizeMb: 0.2 },
];

export const DEFAULT_REGION_ID = "aizawl-mizoram" as const;

export function getRegion(id: string): Region {
  return REGIONS.find((r) => r.id === id) ?? REGIONS[0];
}
