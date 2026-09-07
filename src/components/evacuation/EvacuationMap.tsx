// ============================================================================
// Renders the live Leaflet + OpenStreetMap map (user marker, candidate
// markers, route to the recommended destination). No API key, no billing
// account — OSM tiles and Leaflet are free and always available; the only
// failure mode is the CDN script not loading (offline/blocked), in which
// case a clearly-labeled data-only fallback panel is shown instead. The
// rest of the Flood Evacuation screen (recommendation card, "why this
// location", route stats) works identically either way, since none of that
// depends on the map actually rendering.
// ============================================================================

import { useEffect, useRef, useState } from "react";
import { MapPinOff } from "lucide-react";
import type { ScoredCandidate, UserLocation } from "../../types/evacuation";
import { loadLeaflet, type LeafletNamespace } from "../../lib/leafletLoader";

const CANDIDATE_MARKER_COLOR: Record<string, string> = {
  hospital: "#c14a3d",
  shelter: "#2e5339",
  school: "#4f8fc4",
  public_facility: "#d99a3d",
  other_elevated: "#756e5f",
};

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
  const mapRef = useRef<LeafletNamespace | null>(null);
  const markersRef = useRef<LeafletNamespace[]>([]);
  const routeLineRef = useRef<LeafletNamespace | null>(null);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "ready" | "unavailable">("loading");

  // Load Leaflet + create the map instance once.
  useEffect(() => {
    let cancelled = false;
    setLoadState("loading");
    loadLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        mapRef.current = L.map(containerRef.current, {
          center: [23.7271, 92.7176],
          zoom: 13,
          zoomControl: true,
          attributionControl: true,
        });
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(mapRef.current);
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
      const L = await loadLeaflet();
      const map = mapRef.current;

      markersRef.current.forEach((m) => map.removeLayer(m));
      markersRef.current = [];
      if (routeLineRef.current) {
        map.removeLayer(routeLineRef.current);
        routeLineRef.current = null;
      }

      if (!user) return;

      const bounds: [number, number][] = [];

      const userMarker = L.circleMarker([user.lat, user.lng], {
        radius: 9,
        color: "#fdfbf5",
        weight: 2,
        fillColor: "#4f8fc4",
        fillOpacity: 1,
      })
        .addTo(map)
        .bindTooltip(user.label);
      markersRef.current.push(userMarker);
      bounds.push([user.lat, user.lng]);

      candidates.forEach((c) => {
        const isRecommended = recommended?.id === c.id;
        const marker = L.circleMarker([c.location.lat, c.location.lng], {
          radius: isRecommended ? 9 : 7,
          color: "#fdfbf5",
          weight: 1.5,
          fillColor: CANDIDATE_MARKER_COLOR[c.type] ?? "#756e5f",
          fillOpacity: isRecommended ? 1 : 0.75,
        })
          .addTo(map)
          .bindTooltip(`${c.name} — score ${c.score}/100`);
        markersRef.current.push(marker);
        bounds.push([c.location.lat, c.location.lng]);
      });

      if (recommended) {
        const path: [number, number][] =
          recommended.route?.path && recommended.route.path.length > 0
            ? recommended.route.path.map((p) => [p.lat, p.lng])
            : [
                [user.lat, user.lng],
                [recommended.location.lat, recommended.location.lng],
              ];

        routeLineRef.current = L.polyline(path, {
          color: "#2e5339",
          weight: 4,
          opacity: recommended.route?.isLiveRoute ? 0.9 : 0.55,
          dashArray: recommended.route?.isLiveRoute ? undefined : "2 10",
        }).addTo(map);
      }

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [48, 48], maxZoom: 16 });
      }
    })();
  }, [loadState, user, candidates, recommended]);

  if (loadState === "unavailable") {
    return (
      <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-stone-300 bg-stone-100/60 p-8 text-center">
        <MapPinOff size={28} className="text-stone-400" />
        <div>
          <p className="font-display text-sm font-bold text-stone-700">Live map unavailable</p>
          <p className="mt-1 max-w-sm text-[12px] leading-relaxed text-stone-500">
            The OpenStreetMap map library couldn&rsquo;t be loaded (offline, or the CDN is blocked). Location and
            destination data below is unaffected.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[280px] w-full overflow-hidden rounded-2xl border border-stone-200">
      <div ref={containerRef} className="h-full w-full" />
      {loadState === "loading" && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-cream-100/70 text-[12px] font-semibold text-stone-500">
          Loading map…
        </div>
      )}
    </div>
  );
}
