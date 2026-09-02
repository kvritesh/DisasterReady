import { useEffect, useRef } from "react";
import { useApp } from "../state/AppContext";
import type { EarlyWarningAssessment, RegionId } from "../types";

/**
 * Fires a SimulatedAlert exactly when a site's fused assessment crosses INTO
 * High severity — not on every render while it stays High, and not when it
 * drops back out. Compares against the previously seen severity for this
 * hook instance, so re-renders with an unchanged assessment never re-fire.
 *
 * Used by both the Early Warning screen (single site) and the Monitoring
 * board (one instance per "full" site) — see PHASE B / PHASE C.
 */
export function useHighSeverityAlert(
  regionId: RegionId,
  regionName: string,
  assessment: EarlyWarningAssessment | null
) {
  const { triggerAlert } = useApp();
  const lastSeverityRef = useRef<EarlyWarningAssessment["severity"] | null>(null);

  useEffect(() => {
    if (!assessment) return;
    const previous = lastSeverityRef.current;
    if (assessment.severity === "High" && previous !== "High") {
      triggerAlert({
        regionId,
        regionName,
        severity: "High",
        guidance: assessment.guidance,
        triggeredAt: "Just now",
      });
    }
    lastSeverityRef.current = assessment.severity;
  }, [assessment, regionId, regionName, triggerAlert]);
}
