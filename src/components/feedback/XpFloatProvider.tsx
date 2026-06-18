import { AnimatePresence, motion } from "framer-motion";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { XpFloatContext } from "./xpFloatContext";

interface FloatItem {
  id: number;
  amount: number;
  x: number;
  y: number;
}

export function XpFloatProvider({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotion();
  const [floats, setFloats] = useState<FloatItem[]>([]);

  const triggerXpFloat = useCallback(
    (amount: number, anchorEl?: HTMLElement | null) => {
      if (reducedMotion || amount <= 0 || typeof window === "undefined") return;

      const fallback = document.querySelector<HTMLElement>("[data-xp-counter]");
      const target = anchorEl ?? fallback;
      const rect = target?.getBoundingClientRect();
      const item = {
        id: Date.now() + Math.random(),
        amount,
        x: rect ? rect.left + rect.width / 2 : window.innerWidth - 120,
        y: rect ? rect.top + rect.height / 2 : 76,
      };
      setFloats((value) => [...value, item]);
      window.setTimeout(() => {
        setFloats((value) => value.filter((float) => float.id !== item.id));
      }, 950);
    },
    [reducedMotion],
  );

  const value = useMemo(() => ({ triggerXpFloat }), [triggerXpFloat]);

  return (
    <XpFloatContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-0 z-50"
        aria-hidden="true"
      >
        <AnimatePresence>
          {floats.map((float) => (
            <motion.div
              key={float.id}
              initial={{ opacity: 0, y: 8, scale: 0.92 }}
              animate={{ opacity: 1, y: -28, scale: 1 }}
              exit={{ opacity: 0, y: -44, scale: 0.95 }}
              transition={{ duration: 0.75, ease: "easeOut" }}
              className="absolute rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-black text-amber-700 shadow-pop"
              style={{
                left: float.x,
                top: float.y,
                transform: "translate(-50%, -50%)",
              }}
            >
              +{float.amount} XP
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </XpFloatContext.Provider>
  );
}
