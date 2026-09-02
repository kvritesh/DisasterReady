import { AnimatePresence, motion } from "framer-motion";
import { Siren, X } from "lucide-react";
import { useApp } from "../../state/AppContext";
import { Button } from "./primitives";

/**
 * Full-screen simulated warning event, shown when any monitored site's
 * fused assessment crosses into High severity (see
 * hooks/useHighSeverityAlert.ts). Entirely local/demonstration — no SMS,
 * push notification, government alert, or real dispatch is ever sent, and
 * the copy below says so explicitly rather than implying otherwise.
 */
export function WarningAlert() {
  const { alerts, dismissAlert } = useApp();
  const active = Object.values(alerts)[0] ?? null;

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="fixed inset-0 z-[95] flex items-start justify-center bg-stone-950/35 px-4 pt-20 backdrop-blur-[2px] sm:pt-28"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => dismissAlert(active.regionId)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -8 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-label="Simulated high-severity warning"
            className="w-full max-w-lg overflow-hidden rounded-[28px] border border-danger-500/40 bg-cream-50 shadow-[var(--shadow-lift)]"
          >
            <div className="flex items-center gap-3 bg-danger-600 px-6 py-4 text-cream-50">
              <motion.div
                initial={{ rotate: -8, scale: 0.7 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 12, delay: 0.08 }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cream-50/15"
              >
                <Siren size={22} />
              </motion.div>
              <div className="min-w-0 flex-1">
                <p className="text-[10.5px] font-extrabold uppercase tracking-widest text-cream-100/90">
                  Simulated alert — demonstration only
                </p>
                <p className="font-display text-lg font-extrabold leading-tight">
                  High early-warning severity — {active.regionName}
                </p>
              </div>
              <button
                onClick={() => dismissAlert(active.regionId)}
                className="shrink-0 rounded-lg p-1.5 text-cream-100/80 transition-colors hover:bg-cream-50/15 hover:text-cream-50"
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-4 px-6 py-5">
              <div>
                <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-stone-400">
                  Recommended preparedness action
                </p>
                <p className="text-sm leading-relaxed text-stone-700">{active.guidance}</p>
              </div>

              <div className="rounded-2xl border border-stone-100 bg-stone-50/70 px-4 py-3">
                <p className="text-[11px] leading-relaxed text-stone-400">
                  This is a simulated demonstration event only — no SMS, government notification, or real emergency
                  dispatch has been sent. It illustrates what a warning moment would look like once this fused
                  assessment (terrain-derived factors × a simulated environmental scenario) crosses into High
                  severity.
                </p>
              </div>

              <Button variant="danger" size="sm" className="self-end" onClick={() => dismissAlert(active.regionId)}>
                Acknowledge
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
