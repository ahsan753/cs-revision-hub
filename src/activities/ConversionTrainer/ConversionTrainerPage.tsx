import {
  ArrowLeft,
  CheckCircle2,
  Calculator,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { useXpFloat } from "../../hooks/useXpFloat";
import { getXpForAnswer, useProgressStore } from "../../store/progressStore";
import { normaliseText } from "../shared/activityUtils";
import { WorkingOutBox } from "../shared/WorkingOutBox";

type Mode =
  | "denary-binary"
  | "binary-denary"
  | "denary-hex"
  | "hex-denary"
  | "binary-add"
  | "shift"
  | "twos-complement"
  | "file-size";

interface Problem {
  id: string;
  prompt: string;
  answer: string;
  accept: string[];
  working: string[];
}

const modes: { id: Mode; label: string }[] = [
  { id: "denary-binary", label: "Denary to binary" },
  { id: "binary-denary", label: "Binary to denary" },
  { id: "denary-hex", label: "Denary to hex" },
  { id: "hex-denary", label: "Hex to denary" },
  { id: "binary-add", label: "8-bit addition" },
  { id: "shift", label: "Logical shift" },
  { id: "twos-complement", label: "Two's complement" },
  { id: "file-size", label: "File size" },
];

export function ConversionTrainerPage() {
  const location = useLocation();
  const [mode, setMode] = useState<Mode>("denary-binary");
  const [problem, setProblem] = useState(() =>
    generateProblem("denary-binary"),
  );
  const [problemNonce, setProblemNonce] = useState(0);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<{
    correct: boolean;
    message: string;
  } | null>(null);
  const recordAnswer = useProgressStore((state) => state.recordAnswer);
  const { triggerXpFloat } = useXpFloat();
  const recordDailyTaskCompletion = useProgressStore(
    (state) => state.recordDailyTaskCompletion,
  );
  const awardedProblemKeysRef = useRef<Set<string>>(new Set());
  const problemKey = `${problem.id}:${problemNonce}`;
  const submittedState = result
    ? result.correct
      ? "correct"
      : "incorrect"
    : null;
  const answerFieldClass =
    submittedState === "correct"
      ? "border-emerald-400 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-100 focus:border-emerald-500"
      : submittedState === "incorrect"
        ? "border-rose-400 bg-rose-50 text-rose-950 ring-2 ring-rose-100 focus:border-rose-500"
        : "border-line focus:border-primary";

  const setModeAndProblem = (nextMode: Mode) => {
    setMode(nextMode);
    setProblem(generateProblem(nextMode));
    setProblemNonce((value) => value + 1);
    setAnswer("");
    setResult(null);
  };

  const nextProblem = () => {
    setProblem(generateProblem(mode));
    setProblemNonce((value) => value + 1);
    setAnswer("");
    setResult(null);
  };

  const check = (anchorEl?: HTMLElement | null) => {
    if (result?.correct || awardedProblemKeysRef.current.has(problemKey))
      return;
    const correct = problem.accept
      .map(normaliseText)
      .includes(normaliseText(answer));
    if (correct) awardedProblemKeysRef.current.add(problemKey);
    setResult({
      correct,
      message: correct
        ? "Correct drill answer."
        : `Expected: ${problem.answer}`,
    });
    const answerResult = {
      itemId: getMasteryItemId(mode, problem),
      correct,
      activity: "convert" as const,
      timestamp: Date.now(),
    };
    recordAnswer(answerResult, 2);
    if (correct) triggerXpFloat(getXpForAnswer(answerResult, 2), anchorEl);
    recordDailyTaskCompletion(location.pathname);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-lg border border-line bg-white p-4 shadow-soft">
        <Link
          to="/"
          className="grid h-10 w-10 place-items-center rounded-lg hover:bg-slate-100"
          aria-label="Back to dashboard"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <p className="text-sm font-bold text-muted">
            Unit 1 Data Representation
          </p>
          <h1 className="text-xl font-extrabold">Conversion trainer</h1>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-[280px_1fr_340px]">
        <aside className="rounded-lg border border-line bg-white p-3 shadow-soft">
          <h2 className="px-2 py-2 text-sm font-extrabold uppercase text-muted">
            Modes
          </h2>
          <div className="space-y-2">
            {modes.map((item) => (
              <button
                key={item.id}
                className={`w-full rounded-lg px-3 py-3 text-left text-sm font-bold transition ${mode === item.id ? "bg-indigo-50 text-primary" : "hover:bg-slate-50"}`}
                onClick={() => setModeAndProblem(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </aside>

        <div className="rounded-lg border border-line bg-white p-5 shadow-soft">
          <div className="mb-5 flex items-start gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-violet-50 text-primary">
              <Calculator size={25} />
            </div>
            <div>
              <p className="text-sm font-bold text-muted">
                {modes.find((item) => item.id === mode)?.label}
              </p>
              <h2 className="mt-1 text-2xl font-extrabold">{problem.prompt}</h2>
            </div>
          </div>

          <label className="block">
            <span className="text-sm font-bold text-muted">Your answer</span>
            <input
              className={`mt-2 min-h-12 w-full rounded-lg border px-4 font-mono text-lg font-bold transition ${answerFieldClass}`}
              value={answer}
              onChange={(event) => {
                setAnswer(event.target.value);
                setResult(null);
              }}
              placeholder="Type your answer"
              aria-invalid={submittedState === "incorrect" ? true : undefined}
              readOnly={result?.correct}
            />
          </label>

          <WorkingOutBox itemId={problemKey} />

          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              variant={
                result ? (result.correct ? "success" : "danger") : "primary"
              }
              onClick={(event) => check(event.currentTarget)}
              disabled={!answer.trim() || result?.correct}
            >
              {result ? (
                result.correct ? (
                  <CheckCircle2 className="animate-result-pop" size={18} />
                ) : (
                  <XCircle size={18} />
                )
              ) : null}
              {result
                ? result.correct
                  ? "Correct"
                  : "Try again"
                : "Check answer"}
            </Button>
            <Button variant="ghost" onClick={nextProblem}>
              <RefreshCw size={17} /> New problem
            </Button>
          </div>
        </div>

        <aside
          className="rounded-lg border border-line bg-white shadow-soft"
          aria-live="polite"
        >
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
                <Calculator size={18} />
              )}
              {result ? (result.correct ? "Correct" : "Try again") : "Working"}
            </div>
          </div>
          <div className="space-y-4 p-4">
            <p className="text-sm font-bold text-muted">
              {result?.message ??
                "Check your answer to reveal the worked solution."}
            </p>
            {result ? (
              <div className="space-y-2 rounded-lg bg-slate-50 p-3 font-mono text-xs leading-6">
                {problem.working.map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </div>
            ) : null}
          </div>
        </aside>
      </section>
    </div>
  );
}

function generateProblem(mode: Mode): Problem {
  if (mode === "denary-binary") {
    const value = rand(1, 255);
    const answer = toBinary8(value);
    return {
      id: `${mode}-${value}`,
      prompt: `Convert denary ${value} to 8-bit binary.`,
      answer,
      accept: [answer, answer.replace(/\s/g, "")],
      working: [
        `${value} = ${placeValues(value).join(" + ")}`,
        `8-bit binary = ${answer}`,
      ],
    };
  }
  if (mode === "binary-denary") {
    const value = rand(1, 255);
    const binary = toBinary8(value);
    return {
      id: `${mode}-${value}`,
      prompt: `Convert binary ${binary} to denary.`,
      answer: String(value),
      accept: [String(value)],
      working: [
        `${binary} = ${placeValues(value).join(" + ")}`,
        `Denary = ${value}`,
      ],
    };
  }
  if (mode === "denary-hex") {
    const value = rand(1, 255);
    const answer = value.toString(16).toUpperCase().padStart(2, "0");
    return {
      id: `${mode}-${value}`,
      prompt: `Convert denary ${value} to hexadecimal.`,
      answer,
      accept: [answer],
      working: [
        `${value} ÷ 16 = ${Math.floor(value / 16)} remainder ${value % 16}`,
        `Hex = ${answer}`,
      ],
    };
  }
  if (mode === "hex-denary") {
    const value = rand(1, 255);
    const hex = value.toString(16).toUpperCase().padStart(2, "0");
    return {
      id: `${mode}-${hex}`,
      prompt: `Convert hexadecimal ${hex} to denary.`,
      answer: String(value),
      accept: [String(value)],
      working: [
        `${hex[0]} x 16 + ${hex[1]} = ${parseInt(hex[0], 16) * 16} + ${parseInt(hex[1], 16)}`,
        `Denary = ${value}`,
      ],
    };
  }
  if (mode === "binary-add") {
    const a = rand(1, 180);
    const b = rand(1, 120);
    const total = a + b;
    const overflow = total > 255;
    const result = total % 256;
    const answer = `${toBinary8(result)}${overflow ? " overflow" : ""}`;
    return {
      id: `${mode}-${a}-${b}`,
      prompt: `Add ${toBinary8(a)} + ${toBinary8(b)} in an 8-bit register. Include overflow if it occurs.`,
      answer,
      accept: overflow
        ? [answer, `${toBinary8(result)} with overflow`]
        : [answer, toBinary8(result)],
      working: [
        `${a} + ${b} = ${total}`,
        `8-bit stored result = ${toBinary8(result)}`,
        `Overflow = ${overflow ? "yes" : "no"}`,
      ],
    };
  }
  if (mode === "shift") {
    const value = rand(4, 120);
    const left = Math.random() > 0.5;
    const result = left ? (value * 2) % 256 : Math.floor(value / 2);
    return {
      id: `${mode}-${value}-${left}`,
      prompt: `Apply a logical ${left ? "left" : "right"} shift of one place to ${toBinary8(value)}.`,
      answer: toBinary8(result),
      accept: [toBinary8(result), toBinary8(result).replace(/\s/g, "")],
      working: [
        left ? "Left shift multiplies by 2." : "Right shift divides by 2.",
        `${value} becomes ${result}`,
        `Result = ${toBinary8(result)}`,
      ],
    };
  }
  if (mode === "twos-complement") {
    const value = rand(-64, 63);
    const stored = value < 0 ? 256 + value : value;
    return {
      id: `${mode}-${value}`,
      prompt: `Represent ${value} as 8-bit two's complement.`,
      answer: toBinary8(stored),
      accept: [toBinary8(stored), toBinary8(stored).replace(/\s/g, "")],
      working:
        value < 0
          ? [`256 + (${value}) = ${stored}`, `Binary = ${toBinary8(stored)}`]
          : [
              `Positive values use normal 8-bit binary.`,
              `Binary = ${toBinary8(stored)}`,
            ],
    };
  }
  const image = Math.random() > 0.5;
  if (image) {
    const width = [640, 800, 1024][rand(0, 2)];
    const height = [480, 600, 768][rand(0, 2)];
    const depth = [8, 16, 24][rand(0, 2)];
    const bytes = (width * height * depth) / 8;
    const kib = Math.round(bytes / 1024);
    return {
      id: `${mode}-image-${width}`,
      prompt: `Calculate the file size in KiB for a ${width} x ${height} bitmap image with ${depth}-bit colour depth.`,
      answer: `${kib} KiB`,
      accept: [String(kib), `${kib} KiB`, `${kib} kib`],
      working: [
        `${width} x ${height} x ${depth} bits`,
        `÷ 8 = ${bytes} bytes`,
        `÷ 1024 = ${kib} KiB`,
      ],
    };
  }
  const rate = [8000, 11025, 22050][rand(0, 2)];
  const resolution = [8, 16][rand(0, 1)];
  const seconds = rand(5, 20);
  const bytes = (rate * resolution * seconds) / 8;
  const kib = Math.round(bytes / 1024);
  return {
    id: `${mode}-sound-${rate}`,
    prompt: `Calculate the file size in KiB for ${seconds}s sound at ${rate} Hz and ${resolution}-bit sample resolution.`,
    answer: `${kib} KiB`,
    accept: [String(kib), `${kib} KiB`, `${kib} kib`],
    working: [
      `${rate} x ${resolution} x ${seconds} bits`,
      `÷ 8 = ${bytes} bytes`,
      `÷ 1024 = ${kib} KiB`,
    ],
  };
}

function getMasteryItemId(mode: Mode, problem: Problem) {
  if (mode === "denary-binary") return "u1-mcq-2";
  if (mode === "binary-denary") return "u1-mcq-1";
  if (mode === "denary-hex") return "u1-mcq-4";
  if (mode === "hex-denary") return "u1-mcq-3";
  if (mode === "binary-add") return "u1-mcq-7";
  if (mode === "shift") return "u1-mcq-8";
  if (mode === "twos-complement") return "u1-fc-9";
  if (mode === "file-size" && problem.id.includes("-sound-"))
    return "u1-mcq-10";
  return "u1-mcq-12";
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function toBinary8(value: number) {
  return value
    .toString(2)
    .padStart(8, "0")
    .replace(/(.{4})/, "$1 ");
}

function placeValues(value: number) {
  return [128, 64, 32, 16, 8, 4, 2, 1].filter((place) => (value & place) !== 0);
}
