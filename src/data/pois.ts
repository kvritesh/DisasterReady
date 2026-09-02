import type { POI } from "../types";

export const POIS: POI[] = [
  {
    id: "poi-hospital-1",
    regionId: "aizawl-mizoram",
    type: "hospital",
    name: "District Hospital",
    subtitle: "Emergency medical services",
    distanceM: 420,
    offlineAvailable: true,
    position: [0.32, -0.18],
  },
  {
    id: "poi-shelter-1",
    regionId: "aizawl-mizoram",
    type: "shelter",
    name: "Community Emergency Shelter",
    subtitle: "Public assembly point",
    capacity: 180,
    distanceM: 680,
    offlineAvailable: true,
    position: [-0.4, 0.28],
  },
  {
    id: "poi-shelter-2",
    regionId: "aizawl-mizoram",
    type: "shelter",
    name: "Ridge School Shelter",
    subtitle: "Secondary assembly point",
    capacity: 90,
    distanceM: 1120,
    offlineAvailable: true,
    position: [0.55, 0.42],
  },
];

export function poisForRegion(regionId: string) {
  return POIS.filter((p) => p.regionId === regionId);
}
