import {
  ArrowRight,
  BookOpen,
  RotateCcw,
  Sparkles,
  Target,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../ui/Button";
import { ONBOARDED_KEY, REPLAY_ONBOARDING_EVENT } from "./onboardingEvents";

const cards = [
  {
    title: "Practise little and often",
    copy: "Answer quiz questions, rate flashcards, and revisit items when they are due.",
    icon: BookOpen,
  },
  {
    title: "Build mastery",
    copy: "Correct answers move items through the Leitner boxes so your revision stays focused.",
    icon: Target,
  },
  {
    title: "Celebrate progress",
    copy: "XP, badges, streaks, and levels help you notice the work you are putting in.",
    icon: Sparkles,
  },
];

export function Onboarding() {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const current = cards[index];

  useEffect(() => {
    if (typeof window === "undefined") return;
    setOpen(!window.localStorage.getItem(ONBOARDED_KEY));

    const replay = () => {
      setIndex(0);
      setOpen(true);
    };
    window.addEventListener(REPLAY_ONBOARDING_EVENT, replay);
    return () => window.removeEventListener(REPLAY_ONBOARDING_EVENT, replay);
  }, []);

  const finish = () => {
    window.localStorage.setItem(ONBOARDED_KEY, "true");
    setOpen(false);
  };

  const skip = () => {
    window.localStorage.setItem(ONBOARDED_KEY, "true");
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="w-full max-w-lg rounded-lg border border-line bg-white p-5 shadow-pop">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-indigo-50 text-primary">
            <current.icon size={24} />
          </span>
          <div>
            <p className="text-sm font-black uppercase text-muted">
              Step {index + 1} of {cards.length}
            </p>
            <h2 id="onboarding-title" className="mt-1 text-2xl font-extrabold">
              {current.title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted">{current.copy}</p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={skip}>
            Skip intro
          </Button>
          <div className="flex gap-2">
            {index > 0 ? (
              <Button
                variant="secondary"
                onClick={() => setIndex((value) => Math.max(0, value - 1))}
              >
                <RotateCcw size={17} /> Back
              </Button>
            ) : null}
            {index === cards.length - 1 ? (
              <Button onClick={finish}>Start revising</Button>
            ) : (
              <Button onClick={() => setIndex((value) => value + 1)}>
                Next <ArrowRight size={17} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
