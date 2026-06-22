import {
  ArrowLeft,
  CheckCircle2,
  Code2,
  GripVertical,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { Reorder } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { useXpFloat } from "../../hooks/useXpFloat";
import {
  getCodeTasksForScope,
  getDefaultDifficulty,
  getScopeBackPath,
  getScopeLabel,
  parseScope,
} from "../../content/contentIndex";
import type {
  CodeTask,
  FillBlankTask,
  ParsonsTask,
  PredictOutputTask,
} from "../../data/contentTypes";
import type { RankedSubmission } from "../../ranked/rankedTypes";
import { useProgressStore } from "../../store/progressStore";
import { normaliseText, shuffle } from "../shared/activityUtils";
import { shouldSubmitRankedAttempt } from "../shared/rewardEligibility";

type CodeLabResult = { correct: boolean; message: string };
type ParsonsLineItem = { id: string; line: string };
type CodeLabDraft = {
  predictAnswer?: string;
  blankAnswers?: Record<string, string>;
  parsonsItems?: ParsonsLineItem[];
  result?: CodeLabResult | null;
};

export function CodeLabPage() {
  const { scope: scopeParam } = useParams();
  const location = useLocation();
  const scope = useMemo(() => parseScope(scopeParam), [scopeParam]);
  const tasks = useMemo(() => shuffle(getCodeTasksForScope(scope)), [scope]);
  const backPath = getScopeBackPath(scope);
  const [index, setIndex] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, CodeLabDraft>>({});
  const correctTaskIdsRef = useRef<Set<string>>(new Set());
  const revealedAnswerTaskIdsRef = useRef<Set<string>>(new Set());
  const recordAnswer = useProgressStore((state) => state.recordAnswer);
  const { triggerXpFloat } = useXpFloat();
  const recordDailyTaskCompletion = useProgressStore(
    (state) => state.recordDailyTaskCompletion,
  );
  const task = tasks[index];
  const taskDraft = task ? (drafts[task.id] ?? {}) : {};
  const result = taskDraft.result ?? null;

  useEffect(() => {
    setIndex(0);
    setDrafts({});
    correctTaskIdsRef.current = new Set();
    revealedAnswerTaskIdsRef.current = new Set();
  }, [tasks]);

  const updateDraft = (taskId: string, patch: Partial<CodeLabDraft>) => {
    setDrafts((value) => ({
      ...value,
      [taskId]: {
        ...value[taskId],
        ...patch,
      },
    }));
  };

  const report = (
    correct: boolean,
    message: string,
    submitted: RankedSubmission,
    anchorEl?: HTMLElement | null,
  ) => {
    if (!task) return;
    const answerRevealedBeforeAttempt = revealedAnswerTaskIdsRef.current.has(
      task.id,
    );
    if (correct && correctTaskIdsRef.current.has(task.id)) return;
    if (correct) correctTaskIdsRef.current.add(task.id);
    if (!correct) revealedAnswerTaskIdsRef.current.add(task.id);
    const difficulty = getDefaultDifficulty(task.difficulty);
    updateDraft(task.id, { result: { correct, message } });
    const result = {
      itemId: task.id,
      correct,
      activity: "code" as const,
      timestamp: Date.now(),
      ranked: shouldSubmitRankedAttempt({ answerRevealedBeforeAttempt })
        ? {
            rankedItemId: task.id,
            submitted,
          }
        : undefined,
    };
    recordAnswer(result, difficulty, {
      onRankedXpPreview: (amount) => triggerXpFloat(amount, anchorEl),
    });
    recordDailyTaskCompletion(location.pathname);
  };

  if (!task) {
    return (
      <div className="rounded-lg border border-line bg-white p-6 shadow-soft">
        <h1 className="text-xl font-extrabold">No code tasks available</h1>
        <p className="mt-2 text-sm text-muted">
          Code Lab appears for Units 7 and 8 content.
        </p>
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
            <h1 className="text-xl font-extrabold">Code Lab</h1>
          </div>
        </div>
        <div className="text-sm font-extrabold text-primary">
          Task {index + 1} / {tasks.length}
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="rounded-lg border border-line bg-white p-5 shadow-soft">
          <div className="mb-5 flex items-start gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-indigo-50 text-primary">
              <Code2 size={25} />
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase text-muted">
                {task.language} / {task.type}
              </p>
              <h2 className="mt-1 text-xl font-extrabold">{task.prompt}</h2>
            </div>
          </div>

          <TaskRenderer
            key={task.id}
            task={task}
            draft={taskDraft}
            result={result}
            updateDraft={(patch) => updateDraft(task.id, patch)}
            onResult={report}
          />
        </div>

        <aside className="rounded-lg border border-line bg-white shadow-soft">
          <div
            className={`border-b border-line p-4 ${result ? (result.correct ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700") : "bg-slate-50 text-muted"}`}
          >
            <div className="flex items-center gap-2 text-sm font-extrabold">
              {result ? (
                result.correct ? (
                  <CheckCircle2 size={18} />
                ) : (
                  <XCircle size={18} />
                )
              ) : (
                <Code2 size={18} />
              )}
              {result ? (result.correct ? "Correct" : "Review it") : "Feedback"}
            </div>
          </div>
          <div className="space-y-4 p-4">
            <p className="text-sm leading-6 text-muted">
              {result?.message ??
                "Submit the task to see feedback and update mastery."}
            </p>
            {result && "trace" in task && task.trace?.length ? (
              <div>
                <p className="text-xs font-extrabold uppercase text-muted">
                  Step table
                </p>
                <div className="mt-2 space-y-1 rounded-lg bg-slate-50 p-3 font-mono text-xs">
                  {task.trace.map((line) => (
                    <div key={line}>{line}</div>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="flex gap-2">
              <Button
                variant="secondary"
                disabled={index === 0}
                onClick={() => {
                  setIndex((value) => Math.max(0, value - 1));
                }}
              >
                Previous
              </Button>
              <Button
                disabled={index === tasks.length - 1}
                onClick={() => {
                  setIndex((value) => Math.min(tasks.length - 1, value + 1));
                }}
              >
                Next
              </Button>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

function TaskRenderer({
  task,
  draft,
  result,
  updateDraft,
  onResult,
}: {
  task: CodeTask;
  draft: CodeLabDraft;
  result: CodeLabResult | null;
  updateDraft: (patch: Partial<CodeLabDraft>) => void;
  onResult: (
    correct: boolean,
    message: string,
    submitted: RankedSubmission,
    anchorEl?: HTMLElement | null,
  ) => void;
}) {
  if (task.type === "predict-output")
    return (
      <PredictOutput
        task={task}
        draft={draft}
        result={result}
        updateDraft={updateDraft}
        onResult={onResult}
      />
    );
  if (task.type === "fill-blank")
    return (
      <FillBlank
        task={task}
        draft={draft}
        result={result}
        updateDraft={updateDraft}
        onResult={onResult}
      />
    );
  return (
    <Parsons
      task={task}
      draft={draft}
      result={result}
      updateDraft={updateDraft}
      onResult={onResult}
    />
  );
}

function PredictOutput({
  task,
  draft,
  result,
  updateDraft,
  onResult,
}: {
  task: PredictOutputTask;
  draft: CodeLabDraft;
  result: CodeLabResult | null;
  updateDraft: (patch: Partial<CodeLabDraft>) => void;
  onResult: (
    correct: boolean,
    message: string,
    submitted: RankedSubmission,
    anchorEl?: HTMLElement | null,
  ) => void;
}) {
  const answer = draft.predictAnswer ?? "";
  const accept = [task.answer, ...(task.accept ?? [])].map(normaliseText);
  const submittedState = result
    ? result.correct
      ? "correct"
      : "incorrect"
    : null;
  const fieldStateClass =
    submittedState === "correct"
      ? "border-emerald-400 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-100 focus:border-emerald-500"
      : submittedState === "incorrect"
        ? "border-rose-400 bg-rose-50 text-rose-950 ring-2 ring-rose-100 focus:border-rose-500"
        : "border-line focus:border-primary";
  const check = (anchorEl?: HTMLElement | null) => {
    const correct = accept.includes(normaliseText(answer));
    onResult(
      correct,
      correct ? "Output matched." : `Expected: ${task.answer}`,
      { kind: "code-predict", answer },
      anchorEl,
    );
  };
  return (
    <div className="space-y-4">
      <CodeBlock code={task.code} />
      <label className="block">
        <span className="text-sm font-bold text-muted">Output</span>
        <textarea
          className={`mt-2 min-h-28 w-full rounded-lg border p-3 font-mono text-sm transition ${fieldStateClass}`}
          value={answer}
          onChange={(event) => {
            updateDraft({ predictAnswer: event.target.value, result: null });
          }}
          placeholder="Type the exact output"
          aria-invalid={submittedState === "incorrect" ? true : undefined}
          readOnly={result?.correct}
        />
      </label>
      <Button
        variant={result ? (result.correct ? "success" : "danger") : "primary"}
        onClick={(event) => check(event.currentTarget)}
        disabled={result?.correct}
      >
        {result ? (
          result.correct ? (
            <CheckCircle2 className="animate-result-pop" size={18} />
          ) : (
            <XCircle size={18} />
          )
        ) : null}
        {result ? (result.correct ? "Correct" : "Try again") : "Check output"}
      </Button>
    </div>
  );
}

function FillBlank({
  task,
  draft,
  result,
  updateDraft,
  onResult,
}: {
  task: FillBlankTask;
  draft: CodeLabDraft;
  result: CodeLabResult | null;
  updateDraft: (patch: Partial<CodeLabDraft>) => void;
  onResult: (
    correct: boolean,
    message: string,
    submitted: RankedSubmission,
    anchorEl?: HTMLElement | null,
  ) => void;
}) {
  const answers = draft.blankAnswers ?? {};
  const correct = task.blanks.every((blank) => {
    const value = answers[blank.id] ?? "";
    return isBlankAnswerCorrect(task, blank, value);
  });
  return (
    <div className="space-y-4">
      <CodeBlock code={task.template} />
      <div className="grid gap-3 md:grid-cols-2">
        {task.blanks.map((blank) => (
          <label key={blank.id} className="block">
            <span className="text-sm font-bold text-muted">
              Blank {blank.id}
            </span>
            <input
              className={`mt-2 min-h-11 w-full rounded-lg border px-3 font-mono text-sm transition ${blankInputClass(task, blank, answers[blank.id] ?? "", result)}`}
              value={answers[blank.id] ?? ""}
              onChange={(event) => {
                updateDraft({
                  blankAnswers: {
                    ...answers,
                    [blank.id]: event.target.value,
                  },
                  result: null,
                });
              }}
              aria-invalid={
                result &&
                !isBlankAnswerCorrect(task, blank, answers[blank.id] ?? "")
                  ? true
                  : undefined
              }
              readOnly={result?.correct}
            />
          </label>
        ))}
      </div>
      <Button
        variant={result ? (result.correct ? "success" : "danger") : "primary"}
        onClick={(event) =>
          onResult(
            correct,
            correct
              ? "All blanks are correct."
              : "One or more blanks need another look.",
            { kind: "code-fill", answersByBlankId: answers },
            event.currentTarget,
          )
        }
        disabled={result?.correct}
      >
        {result ? (
          result.correct ? (
            <CheckCircle2 className="animate-result-pop" size={18} />
          ) : (
            <XCircle size={18} />
          )
        ) : null}
        {result ? (result.correct ? "Correct" : "Try again") : "Check blanks"}
      </Button>
    </div>
  );
}

function blankInputClass(
  task: FillBlankTask,
  blank: FillBlankTask["blanks"][number],
  value: string,
  result: CodeLabResult | null,
) {
  if (!result) return "border-line focus:border-primary";
  return isBlankAnswerCorrect(task, blank, value)
    ? "border-emerald-400 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-100 focus:border-emerald-500"
    : "border-rose-400 bg-rose-50 text-rose-950 ring-2 ring-rose-100 focus:border-rose-500";
}

function isBlankAnswerCorrect(
  task: FillBlankTask,
  blank: FillBlankTask["blanks"][number],
  value: string,
) {
  const caseSensitive = task.language !== "pseudocode" && blank.caseSensitive;
  return blank.accept.some((accepted) =>
    caseSensitive
      ? value.trim() === accepted
      : normaliseText(value) === normaliseText(accepted),
  );
}

function Parsons({
  task,
  draft,
  result,
  updateDraft,
  onResult,
}: {
  task: ParsonsTask;
  draft: CodeLabDraft;
  result: CodeLabResult | null;
  updateDraft: (patch: Partial<CodeLabDraft>) => void;
  onResult: (
    correct: boolean,
    message: string,
    submitted: RankedSubmission,
    anchorEl?: HTMLElement | null,
  ) => void;
}) {
  const fallbackLines = useMemo(
    () => shuffle([...task.lines, ...(task.distractors ?? [])]),
    [task],
  );
  const fallbackItems = useMemo(
    () =>
      fallbackLines.map((line, index) => ({
        id: `${task.id}-${index}`,
        line,
      })),
    [fallbackLines, task.id],
  );
  const items = draft.parsonsItems ?? fallbackItems;
  const lines = items.map((item) => item.line);
  const hasDistractors = items.length > task.lines.length;
  const reorder = (next: ParsonsLineItem[]) => {
    if (result?.correct) return;
    updateDraft({
      parsonsItems: next,
      result: null,
    });
  };
  const moveItem = (from: number, direction: -1 | 1) => {
    const to = from + direction;
    if (result?.correct || to < 0 || to >= items.length) return;
    const next = [...items];
    [next[from], next[to]] = [next[to], next[from]];
    reorder(next);
  };
  const check = (anchorEl?: HTMLElement | null) => {
    const used = lines.slice(0, task.lines.length);
    const correct =
      used.length === task.lines.length &&
      used.every((line, i) => line === task.lines[i]);
    updateDraft({ parsonsItems: items });
    onResult(
      correct,
      correct
        ? "The algorithm is in the correct order."
        : "Drag the correct lines to the top in the right order. Distractors should stay below.",
      { kind: "code-parsons", lines },
      anchorEl,
    );
  };
  return (
    <div className="space-y-4">
      <p className="text-sm font-bold text-muted">
        Drag the lines needed for the program into the highlighted answer area.
        Any lines below the divider are not used.
      </p>
      <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 p-3 text-xs font-extrabold uppercase text-indigo-700">
        Program answer: top {task.lines.length} lines are checked
      </div>
      <Reorder.Group
        as="div"
        axis="y"
        values={items}
        onReorder={reorder}
        className="space-y-2"
      >
        {items.map((item, index) => (
          <ParsonsLine
            key={item.id}
            item={item}
            index={index}
            answerLength={task.lines.length}
            result={result}
            onKeyboardMove={moveItem}
            isUnusedArea={index >= task.lines.length}
            showUnusedDivider={hasDistractors && index === task.lines.length}
          />
        ))}
      </Reorder.Group>
      <div className="flex gap-2">
        <Button
          variant={result ? (result.correct ? "success" : "danger") : "primary"}
          onClick={(event) => check(event.currentTarget)}
          disabled={result?.correct}
        >
          {result ? (
            result.correct ? (
              <CheckCircle2 className="animate-result-pop" size={18} />
            ) : (
              <XCircle size={18} />
            )
          ) : null}
          {result ? (result.correct ? "Correct" : "Try again") : "Check order"}
        </Button>
        <Button
          variant="ghost"
          disabled={result?.correct}
          onClick={() => {
            updateDraft({
              parsonsItems: shuffle([
                ...task.lines,
                ...(task.distractors ?? []),
              ]).map((line, index) => ({
                id: `${task.id}-shuffle-${Date.now()}-${index}`,
                line,
              })),
              result: null,
            });
          }}
        >
          <RotateCcw size={17} /> Shuffle
        </Button>
      </div>
    </div>
  );
}

function ParsonsLine({
  item,
  index,
  answerLength,
  result,
  onKeyboardMove,
  isUnusedArea,
  showUnusedDivider,
}: {
  item: ParsonsLineItem;
  index: number;
  answerLength: number;
  result: CodeLabResult | null;
  onKeyboardMove: (from: number, direction: -1 | 1) => void;
  isUnusedArea: boolean;
  showUnusedDivider: boolean;
}) {
  const isLocked = Boolean(result?.correct);

  return (
    <Reorder.Item
      as="div"
      value={item}
      layout="position"
      drag={isLocked ? false : "y"}
      dragListener={!isLocked}
      whileDrag={{
        scale: 1.015,
        boxShadow: "0 18px 35px rgba(15, 23, 42, 0.16)",
      }}
      transition={{ type: "spring", stiffness: 520, damping: 38 }}
      tabIndex={isLocked ? -1 : 0}
      role="button"
      aria-label={`Drag line ${index + 1}: ${item.line}. Use arrow keys to reorder.`}
      onKeyDown={(event) => {
        if (event.key === "ArrowUp") {
          event.preventDefault();
          onKeyboardMove(index, -1);
        }
        if (event.key === "ArrowDown") {
          event.preventDefault();
          onKeyboardMove(index, 1);
        }
      }}
      className="group cursor-grab touch-none space-y-2 outline-none active:cursor-grabbing"
    >
      {showUnusedDivider ? (
        <div className="flex items-center gap-3 py-1">
          <div className="h-px flex-1 bg-amber-300" />
          <div className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-extrabold uppercase text-amber-800">
            Not used in this program
          </div>
          <div className="h-px flex-1 bg-amber-300" />
        </div>
      ) : null}
      <div
        className={`flex items-center gap-2 rounded-lg border p-3 transition group-focus-visible:ring-2 group-focus-visible:ring-primary group-focus-visible:ring-offset-2 ${parsonsLineClass(index, answerLength, result)}`}
      >
        <GripVertical
          className="shrink-0 text-slate-400 transition group-hover:text-primary"
          size={18}
          aria-hidden="true"
        />
        <code className="min-w-0 flex-1 whitespace-pre-wrap font-mono text-sm">
          {item.line}
        </code>
        {isUnusedArea ? (
          <span className="hidden shrink-0 rounded-full bg-amber-100 px-2 py-1 text-xs font-extrabold uppercase text-amber-800 sm:inline">
            Not used
          </span>
        ) : null}
      </div>
    </Reorder.Item>
  );
}

function parsonsLineClass(
  index: number,
  answerLength: number,
  result: CodeLabResult | null,
) {
  if (result?.correct && index < answerLength)
    return "border-emerald-200 bg-emerald-50";
  if (result && !result.correct && index < answerLength)
    return "border-rose-200 bg-rose-50";
  return index < answerLength
    ? "border-indigo-200 bg-indigo-50"
    : "border-amber-200 bg-amber-50/70";
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="overflow-auto rounded-lg border border-line bg-slate-950 p-4 text-sm leading-7 text-slate-50">
      <code>{code}</code>
    </pre>
  );
}
