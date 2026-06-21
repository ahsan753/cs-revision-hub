import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  XCircle,
} from "lucide-react";
import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useXpFloat } from "../../hooks/useXpFloat";
import { Button } from "../../components/ui/Button";
import { ProgressRing } from "../../components/ui/ProgressRing";
import { getDefaultDifficulty } from "../../content/contentIndex";
import type { Flashcard, MCQ } from "../../data/contentTypes";
import { useProgressStore } from "../../store/progressStore";
import {
  planSmartSession,
  type SmartSessionItem,
  type SmartSessionPlan,
} from "./smartSessionPlanner";

interface AnswerRecord {
  id: string;
  type: SmartSessionItem["type"];
  correct: boolean;
  xpGained: number;
}

export function SmartSessionPage() {
  const recordAnswer = useProgressStore((state) => state.recordAnswer);
  const { triggerXpFloat } = useXpFloat();
  const [plan, setPlan] = useState(() =>
    planSmartSession(useProgressStore.getState().itemProgress, Date.now()),
  );
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [flashcardRevealed, setFlashcardRevealed] = useState(false);
  const answeredItemRef = useRef<string | null>(null);

  const current = plan.items[index];
  const complete = plan.items.length > 0 && index >= plan.items.length;

  const restart = () => {
    setPlan(
      planSmartSession(useProgressStore.getState().itemProgress, Date.now()),
    );
    setIndex(0);
    setAnswers([]);
    setSelected(null);
    setRevealed(false);
    setFlashcardRevealed(false);
    answeredItemRef.current = null;
  };

  if (plan.items.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-white p-6 shadow-soft">
        <h1 className="text-xl font-extrabold">No smart practice available</h1>
        <p className="mt-2 text-sm text-muted">
          Add MCQs or flashcards to the content bank to use this session.
        </p>
        <Link className="mt-4 inline-flex text-primary hover:underline" to="/">
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (complete) {
    return <Results plan={plan} answers={answers} onRestart={restart} />;
  }

  const answer = (
    correct: boolean,
    anchorEl?: HTMLElement | null,
    selectedIndex?: number,
  ) => {
    if (!current || revealed || answeredItemRef.current === current.id) return;
    answeredItemRef.current = current.id;
    const difficulty = getDefaultDifficulty(current.item.difficulty);
    const result = {
      itemId: current.id,
      correct,
      activity:
        current.type === "mcq" ? ("quiz" as const) : ("flashcards" as const),
      timestamp: Date.now(),
      ranked:
        current.type === "mcq" && typeof selectedIndex === "number"
          ? {
              rankedItemId: current.id,
              submitted: { kind: "mcq" as const, selectedIndex },
            }
          : undefined,
    };
    const xpGained = recordAnswer(result, difficulty);
    setRevealed(true);
    setAnswers((value) => [
      ...value,
      { id: current.id, type: current.type, correct, xpGained },
    ]);
    if (xpGained > 0) triggerXpFloat(xpGained, anchorEl);
  };

  const next = () => {
    setIndex((value) => value + 1);
    setSelected(null);
    setRevealed(false);
    setFlashcardRevealed(false);
    answeredItemRef.current = null;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-line bg-white p-4 shadow-soft md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="grid h-10 w-10 place-items-center rounded-lg hover:bg-slate-100"
            aria-label="Back to dashboard"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <p className="text-sm font-bold text-muted">Smart practice</p>
            <h1 className="text-xl font-extrabold">Continue practising</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm font-bold">
          <SmartSessionMetric
            id="smart-session-progress-help"
            align="start"
            className="text-ink"
            description={`You are on item ${index + 1} out of ${plan.items.length} in this smart practice session.`}
          >
            {index + 1} / {plan.items.length}
          </SmartSessionMetric>
          <SmartSessionMetric
            id="smart-session-due-help"
            className="bg-indigo-50 text-primary"
            description="Due items are questions or flashcards you have tried before and the app has scheduled for review now."
          >
            {plan.dueCount} due
          </SmartSessionMetric>
          <SmartSessionMetric
            id="smart-session-new-help"
            className="bg-emerald-50 text-emerald-700"
            description="New items are questions or flashcards you have not tried yet. They are added when the session needs fresh practice."
          >
            {plan.newCount} new
          </SmartSessionMetric>
        </div>
      </div>

      {current.type === "mcq" ? (
        <SmartMcq
          item={current.item}
          selected={selected}
          revealed={revealed}
          onSelect={setSelected}
          onAnswer={answer}
        />
      ) : (
        <SmartFlashcard
          item={current.item}
          revealed={flashcardRevealed}
          answered={revealed}
          onReveal={() => setFlashcardRevealed(true)}
          onAnswer={answer}
        />
      )}

      {revealed ? (
        <div className="flex justify-end">
          <Button onClick={next}>
            {index === plan.items.length - 1 ? "Finish session" : "Next item"}
            <ArrowRight size={18} />
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function SmartSessionMetric({
  id,
  align = "end",
  className,
  description,
  children,
}: {
  id: string;
  align?: "start" | "end";
  className: string;
  description: string;
  children: ReactNode;
}) {
  const positionClass =
    align === "start" ? "left-0 sm:left-auto sm:right-0" : "right-0";

  return (
    <span className="group relative inline-flex">
      <span
        tabIndex={0}
        aria-describedby={id}
        className={`rounded-lg px-3 py-2 outline-none focus-visible:shadow-[var(--focus)] ${className}`}
      >
        {children}
      </span>
      <span
        id={id}
        role="tooltip"
        className={`pointer-events-none absolute top-full z-20 mt-2 hidden w-40 rounded-md border border-line bg-white px-3 py-2 text-left text-xs font-semibold leading-5 text-ink shadow-soft group-hover:block group-focus-within:block sm:w-64 ${positionClass}`}
      >
        {description}
      </span>
    </span>
  );
}

function SmartMcq({
  item,
  selected,
  revealed,
  onSelect,
  onAnswer,
}: {
  item: MCQ;
  selected: number | null;
  revealed: boolean;
  onSelect: (index: number) => void;
  onAnswer: (
    correct: boolean,
    anchorEl?: HTMLElement | null,
    selectedIndex?: number,
  ) => void;
}) {
  const options = item.options ?? [];
  const correctIndex = item.answerIndex ?? 0;
  const isCorrect = selected === correctIndex;

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <div className="mb-5 flex items-start gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
            <HelpCircle size={26} />
          </div>
          <h2 className="text-xl font-extrabold leading-snug">
            {item.question}
          </h2>
        </div>

        <div className="space-y-3">
          {options.map((option, optionIndex) => {
            const chosen = selected === optionIndex;
            const correct = revealed && optionIndex === correctIndex;
            const wrong = revealed && chosen && optionIndex !== correctIndex;
            return (
              <button
                key={option}
                className={`flex w-full items-center gap-3 rounded-lg border p-4 text-left text-sm font-bold transition ${
                  correct
                    ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                    : wrong
                      ? "border-rose-400 bg-rose-50 text-rose-700"
                      : chosen
                        ? "border-primary bg-indigo-50 text-primary"
                        : "border-line bg-white hover:border-primary"
                }`}
                onClick={() => !revealed && onSelect(optionIndex)}
                disabled={revealed}
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-current text-xs">
                  {String.fromCharCode(65 + optionIndex)}
                </span>
                <span>{option}</span>
                {correct ? (
                  <CheckCircle2 className="ml-auto" size={19} />
                ) : null}
                {wrong ? <XCircle className="ml-auto" size={19} /> : null}
              </button>
            );
          })}
        </div>

        {!revealed ? (
          <div className="mt-6 flex justify-end">
            <Button
              disabled={selected === null}
              onClick={(event) =>
                onAnswer(isCorrect, event.currentTarget, selected ?? undefined)
              }
            >
              Check answer
            </Button>
          </div>
        ) : null}
      </div>

      <aside className="rounded-lg border border-line bg-white shadow-soft">
        <div
          className={`border-b border-line p-4 ${revealed ? (isCorrect ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700") : "bg-slate-50 text-muted"}`}
        >
          <div className="flex items-center gap-2 text-sm font-extrabold">
            {revealed ? (
              isCorrect ? (
                <CheckCircle2 size={18} />
              ) : (
                <XCircle size={18} />
              )
            ) : (
              <HelpCircle size={18} />
            )}
            {revealed ? (isCorrect ? "Correct" : "Not quite") : "Feedback"}
          </div>
        </div>
        <div className="space-y-4 p-4">
          {revealed ? (
            <>
              <p className="rounded-lg bg-slate-50 p-3 text-sm font-bold">
                {String.fromCharCode(65 + correctIndex)}.{" "}
                {options[correctIndex]}
              </p>
              <p className="text-sm leading-6 text-ink">{item.explanation}</p>
            </>
          ) : (
            <p className="text-sm leading-6 text-muted">
              Choose an answer, then check it to see the explanation.
            </p>
          )}
        </div>
      </aside>
    </section>
  );
}

function SmartFlashcard({
  item,
  revealed,
  answered,
  onReveal,
  onAnswer,
}: {
  item: Flashcard;
  revealed: boolean;
  answered: boolean;
  onReveal: () => void;
  onAnswer: (correct: boolean, anchorEl?: HTMLElement | null) => void;
}) {
  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
      <div className="mx-auto max-w-4xl text-center">
        <p className="text-sm font-black uppercase text-muted">Flashcard</p>
        <div className="flashcard-surface mt-4 grid min-h-[260px] place-items-center rounded-lg border border-line bg-gradient-to-br from-white to-indigo-50 p-8">
          <div>
            <p className="text-2xl font-extrabold leading-snug md:text-4xl">
              {revealed ? item.definition : item.term}
            </p>
            <p className="mt-5 text-sm font-bold text-primary">
              {revealed ? "Definition" : "Term"}
            </p>
          </div>
        </div>

        {!revealed ? (
          <div className="mt-6">
            <Button onClick={onReveal}>Show answer</Button>
          </div>
        ) : null}

        {revealed && !answered ? (
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <Button
              variant="success"
              onClick={(event) => onAnswer(true, event.currentTarget)}
            >
              <CheckCircle2 size={20} /> Got it
            </Button>
            <Button variant="warning" onClick={() => onAnswer(false)}>
              <RotateCcw size={20} /> Almost
            </Button>
            <Button variant="danger" onClick={() => onAnswer(false)}>
              <XCircle size={20} /> Missed
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Results({
  plan,
  answers,
  onRestart,
}: {
  plan: SmartSessionPlan;
  answers: AnswerRecord[];
  onRestart: () => void;
}) {
  const correct = answers.filter((answer) => answer.correct).length;
  const percent = Math.round((correct / Math.max(1, answers.length)) * 100);

  return (
    <div className="mx-auto max-w-3xl rounded-lg border border-line bg-white p-8 text-center shadow-soft">
      <ProgressRing value={percent} size={96} color="#22c55e" />
      <h1 className="mt-5 text-3xl font-extrabold">Smart session complete</h1>
      <p className="mt-2 text-muted">
        You scored {correct} / {answers.length}. XP is recorded only for
        server-checked online answers.
      </p>
      <div className="mt-5 grid gap-3 text-sm font-bold md:grid-cols-3">
        <span className="rounded-lg bg-indigo-50 p-3 text-primary">
          {plan.dueCount} due reviewed
        </span>
        <span className="rounded-lg bg-emerald-50 p-3 text-emerald-700">
          {plan.newCount} new items
        </span>
        <span className="rounded-lg bg-slate-50 p-3 text-muted">
          {answers.length - correct} to review
        </span>
      </div>
      {plan.cappedDueCount > 0 ? (
        <p className="mt-4 text-sm font-bold text-muted">
          {plan.cappedDueCount} more due items will appear in a later session.
        </p>
      ) : null}
      <div className="mt-6 flex justify-center gap-3">
        <Button variant="secondary" onClick={onRestart}>
          <RotateCcw size={18} /> Practise again
        </Button>
        <Link to="/">
          <Button>Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
