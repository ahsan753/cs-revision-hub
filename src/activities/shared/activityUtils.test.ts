import { afterEach, describe, expect, it, vi } from "vitest";
import type { Flashcard } from "../../data/contentTypes";
import {
  formatElapsedTime,
  normaliseText,
  shuffle,
  takeRound,
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

describe("formatElapsedTime", () => {
  it("formats elapsed milliseconds as minutes, seconds, and tenths", () => {
    expect(formatElapsedTime(65_430)).toBe("1:05.4");
  });
});
