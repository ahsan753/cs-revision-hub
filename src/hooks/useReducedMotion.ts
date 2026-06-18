import { useEffect, useState } from "react";
import { useProgressStore } from "../store/progressStore";

export function useReducedMotion() {
  const reducedMotionSetting = useProgressStore(
    (state) => state.settings.reducedMotion,
  );
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reducedMotionSetting || prefersReducedMotion;
}
