import { describe, expect, it } from "vitest";
import {
  conversionRankedItemId,
  solveConversion,
  verifyFillBlankAnswer,
  verifyMcqAnswer,
  verifyParsonsAnswer,
  verifySubmission,
  verifyTextAnswer,
} from "./answerCheck";

describe("answerCheck", () => {
  it("checks single-answer MCQs", () => {
    expect(verifyMcqAnswer({ answerIndex: 2 }, 2)).toBe(true);
    expect(verifyMcqAnswer({ answerIndex: 2 }, 1)).toBe(false);
  });

  it("normalises text answers", () => {
    expect(
      verifyTextAnswer({ answer: "Hello World", accept: ["hello  world"] }, " hello world "),
    ).toBe(true);
  });

  it("accepts 8-bit binary answers with or without nibble spacing", () => {
    expect(
      verifyTextAnswer({ answer: "1100 1000" }, "11001000"),
    ).toBe(true);
    expect(
      verifyTextAnswer({ answer: "11001000" }, "1100 1000"),
    ).toBe(true);
    expect(
      verifyTextAnswer({ answer: "1100 1000" }, "1100 1001"),
    ).toBe(false);
  });

  it("checks fill blanks with per-blank case handling", () => {
    expect(
      verifyFillBlankAnswer(
        {
          blanks: [
            { id: "a", accept: ["print"], caseSensitive: false },
            { id: "b", accept: ["Total"], caseSensitive: true },
          ],
        },
        { a: "PRINT", b: "Total" },
      ),
    ).toBe(true);
  });

  it("checks Parsons line order", () => {
    expect(verifyParsonsAnswer({ lines: ["a", "b"] }, ["a", "b", "x"])).toBe(
      true,
    );
    expect(verifyParsonsAnswer({ lines: ["a", "b"] }, ["b", "a"])).toBe(
      false,
    );
  });

  it("verifies match and memory pair ids", () => {
    expect(
      verifySubmission(
        {
          content_kind: "flashcard",
          item_id: "fc-1",
          answer_key: { term: "CPU", definition: "Processor" },
        },
        "match",
        { kind: "match", termId: "fc-1", definitionId: "fc-1" },
      ),
    ).toBe(true);
    expect(
      verifySubmission(
        {
          content_kind: "flashcard",
          item_id: "fc-1",
          answer_key: { term: "CPU", definition: "Processor" },
        },
        "memory",
        {
          kind: "memory",
          firstPairId: "fc-1",
          secondPairId: "fc-1",
          firstKind: "term",
          secondKind: "definition",
        },
      ),
    ).toBe(true);
  });

  it("recomputes conversion answers from operands", () => {
    expect(
      solveConversion("denary-binary", { kind: "value", value: 10 }).accept,
    ).toContain("0000 1010");
    expect(
      verifySubmission(
        {
          content_kind: "conversion",
          item_id: "convert-denary-binary:value",
        },
        "convert",
        {
          kind: "conversion",
          mode: "denary-binary",
          operands: { kind: "value", value: 200 },
          submittedAnswer: "11001000",
        },
      ),
    ).toBe(true);
    expect(
      solveConversion("file-size", {
        kind: "image",
        width: 640,
        height: 480,
        depth: 8,
      }).answer,
    ).toBe("300 KiB");
    expect(
      conversionRankedItemId("file-size", {
        kind: "sound",
        seconds: 10,
        sampleRate: 8000,
        resolution: 8,
      }),
    ).toBe("convert-file-size:sound");
  });
});
