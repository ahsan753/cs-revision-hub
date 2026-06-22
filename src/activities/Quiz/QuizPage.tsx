import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
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
  getScopeBackPath,
  getScopeLabel,
  parseScope,
} from "../../content/contentIndex";
import type { MCQ } from "../../data/contentTypes";
import { getMasteryForItemIds } from "../../store/mastery";
import type { ItemProgress } from "../../store/progressStore";
import { isKnown, useProgressStore } from "../../store/progressStore";
import { shuffle } from "../shared/activityUtils";
import { WorkingOutBox } from "../shared/WorkingOutBox";

interface QuizSession {
  queue: MCQ[];
  targets: Record<string, number>;
  itemIds: string[];
  completedIds: string[];
}

interface QuizPageState {
  session: QuizSession;
  selected: number | null;
  answered: boolean;
  answerResults: Record<string, "correct" | "incorrect">;
  correctCount: number;
  answeredCount: number;
}

export function QuizPage() {
  const { scope: scopeParam } = useParams();
  const location = useLocation();
  const scopeKey = scopeParam ?? "mixed";
  const scope = useMemo(() => parseScope(scopeParam), [scopeParam]);
  const backPath = getScopeBackPath(scope);
  const progress = useProgressStore((state) => state.itemProgress);
  const recordAnswer = useProgressStore((state) => state.recordAnswer);
  const recordDailyTaskCompletion = useProgressStore(
    (state) => state.recordDailyTaskCompletion,
  );
  const progressRef = useRef(progress);
  const selectedOptionRef = useRef<HTMLButtonElement | null>(null);
  const submittedQuestionRef = useRef<string | null>(null);
  progressRef.current = progress;
  const { triggerXpFloat } = useXpFloat();
  const sourceItems = useMemo(
    () =>
      getMcqsForScope(scope).filter(
        (item) => (item.type ?? "single") === "single",
      ),
    [scope],
  );
  const initialQuizState = useMemo(
    () => restoreQuizPageState(scopeKey, sourceItems, progress),
    [progress, scopeKey, sourceItems],
  );
  const [session, setSession] = useState(initialQuizState.session);

  const [selected, setSelected] = useState<number | null>(
    initialQuizState.selected,
  );
  const [answered, setAnswered] = useState(initialQuizState.answered);
  const [answerResults, setAnswerResults] = useState(
    initialQuizState.answerResults,
  );
  const [correctCount, setCorrectCount] = useState(
    initialQuizState.correctCount,
  );
  const [answeredCount, setAnsweredCount] = useState(
    initialQuizState.answeredCount,
  );

  useEffect(() => {
    const restored = restoreQuizPageState(
      scopeKey,
      sourceItems,
      progressRef.current,
    );
    setSession(restored.session);
    setSelected(restored.selected);
    setAnswered(restored.answered);
    setAnswerResults(restored.answerResults);
    setCorrectCount(restored.correctCount);
    setAnsweredCount(restored.answeredCount);
    submittedQuestionRef.current = restored.answered
      ? (restored.session.queue[0]?.id ?? null)
      : null;
    selectedOptionRef.current = null;
  }, [scopeKey, sourceItems]);

  const current = session.queue[0];
  const mastery = getMasteryForItemIds(session.itemIds, progress);
  const currentQuestionIndex = current
    ? Math.max(0, session.itemIds.indexOf(current.id))
    : 0;
  const finished = sourceItems.length > 0 && session.queue.length === 0;

  useEffect(() => {
    if (sourceItems.length === 0) return;
    if (finished) {
      clearStoredQuizPageState(scopeKey);
      return;
    }
    saveQuizPageState(scopeKey, {
      session,
      selected,
      answered,
      answerResults,
      correctCount,
      answeredCount,
    });
  }, [
    answered,
    answerResults,
    answeredCount,
    correctCount,
    finished,
    scopeKey,
    selected,
    session,
    sourceItems.length,
  ]);

  if (sourceItems.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-white p-6 shadow-soft">
        <h1 className="text-xl font-extrabold">No quiz questions available</h1>
        <Link
          className="mt-4 inline-flex text-primary hover:underline"
          to={backPath}
        >
          Back to overview
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
              setAnswerResults({});
              submittedQuestionRef.current = null;
              selectedOptionRef.current = null;
              setCorrectCount(0);
              setAnsweredCount(0);
            }}
          >
            Practise again
          </Button>
          <Link to={backPath}>
            <Button>Back to overview</Button>
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
    if (
      selected === null ||
      answered ||
      submittedQuestionRef.current === current.id
    )
      return;
    submittedQuestionRef.current = current.id;
    const correct = selected === correctIndex;
    const difficulty = getDefaultDifficulty(current.difficulty);
    setAnswered(true);
    setAnsweredCount((value) => value + 1);
    if (correct) setCorrectCount((value) => value + 1);
    setAnswerResults((value) => ({
      ...value,
      [current.id]: correct ? "correct" : "incorrect",
    }));
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
      ranked: {
        rankedItemId: current.id,
        submitted: { kind: "mcq" as const, selectedIndex: selected },
      },
    };
    recordAnswer(result, difficulty, {
      onRankedXpPreview: (amount) =>
        triggerXpFloat(amount, selectedOptionRef.current),
    });
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
    selectedOptionRef.current = null;
    setAnswered(false);
    submittedQuestionRef.current = null;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-line bg-white p-4 shadow-soft lg:flex-row lg:items-center lg:justify-between">
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
            <h1 className="text-xl font-extrabold">Quiz</h1>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-center md:justify-end">
          <span className="shrink-0 text-sm font-extrabold">
            Question {currentQuestionIndex + 1} / {session.itemIds.length}
          </span>
          <div
            className="flex min-w-0 flex-wrap gap-1"
            aria-label="Question results: green is correct, red is incorrect, blue is current, grey is unanswered"
          >
            {session.itemIds.map((itemId, index) => {
              const result = answerResults[itemId];
              const dotLabel = getQuestionResultLabel(
                index,
                result,
                current.id === itemId,
              );
              return (
                <span
                  key={itemId}
                  role="img"
                  aria-label={dotLabel}
                  title={dotLabel}
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    result === "correct"
                      ? "bg-emerald-500"
                      : result === "incorrect"
                        ? "bg-rose-500"
                        : current.id === itemId
                          ? "bg-primary"
                          : "bg-slate-300"
                  }`}
                />
              );
            })}
          </div>
          <span className="shrink-0 text-xs font-bold text-muted">
            {session.queue.length} in loop
          </span>
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
                  onClick={(event) => {
                    if (answered) return;
                    selectedOptionRef.current = event.currentTarget;
                    setSelected(optionIndex);
                  }}
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

function sortQuizItems(
  items: MCQ[],
  progress: Record<string, ItemProgress>,
): MCQ[] {
  const now = Date.now();
  const priorityBuckets = new Map<number, MCQ[]>();
  for (const item of items) {
    const priority = getQuizPriority(item, progress, now);
    priorityBuckets.set(priority, [
      ...(priorityBuckets.get(priority) ?? []),
      item,
    ]);
  }
  return [...priorityBuckets.keys()]
    .sort((a, b) => a - b)
    .flatMap((priority) => shuffle(priorityBuckets.get(priority) ?? []));
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

type StoredQuizPageState = {
  version: 1;
  session: {
    queueIds: string[];
    targets: Record<string, number>;
    itemIds: string[];
    completedIds: string[];
  };
  selected: number | null;
  answered: boolean;
  answerResults?: Record<string, "correct" | "incorrect">;
  correctCount: number;
  answeredCount: number;
};

function createQuizPageState(
  items: MCQ[],
  progress: Record<string, ItemProgress>,
): QuizPageState {
  return {
    session: createQuizSession(items, progress),
    selected: null,
    answered: false,
    answerResults: {},
    correctCount: 0,
    answeredCount: 0,
  };
}

function quizStorageKey(scopeKey: string) {
  return `csrh:v1:quiz:${encodeURIComponent(scopeKey)}`;
}

function restoreQuizPageState(
  scopeKey: string,
  items: MCQ[],
  progress: Record<string, ItemProgress>,
): QuizPageState {
  if (typeof window === "undefined")
    return createQuizPageState(items, progress);
  try {
    const raw = window.localStorage.getItem(quizStorageKey(scopeKey));
    if (!raw) return createQuizPageState(items, progress);
    const parsed = JSON.parse(raw) as StoredQuizPageState;
    if (parsed.version !== 1) return createQuizPageState(items, progress);

    const byId = new Map(items.map((item) => [item.id, item]));
    const queue = parsed.session.queueIds
      .map((id) => byId.get(id))
      .filter((item): item is MCQ => Boolean(item));
    if (queue.length === 0) return createQuizPageState(items, progress);

    const itemIds = parsed.session.itemIds.filter((id) => byId.has(id));
    const completedIds = parsed.session.completedIds.filter((id) =>
      itemIds.includes(id),
    );
    const answerResults = Object.fromEntries(
      Object.entries(parsed.answerResults ?? {}).filter(
        (entry): entry is [string, "correct" | "incorrect"] =>
          itemIds.includes(entry[0]) &&
          (entry[1] === "correct" || entry[1] === "incorrect"),
      ),
    );
    const currentOptions = queue[0]?.options ?? [];
    const selected =
      typeof parsed.selected === "number" &&
      parsed.selected >= 0 &&
      parsed.selected < currentOptions.length
        ? parsed.selected
        : null;

    return {
      session: {
        queue,
        targets: parsed.session.targets,
        itemIds: itemIds.length ? itemIds : queue.map((item) => item.id),
        completedIds,
      },
      selected,
      answered: Boolean(parsed.answered && selected !== null),
      answerResults,
      correctCount: Math.max(0, parsed.correctCount),
      answeredCount: Math.max(0, parsed.answeredCount),
    };
  } catch {
    return createQuizPageState(items, progress);
  }
}

function saveQuizPageState(scopeKey: string, state: QuizPageState) {
  if (typeof window === "undefined") return;
  const stored: StoredQuizPageState = {
    version: 1,
    session: {
      queueIds: state.session.queue.map((item) => item.id),
      targets: state.session.targets,
      itemIds: state.session.itemIds,
      completedIds: state.session.completedIds,
    },
    selected: state.selected,
    answered: state.answered,
    answerResults: state.answerResults,
    correctCount: state.correctCount,
    answeredCount: state.answeredCount,
  };
  try {
    window.localStorage.setItem(
      quizStorageKey(scopeKey),
      JSON.stringify(stored),
    );
  } catch {
    // Losing an in-progress quiz is non-fatal; mastery records still persist.
  }
}

function clearStoredQuizPageState(scopeKey: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(quizStorageKey(scopeKey));
  } catch {
    // Ignore storage cleanup failures.
  }
}

function getQuestionResultLabel(
  index: number,
  result: "correct" | "incorrect" | undefined,
  current: boolean,
) {
  if (result === "correct") return `Question ${index + 1}: correct`;
  if (result === "incorrect") return `Question ${index + 1}: incorrect`;
  if (current) return `Question ${index + 1}: current question`;
  return `Question ${index + 1}: unanswered`;
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
