import { useEffect } from "react";
import { useProgressStore } from "../store/progressStore";
import { resumeAudioContext } from "./sound";

export function useSound() {
  const enabled = useProgressStore((state) => state.settings.sound);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const prime = () => void resumeAudioContext();
    window.addEventListener("pointerdown", prime, { once: true });
    window.addEventListener("keydown", prime, { once: true });
    return () => {
      window.removeEventListener("pointerdown", prime);
      window.removeEventListener("keydown", prime);
    };
  }, [enabled]);

  return { enabled };
}
