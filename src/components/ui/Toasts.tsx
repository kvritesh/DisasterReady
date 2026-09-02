import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, WifiOff } from "lucide-react";
import { useApp } from "../../state/AppContext";

const toneStyles = {
  info: { bg: "bg-stone-900", icon: <Info size={16} className="text-sky-300" /> },
  success: { bg: "bg-forest-800", icon: <CheckCircle2 size={16} className="text-forest-300" /> },
  warning: { bg: "bg-stone-900", icon: <WifiOff size={16} className="text-amber-400" /> },
  danger: { bg: "bg-danger-600", icon: <AlertTriangle size={16} className="text-cream-100" /> },
};

export function Toasts() {
  const { toasts, dismissToast } = useApp();
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[100] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4">
      <AnimatePresence>
        {toasts.map((toast) => {
          const style = toneStyles[toast.tone];
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
              className={`pointer-events-auto flex items-start gap-3 rounded-2xl ${style.bg} px-4 py-3 text-cream-50 shadow-[var(--shadow-lift)]`}
              onClick={() => dismissToast(toast.id)}
              role="status"
            >
              <span className="mt-0.5">{style.icon}</span>
              <div>
                <p className="text-sm font-semibold leading-snug">{toast.title}</p>
                {toast.body && <p className="text-xs leading-snug text-cream-200/80">{toast.body}</p>}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
