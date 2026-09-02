import { createContext, useCallback, useContext, useMemo, useReducer, useRef } from "react";
import type { ReactNode } from "react";
import type {
  ConnectivityState,
  GraphicsQuality,
  Mission,
  OfflinePackage,
  RegionId,
  SimulatedAlert,
  TerrainPoint,
  UserProgress,
} from "../types";
import { DEFAULT_REGION_ID, LAYER_DEFINITIONS, getRegion } from "../data/regions";
import { INITIAL_MISSIONS } from "../data/missions";

// ----------------------------------------------------------------------------
// Leveling
// ----------------------------------------------------------------------------
export function xpRequirementForLevel(level: number): number {
  return 500 + level * 250;
}

export interface ToastMessage {
  id: number;
  tone: "info" | "success" | "warning" | "danger";
  title: string;
  body?: string;
}

interface State {
  selectedRegionId: RegionId;
  connectivity: ConnectivityState;
  lastSyncedAt: string | null;
  progress: UserProgress;
  offlinePackage: OfflinePackage;
  missions: Mission[];
  graphicsQuality: GraphicsQuality;
  notificationsEnabled: boolean;
  debugTerrain: boolean;
  showPerformance: boolean;
  toasts: ToastMessage[];
  activeMissionId: string | null;
  missionTargetHint: string | null;
  celebration: { title: string; subtitle: string; xp: number } | null;
  lastPoint: TerrainPoint | null;
  /** Simulated High-severity warnings, keyed by region. See types#SimulatedAlert. */
  alerts: Partial<Record<RegionId, SimulatedAlert>>;
}

const initialOfflinePackage = (): OfflinePackage => ({
  regionId: DEFAULT_REGION_ID,
  isReady: true,
  totalMb: 18.4,
  lastSyncedAt: "Today, 18:42",
  layers: LAYER_DEFINITIONS.map((l) => ({ ...l, cached: true })),
});

const initialState: State = {
  selectedRegionId: DEFAULT_REGION_ID,
  connectivity: "connected",
  lastSyncedAt: "Today, 18:42",
  progress: {
    level: 4,
    xp: 1250,
    xpToNextLevel: xpRequirementForLevel(4),
    preparednessScore: 87,
    missionsCompleted: INITIAL_MISSIONS.filter((m) => m.status === "complete").length,
    missionsTotal: INITIAL_MISSIONS.length,
    poisVisited: [],
  },
  offlinePackage: initialOfflinePackage(),
  missions: INITIAL_MISSIONS,
  graphicsQuality: "high",
  notificationsEnabled: true,
  debugTerrain: false,
  showPerformance: false,
  toasts: [],
  activeMissionId: null,
  missionTargetHint: null,
  celebration: null,
  lastPoint: null,
  alerts: {},
};

type Action =
  | { type: "SET_REGION"; regionId: RegionId }
  | { type: "SET_CONNECTIVITY"; connectivity: ConnectivityState }
  | { type: "PREPARE_COMPLETE" }
  | { type: "DELETE_OFFLINE_PACKAGE" }
  | { type: "ACTIVATE_MISSION"; missionId: string }
  | { type: "CANCEL_MISSION" }
  | { type: "COMPLETE_MISSION"; missionId: string }
  | { type: "VISIT_POI"; poiId: string }
  | { type: "SET_GRAPHICS_QUALITY"; quality: GraphicsQuality }
  | { type: "TOGGLE_NOTIFICATIONS" }
  | { type: "TOGGLE_DEBUG_TERRAIN" }
  | { type: "TOGGLE_PERFORMANCE" }
  | { type: "ADD_TOAST"; toast: ToastMessage }
  | { type: "DISMISS_TOAST"; id: number }
  | { type: "DISMISS_CELEBRATION" }
  | { type: "SET_TERRAIN_POINT"; point: TerrainPoint }
  | { type: "TRIGGER_ALERT"; alert: SimulatedAlert }
  | { type: "DISMISS_ALERT"; regionId: RegionId }
  | { type: "RESET_DEMO" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_REGION":
      return { ...state, selectedRegionId: action.regionId };

    case "SET_CONNECTIVITY":
      return { ...state, connectivity: action.connectivity };

    case "PREPARE_COMPLETE": {
      const region = getRegion(state.selectedRegionId);
      return {
        ...state,
        offlinePackage: {
          regionId: state.selectedRegionId,
          isReady: true,
          totalMb: region.estimatedPackageMb,
          lastSyncedAt: "Just now",
          layers: LAYER_DEFINITIONS.map((l) => ({ ...l, cached: true })),
        },
      };
    }

    case "DELETE_OFFLINE_PACKAGE":
      return {
        ...state,
        offlinePackage: {
          ...state.offlinePackage,
          isReady: false,
          lastSyncedAt: null,
          layers: state.offlinePackage.layers.map((l) => ({ ...l, cached: false })),
        },
      };

    case "ACTIVATE_MISSION": {
      const mission = state.missions.find((m) => m.id === action.missionId);
      const hints: Record<string, string> = {
        "find-high-ground": "Click the highest ridge on the terrain.",
        "find-shelter": "Click the shelter marker (🛜) on the terrain.",
        "find-steep-slope": "Click a slope steeper than 30° — try the switchback face.",
        "find-hospital": "Click the hospital marker (🏥) on the terrain.",
        "explore-pois": "Click through points of interest on the terrain.",
      };
      return {
        ...state,
        activeMissionId: action.missionId,
        missionTargetHint: mission?.interactionKind ? hints[mission.interactionKind] ?? null : null,
        missions: state.missions.map((m) =>
          m.id === action.missionId && m.status === "available" ? { ...m, status: "active" } : m
        ),
      };
    }

    case "CANCEL_MISSION":
      return {
        ...state,
        activeMissionId: null,
        missionTargetHint: null,
        missions: state.missions.map((m) => (m.status === "active" ? { ...m, status: "available" } : m)),
      };

    case "COMPLETE_MISSION": {
      const mission = state.missions.find((m) => m.id === action.missionId);
      if (!mission || mission.status === "complete") return state;

      const missions = state.missions.map((m) =>
        m.id === action.missionId ? { ...m, status: "complete" as const } : m
      );

      let { level, xp, xpToNextLevel } = state.progress;
      xp += mission.xpReward;
      while (xp >= xpToNextLevel) {
        xp -= xpToNextLevel;
        level += 1;
        xpToNextLevel = xpRequirementForLevel(level);
      }

      const missionsCompleted = missions.filter((m) => m.status === "complete").length;
      const preparednessScore = Math.min(100, state.progress.preparednessScore + Math.round(mission.xpReward / 40));

      return {
        ...state,
        missions,
        activeMissionId: null,
        missionTargetHint: null,
        progress: {
          ...state.progress,
          level,
          xp,
          xpToNextLevel,
          missionsCompleted,
          preparednessScore,
        },
        celebration: {
          title: "Mission complete",
          subtitle: "You're more prepared than you were yesterday.",
          xp: mission.xpReward,
        },
      };
    }

    case "VISIT_POI": {
      if (state.progress.poisVisited.includes(action.poiId)) return state;
      return {
        ...state,
        progress: {
          ...state.progress,
          poisVisited: [...state.progress.poisVisited, action.poiId],
        },
      };
    }

    case "SET_GRAPHICS_QUALITY":
      return { ...state, graphicsQuality: action.quality };

    case "TOGGLE_NOTIFICATIONS":
      return { ...state, notificationsEnabled: !state.notificationsEnabled };

    case "TOGGLE_DEBUG_TERRAIN":
      return { ...state, debugTerrain: !state.debugTerrain };

    case "TOGGLE_PERFORMANCE":
      return { ...state, showPerformance: !state.showPerformance };

    case "ADD_TOAST":
      return { ...state, toasts: [...state.toasts, action.toast] };

    case "DISMISS_TOAST":
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.id) };

    case "DISMISS_CELEBRATION":
      return { ...state, celebration: null };

    case "SET_TERRAIN_POINT":
      return { ...state, lastPoint: action.point };

    case "TRIGGER_ALERT":
      return { ...state, alerts: { ...state.alerts, [action.alert.regionId]: action.alert } };

    case "DISMISS_ALERT": {
      const next = { ...state.alerts };
      delete next[action.regionId];
      return { ...state, alerts: next };
    }

    case "RESET_DEMO":
      return {
        ...initialState,
        toasts: [],
      };

    default:
      return state;
  }
}

interface AppContextValue extends State {
  region: ReturnType<typeof getRegion>;
  setRegion: (id: RegionId) => void;
  toggleConnectivity: () => void;
  setConnectivity: (state: ConnectivityState) => void;
  prepareOfflinePackage: () => void;
  deleteOfflinePackage: () => void;
  activateMission: (id: string) => void;
  cancelMission: () => void;
  completeMission: (id: string) => void;
  visitPoi: (id: string) => void;
  setGraphicsQuality: (q: GraphicsQuality) => void;
  toggleNotifications: () => void;
  toggleDebugTerrain: () => void;
  togglePerformance: () => void;
  pushToast: (toast: Omit<ToastMessage, "id">) => void;
  dismissToast: (id: number) => void;
  dismissCelebration: () => void;
  setTerrainPoint: (point: TerrainPoint) => void;
  triggerAlert: (alert: SimulatedAlert) => void;
  dismissAlert: (regionId: RegionId) => void;
  resetDemo: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const toastId = useRef(0);

  const pushToast = useCallback((toast: Omit<ToastMessage, "id">) => {
    const id = ++toastId.current;
    dispatch({ type: "ADD_TOAST", toast: { ...toast, id } });
    window.setTimeout(() => dispatch({ type: "DISMISS_TOAST", id }), 4200);
  }, []);

  const setConnectivity = useCallback(
    (connectivity: ConnectivityState) => {
      dispatch({ type: "SET_CONNECTIVITY", connectivity });
      if (connectivity === "offline") {
        pushToast({
          tone: "warning",
          title: "Network unavailable",
          body: "DisasterReady is using cached data.",
        });
      } else {
        pushToast({ tone: "success", title: "Back online", body: "Reconnected to the network." });
      }
    },
    [pushToast]
  );

  const toggleConnectivity = useCallback(() => {
    setConnectivity(state.connectivity === "connected" ? "offline" : "connected");
  }, [setConnectivity, state.connectivity]);

  const value = useMemo<AppContextValue>(
    () => ({
      ...state,
      region: getRegion(state.selectedRegionId),
      setRegion: (id) => dispatch({ type: "SET_REGION", regionId: id }),
      toggleConnectivity,
      setConnectivity,
      prepareOfflinePackage: () => dispatch({ type: "PREPARE_COMPLETE" }),
      deleteOfflinePackage: () => dispatch({ type: "DELETE_OFFLINE_PACKAGE" }),
      activateMission: (id) => dispatch({ type: "ACTIVATE_MISSION", missionId: id }),
      cancelMission: () => dispatch({ type: "CANCEL_MISSION" }),
      completeMission: (id) => dispatch({ type: "COMPLETE_MISSION", missionId: id }),
      visitPoi: (id) => dispatch({ type: "VISIT_POI", poiId: id }),
      setGraphicsQuality: (q) => dispatch({ type: "SET_GRAPHICS_QUALITY", quality: q }),
      toggleNotifications: () => dispatch({ type: "TOGGLE_NOTIFICATIONS" }),
      toggleDebugTerrain: () => dispatch({ type: "TOGGLE_DEBUG_TERRAIN" }),
      togglePerformance: () => dispatch({ type: "TOGGLE_PERFORMANCE" }),
      pushToast,
      dismissToast: (id) => dispatch({ type: "DISMISS_TOAST", id }),
      dismissCelebration: () => dispatch({ type: "DISMISS_CELEBRATION" }),
      setTerrainPoint: (point) => dispatch({ type: "SET_TERRAIN_POINT", point }),
      triggerAlert: (alert) => dispatch({ type: "TRIGGER_ALERT", alert }),
      dismissAlert: (regionId) => dispatch({ type: "DISMISS_ALERT", regionId }),
      resetDemo: () => dispatch({ type: "RESET_DEMO" }),
    }),
    [state, toggleConnectivity, setConnectivity, pushToast]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
