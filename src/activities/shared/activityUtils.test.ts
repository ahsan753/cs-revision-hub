import { afterEach, describe, expect, it, vi } from "vitest";
import type { Flashcard } from "../../data/contentTypes";
import {
  createMcqOptionOrder,
  formatElapsedTime,
  getOrderedMcqOptions,
  normaliseText,
  shuffle,
  takeRound,
  validMcqOptionOrder,
} from "./activityUtils";

const cards: Flashcard[] = [
  { id: "a", subtopic: "1.1", term: "A", definition: "Alpha" },
  { id: "b", subtopic: "1.1", term: "B", definition: "Beta" },
];

describe("normaliseText", () => {
  it("trims, collapses spaces, and lowercases answers", () => {
    expect(normaliseText("  Hello   WORLD  ")).toBe("hello world");
  });
});

describe("takeRound", () => {
  it("never asks for more cards than are available", () => {
    expect(takeRound(cards, 6)).toHaveLength(2);
  });

  it("returns an empty round for empty source content", () => {
    expect(takeRound([], 6)).toEqual([]);
  });
});

describe("shuffle", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the same items without mutating the original array", () => {
    const source = ["a", "b", "c"];

    const shuffled = shuffle(source);

    expect(source).toEqual(["a", "b", "c"]);
    expect([...shuffled].sort()).toEqual(source);
  });

  it("uses random swaps to change item order", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    expect(shuffle(["a", "b", "c"])).toEqual(["b", "c", "a"]);
  });
});

describe("MCQ option ordering", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a shuffled order of original option indexes", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const order = createMcqOptionOrder({
      id: "q1",
      subtopic: "1.1",
      question: "Pick one",
      options: ["A", "B", "C"],
      answerIndex: 2,
      explanation: "C is correct.",
    });

    expect(order).toEqual([1, 2, 0]);
  });

  it("maps displayed options back to their original indexes", () => {
    const item = {
      id: "q1",
      subtopic: "1.1",
      question: "Pick one",
      options: ["A", "B", "C"],
      answerIndex: 2,
      explanation: "C is correct.",
    };

    expect(getOrderedMcqOptions(item, [2, 0, 1])).toEqual([
      { originalIndex: 2, text: "C" },
      { originalIndex: 0, text: "A" },
      { originalIndex: 1, text: "B" },
    ]);
  });

  it("rejects malformed saved option orders", () => {
    const item = {
      id: "q1",
      subtopic: "1.1",
      question: "Pick one",
      options: ["A", "B", "C"],
      answerIndex: 2,
      explanation: "C is correct.",
    };

    expect(validMcqOptionOrder(item, [0, 0, 1])).toBeNull();
    expect(validMcqOptionOrder(item, [0, 1])).toBeNull();
    expect(validMcqOptionOrder(item, [0, 1, 2])).toEqual([0, 1, 2]);
  });
});

describe("formatElapsedTime", () => {
  it("formats elapsed milliseconds as minutes, seconds, and tenths", () => {
    expect(formatElapsedTime(65_430)).toBe("1:05.4");
  });
});
