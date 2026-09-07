// ============================================================================
// Renders the live Google Map (user marker, candidate markers, route to the
// recommended destination) when VITE_GOOGLE_MAPS_API_KEY is configured and
// the script loads successfully. Otherwise renders a clearly-labeled
// data-only fallback panel — the rest of the Flood Evacuation screen (the
// recommendation card, "why this location", route stats) works identically
// either way, since none of that depends on the map actually rendering.
// ============================================================================

import { useEffect, useRef, useState } from "react";
import { MapPinOff } from "lucide-react";
import type { ScoredCandidate, UserLocation } from "../../types/evacuation";
import { isGoogleMapsConfigured, loadGoogleMaps, type GoogleNamespace } from "../../lib/googleMapsLoader";

const CANDIDATE_MARKER_COLOR: Record<string, string> = {
  hospital: "#c14a3d",
  shelter: "#2e5339",
  school: "#4f8fc4",
  public_facility: "#d99a3d",
  other_elevated: "#756e5f",
};

function candidateGlyph(color: string) {
  return {
    path: "M12 2C7.6 2 4 5.6 4 10c0 6 8 12 8 12s8-6 8-12c0-4.4-3.6-8-8-8z",
    fillColor: color,
    fillOpacity: 1,
    strokeColor: "#fdfbf5",
    strokeWeight: 1.5,
    scale: 1.4,
    anchor: undefined,
  };
}

export function EvacuationMap({
  user,
  candidates,
  recommended,
}: {
  user: UserLocation | null;
  candidates: ScoredCandidate[];
  recommended: ScoredCandidate | null;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<GoogleNamespace | null>(null);
  const markersRef = useRef<GoogleNamespace[]>([]);
  const routeLineRef = useRef<GoogleNamespace | null>(null);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "ready" | "unavailable">(
    isGoogleMapsConfigured() ? "idle" : "unavailable"
  );

  // Load the API + create the map instance once.
  useEffect(() => {
    if (!isGoogleMapsConfigured()) {
      setLoadState("unavailable");
      return;
    }
    let cancelled = false;
    setLoadState("loading");
    loadGoogleMaps()
      .then((google) => {
        if (cancelled || !containerRef.current) return;
        mapRef.current = new google.maps.Map(containerRef.current, {
          center: { lat: 23.7271, lng: 92.7176 },
          zoom: 13,
          mapId: undefined,
          disableDefaultUI: true,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        });
        setLoadState("ready");
      })
      .catch(() => {
        if (!cancelled) setLoadState("unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep markers + route in sync with the latest analysis result.
  useEffect(() => {
    if (loadState !== "ready" || !mapRef.current) return;
    void (async () => {
      const google = await loadGoogleMaps();
      const map = mapRef.current;

      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      routeLineRef.current?.setMap(null);
      routeLineRef.current = null;

      if (!user) return;

      const bounds = new google.maps.LatLngBounds();

      const userMarker = new google.maps.Marker({
        map,
        position: { lat: user.lat, lng: user.lng },
        title: user.label,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#4f8fc4",
          fillOpacity: 1,
          strokeColor: "#fdfbf5",
          strokeWeight: 2,
        },
        zIndex: 50,
      });
      markersRef.current.push(userMarker);
      bounds.extend(userMarker.getPosition());

      candidates.forEach((c) => {
        const isRecommended = recommended?.id === c.id;
        const marker = new google.maps.Marker({
          map,
          position: c.location,
          title: `${c.name} — score ${c.score}/100`,
          icon: candidateGlyph(CANDIDATE_MARKER_COLOR[c.type] ?? "#756e5f"),
          zIndex: isRecommended ? 40 : 10,
          opacity: isRecommended ? 1 : 0.75,
        });
        markersRef.current.push(marker);
        bounds.extend(marker.getPosition());
      });

      if (recommended) {
        const path =
          recommended.route?.encodedPolyline && google.maps.geometry?.encoding
            ? google.maps.geometry.encoding.decodePath(recommended.route.encodedPolyline)
            : [{ lat: user.lat, lng: user.lng }, recommended.location];

        routeLineRef.current = new google.maps.Polyline({
          map,
          path,
          strokeColor: "#2e5339",
          strokeOpacity: recommended.route?.isLiveRoute ? 0.9 : 0.55,
          strokeWeight: 4,
          icons: recommended.route?.isLiveRoute
            ? undefined
            : [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 }, offset: "0", repeat: "14px" }],
        });
      }

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, 64);
      }
    })();
  }, [loadState, user, candidates, recommended]);

  if (loadState === "unavailable") {
    return (
      <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-stone-300 bg-stone-100/60 p-8 text-center">
        <MapPinOff size={28} className="text-stone-400" />
        <div>
          <p className="font-display text-sm font-bold text-stone-700">Live map unavailable in this environment</p>
          <p className="mt-1 max-w-sm text-[12px] leading-relaxed text-stone-500">
            {isGoogleMapsConfigured()
              ? "Google Maps could not be loaded (network, API key, or billing issue). Location and destination data below is unaffected."
              : "Set VITE_GOOGLE_MAPS_API_KEY to show the live Google Map here. Location and destination data below still works from demo data."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[280px] w-full overflow-hidden rounded-2xl border border-stone-200">
      <div ref={containerRef} className="h-full w-full" />
      {loadState === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-cream-100/70 text-[12px] font-semibold text-stone-500">
          Loading map…
        </div>
      )}
    </div>
  );
}
