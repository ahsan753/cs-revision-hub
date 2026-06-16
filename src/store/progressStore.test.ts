import { describe, expect, it } from "vitest";
import {
  getItemAccuracyPercent,
  isProgressSnapshot,
  levelFromXp,
  xpForLevel,
} from "./progressStore";
import type { ProgressSnapshot } from "./progressStore";

function makeSnapshot(
  overrides: Partial<ProgressSnapshot> = {},
): ProgressSnapshot {
  return {
    version: 1,
    xp: 0,
    level: 1,
    streak: 0,
    dailyGoal: 20,
    dailyProgress: {
      date: "2026-06-16",
      answered: 0,
      xp: 0,
      completed: false,
      completedTasks: [],
    },
    unlockedBadges: [],
    settings: {
      sound: false,
      reducedMotion: false,
      darkMode: false,
    },
    itemProgress: {},
    history: [],
    ...overrides,
  };
}

describe("level helpers", () => {
  it("keeps level thresholds reversible at exact boundaries", () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(xpForLevel(2))).toBe(2);
    expect(levelFromXp(xpForLevel(5))).toBe(5);
  });
});

describe("progress import validation", () => {
  it("accepts a complete version 1 progress snapshot", () => {
    expect(isProgressSnapshot(makeSnapshot())).toBe(true);
  });

  it("rejects invalid objects instead of treating them as fresh progress", () => {
    expect(isProgressSnapshot({ version: 1 })).toBe(false);
    expect(isProgressSnapshot({ ...makeSnapshot(), history: {} })).toBe(false);
    expect(isProgressSnapshot({ ...makeSnapshot(), version: 2 })).toBe(false);
  });
});

describe("item accuracy", () => {
  it("uses lifetime correct attempts rather than the mastery count", () => {
    expect(
      getItemAccuracyPercent({
        attempts: 4,
        correctAttempts: 3,
        correctCount: 1,
      }),
    ).toBe(75);
  });

  it("falls back to correctCount for older progress data", () => {
    expect(getItemAccuracyPercent({ attempts: 4, correctCount: 2 })).toBe(50);
  });
});
