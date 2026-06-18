import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eraser,
  HelpCircle,
  Keyboard,
  PencilLine,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { useXpFloat } from "../../hooks/useXpFloat";
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
import {
  getXpForAnswer,
  isKnown,
  useProgressStore,
} from "../../store/progressStore";

interface QuizSession {
  queue: MCQ[];
  targets: Record<string, number>;
  itemIds: string[];
  completedIds: string[];
}

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
  const cardRef = useRef<HTMLDivElement | null>(null);
  progressRef.current = progress;
  const { triggerXpFloat } = useXpFloat();
  const sourceItems = useMemo(
    () =>
      getMcqsForScope(scope).filter(
        (item) => (item.type ?? "single") === "single",
      ),
    [scope],
  );
  const [session, setSession] = useState(() =>
    createQuizSession(sourceItems, progress),
  );

  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);

  useEffect(() => {
    setSession(createQuizSession(sourceItems, progressRef.current));
    setSelected(null);
    setAnswered(false);
    setCorrectCount(0);
    setAnsweredCount(0);
  }, [scopeKey, sourceItems]);

  const current = session.queue[0];
  const mastery = getMasteryForItemIds(session.itemIds, progress);
  const liveCompletedIds = useMemo(
    () =>
      session.itemIds.filter(
        (itemId) =>
          session.completedIds.includes(itemId) ||
          isKnown(progress[itemId]) ||
          (session.targets[itemId] ?? 1) <= 0,
      ),
    [progress, session.completedIds, session.itemIds, session.targets],
  );
  const liveCompleted = useMemo(
    () => new Set(liveCompletedIds),
    [liveCompletedIds],
  );
  const finished = sourceItems.length > 0 && session.queue.length === 0;

  if (sourceItems.length === 0) {
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
          value={Math.round((correctCount / Math.max(1, answeredCount)) * 100)}
          size={96}
          color="#22c55e"
        />
        <h1 className="mt-5 text-3xl font-extrabold">Quiz complete</h1>
        <p className="mt-2 text-muted">
          You scored {correctCount} / {answeredCount}.{" "}
          {session.completedIds.length} target items reached mastery in this
          session.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              setSession(createQuizSession(sourceItems, progressRef.current));
              setSelected(null);
              setAnswered(false);
              setCorrectCount(0);
              setAnsweredCount(0);
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
    const difficulty = getDefaultDifficulty(current.difficulty);
    setAnswered(true);
    setAnsweredCount((value) => value + 1);
    if (correct) setCorrectCount((value) => value + 1);
    setSession((value) => {
      const remaining = value.targets[current.id] ?? 1;
      const nextRemaining = correct
        ? Math.max(0, remaining - 1)
        : Math.max(2, remaining);
      return {
        ...value,
        targets: {
          ...value.targets,
          [current.id]: nextRemaining,
        },
      };
    });
    const result = {
      itemId: current.id,
      correct,
      activity: "quiz" as const,
      timestamp: Date.now(),
    };
    recordAnswer(result, difficulty);
    if (correct)
      triggerXpFloat(getXpForAnswer(result, difficulty), cardRef.current);
  };

  const next = () => {
    if (!answered) return;
    const remaining = session.targets[current.id] ?? 0;
    const willFinish = session.queue.length === 1 && remaining <= 0;
    setSession((value) => {
      const [answeredItem, ...rest] = value.queue;
      if (!answeredItem) return value;
      const nextRemaining = value.targets[answeredItem.id] ?? 0;
      const completedIds =
        nextRemaining <= 0 && !value.completedIds.includes(answeredItem.id)
          ? [...value.completedIds, answeredItem.id]
          : value.completedIds;
      return {
        ...value,
        queue: nextRemaining > 0 ? [...rest, answeredItem] : rest,
        completedIds,
      };
    });
    if (willFinish) recordDailyTaskCompletion(location.pathname);
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
            Mastered {liveCompletedIds.length} / {session.itemIds.length}
          </span>
          <div
            className="flex min-w-0 flex-wrap gap-1"
            aria-label={`${liveCompletedIds.length} of ${session.itemIds.length} target items mastered`}
          >
            {session.itemIds.map((itemId) => (
              <span
                key={itemId}
                className={`h-2 w-2 shrink-0 rounded-full ${
                  liveCompleted.has(itemId)
                    ? "bg-emerald-500"
                    : current.id === itemId
                      ? "bg-primary"
                      : "bg-slate-300"
                }`}
              />
            ))}
          </div>
          <span className="shrink-0 text-xs font-bold text-muted">
            {session.queue.length} in loop
          </span>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div
          ref={cardRef}
          className="rounded-lg border border-line bg-white p-5 shadow-soft"
        >
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
                {session.queue.length === 1 &&
                (session.targets[current.id] ?? 0) <= 0
                  ? "Finish quiz"
                  : "Next question"}{" "}
                <ArrowRight size={18} />
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
  const [tool, setTool] = useState<"pencil" | "eraser">("pencil");

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

    context.save();
    context.globalCompositeOperation =
      tool === "eraser" ? "destination-out" : "source-over";
    context.strokeStyle = "#111827";
    context.lineWidth = tool === "eraser" ? 18 : 4;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(lastPoint.x, lastPoint.y);
    context.lineTo(point.x, point.y);
    context.stroke();
    context.restore();
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
        <div className="flex flex-wrap gap-2">
          <Button
            variant={tool === "pencil" ? "primary" : "secondary"}
            className="min-h-9 px-3 py-2 text-xs"
            onClick={() => setTool("pencil")}
            type="button"
          >
            <PencilLine size={15} />
            Pencil
          </Button>
          <Button
            variant={tool === "eraser" ? "primary" : "secondary"}
            className="min-h-9 px-3 py-2 text-xs"
            onClick={() => setTool("eraser")}
            type="button"
          >
            <Eraser size={15} />
            Eraser
          </Button>
          <Button
            variant="secondary"
            className="min-h-9 px-3 py-2 text-xs"
            onClick={clearCanvas}
            type="button"
          >
            <RotateCcw size={15} />
            Clear
          </Button>
        </div>
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
      return (
        getQuizPriority(a.item, progress, now) -
          getQuizPriority(b.item, progress, now) || a.order - b.order
      );
    })
    .map(({ item }) => item);
}

function createQuizSession(
  items: MCQ[],
  progress: Record<string, ItemProgress>,
): QuizSession {
  const now = Date.now();
  const sorted = sortQuizItems(items, progress);
  const targetItems =
    sorted.filter((item) => getQuizPriority(item, progress, now) < 2) || [];
  const queue = targetItems.length > 0 ? targetItems : sorted;
  const targets = Object.fromEntries(
    queue.map((item) => [item.id, getCorrectsNeeded(progress[item.id])]),
  );
  return {
    queue,
    targets,
    itemIds: queue.map((item) => item.id),
    completedIds: [],
  };
}

function getQuizPriority(
  item: MCQ,
  progress: Record<string, ItemProgress>,
  now: number,
) {
  const itemProgress = progress[item.id];
  if (itemProgress && itemProgress.nextDue <= now) return 0;
  if (!itemProgress || !isKnown(itemProgress)) return 1;
  return 2;
}

function getCorrectsNeeded(progress?: ItemProgress) {
  if (!progress) return 2;
  if (isKnown(progress)) return 1;
  return Math.max(1, 2 - progress.correctCount);
}
