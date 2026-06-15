import { ArrowDown, ArrowLeft, ArrowUp, CheckCircle2, Code2, RotateCcw, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { getCodeTasksForScope, getDefaultDifficulty, getScopeLabel, parseScope } from "../../content/contentIndex";
import type { CodeTask, FillBlankTask, ParsonsTask, PredictOutputTask } from "../../data/contentTypes";
import { useProgressStore } from "../../store/progressStore";
import { normaliseText, shuffle } from "../shared/activityUtils";

export function CodeLabPage() {
  const { scope: scopeParam } = useParams();
  const scope = useMemo(() => parseScope(scopeParam), [scopeParam]);
  const tasks = useMemo(() => getCodeTasksForScope(scope), [scope]);
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<{ correct: boolean; message: string } | null>(null);
  const recordAnswer = useProgressStore((state) => state.recordAnswer);
  const task = tasks[index];

  const report = (correct: boolean, message: string) => {
    if (!task) return;
    setResult({ correct, message });
    recordAnswer(
      {
        itemId: task.id,
        correct,
        activity: "code",
        timestamp: Date.now(),
      },
      getDefaultDifficulty(task.difficulty),
    );
  };

  if (!task) {
    return (
      <div className="rounded-lg border border-line bg-white p-6 shadow-soft">
        <h1 className="text-xl font-extrabold">No code tasks available</h1>
        <p className="mt-2 text-sm text-muted">Code Lab appears for Units 7 and 8 content.</p>
        <Link className="mt-4 inline-flex text-primary hover:underline" to="/">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-line bg-white p-4 shadow-soft md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="grid h-10 w-10 place-items-center rounded-lg hover:bg-slate-100" aria-label="Back to dashboard">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <p className="text-sm font-bold text-muted">{getScopeLabel(scope)}</p>
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

          <TaskRenderer key={task.id} task={task} onResult={report} />
        </div>

        <aside className="rounded-lg border border-line bg-white shadow-soft">
          <div className={`border-b border-line p-4 ${result ? (result.correct ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700") : "bg-slate-50 text-muted"}`}>
            <div className="flex items-center gap-2 text-sm font-extrabold">
              {result ? result.correct ? <CheckCircle2 size={18} /> : <XCircle size={18} /> : <Code2 size={18} />}
              {result ? (result.correct ? "Correct" : "Review it") : "Feedback"}
            </div>
          </div>
          <div className="space-y-4 p-4">
            <p className="text-sm leading-6 text-muted">{result?.message ?? "Submit the task to see feedback and update mastery."}</p>
            {result && "trace" in task && task.trace?.length ? (
              <div>
                <p className="text-xs font-extrabold uppercase text-muted">Step table</p>
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
                  setResult(null);
                }}
              >
                Previous
              </Button>
              <Button
                disabled={index === tasks.length - 1}
                onClick={() => {
                  setIndex((value) => Math.min(tasks.length - 1, value + 1));
                  setResult(null);
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

function TaskRenderer({ task, onResult }: { task: CodeTask; onResult: (correct: boolean, message: string) => void }) {
  if (task.type === "predict-output") return <PredictOutput task={task} onResult={onResult} />;
  if (task.type === "fill-blank") return <FillBlank task={task} onResult={onResult} />;
  return <Parsons task={task} onResult={onResult} />;
}

function PredictOutput({ task, onResult }: { task: PredictOutputTask; onResult: (correct: boolean, message: string) => void }) {
  const [answer, setAnswer] = useState("");
  const accept = [task.answer, ...(task.accept ?? [])].map(normaliseText);
  return (
    <div className="space-y-4">
      <CodeBlock code={task.code} />
      <label className="block">
        <span className="text-sm font-bold text-muted">Output</span>
        <textarea
          className="mt-2 min-h-28 w-full rounded-lg border border-line p-3 font-mono text-sm focus:border-primary"
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          placeholder="Type the exact output"
        />
      </label>
      <Button onClick={() => onResult(accept.includes(normaliseText(answer)), accept.includes(normaliseText(answer)) ? "Output matched." : `Expected: ${task.answer}`)}>
        Check output
      </Button>
    </div>
  );
}

function FillBlank({ task, onResult }: { task: FillBlankTask; onResult: (correct: boolean, message: string) => void }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const correct = task.blanks.every((blank) => {
    const value = answers[blank.id] ?? "";
    return blank.accept.some((accepted) => (blank.caseSensitive ? value.trim() === accepted : normaliseText(value) === normaliseText(accepted)));
  });
  return (
    <div className="space-y-4">
      <CodeBlock code={task.template} />
      <div className="grid gap-3 md:grid-cols-2">
        {task.blanks.map((blank) => (
          <label key={blank.id} className="block">
            <span className="text-sm font-bold text-muted">Blank {blank.id}</span>
            <input
              className="mt-2 min-h-11 w-full rounded-lg border border-line px-3 font-mono text-sm focus:border-primary"
              value={answers[blank.id] ?? ""}
              onChange={(event) => setAnswers((value) => ({ ...value, [blank.id]: event.target.value }))}
            />
          </label>
        ))}
      </div>
      <Button onClick={() => onResult(correct, correct ? "All blanks are correct." : "One or more blanks need another look.")}>
        Check blanks
      </Button>
    </div>
  );
}

function Parsons({ task, onResult }: { task: ParsonsTask; onResult: (correct: boolean, message: string) => void }) {
  const [lines, setLines] = useState(() => shuffle([...task.lines, ...(task.distractors ?? [])]));
  const move = (from: number, direction: -1 | 1) => {
    const to = from + direction;
    if (to < 0 || to >= lines.length) return;
    setLines((value) => {
      const next = [...value];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  };
  const check = () => {
    const used = lines.slice(0, task.lines.length);
    const correct = used.length === task.lines.length && used.every((line, i) => line === task.lines[i]);
    onResult(correct, correct ? "The algorithm is in the correct order." : "Move the correct lines to the top in the right order. Distractors should stay below.");
  };
  return (
    <div className="space-y-4">
      <p className="text-sm font-bold text-muted">Move the correct lines into order at the top. Extra distractor lines can remain below.</p>
      <div className="space-y-2">
        {lines.map((line, index) => (
          <div
            key={`${line}-${index}`}
            className={`flex items-center gap-2 rounded-lg border p-3 ${index < task.lines.length ? "border-indigo-200 bg-indigo-50" : "border-line bg-slate-50"}`}
          >
            <code className="min-w-0 flex-1 whitespace-pre-wrap font-mono text-sm">{line}</code>
            <button className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white" onClick={() => move(index, -1)} aria-label="Move line up">
              <ArrowUp size={17} />
            </button>
            <button className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white" onClick={() => move(index, 1)} aria-label="Move line down">
              <ArrowDown size={17} />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Button onClick={check}>Check order</Button>
        <Button variant="ghost" onClick={() => setLines(shuffle([...task.lines, ...(task.distractors ?? [])]))}>
          <RotateCcw size={17} /> Shuffle
        </Button>
      </div>
    </div>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="overflow-auto rounded-lg border border-line bg-slate-950 p-4 text-sm leading-7 text-slate-50">
      <code>{code}</code>
    </pre>
  );
}

