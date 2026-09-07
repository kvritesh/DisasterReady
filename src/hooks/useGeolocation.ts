// ============================================================================
// Thin wrapper around the browser Geolocation API for the Flood Evacuation
// feature. Handles permission denial, unavailability, timeout, and browsers
// without geolocation support — none of those should ever hard-crash the
// screen; see src/screens/FloodEvacuation.tsx for how the fallback to a
// demo location is offered.
// ============================================================================

import { useCallback, useState } from "react";
import type { GeolocationErrorKind } from "../types/evacuation";

export interface GpsLocation {
  lat: number;
  lng: number;
  accuracyM: number;
}

export type GeolocationState =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "success"; location: GpsLocation }
  | { status: "error"; kind: GeolocationErrorKind; message: string };

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({ status: "idle" });

  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setState({ status: "error", kind: "unsupported", message: "This browser does not support location access." });
      return;
    }

    setState({ status: "locating" });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          status: "success",
          location: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracyM: position.coords.accuracy,
          },
        });
      },
      (error) => {
        let kind: GeolocationErrorKind = "unavailable";
        let message = "Your location could not be determined.";
        if (error.code === error.PERMISSION_DENIED) {
          kind = "denied";
          message = "Location permission was denied.";
        } else if (error.code === error.TIMEOUT) {
          kind = "timeout";
          message = "Timed out while getting your location.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          kind = "unavailable";
          message = "Your location is currently unavailable.";
        }
        setState({ status: "error", kind, message });
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
    );
  }, []);

  const reset = useCallback(() => setState({ status: "idle" }), []);

  return { state, requestLocation, reset };
}
