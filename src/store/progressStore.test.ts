import { describe, expect, it } from "vitest";
import {
  getCelebrationEventsForAnswer,
  getItemAccuracyPercent,
  getXpForAnswer,
  isProgressSnapshot,
  levelFromXp,
  maxNameLength,
  useProgressStore,
  xpForLevel,
} from "./progressStore";
import {
  contentIndex,
  getItemIdsForSubtopic,
  getItemIdsForUnit,
} from "../content/contentIndex";
import { getUnitMastery } from "./mastery";
import type {
  ActivityResult,
  ItemProgress,
  ProgressSnapshot,
} from "./progressStore";

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

function makeItemProgress(id: string, correctCount = 2): ItemProgress {
  return {
    itemId: id,
    attempts: correctCount,
    correctCount,
    correctAttempts: correctCount,
    latestCorrect: true,
    leitnerBox: 2,
    nextDue: Date.now(),
    lastActivity: "quiz",
    lastAttemptAt: Date.now(),
  };
}

function answer(itemId = "u1-mcq-1", correct = true): ActivityResult {
  return {
    itemId,
    correct,
    activity: "quiz",
    timestamp: Date.now(),
  };
}

describe("level helpers", () => {
  it("keeps level thresholds reversible at exact boundaries", () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(xpForLevel(2))).toBe(2);
    expect(levelFromXp(xpForLevel(5))).toBe(5);
  });
});

describe("XP policy", () => {
  it("awards difficulty-scaled XP for correct non-flashcard answers", () => {
    expect(getXpForAnswer({ activity: "quiz", correct: true }, 3)).toBe(30);
  });

  it("awards no XP for flashcard answers even when correct", () => {
    expect(getXpForAnswer({ activity: "flashcards", correct: true }, 3)).toBe(
      0,
    );
  });

  it("awards no XP for incorrect answers in any activity", () => {
    expect(getXpForAnswer({ activity: "memory", correct: false }, 3)).toBe(0);
    expect(getXpForAnswer({ activity: "quiz", correct: false }, 1)).toBe(0);
  });

  it("still awards XP for the second correct attempt needed to master an item", () => {
    expect(
      getXpForAnswer({ activity: "code", correct: true }, 2, {
        correctCount: 1,
        latestCorrect: true,
        nextDue: Date.now() + 60_000,
      }),
    ).toBe(20);
  });

  it("does not award XP for immediate repeats of already-mastered items", () => {
    expect(
      getXpForAnswer(
        { activity: "code", correct: true },
        2,
        {
          correctCount: 2,
          latestCorrect: true,
          nextDue: Date.now() + 60_000,
        },
        Date.now(),
      ),
    ).toBe(0);
  });

  it("does not award XP when an already-mastered not-due item was deliberately missed first", () => {
    const now = Date.now();
    const masteredProgress = makeItemProgress("u1-mcq-1");
    masteredProgress.nextDue = now + 60_000;

    useProgressStore.setState({
      ...useProgressStore.getState(),
      xp: 100,
      level: levelFromXp(100),
      dailyProgress: {
        date: useProgressStore.getState().dailyProgress.date,
        answered: 0,
        xp: 0,
        completed: false,
        completedTasks: [],
      },
      itemProgress: {
        "u1-mcq-1": masteredProgress,
      },
      history: [],
      celebrations: [],
    });

    useProgressStore
      .getState()
      .recordAnswer({ ...answer("u1-mcq-1", false), timestamp: now }, 1);
    const gained = useProgressStore
      .getState()
      .recordAnswer({ ...answer("u1-mcq-1", true), timestamp: now + 1 }, 1);

    expect(gained).toBe(0);
    expect(useProgressStore.getState().xp).toBe(100);
    useProgressStore.getState().resetProgress();
  });

  it("awards XP for mastered items when they are due again", () => {
    const now = Date.now();

    expect(
      getXpForAnswer(
        { activity: "quiz", correct: true },
        1,
        {
          correctCount: 2,
          latestCorrect: true,
          nextDue: now - 1,
        },
        now,
      ),
    ).toBe(10);
  });
});

describe("progress import validation", () => {
  it("accepts a complete version 1 progress snapshot", () => {
    expect(isProgressSnapshot(makeSnapshot())).toBe(true);
  });

  it("accepts older snapshots without a name", () => {
    const snapshot = makeSnapshot();
    delete snapshot.name;
    expect(isProgressSnapshot(snapshot)).toBe(true);
  });

  it("rejects invalid objects instead of treating them as fresh progress", () => {
    expect(isProgressSnapshot({ version: 1 })).toBe(false);
    expect(isProgressSnapshot({ ...makeSnapshot(), history: {} })).toBe(false);
    expect(isProgressSnapshot({ ...makeSnapshot(), version: 2 })).toBe(false);
  });

  it("caps imported XP to progress evidence and recomputes the level", () => {
    const ok = useProgressStore.getState().importProgress(
      makeSnapshot({
        xp: 999_999,
        level: 100,
        itemProgress: {
          "u1-mcq-1": makeItemProgress("u1-mcq-1"),
        },
      }),
    );

    expect(ok).toBe(true);
    expect(useProgressStore.getState().xp).toBeLessThan(999_999);
    expect(useProgressStore.getState().level).toBe(
      levelFromXp(useProgressStore.getState().xp),
    );
    useProgressStore.getState().resetProgress();
  });

  it("does not preserve unearned imported badges", () => {
    const ok = useProgressStore.getState().importProgress(
      makeSnapshot({
        unlockedBadges: ["perfect-week", "unit-crusher"],
      }),
    );

    expect(ok).toBe(true);
    expect(useProgressStore.getState().unlockedBadges).toEqual([]);
    useProgressStore.getState().resetProgress();
  });
});

describe("daily goal fairness", () => {
  it("does not complete the day or increment the streak when a student lowers today's goal", () => {
    useProgressStore.setState({
      ...useProgressStore.getState(),
      streak: 0,
      dailyGoal: 20,
      dailyProgress: {
        date: useProgressStore.getState().dailyProgress.date,
        answered: 6,
        xp: 0,
        completed: false,
        completedTasks: [],
      },
      celebrations: [],
    });

    useProgressStore.getState().setDailyGoal(5);

    expect(useProgressStore.getState().dailyProgress.completed).toBe(false);
    expect(useProgressStore.getState().streak).toBe(0);
    useProgressStore.getState().resetProgress();
  });
});

describe("profile settings", () => {
  it("limits saved names to 30 characters", () => {
    const longName = "A".repeat(maxNameLength + 10);

    useProgressStore.getState().setName(longName);

    expect(useProgressStore.getState().name).toHaveLength(maxNameLength);
    useProgressStore.getState().resetProgress();
  });
});

describe("celebration event detection", () => {
  it("emits a single correctness event for an answer", () => {
    const events = getCelebrationEventsForAnswer({
      before: makeSnapshot(),
      after: makeSnapshot({ xp: 10, level: 1 }),
      result: answer("u1-mcq-1", true),
      xpGained: 10,
      dailyGoalCompletedByAnswer: false,
      streakIncrementedByAnswer: false,
    });

    expect(events.filter((event) => event.type === "correct")).toHaveLength(1);
    expect(events.some((event) => event.type === "incorrect")).toBe(false);
  });

  it("allows correct events with zero XP without emitting level-up", () => {
    const events = getCelebrationEventsForAnswer({
      before: makeSnapshot(),
      after: makeSnapshot(),
      result: { ...answer("u1-fc-1", true), activity: "flashcards" },
      xpGained: 0,
      dailyGoalCompletedByAnswer: false,
      streakIncrementedByAnswer: false,
    });

    expect(events).toContainEqual(
      expect.objectContaining({ type: "correct", xpGained: 0 }),
    );
    expect(events.some((event) => event.type === "level-up")).toBe(false);
  });

  it("emits level-up when an answer crosses a level boundary", () => {
    const beforeXp = xpForLevel(2) - 2;
    const events = getCelebrationEventsForAnswer({
      before: makeSnapshot({ xp: beforeXp, level: levelFromXp(beforeXp) }),
      after: makeSnapshot({ xp: beforeXp + 10, level: 2 }),
      result: answer(),
      xpGained: 10,
      dailyGoalCompletedByAnswer: false,
      streakIncrementedByAnswer: false,
    });

    expect(events.some((event) => event.type === "level-up")).toBe(true);
  });

  it("emits daily goal and streak events only when passed in from answer flow", () => {
    const withAnswerFlags = getCelebrationEventsForAnswer({
      before: makeSnapshot(),
      after: makeSnapshot({ streak: 1 }),
      result: answer(),
      xpGained: 10,
      dailyGoalCompletedByAnswer: true,
      streakIncrementedByAnswer: true,
    });
    const withoutAnswerFlags = getCelebrationEventsForAnswer({
      before: makeSnapshot(),
      after: makeSnapshot({ streak: 1 }),
      result: answer(),
      xpGained: 10,
      dailyGoalCompletedByAnswer: false,
      streakIncrementedByAnswer: false,
    });

    expect(withAnswerFlags.some((event) => event.type === "daily-goal")).toBe(
      true,
    );
    expect(
      withAnswerFlags.some((event) => event.type === "streak-incremented"),
    ).toBe(true);
    expect(
      withoutAnswerFlags.some((event) => event.type === "daily-goal"),
    ).toBe(false);
    expect(
      withoutAnswerFlags.some((event) => event.type === "streak-incremented"),
    ).toBe(false);
  });

  it("emits mastery transitions and newly unlocked badges", () => {
    const unit = contentIndex.units[0];
    const subtopic = unit.subtopics[0];
    const ids = getItemIdsForSubtopic(unit, subtopic.id);
    const target = ids[0];
    const almostMastered = Object.fromEntries(
      ids.slice(1).map((id) => [id, makeItemProgress(id)]),
    );
    const mastered = {
      ...almostMastered,
      [target]: makeItemProgress(target),
    };

    const events = getCelebrationEventsForAnswer({
      before: makeSnapshot({
        itemProgress: almostMastered,
        unlockedBadges: [],
      }),
      after: makeSnapshot({
        itemProgress: mastered,
        unlockedBadges: ["first-steps"],
      }),
      result: answer(target),
      xpGained: 10,
      dailyGoalCompletedByAnswer: false,
      streakIncrementedByAnswer: false,
    });

    expect(events.some((event) => event.type === "subtopic-mastered")).toBe(
      true,
    );
    expect(events.some((event) => event.type === "badge-unlocked")).toBe(true);
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

describe("unit mastery regressions", () => {
  it("reports Unit 2 as 39 / 39 and 100% when all Unit 2 items are known", () => {
    const unit = contentIndex.unitsById.get("u2");
    expect(unit).toBeDefined();
    if (!unit) return;

    const progress = Object.fromEntries(
      getItemIdsForUnit(unit).map((id) => [id, makeItemProgress(id)]),
    );
    const mastery = getUnitMastery(unit, progress);

    expect(mastery.known).toBe(39);
    expect(mastery.total).toBe(39);
    expect(mastery.percent).toBe(100);
    expect(mastery.state).toBe("Mastered");
  });
});
