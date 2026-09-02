// Web <-> Unity WebGL preparedness-simulator integration contract.
//
// This is intentionally the *entire* contract: the web app hands the Unity
// build a region/scenario to run via URL query parameters, and the Unity
// build hands a single result object back via window.postMessage once the
// simulation finishes. There is no backend and no persistence layer here —
// see src/hooks/useUnitySimulator.ts for how these are used.

import type { RegionId } from "./index";

/** Query-string parameters the web app launches the Unity WebGL build with. */
export interface SimulatorLaunchParams {
  regionId: RegionId;
  /** Reserved for future multi-scenario regions; the vertical slice only implements one scenario today. */
  scenarioId: string;
  simulatorMode: "standard";
}

/**
 * The preparedness result posted back by the Unity build when the player
 * finishes the simulated emergency. Mirrors, field for field, what
 * EmergencyScenarioController.ShowResult() already computes for Unity's own
 * result panel — the web app does not recompute or reinterpret the score.
 */
export interface SimulatorResult {
  type: "disasterready-simulator-result";
  regionId: RegionId | string;
  scenarioId: string;
  simulationCompleted: boolean;
  missionsCompleted: number;
  missionsTotal: number;
  xpEarned: number;
  xpMax: number;
  /** 0-100. A transparent, deterministic demo score — not a statistical or ML-derived risk metric. */
  preparednessScore: number;
}

export function isSimulatorResultMessage(data: unknown): data is SimulatorResult {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { type?: unknown }).type === "disasterready-simulator-result"
  );
}
