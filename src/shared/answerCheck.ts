type ConversionOperand =
  | { kind: "value"; value: number }
  | { kind: "binary-add"; left: number; right: number }
  | { kind: "shift"; value: number; direction: "left" | "right" }
  | { kind: "image"; width: number; height: number; depth: number }
  | {
      kind: "sound";
      seconds: number;
      sampleRate: number;
      resolution: number;
    };

type RankedSubmission =
  | { kind: "mcq"; selectedIndex: number }
  | { kind: "match"; termId: string; definitionId: string }
  | {
      kind: "memory";
      firstPairId: string;
      secondPairId: string;
      firstKind: "term" | "definition";
      secondKind: "term" | "definition";
    }
  | { kind: "code-predict"; answer: string }
  | { kind: "code-fill"; answersByBlankId: Record<string, string> }
  | { kind: "code-parsons"; lines: string[] }
  | {
      kind: "conversion";
      mode: string;
      operands: ConversionOperand;
      submittedAnswer: string;
    };

interface MinimalMCQ {
  type?: "single" | "multi" | "truefalse" | "text";
  answerIndex?: number;
  answerIndices?: number[];
  answer?: string;
  accept?: string[];
}

interface MinimalFlashcard {
  term: string;
  definition: string;
}

type MinimalCodeTask =
  | {
      type: "predict-output";
      answer: string;
      accept?: string[];
    }
  | {
      type: "fill-blank";
      blanks: { id: string; accept: string[]; caseSensitive?: boolean }[];
    }
  | {
      type: "parsons";
      lines: string[];
      distractors?: string[];
    };

export function normaliseAnswerText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function verifySubmission(
  item:
    | { content_kind: "mcq"; answer_key: McqAnswerKey }
    | { content_kind: "flashcard"; item_id: string; answer_key: FlashcardAnswerKey }
    | { content_kind: "code-predict"; answer_key: PredictAnswerKey }
    | { content_kind: "code-fill"; answer_key: FillAnswerKey }
    | { content_kind: "code-parsons"; answer_key: ParsonsAnswerKey }
    | { content_kind: "conversion"; item_id: string; answer_key?: null },
  activity: string,
  submitted: RankedSubmission,
) {
  if (item.content_kind === "mcq" && submitted.kind === "mcq") {
    return verifyMcqAnswer(item.answer_key, submitted.selectedIndex);
  }
  if (item.content_kind === "flashcard" && submitted.kind === "match") {
    return activity === "match" && submitted.termId === submitted.definitionId;
  }
  if (item.content_kind === "flashcard" && submitted.kind === "memory") {
    return (
      activity === "memory" &&
      submitted.firstPairId === submitted.secondPairId &&
      submitted.firstKind !== submitted.secondKind
    );
  }
  if (
    item.content_kind === "code-predict" &&
    submitted.kind === "code-predict"
  ) {
    return verifyTextAnswer(item.answer_key, submitted.answer);
  }
  if (item.content_kind === "code-fill" && submitted.kind === "code-fill") {
    return verifyFillBlankAnswer(item.answer_key, submitted.answersByBlankId);
  }
  if (
    item.content_kind === "code-parsons" &&
    submitted.kind === "code-parsons"
  ) {
    return verifyParsonsAnswer(item.answer_key, submitted.lines);
  }
  if (item.content_kind === "conversion" && submitted.kind === "conversion") {
    const expected = solveConversion(submitted.mode, submitted.operands);
    return expected.accept
      .map(normaliseAnswerText)
      .includes(normaliseAnswerText(submitted.submittedAnswer));
  }
  return false;
}

export type McqAnswerKey =
  | { answerIndex: number }
  | { answerIndices: number[] }
  | { answer: string; accept?: string[] };

export interface FlashcardAnswerKey {
  term: string;
  definition: string;
}

export interface PredictAnswerKey {
  answer: string;
  accept?: string[];
}

export interface FillAnswerKey {
  blanks: { id: string; accept: string[]; caseSensitive?: boolean }[];
}

export interface ParsonsAnswerKey {
  lines: string[];
  distractors?: string[];
}

export function answerKeyFromMcq(item: MinimalMCQ): McqAnswerKey {
  if (item.type === "multi") return { answerIndices: item.answerIndices ?? [] };
  if (item.type === "text") return { answer: item.answer ?? "", accept: item.accept };
  return { answerIndex: item.answerIndex ?? 0 };
}

export function answerKeyFromFlashcard(item: MinimalFlashcard): FlashcardAnswerKey {
  return { term: item.term, definition: item.definition };
}

export function answerKeyFromCodeTask(task: MinimalCodeTask) {
  if (task.type === "predict-output") {
    return {
      contentKind: "code-predict" as const,
      answerKey: { answer: task.answer, accept: task.accept } satisfies PredictAnswerKey,
    };
  }
  if (task.type === "fill-blank") {
    return {
      contentKind: "code-fill" as const,
      answerKey: { blanks: task.blanks } satisfies FillAnswerKey,
    };
  }
  return {
    contentKind: "code-parsons" as const,
    answerKey: {
      lines: task.lines,
      distractors: task.distractors,
    } satisfies ParsonsAnswerKey,
  };
}

export function verifyMcqAnswer(key: McqAnswerKey, selectedIndex: number) {
  if ("answerIndex" in key) return selectedIndex === key.answerIndex;
  return false;
}

export function verifyTextAnswer(key: PredictAnswerKey, submitted: string) {
  return [key.answer, ...(key.accept ?? [])]
    .map(normaliseAnswerText)
    .includes(normaliseAnswerText(submitted));
}

export function verifyFillBlankAnswer(
  key: FillAnswerKey,
  answersByBlankId: Record<string, string>,
) {
  return key.blanks.every((blank) => {
    const submitted = answersByBlankId[blank.id] ?? "";
    return blank.accept.some((accepted) =>
      blank.caseSensitive
        ? submitted.trim() === accepted
        : normaliseAnswerText(submitted) === normaliseAnswerText(accepted),
    );
  });
}

export function verifyParsonsAnswer(key: ParsonsAnswerKey, lines: string[]) {
  const used = lines.slice(0, key.lines.length);
  return (
    used.length === key.lines.length &&
    used.every((line, index) => line === key.lines[index])
  );
}

export function solveConversion(mode: string, operands: ConversionOperand) {
  if (
    (mode === "denary-binary" ||
      mode === "binary-denary" ||
      mode === "denary-hex" ||
      mode === "hex-denary" ||
      mode === "twos-complement") &&
    operands.kind === "value"
  ) {
    if (mode === "denary-binary") {
      const answer = toBinary8(operands.value);
      return { answer, accept: [answer, answer.replace(/\s/g, "")] };
    }
    if (mode === "binary-denary" || mode === "hex-denary") {
      return { answer: String(operands.value), accept: [String(operands.value)] };
    }
    if (mode === "denary-hex") {
      const answer = operands.value.toString(16).toUpperCase().padStart(2, "0");
      return { answer, accept: [answer] };
    }
    const stored = operands.value < 0 ? 256 + operands.value : operands.value;
    const answer = toBinary8(stored);
    return { answer, accept: [answer, answer.replace(/\s/g, "")] };
  }

  if (mode === "binary-add" && operands.kind === "binary-add") {
    const total = operands.left + operands.right;
    const overflow = total > 255;
    const result = total % 256;
    const storedResult = toBinary8(result);
    const compact = storedResult.replace(/\s/g, "");
    const answer = `${storedResult}${overflow ? " overflow" : ""}`;
    return {
      answer,
      accept: overflow
        ? [
            answer,
            `${compact} overflow`,
            `${storedResult} with overflow`,
            `${compact} with overflow`,
          ]
        : [storedResult, compact],
    };
  }

  if (mode === "shift" && operands.kind === "shift") {
    const result =
      operands.direction === "left"
        ? (operands.value * 2) % 256
        : Math.floor(operands.value / 2);
    const answer = toBinary8(result);
    return { answer, accept: [answer, answer.replace(/\s/g, "")] };
  }

  if (mode === "file-size" && operands.kind === "image") {
    const bytes = (operands.width * operands.height * operands.depth) / 8;
    const kib = Math.round(bytes / 1024);
    return {
      answer: `${kib} KiB`,
      accept: [String(kib), `${kib} KiB`, `${kib} kib`],
    };
  }

  if (mode === "file-size" && operands.kind === "sound") {
    const bytes =
      (operands.sampleRate * operands.resolution * operands.seconds) / 8;
    const kib = Math.round(bytes / 1024);
    return {
      answer: `${kib} KiB`,
      accept: [String(kib), `${kib} KiB`, `${kib} kib`],
    };
  }

  return { answer: "", accept: [] };
}

export function conversionRankedItemId(mode: string, operands: ConversionOperand) {
  if (mode === "file-size") return `convert-file-size:${operands.kind}`;
  if (mode === "binary-add") return "convert-binary-add:8bit";
  if (mode === "shift") return "convert-shift:1bit";
  if (mode === "twos-complement") return "convert-twos-complement:8bit";
  return `convert-${mode}:value`;
}

export function toBinary8(value: number) {
  return value
    .toString(2)
    .padStart(8, "0")
    .replace(/(.{4})/, "$1 ");
}

export function isPredictTask(
  task: MinimalCodeTask,
): task is Extract<MinimalCodeTask, { type: "predict-output" }> {
  return task.type === "predict-output";
}

export function isFillBlankTask(
  task: MinimalCodeTask,
): task is Extract<MinimalCodeTask, { type: "fill-blank" }> {
  return task.type === "fill-blank";
}

export function isParsonsTask(
  task: MinimalCodeTask,
): task is Extract<MinimalCodeTask, { type: "parsons" }> {
  return task.type === "parsons";
}
