// ============================================================================
// DisasterReady — core data models
// These types describe the shape real APIs would eventually fill in.
// Everything backing them tonight is local mock data (see src/data/*).
// ============================================================================

export type RegionId = "aizawl-mizoram" | "kodagu-hills" | "darjeeling" | "wayanad";

/**
 * Whether a region has its full demo dataset (emergency POIs, environmental
 * scenario monitoring) or is terrain-only. "full" today means exactly
 * Aizawl — every other region is honestly marked "pilot" everywhere it's
 * selectable, rather than silently showing empty POI/severity panels. See
 * data/regions.ts.
 */
export type RegionStatus = "full" | "pilot";

export interface Region {
  id: RegionId;
  name: string;
  state: string;
  areaKm2: number;
  elevationMinM: number;
  elevationMaxM: number;
  terrainResolutionM: number;
  estimatedPackageMb: number;
  description: string;
  /** Normalized 0-1 heightmap seed values used to procedurally generate the terrain mesh */
  terrainSeed: number;
  ridgeCount: number;
  hasValley: boolean;
  thumbnailGradient: [string, string];
  status: RegionStatus;
}

export type LayerId =
  | "elevation"
  | "slope"
  | "shelters"
  | "hospitals"
  | "roads"
  | "missions"
  | "earlyWarning";

export interface TerrainLayer {
  id: LayerId;
  label: string;
  sizeMb: number;
}

export interface TerrainTile {
  id: string;
  regionId: RegionId;
  x: number;
  y: number;
  resolutionM: number;
}

/** A queried point on the terrain surface, as returned by picking the mesh */
export interface TerrainPoint {
  x: number;
  z: number;
  elevationM: number;
  slopeDeg: number;
  aspect: CompassDirection;
  terrainClass: TerrainClass;
}

export type TerrainClass = "Ridgeline" | "Valley Floor" | "Slope" | "Plateau" | "Streambed";

/**
 * Coarse tier for the demo "regional risk" heuristic — derived purely from the
 * procedural terrain already used elsewhere in the app (steepness + slope
 * distribution). Not a validated hazard classification.
 */
export type RiskTier = "Low" | "Moderate" | "Elevated";

/**
 * Output of the demo risk heuristic (see three/terrainGeometry.ts#assessRegionRisk).
 * Every field is computed from the same procedural height field driving the 3D
 * terrain — there is no external data source behind this.
 */
export interface RegionRiskSummary {
  /** 0-100 demo heuristic score. Not a probability or a validated risk index. */
  score: number;
  tier: RiskTier;
  /** % of sampled area steeper than the app's 30° "steep" threshold. */
  steepFractionPct: number;
  avgSlopeDeg: number;
  maxSlopeDeg: number;
  dominantClass: TerrainClass;
}

/**
 * Fixed, deterministic demo environmental preset — NOT live weather or
 * sensor data. See src/data/environmentalScenarios.ts for the actual values
 * and src/three/terrainGeometry.ts#fuseEarlyWarning for how it's combined
 * with the terrain-only heuristic.
 */
export type EnvironmentalScenarioId = "dry" | "normal" | "heavy-rain" | "prolonged-monsoon";

export interface EnvironmentalScenario {
  id: EnvironmentalScenarioId;
  label: string;
  description: string;
  /** Fixed demo rainfall for the last 5 days, oldest → newest, in mm/day. Not live data. */
  rainfallTimelineMm: number[];
  /** Fixed demo soil saturation, 0-100. Not a live sensor reading. */
  soilMoisturePct: number;
}

/** Severity band for the fused (terrain + simulated environment) demo assessment. */
export type EarlyWarningSeverity = "Low" | "Elevated" | "High";

/**
 * Output of fuseEarlyWarning() — a demo heuristic combining the terrain-only
 * RegionRiskSummary with a selected EnvironmentalScenario. Plain arithmetic,
 * not a machine-learning model, not a validated forecast.
 */
export interface EarlyWarningAssessment {
  fusedScore: number;
  severity: EarlyWarningSeverity;
  /** Echoed from RegionRiskSummary.score so the UI can show its contribution. */
  terrainScore: number;
  /** 0-100 blended rainfall + soil-moisture pressure. */
  environmentalFactorPct: number;
  /** Multiplier actually applied to terrainScore, e.g. 1.27. */
  amplification: number;
  guidance: string;
}

/**
 * A simulated warning event fired when a site's fused assessment crosses
 * into High severity (see hooks/useHighSeverityAlert.ts). Entirely local to
 * this session — no SMS, push notification, government alert, or real
 * dispatch of any kind is triggered. Always render this as clearly labeled
 * demonstration content, never as if a real notification was sent.
 */
export interface SimulatedAlert {
  regionId: RegionId;
  regionName: string;
  severity: "High";
  guidance: string;
  /** Display-only string, e.g. "Just now" — not a real delivery timestamp. */
  triggeredAt: string;
}

export type CompassDirection = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";

export type POIType = "hospital" | "shelter";

export interface POI {
  id: string;
  regionId: RegionId;
  type: POIType;
  name: string;
  subtitle: string;
  distanceM: number;
  capacity?: number;
  offlineAvailable: boolean;
  /** normalized position on the terrain plane, -1..1 */
  position: [number, number];
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  status: "locked" | "available" | "active" | "complete";
  /** if true, this mission can be completed interactively in the terrain explorer */
  interactive: boolean;
  interactionKind?: "find-high-ground" | "find-shelter" | "find-steep-slope" | "find-hospital" | "explore-pois";
}

export interface UserProgress {
  level: number;
  xp: number;
  xpToNextLevel: number;
  preparednessScore: number;
  missionsCompleted: number;
  missionsTotal: number;
  poisVisited: string[];
}

export interface OfflinePackage {
  regionId: RegionId;
  isReady: boolean;
  totalMb: number;
  lastSyncedAt: string | null;
  layers: { id: LayerId; label: string; sizeMb: number; cached: boolean }[];
}

export interface TerrainQuery {
  point: TerrainPoint | null;
  isLoading: boolean;
}

export type ConnectivityState = "connected" | "offline";

export type VisualizationMode = "normal" | "elevation" | "slope" | "aspect";

export type GraphicsQuality = "high" | "balanced" | "performance";

/**
 * UI EXPERIENCE MODE — purely presentational. "simple" is the existing
 * lightweight interface; "ultra" is the richer, more immersive visual
 * treatment (dark forest chrome, topographic textures, premium terrain
 * overlays). Neither mode changes scoring, elevation data, evacuation
 * logic, or any other underlying calculation — see AppContext/uiMode.
 */
export type UiMode = "simple" | "ultra";

export interface AppState {
  selectedRegionId: RegionId;
  connectivity: ConnectivityState;
  progress: UserProgress;
  offlinePackage: OfflinePackage;
  missions: Mission[];
  graphicsQuality: GraphicsQuality;
  notificationsEnabled: boolean;
  debugTerrain: boolean;
  showPerformance: boolean;
  uiMode: UiMode;
}
