import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "framer-motion";
import { Award, CheckCircle2, Trophy, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { playCue, type SoundCue } from "../../hooks/sound";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { useSound } from "../../hooks/useSound";
import type { CelebrationEvent } from "../../store/progressStore";
import { useProgressStore } from "../../store/progressStore";

interface Toast {
  id: string;
  title: string;
  body?: string;
  icon: "badge" | "goal" | "mastery";
}

export function CelebrationLayer() {
  const celebrationCount = useProgressStore(
    (state) => state.celebrations.length,
  );
  const consumeCelebrations = useProgressStore(
    (state) => state.consumeCelebrations,
  );
  const reducedMotion = useReducedMotion();
  const { enabled: soundEnabled } = useSound();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const [level, setLevel] = useState<number | null>(null);

  const dismissToast = useCallback((id: string) => {
    setToasts((value) => value.filter((toast) => toast.id !== id));
  }, []);

  useEffect(() => {
    if (celebrationCount === 0) return;
    const events = consumeCelebrations();
    if (events.length === 0) return;

    for (const event of events) {
      const cue = getCue(event);
      if (cue) playCue(cue, soundEnabled);

      const text = getAnnouncement(event);
      if (text) setAnnouncement(text);

      if (!reducedMotion) runConfetti(event);

      if (event.type === "streak-incremented") {
        window.dispatchEvent(new Event("csrh:streak-pulse"));
      }

      if (event.type === "level-up") {
        setLevel(event.level);
        window.setTimeout(() => setLevel(null), 1500);
      }

      const toast = getToast(event);
      if (toast) {
        setToasts((value) => [...value, toast]);
        window.setTimeout(() => dismissToast(toast.id), 5200);
      }
    }
  }, [
    celebrationCount,
    consumeCelebrations,
    dismissToast,
    reducedMotion,
    soundEnabled,
  ]);

  return (
    <>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      <div className="fixed right-4 top-20 z-50 w-[min(24rem,calc(100vw-2rem))] space-y-3">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={reducedMotion ? false : { opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 24 }}
              className="rounded-lg border border-line bg-white p-4 shadow-pop"
              role="status"
            >
              <div className="flex gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-700">
                  {toast.icon === "badge" ? (
                    <Award size={20} />
                  ) : (
                    <CheckCircle2 size={20} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold">{toast.title}</p>
                  {toast.body ? (
                    <p className="mt-1 text-sm leading-5 text-muted">
                      {toast.body}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-slate-100 hover:text-ink"
                  onClick={() => dismissToast(toast.id)}
                  aria-label="Dismiss notification"
                >
                  <X size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {level ? (
          <motion.div
            className="pointer-events-none fixed inset-0 z-40 grid place-items-center"
            initial={reducedMotion ? false : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
          >
            <div className="rounded-lg border border-amber-200 bg-white px-8 py-6 text-center shadow-pop">
              <Trophy className="mx-auto text-amber-500" size={38} />
              <p className="mt-3 text-sm font-black uppercase text-muted">
                Level up
              </p>
              <p className="text-3xl font-extrabold">Level {level}!</p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function getCue(event: CelebrationEvent): SoundCue | null {
  if (event.type === "correct") return "correct";
  if (event.type === "incorrect") return "incorrect";
  if (event.type === "level-up") return "level-up";
  if (event.type === "badge-unlocked") return "badge-unlocked";
  if (event.type === "daily-goal") return "daily-goal";
  if (event.type === "subtopic-mastered" || event.type === "unit-mastered") {
    return "mastered";
  }
  return null;
}

function getAnnouncement(event: CelebrationEvent) {
  if (event.type === "correct") {
    return event.xpGained > 0
      ? `Correct. ${event.xpGained} XP earned.`
      : "Correct.";
  }
  if (event.type === "incorrect") return "Not quite. Keep going.";
  if (event.type === "level-up") return `Level ${event.level} reached.`;
  if (event.type === "daily-goal") return "Daily goal complete.";
  if (event.type === "streak-incremented") {
    return `${event.streak} day streak reached.`;
  }
  if (event.type === "badge-unlocked") {
    return `Badge unlocked: ${event.badgeName}.`;
  }
  if (event.type === "subtopic-mastered") {
    return `Subtopic mastered: ${event.title}.`;
  }
  if (event.type === "unit-mastered") return `${event.title} mastered.`;
  return "";
}

function getToast(event: CelebrationEvent): Toast | null {
  if (event.type === "badge-unlocked") {
    return {
      id: event.id,
      title: `Badge unlocked: ${event.badgeName}`,
      icon: "badge",
    };
  }
  if (event.type === "daily-goal") {
    return {
      id: event.id,
      title: "Daily goal complete",
      body: "Your streak has been updated.",
      icon: "goal",
    };
  }
  if (event.type === "subtopic-mastered" || event.type === "unit-mastered") {
    return {
      id: event.id,
      title:
        event.type === "subtopic-mastered"
          ? "Subtopic mastered"
          : "Unit mastered",
      body: event.title,
      icon: "mastery",
    };
  }
  return null;
}

function runConfetti(event: CelebrationEvent) {
  if (
    event.type !== "daily-goal" &&
    event.type !== "level-up" &&
    event.type !== "subtopic-mastered" &&
    event.type !== "unit-mastered"
  ) {
    return;
  }

  const particleCount = event.type === "unit-mastered" ? 90 : 55;
  confetti({
    particleCount,
    spread: event.type === "unit-mastered" ? 75 : 55,
    startVelocity: event.type === "unit-mastered" ? 40 : 32,
    scalar: 0.85,
    origin: { y: 0.25 },
  });
}
