import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { AppProvider, useApp } from "./state/AppContext";
import { Sidebar } from "./components/layout/Sidebar";
import { Toasts } from "./components/ui/Toasts";
import { Celebration } from "./components/ui/Celebration";
import { WarningAlert } from "./components/ui/WarningAlert";
import { Overview } from "./screens/Overview";
import { RegionPrep } from "./screens/RegionPrep";
import { Explore } from "./screens/Explore";
import { Missions } from "./screens/Missions";
import { FloodEvacuation } from "./screens/FloodEvacuation";
import { OfflineData } from "./screens/OfflineData";
import { Safety } from "./screens/Safety";
import { Monitoring } from "./screens/Monitoring";
import { Settings } from "./screens/Settings";

export type ScreenId =
  | "overview"
  | "prepare"
  | "explore"
  | "missions"
  | "flood-evacuation"
  | "offline"
  | "safety"
  | "monitoring"
  | "settings";

function Shell() {
  const [screen, setScreen] = useState<ScreenId>("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { connectivity } = useApp();

  const navigate = (next: ScreenId) => {
    setScreen(next);
    setMobileNavOpen(false);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-cream-100">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar screen={screen} onNavigate={navigate} />
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileNavOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-stone-950/40 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileNavOpen(false)}
            />
            <motion.div
              className="fixed inset-y-0 left-0 z-50 md:hidden"
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
            >
              <Sidebar screen={screen} onNavigate={navigate} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <div className="flex items-center justify-between border-b border-stone-200 bg-cream-50 px-4 py-3 md:hidden">
          <span className="font-display text-sm font-extrabold text-stone-900">DisasterReady</span>
          <button
            onClick={() => setMobileNavOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 text-stone-600"
          >
            {mobileNavOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {connectivity === "offline" && (
          <div className="flex items-center justify-center gap-2 bg-danger-600 px-4 py-1.5 text-center text-[12px] font-bold uppercase tracking-wide text-cream-50">
            Offline mode active — showing data cached on this device
          </div>
        )}

        <main className="min-w-0 flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={screen}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="h-full"
            >
              {screen === "overview" && <Overview onNavigate={navigate} />}
              {screen === "prepare" && <RegionPrep onNavigate={navigate} />}
              {screen === "explore" && <Explore onNavigate={navigate} />}
              {screen === "missions" && <Missions onNavigate={navigate} />}
              {screen === "flood-evacuation" && <FloodEvacuation />}
              {screen === "offline" && <OfflineData onNavigate={navigate} />}
              {screen === "safety" && <Safety />}
              {screen === "monitoring" && <Monitoring onNavigate={navigate} />}
              {screen === "settings" && <Settings onNavigate={navigate} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <Toasts />
      <Celebration />
      <WarningAlert />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
