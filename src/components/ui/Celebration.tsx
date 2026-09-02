import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useEffect } from "react";
import { useApp } from "../../state/AppContext";

export function Celebration() {
  const { celebration, dismissCelebration } = useApp();

  useEffect(() => {
    if (!celebration) return;
    const t = window.setTimeout(dismissCelebration, 2600);
    return () => window.clearTimeout(t);
  }, [celebration, dismissCelebration]);

  return (
    <AnimatePresence>
      {celebration && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -12 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
            className="flex flex-col items-center gap-3 rounded-[28px] border border-forest-200 bg-cream-50/95 px-10 py-8 text-center shadow-[var(--shadow-lift)] backdrop-blur"
          >
            <motion.div
              initial={{ rotate: -12, scale: 0.6 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 12, delay: 0.1 }}
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-500 text-cream-50 shadow-[0_6px_18px_-4px_rgba(59,107,71,0.6)]"
            >
              <Sparkles size={26} />
            </motion.div>
            <p className="font-display text-xl font-extrabold uppercase tracking-wide text-forest-700">
              {celebration.title}
            </p>
            <p className="max-w-[240px] text-sm text-stone-500">{celebration.subtitle}</p>
            <span className="rounded-full bg-forest-100 px-4 py-1.5 text-sm font-extrabold text-forest-700">
              +{celebration.xp} XP
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
