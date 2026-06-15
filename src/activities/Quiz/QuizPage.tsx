import { ArrowLeft, ArrowRight, CheckCircle2, HelpCircle, XCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { ProgressRing } from "../../components/ui/ProgressRing";
import { getDefaultDifficulty, getMcqsForScope, getScopeLabel, parseScope } from "../../content/contentIndex";
import type { MCQ } from "../../data/contentTypes";
import { getMasteryForItemIds } from "../../store/mastery";
import type { ItemProgress } from "../../store/progressStore";
import { useProgressStore } from "../../store/progressStore";

export function QuizPage() {
  const { scope: scopeParam } = useParams();
  const scopeKey = scopeParam ?? "mixed";
  const scope = useMemo(() => parseScope(scopeParam), [scopeParam]);
  const progress = useProgressStore((state) => state.itemProgress);
  const recordAnswer = useProgressStore((state) => state.recordAnswer);
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const sourceItems = useMemo(() => getMcqsForScope(scope).filter((item) => (item.type ?? "single") === "single"), [scope]);
  const [items, setItems] = useState(() => sortQuizItems(sourceItems, progress));

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  useEffect(() => {
    setItems(sortQuizItems(sourceItems, progressRef.current));
    setIndex(0);
    setSelected(null);
    setAnswered(false);
    setCorrectCount(0);
  }, [scopeKey, sourceItems]);

  const current = items[index];
  const itemIds = useMemo(() => items.map((item) => item.id), [items]);
  const mastery = getMasteryForItemIds(itemIds, progress);
  const finished = index >= items.length;

  if (!current && !finished) {
    return (
      <div className="rounded-lg border border-line bg-white p-6 shadow-soft">
        <h1 className="text-xl font-extrabold">No quiz questions available</h1>
        <Link className="mt-4 inline-flex text-primary hover:underline" to="/">
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="mx-auto max-w-3xl rounded-lg border border-line bg-white p-8 text-center shadow-soft">
        <ProgressRing value={Math.round((correctCount / Math.max(1, items.length)) * 100)} size={96} color="#22c55e" />
        <h1 className="mt-5 text-3xl font-extrabold">Quiz complete</h1>
        <p className="mt-2 text-muted">
          You scored {correctCount} / {items.length}. Review explanations and repeat due questions to build mastery.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              setItems(sortQuizItems(sourceItems, progressRef.current));
              setIndex(0);
              setSelected(null);
              setAnswered(false);
              setCorrectCount(0);
            }}
          >
            Practise again
          </Button>
          <Link to="/">
            <Button>Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const options = current.options ?? [];
  const correctIndex = current.answerIndex ?? 0;
  const isCorrect = selected === correctIndex;

  const submit = () => {
    if (selected === null || answered) return;
    const correct = selected === correctIndex;
    setAnswered(true);
    if (correct) setCorrectCount((value) => value + 1);
    recordAnswer(
      {
        itemId: current.id,
        correct,
        activity: "quiz",
        timestamp: Date.now(),
      },
      getDefaultDifficulty(current.difficulty),
    );
  };

  const next = () => {
    if (!answered) return;
    setIndex((value) => value + 1);
    setSelected(null);
    setAnswered(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-line bg-white p-4 shadow-soft md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="grid h-10 w-10 place-items-center rounded-lg hover:bg-slate-100" aria-label="Back to dashboard">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <p className="text-sm font-bold text-muted">{getScopeLabel(scope)}</p>
            <h1 className="text-xl font-extrabold">Quiz</h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-extrabold">
            Question {index + 1} / {items.length}
          </span>
          <div className="flex gap-1">
            {items.map((item, itemIndex) => (
              <span
                key={item.id}
                className={`h-2.5 w-2.5 rounded-full ${itemIndex < index ? "bg-emerald-500" : itemIndex === index ? "bg-primary" : "bg-slate-300"}`}
              />
            ))}
          </div>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-line bg-white p-5 shadow-soft">
          <div className="mb-5 flex items-start gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
              <HelpCircle size={26} />
            </div>
            <h2 className="text-xl font-extrabold leading-snug">{current.question}</h2>
          </div>

          <div className="space-y-3">
            {options.map((option, optionIndex) => {
              const chosen = selected === optionIndex;
              const correct = answered && optionIndex === correctIndex;
              const wrong = answered && chosen && optionIndex !== correctIndex;
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
                  onClick={() => !answered && setSelected(optionIndex)}
                  disabled={answered}
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-current text-xs">
                    {String.fromCharCode(65 + optionIndex)}
                  </span>
                  <span>{option}</span>
                  {correct ? <CheckCircle2 className="ml-auto" size={19} /> : null}
                  {wrong ? <XCircle className="ml-auto" size={19} /> : null}
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex justify-end">
            {answered ? (
              <Button onClick={next}>
                Next question <ArrowRight size={18} />
              </Button>
            ) : (
              <Button onClick={submit} disabled={selected === null}>
                Check answer
              </Button>
            )}
          </div>
        </div>

        <aside className="rounded-lg border border-line bg-white shadow-soft">
          <div
            className={`border-b border-line p-4 ${answered ? (isCorrect ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700") : "bg-slate-50 text-muted"}`}
          >
            <div className="flex items-center gap-2 text-sm font-extrabold">
              {answered ? isCorrect ? <CheckCircle2 size={18} /> : <XCircle size={18} /> : <HelpCircle size={18} />}
              {answered ? (isCorrect ? "Correct" : "Not quite") : "Answer feedback"}
            </div>
          </div>
          <div className="space-y-5 p-4">
            {answered ? (
              <>
                <div>
                  <p className="text-xs font-extrabold uppercase text-muted">Correct answer</p>
                  <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm font-bold">
                    {String.fromCharCode(65 + correctIndex)}. {options[correctIndex]}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-extrabold uppercase text-muted">Explanation</p>
                  <p className="mt-2 text-sm leading-6 text-ink">{current.explanation}</p>
                </div>
              </>
            ) : (
              <p className="text-sm leading-6 text-muted">Choose an answer, then check it to see the explanation.</p>
            )}
            <div className="rounded-lg bg-slate-50 p-4">
              <div className="flex items-center justify-between text-sm font-bold">
                <span>Mastery</span>
                <span className="text-primary">{mastery.percent}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${mastery.percent}%` }} />
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

function sortQuizItems(items: MCQ[], progress: Record<string, ItemProgress>): MCQ[] {
  const now = Date.now();
  return items
    .map((item, order) => ({ item, order }))
    .sort((a, b) => {
      const aProgress = progress[a.item.id];
      const bProgress = progress[b.item.id];
      const aDue = !aProgress || aProgress.nextDue <= now ? 0 : 1;
      const bDue = !bProgress || bProgress.nextDue <= now ? 0 : 1;
      return aDue - bDue || a.order - b.order;
    })
    .map(({ item }) => item);
}
