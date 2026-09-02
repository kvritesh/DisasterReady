import { useCallback, useEffect, useRef, useState } from "react";
import type { RegionId } from "../types";
import { isSimulatorResultMessage, type SimulatorResult } from "../types/simulator";

// Same-origin static build produced by Unity's WebGL export, committed under
// public/ so Vite serves it as-is (see public/unity-sim/README.txt for how
// it was produced / how to rebuild it).
const SIMULATOR_URL = "/unity-sim/index.html";

// "blocked" covers window.open() returning null/undefined, which happens
// when the browser's popup blocker intercepts the launch (confirmed via
// live testing: some embedded/automated browser contexts always block it,
// and a normal browser can too if popups aren't allowed for this site).
// Without this, the UI silently claimed "launched" forever with no way to
// recover if the window never actually opened.
export type SimulatorStatus = "idle" | "launched" | "blocked" | "completed";

/**
 * Launches the Unity preparedness simulator in a new same-origin tab/window
 * and listens for the single postMessage result it posts back on
 * completion. Deliberately local, component-level state (not wired into the
 * global AppContext reducer) — this is the smallest integration that gets a
 * real result back into the web UI, per the "no backend, minimal footprint"
 * brief for this first milestone.
 */
export function useUnitySimulator() {
  const [status, setStatus] = useState<SimulatorStatus>("idle");
  const [result, setResult] = useState<SimulatorResult | null>(null);
  const windowRef = useRef<Window | null>(null);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (!isSimulatorResultMessage(event.data)) return;
      setResult(event.data);
      setStatus("completed");
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const launch = useCallback((regionId: RegionId, scenarioId = "preparedness-default") => {
    const params = new URLSearchParams({ regionId, scenarioId, simulatorMode: "standard" });
    const url = `${SIMULATOR_URL}?${params.toString()}`;
    setResult(null);
    const opened = window.open(url, "disasterready-unity-sim", "width=1280,height=800");
    windowRef.current = opened;
    setStatus(opened ? "launched" : "blocked");
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setResult(null);
  }, []);

  return { status, result, launch, reset };
}
