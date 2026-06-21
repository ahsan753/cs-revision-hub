import { AnimatePresence, motion } from "framer-motion";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { rankedXpAwardedEvent } from "../../ranked/rankedClient";
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
      const hasVisibleRect = Boolean(rect && rect.width > 0 && rect.height > 0);
      const item = {
        id: Date.now() + Math.random(),
        amount,
        x: hasVisibleRect
          ? rect!.left + rect!.width / 2
          : window.innerWidth - 96,
        y: hasVisibleRect ? rect!.top + rect!.height / 2 : 76,
      };
      setFloats((value) => [...value, item]);
      window.setTimeout(() => {
        setFloats((value) => value.filter((float) => float.id !== item.id));
      }, 950);
    },
    [reducedMotion],
  );

  useEffect(() => {
    const showRankedXp = (event: Event) => {
      const amount = (event as CustomEvent<{ amount?: number }>).detail?.amount;
      if (typeof amount === "number") triggerXpFloat(amount);
    };
    window.addEventListener(rankedXpAwardedEvent, showRankedXp);
    return () => window.removeEventListener(rankedXpAwardedEvent, showRankedXp);
  }, [triggerXpFloat]);

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
