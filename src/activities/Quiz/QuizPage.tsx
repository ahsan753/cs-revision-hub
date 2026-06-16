import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  Keyboard,
  PencilLine,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { ProgressRing } from "../../components/ui/ProgressRing";
import {
  contentIndex,
  getDefaultDifficulty,
  getMcqsForScope,
  getScopeLabel,
  parseScope,
} from "../../content/contentIndex";
import type { MCQ } from "../../data/contentTypes";
import { getMasteryForItemIds } from "../../store/mastery";
import type { ItemProgress } from "../../store/progressStore";
import { useProgressStore } from "../../store/progressStore";

export function QuizPage() {
  const { scope: scopeParam } = useParams();
  const location = useLocation();
  const scopeKey = scopeParam ?? "mixed";
  const scope = useMemo(() => parseScope(scopeParam), [scopeParam]);
  const progress = useProgressStore((state) => state.itemProgress);
  const recordAnswer = useProgressStore((state) => state.recordAnswer);
  const recordDailyTaskCompletion = useProgressStore(
    (state) => state.recordDailyTaskCompletion,
  );
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const sourceItems = useMemo(
    () =>
      getMcqsForScope(scope).filter(
        (item) => (item.type ?? "single") === "single",
      ),
    [scope],
  );
  const [items, setItems] = useState(() =>
    sortQuizItems(sourceItems, progress),
  );

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
        <ProgressRing
          value={Math.round((correctCount / Math.max(1, items.length)) * 100)}
          size={96}
          color="#22c55e"
        />
        <h1 className="mt-5 text-3xl font-extrabold">Quiz complete</h1>
        <p className="mt-2 text-muted">
          You scored {correctCount} / {items.length}. Review explanations and
          repeat due questions to build mastery.
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
  const currentUnit = contentIndex.subtopicToUnit.get(current.subtopic);
  const showWorkingOut = currentUnit?.number === 1;

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
    if (index === items.length - 1) {
      recordDailyTaskCompletion(location.pathname);
    }
  };

  const next = () => {
    if (!answered) return;
    setIndex((value) => value + 1);
    setSelected(null);
    setAnswered(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-line bg-white p-4 shadow-soft lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="grid h-10 w-10 place-items-center rounded-lg hover:bg-slate-100"
            aria-label="Back to dashboard"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <p className="text-sm font-bold text-muted">
              {getScopeLabel(scope)}
            </p>
            <h1 className="text-xl font-extrabold">Quiz</h1>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-center md:justify-end">
          <span className="shrink-0 text-sm font-extrabold">
            Question {index + 1} / {items.length}
          </span>
          <div
            className="flex min-w-0 flex-wrap gap-1"
            aria-label={`Question ${index + 1} of ${items.length}`}
          >
            {items.map((item, itemIndex) => (
              <span
                key={item.id}
                className={`h-2 w-2 shrink-0 rounded-full ${itemIndex < index ? "bg-emerald-500" : itemIndex === index ? "bg-primary" : "bg-slate-300"}`}
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
            <h2 className="text-xl font-extrabold leading-snug">
              {current.question}
            </h2>
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
                  {correct ? (
                    <CheckCircle2 className="ml-auto" size={19} />
                  ) : null}
                  {wrong ? <XCircle className="ml-auto" size={19} /> : null}
                </button>
              );
            })}
          </div>

          {showWorkingOut ? <WorkingOutBox itemId={current.id} /> : null}

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
              {answered ? (
                isCorrect ? (
                  <CheckCircle2 size={18} />
                ) : (
                  <XCircle size={18} />
                )
              ) : (
                <HelpCircle size={18} />
              )}
              {answered
                ? isCorrect
                  ? "Correct"
                  : "Not quite"
                : "Answer feedback"}
            </div>
          </div>
          <div className="space-y-5 p-4">
            {answered ? (
              <>
                <div>
                  <p className="text-xs font-extrabold uppercase text-muted">
                    Correct answer
                  </p>
                  <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm font-bold">
                    {String.fromCharCode(65 + correctIndex)}.{" "}
                    {options[correctIndex]}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-extrabold uppercase text-muted">
                    Explanation
                  </p>
                  <p className="mt-2 text-sm leading-6 text-ink">
                    {current.explanation}
                  </p>
                </div>
              </>
            ) : (
              <p className="text-sm leading-6 text-muted">
                Choose an answer, then check it to see the explanation.
              </p>
            )}
            <div className="rounded-lg bg-slate-50 p-4">
              <div className="flex items-center justify-between text-sm font-bold">
                <span>Mastery</span>
                <span className="text-primary">{mastery.percent}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${mastery.percent}%` }}
                />
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

function WorkingOutBox({ itemId }: { itemId: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setNotes("");
    const canvas = canvasRef.current;
    if (!canvas) return;
    resizeCanvas(canvas);
  }, [itemId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    resizeCanvas(canvas);
    const handleResize = () => resizeCanvas(canvas);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    context?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const getCanvasPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const drawToPoint = (
    canvas: HTMLCanvasElement,
    point: { x: number; y: number },
  ) => {
    const context = canvas.getContext("2d");
    const lastPoint = lastPointRef.current;
    if (!context || !lastPoint) return;

    context.strokeStyle = "#111827";
    context.lineWidth = 4;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(lastPoint.x, lastPoint.y);
    context.lineTo(point.x, point.y);
    context.stroke();
    lastPointRef.current = point;
  };

  const startDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    isDrawingRef.current = true;
    lastPointRef.current = getCanvasPoint(event);
  };

  const continueDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    drawToPoint(event.currentTarget, getCanvasPoint(event));
  };

  const stopDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    isDrawingRef.current = false;
    lastPointRef.current = null;
  };

  return (
    <div className="mt-5 rounded-lg border border-dashed border-indigo-200 bg-indigo-50/50 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-extrabold text-primary">
            <PencilLine size={18} />
            Working out
          </div>
          <p className="mt-1 text-xs font-semibold text-muted">
            Use this space for binary, denary, hexadecimal or file-size
            calculations.
          </p>
        </div>
        <Button
          variant="secondary"
          className="min-h-9 px-3 py-2 text-xs"
          onClick={clearCanvas}
          type="button"
        >
          <RotateCcw size={15} />
          Clear drawing
        </Button>
      </div>

      <label className="mt-4 block">
        <span className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase text-muted">
          <Keyboard size={15} />
          Typed notes
        </span>
        <textarea
          className="min-h-24 w-full resize-y rounded-lg border border-line bg-white p-3 text-sm leading-6 text-ink shadow-sm transition placeholder:text-slate-400 focus:border-primary"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Type your calculations or reminders here..."
        />
      </label>

      <div className="mt-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase text-muted">
          <PencilLine size={15} />
          Handwriting space
        </div>
        <canvas
          ref={canvasRef}
          className="h-44 w-full rounded-lg border border-line shadow-sm"
          style={{ backgroundColor: "#fff", touchAction: "none" }}
          aria-label="Handwriting space for working out"
          onPointerDown={startDrawing}
          onPointerMove={continueDrawing}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
          onPointerLeave={stopDrawing}
        />
      </div>
    </div>
  );
}

function resizeCanvas(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  const pixelRatio = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(rect.width * pixelRatio));
  const height = Math.max(1, Math.floor(rect.height * pixelRatio));
  canvas.width = width;
  canvas.height = height;
}

function sortQuizItems(
  items: MCQ[],
  progress: Record<string, ItemProgress>,
): MCQ[] {
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
