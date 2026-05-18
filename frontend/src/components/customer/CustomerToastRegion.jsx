import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, CircleAlert, Info } from "lucide-react";

const toneMap = {
  success: {
    icon: CheckCircle2,
    card: "border-coral-200 bg-white text-slate-900",
    accent: "bg-coral-500 text-white"
  },
  danger: {
    icon: CircleAlert,
    card: "border-rose-200 bg-white text-slate-900",
    accent: "bg-rose-500 text-white"
  },
  neutral: {
    icon: Info,
    card: "border-slate-200 bg-white text-slate-900",
    accent: "bg-slate-700 text-white"
  }
};

export function CustomerToastRegion({ toast }) {
  const tone = toneMap[toast?.tone || "success"];
  const Icon = tone.icon;

  return (
    <div className="pointer-events-none fixed inset-x-4 top-4 z-[70] sm:left-auto sm:right-6 sm:w-[360px]">
      <AnimatePresence>
        {toast ? (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className={`pointer-events-auto flex items-center gap-3 rounded-[22px] border px-4 py-3 shadow-xl ${tone.card}`}
          >
            <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${tone.accent}`}>
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold">{toast.message}</p>
              <p className="text-xs text-slate-500">Your basket updated immediately.</p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
