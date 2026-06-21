import { motion } from "framer-motion";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { useEffect, useRef, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { useXpFloat } from "../../hooks/useXpFloat";
import {
  getDefaultDifficulty,
  getFlashcardsForScope,
  getScopeBackPath,
  getScopeLabel,
  parseScope,
} from "../../content/contentIndex";
import { useProgressStore } from "../../store/progressStore";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import {
  formatElapsedTime,
  shuffle,
  takeRound,
} from "../shared/activityUtils";

interface MemoryCard {
  key: string;
  pairId: string;
  text: string;
  kind: "term" | "definition";
  difficulty?: 1 | 2 | 3;
}

export function MemoryGamePage() {
  const { scope: scopeParam } = useParams();
  const location = useLocation();
  const scope = useMemo(() => parseScope(scopeParam), [scopeParam]);
  const sourceCards = useMemo(() => getFlashcardsForScope(scope), [scope]);
  const backPath = getScopeBackPath(scope);
  const timerKey = useMemo(
    () => `memory:${scopeParam ?? "mixed"}`,
    [scopeParam],
  );
  const [deck, setDeck] = useState<MemoryCard[]>(() => makeDeck(sourceCards));
  const [open, setOpen] = useState<string[]>([]);
  const [matched, setMatched] = useState<Record<string, boolean>>({});
  const [moves, setMoves] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [completedElapsedMs, setCompletedElapsedMs] = useState<number | null>(
    null,
  );
  const closeTimer = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const matchedPairIdsRef = useRef<Set<string>>(new Set());
  const reducedMotion = useReducedMotion();
  const recordAnswer = useProgressStore((state) => state.recordAnswer);
  const recordTimedActivityBest = useProgressStore(
    (state) => state.recordTimedActivityBest,
  );
  const bestTimeMs = useProgressStore(
    (state) => state.timedActivityBests[timerKey],
  );
  const { triggerXpFloat } = useXpFloat();
  const recordDailyTaskCompletion = useProgressStore(
    (state) => state.recordDailyTaskCompletion,
  );

  const complete =
    deck.length > 0 && Object.keys(matched).length === deck.length / 2;

  const resetTimer = () => {
    startedAtRef.current = null;
    setStartedAt(null);
    setElapsedMs(0);
    setCompletedElapsedMs(null);
  };

  useEffect(() => {
    return () => {
      if (closeTimer.current) {
        window.clearTimeout(closeTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!startedAt || completedElapsedMs !== null) return;

    const tick = () => setElapsedMs(Date.now() - startedAt);
    tick();
    const timer = window.setInterval(tick, 100);
    return () => window.clearInterval(timer);
  }, [completedElapsedMs, startedAt]);

  useEffect(() => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setDeck(makeDeck(sourceCards));
    setOpen([]);
    setMatched({});
    matchedPairIdsRef.current = new Set();
    setMoves(0);
    resetTimer();
  }, [sourceCards]);

  const startTimer = () => {
    if (startedAtRef.current !== null || completedElapsedMs !== null) return;
    const now = Date.now();
    startedAtRef.current = now;
    setStartedAt(now);
    setElapsedMs(0);
  };

  const stopTimer = () => {
    const start = startedAtRef.current;
    if (start === null) return;
    const finishedMs = Date.now() - start;
    startedAtRef.current = null;
    setStartedAt(null);
    setElapsedMs(finishedMs);
    setCompletedElapsedMs(finishedMs);
    recordTimedActivityBest(timerKey, finishedMs);
  };

  const restart = () => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setDeck(makeDeck(sourceCards));
    setOpen([]);
    setMatched({});
    matchedPairIdsRef.current = new Set();
    setMoves(0);
    resetTimer();
  };

  const flip = (card: MemoryCard, anchorEl?: HTMLElement | null) => {
    if (
      matched[card.pairId] ||
      matchedPairIdsRef.current.has(card.pairId) ||
      open.includes(card.key) ||
      open.length === 2
    )
      return;
    startTimer();
    const nextOpen = [...open, card.key];
    setOpen(nextOpen);
    if (nextOpen.length === 2) {
      setMoves((value) => value + 1);
      const first = deck.find((item) => item.key === nextOpen[0]);
      const second = card;
      const correct = Boolean(
        first && first.pairId === second.pairId && first.kind !== second.kind,
      );
      const difficulty = getDefaultDifficulty(second.difficulty);
      const result = {
        itemId: second.pairId,
        correct,
        activity: "memory" as const,
        timestamp: Date.now(),
      };
      const xpGained = recordAnswer(result, difficulty);
      if (correct) {
        matchedPairIdsRef.current.add(second.pairId);
        if (xpGained > 0) triggerXpFloat(xpGained, anchorEl);
        const nextMatched = { ...matched, [second.pairId]: true };
        setMatched(nextMatched);
        if (Object.keys(nextMatched).length === deck.length / 2) {
          stopTimer();
          recordDailyTaskCompletion(location.pathname);
        }
        closeTimer.current = window.setTimeout(() => {
          setOpen([]);
          closeTimer.current = null;
        }, 350);
      } else {
        closeTimer.current = window.setTimeout(() => {
          setOpen([]);
          closeTimer.current = null;
        }, 850);
      }
    }
  };

  if (deck.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-white p-6 shadow-soft">
        <h1 className="text-xl font-extrabold">No memory pairs available</h1>
        <Link
          className="mt-4 inline-flex text-primary hover:underline"
          to={backPath}
        >
          Back to overview
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-line bg-white p-4 shadow-soft md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Link
            to={backPath}
            className="grid h-10 w-10 place-items-center rounded-lg hover:bg-slate-100"
            aria-label="Back to overview"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <p className="text-sm font-bold text-muted">
              {getScopeLabel(scope)}
            </p>
            <h1 className="text-xl font-extrabold">Memory game</h1>
          </div>
        </div>
        <Button variant="ghost" onClick={restart}>
          <RotateCcw size={17} /> New grid
        </Button>
      </div>

      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-bold text-muted">
            <span>Moves: {moves}</span>
            <span>
              Time: {formatElapsedTime(completedElapsedMs ?? elapsedMs)}
            </span>
            <span>
              Personal best:{" "}
              {bestTimeMs ? formatElapsedTime(bestTimeMs) : "Not set"}
            </span>
          </div>
          <p className="text-sm font-bold text-primary">
            {complete
              ? "Grid complete"
              : `${Object.keys(matched).length} / ${deck.length / 2} pairs`}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {deck.map((card) => {
            const visible = open.includes(card.key) || matched[card.pairId];
            const isOpenMismatch =
              open.includes(card.key) &&
              open.length === 2 &&
              !matched[card.pairId] &&
              deck.find((item) => item.key === open[0])?.pairId !==
                deck.find((item) => item.key === open[1])?.pairId;
            return (
              <motion.button
                key={card.key}
                animate={
                  reducedMotion
                    ? undefined
                    : matched[card.pairId]
                      ? { scale: [1, 1.04, 1] }
                      : isOpenMismatch
                        ? { x: [0, -5, 5, -3, 3, 0] }
                        : { x: 0, scale: 1 }
                }
                className={`min-h-32 rounded-lg border p-4 text-center text-sm font-bold transition ${
                  matched[card.pairId]
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : visible
                      ? "border-primary bg-white text-ink shadow-soft"
                      : "border-indigo-200 bg-primary text-white hover:bg-indigo-600"
                }`}
                onClick={(event) => flip(card, event.currentTarget)}
              >
                {visible ? card.text : "CS"}
              </motion.button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function makeDeck(
  items: ReturnType<typeof getFlashcardsForScope>,
): MemoryCard[] {
  const round = takeRound(items, 6);
  return shuffle(
    round.flatMap((item) => [
      {
        key: `${item.id}-term`,
        pairId: item.id,
        text: item.term,
        kind: "term" as const,
        difficulty: item.difficulty,
      },
      {
        key: `${item.id}-definition`,
        pairId: item.id,
        text: item.definition,
        kind: "definition" as const,
        difficulty: item.difficulty,
      },
    ]),
  );
}
