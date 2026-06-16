import { ArrowLeft, CheckCircle2, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import {
  getDefaultDifficulty,
  getFlashcardsForScope,
  getScopeLabel,
  parseScope,
} from "../../content/contentIndex";
import type { Flashcard } from "../../data/contentTypes";
import { useProgressStore } from "../../store/progressStore";
import { shuffle, takeRound } from "../shared/activityUtils";

export function MatchGamePage() {
  const { scope: scopeParam } = useParams();
  const location = useLocation();
  const scope = useMemo(() => parseScope(scopeParam), [scopeParam]);
  const sourceCards = useMemo(() => getFlashcardsForScope(scope), [scope]);
  const [round, setRound] = useState<Flashcard[]>(() =>
    takeRound(sourceCards, 6),
  );
  const [definitions, setDefinitions] = useState<Flashcard[]>(() =>
    shuffle(round),
  );
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
  const [matched, setMatched] = useState<Record<string, boolean>>({});
  const [wrongMatch, setWrongMatch] = useState<{
    termId: string;
    definitionId: string;
  } | null>(null);
  const [moves, setMoves] = useState(0);
  const [feedback, setFeedback] = useState("");
  const wrongMatchTimer = useRef<number | null>(null);
  const recordAnswer = useProgressStore((state) => state.recordAnswer);
  const recordDailyTaskCompletion = useProgressStore(
    (state) => state.recordDailyTaskCompletion,
  );

  const complete =
    Object.keys(matched).length === round.length && round.length > 0;

  useEffect(() => {
    return () => {
      if (wrongMatchTimer.current) {
        window.clearTimeout(wrongMatchTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (wrongMatchTimer.current) {
      window.clearTimeout(wrongMatchTimer.current);
      wrongMatchTimer.current = null;
    }
    const next = takeRound(sourceCards, 6);
    setRound(next);
    setDefinitions(shuffle(next));
    setSelectedTerm(null);
    setMatched({});
    setWrongMatch(null);
    setMoves(0);
    setFeedback("");
  }, [sourceCards]);

  const showWrongMatch = (termId: string, definitionId: string) => {
    if (wrongMatchTimer.current) {
      window.clearTimeout(wrongMatchTimer.current);
    }
    setWrongMatch({ termId, definitionId });
    wrongMatchTimer.current = window.setTimeout(() => {
      setWrongMatch(null);
      wrongMatchTimer.current = null;
    }, 3000);
  };

  const restart = () => {
    if (wrongMatchTimer.current) {
      window.clearTimeout(wrongMatchTimer.current);
      wrongMatchTimer.current = null;
    }
    const next = takeRound(sourceCards, 6);
    setRound(next);
    setDefinitions(shuffle(next));
    setSelectedTerm(null);
    setMatched({});
    setWrongMatch(null);
    setMoves(0);
    setFeedback("");
  };

  const chooseDefinition = (card: Flashcard) => {
    if (!selectedTerm || wrongMatch || matched[card.id]) return;
    const correct = selectedTerm === card.id;
    setMoves((value) => value + 1);
    recordAnswer(
      {
        itemId: selectedTerm,
        correct,
        activity: "match",
        timestamp: Date.now(),
      },
      getDefaultDifficulty(card.difficulty),
    );
    if (correct) {
      setWrongMatch(null);
      const nextMatched = { ...matched, [card.id]: true };
      setMatched(nextMatched);
      if (Object.keys(nextMatched).length === round.length) {
        recordDailyTaskCompletion(location.pathname);
      }
      setFeedback("Correct match");
    } else {
      showWrongMatch(selectedTerm, card.id);
      setFeedback("Try a different definition");
    }
    setSelectedTerm(null);
  };

  if (round.length === 0) {
    return <EmptyActivity title="No matching pairs available" />;
  }

  return (
    <div className="space-y-4">
      <ActivityHeader title="Matching game" subtitle={getScopeLabel(scope)} />
      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-bold text-muted">
            Match each term to its definition. Moves:{" "}
            <span className="text-ink">{moves}</span>
          </p>
          <Button variant="ghost" onClick={restart}>
            <RotateCcw size={17} /> New round
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <h2 className="text-sm font-extrabold uppercase text-muted">
              Terms
            </h2>
            {round.map((card) => {
              const isWrongMatch = wrongMatch?.termId === card.id;
              return (
                <button
                  key={card.id}
                  disabled={matched[card.id] || Boolean(wrongMatch)}
                  onClick={() => setSelectedTerm(card.id)}
                  className={`flex min-h-14 w-full items-center justify-between rounded-lg border p-4 text-left text-sm font-bold transition ${
                    matched[card.id]
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : isWrongMatch
                        ? "border-red-400 bg-red-50 text-red-700"
                        : selectedTerm === card.id
                          ? "border-primary bg-indigo-50 text-primary"
                          : "border-line bg-white hover:border-primary"
                  }`}
                >
                  {card.term}
                  {matched[card.id] ? <CheckCircle2 size={18} /> : null}
                </button>
              );
            })}
          </div>
          <div className="space-y-3">
            <h2 className="text-sm font-extrabold uppercase text-muted">
              Definitions
            </h2>
            {definitions.map((card) => {
              const isWrongMatch = wrongMatch?.definitionId === card.id;
              return (
                <button
                  key={card.id}
                  disabled={matched[card.id] || Boolean(wrongMatch)}
                  onClick={() => chooseDefinition(card)}
                  className={`min-h-14 w-full rounded-lg border p-4 text-left text-sm leading-6 transition ${
                    matched[card.id]
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : isWrongMatch
                        ? "border-red-400 bg-red-50 text-red-700"
                        : "border-line bg-white hover:border-primary"
                  }`}
                >
                  {card.definition}
                </button>
              );
            })}
          </div>
        </div>

        <div
          className="mt-5 rounded-lg bg-slate-50 p-4 text-sm font-bold text-muted"
          aria-live="polite"
        >
          {complete
            ? "Round complete. Nice work."
            : feedback || "Select a term, then choose its matching definition."}
        </div>
      </section>
    </div>
  );
}

function ActivityHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-line bg-white p-4 shadow-soft">
      <Link
        to="/"
        className="grid h-10 w-10 place-items-center rounded-lg hover:bg-slate-100"
        aria-label="Back to dashboard"
      >
        <ArrowLeft size={20} />
      </Link>
      <div>
        <p className="text-sm font-bold text-muted">{subtitle}</p>
        <h1 className="text-xl font-extrabold">{title}</h1>
      </div>
    </div>
  );
}

function EmptyActivity({ title }: { title: string }) {
  return (
    <div className="rounded-lg border border-line bg-white p-6 shadow-soft">
      <h1 className="text-xl font-extrabold">{title}</h1>
      <Link className="mt-4 inline-flex text-primary hover:underline" to="/">
        Back to dashboard
      </Link>
    </div>
  );
}
