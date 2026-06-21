import { describe, expect, it } from "vitest";
import type { Flashcard } from "../../data/contentTypes";
import { formatElapsedTime, normaliseText, takeRound } from "./activityUtils";

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

describe("formatElapsedTime", () => {
  it("formats elapsed milliseconds as minutes, seconds, and tenths", () => {
    expect(formatElapsedTime(65_430)).toBe("1:05.4");
  });
});
