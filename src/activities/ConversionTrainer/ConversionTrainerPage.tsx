import { ArrowLeft, CheckCircle2, Calculator, RefreshCw, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { useProgressStore } from "../../store/progressStore";
import { normaliseText } from "../shared/activityUtils";

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
  const [mode, setMode] = useState<Mode>("denary-binary");
  const [problem, setProblem] = useState(() => generateProblem("denary-binary"));
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<{ correct: boolean; message: string } | null>(null);
  const recordAnswer = useProgressStore((state) => state.recordAnswer);

  const setModeAndProblem = (nextMode: Mode) => {
    setMode(nextMode);
    setProblem(generateProblem(nextMode));
    setAnswer("");
    setResult(null);
  };

  const nextProblem = () => {
    setProblem(generateProblem(mode));
    setAnswer("");
    setResult(null);
  };

  const check = () => {
    const correct = problem.accept.map(normaliseText).includes(normaliseText(answer));
    setResult({ correct, message: correct ? "Correct drill answer." : `Expected: ${problem.answer}` });
    recordAnswer(
      {
        itemId: `convert-${mode}`,
        correct,
        activity: "convert",
        timestamp: Date.now(),
      },
      2,
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-lg border border-line bg-white p-4 shadow-soft">
        <Link to="/" className="grid h-10 w-10 place-items-center rounded-lg hover:bg-slate-100" aria-label="Back to dashboard">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <p className="text-sm font-bold text-muted">Unit 1 Data Representation</p>
          <h1 className="text-xl font-extrabold">Conversion trainer</h1>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-[280px_1fr_340px]">
        <aside className="rounded-lg border border-line bg-white p-3 shadow-soft">
          <h2 className="px-2 py-2 text-sm font-extrabold uppercase text-muted">Modes</h2>
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
              <p className="text-sm font-bold text-muted">{modes.find((item) => item.id === mode)?.label}</p>
              <h2 className="mt-1 text-2xl font-extrabold">{problem.prompt}</h2>
            </div>
          </div>

          <label className="block">
            <span className="text-sm font-bold text-muted">Your answer</span>
            <input
              className="mt-2 min-h-12 w-full rounded-lg border border-line px-4 font-mono text-lg font-bold focus:border-primary"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="Type your answer"
            />
          </label>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={check} disabled={!answer.trim()}>
              Check answer
            </Button>
            <Button variant="ghost" onClick={nextProblem}>
              <RefreshCw size={17} /> New problem
            </Button>
          </div>
        </div>

        <aside className="rounded-lg border border-line bg-white shadow-soft">
          <div className={`border-b border-line p-4 ${result ? (result.correct ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700") : "bg-slate-50 text-muted"}`}>
            <div className="flex items-center gap-2 text-sm font-extrabold">
              {result ? result.correct ? <CheckCircle2 size={18} /> : <XCircle size={18} /> : <Calculator size={18} />}
              {result ? (result.correct ? "Correct" : "Try again") : "Working"}
            </div>
          </div>
          <div className="space-y-4 p-4">
            <p className="text-sm font-bold text-muted">{result?.message ?? "Check your answer to reveal the worked solution."}</p>
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
      working: [`${value} = ${placeValues(value).join(" + ")}`, `8-bit binary = ${answer}`],
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
      working: [`${binary} = ${placeValues(value).join(" + ")}`, `Denary = ${value}`],
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
      working: [`${value} ÷ 16 = ${Math.floor(value / 16)} remainder ${value % 16}`, `Hex = ${answer}`],
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
      working: [`${hex[0]} x 16 + ${hex[1]} = ${parseInt(hex[0], 16) * 16} + ${parseInt(hex[1], 16)}`, `Denary = ${value}`],
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
      accept: [answer, toBinary8(result), overflow ? `${toBinary8(result)} with overflow` : toBinary8(result)],
      working: [`${a} + ${b} = ${total}`, `8-bit stored result = ${toBinary8(result)}`, `Overflow = ${overflow ? "yes" : "no"}`],
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
      working: [left ? "Left shift multiplies by 2." : "Right shift divides by 2.", `${value} becomes ${result}`, `Result = ${toBinary8(result)}`],
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
      working: value < 0 ? [`256 + (${value}) = ${stored}`, `Binary = ${toBinary8(stored)}`] : [`Positive values use normal 8-bit binary.`, `Binary = ${toBinary8(stored)}`],
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
      working: [`${width} x ${height} x ${depth} bits`, `÷ 8 = ${bytes} bytes`, `÷ 1024 = ${kib} KiB`],
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
    working: [`${rate} x ${resolution} x ${seconds} bits`, `÷ 8 = ${bytes} bytes`, `÷ 1024 = ${kib} KiB`],
  };
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function toBinary8(value: number) {
  return value.toString(2).padStart(8, "0").replace(/(.{4})/, "$1 ");
}

function placeValues(value: number) {
  return [128, 64, 32, 16, 8, 4, 2, 1].filter((place) => (value & place) !== 0);
}

