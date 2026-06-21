import { create } from "zustand";
import { contentIndex } from "../content/contentIndex";
import { recordRankedAnswer } from "../ranked/rankedClient";
import type { RankedPayload } from "../ranked/rankedTypes";
import { getSubtopicMastery, getUnitMastery } from "./mastery";
import {
  clearProgress,
  readProgress,
  setProgressStorageUser,
  writeProgress,
} from "./storage";

export type ActivityType =
  | "flashcards"
  | "quiz"
  | "match"
  | "memory"
  | "code"
  | "convert";

export interface ActivityResult {
  itemId: string;
  correct: boolean;
  activity: ActivityType;
  timestamp: number;
  ranked?: RankedPayload;
}

export interface ItemProgress {
  itemId: string;
  attempts: number;
  correctCount: number;
  correctAttempts: number;
  latestCorrect: boolean;
  leitnerBox: number;
  nextDue: number;
  lastActivity: ActivityType;
  lastAttemptAt: number;
}

export interface ProgressSnapshot {
  version: 1;
  name?: string;
  xp: number;
  level: number;
  streak: number;
  dailyGoal: number;
  dailyProgress: {
    date: string;
    answered: number;
    xp: number;
    completed: boolean;
    completedTasks: string[];
  };
  unlockedBadges: string[];
  settings: {
    sound: boolean;
    reducedMotion: boolean;
    darkMode: boolean;
  };
  timedActivityBests: Record<string, number>;
  itemProgress: Record<string, ItemProgress>;
  history: ActivityResult[];
}

export type CelebrationEvent =
  | {
      id: string;
      type: "correct" | "incorrect";
      itemId: string;
      activity: ActivityType;
      xpGained: number;
    }
  | { id: string; type: "level-up"; level: number }
  | { id: string; type: "daily-goal" }
  | { id: string; type: "streak-incremented"; streak: number }
  | {
      id: string;
      type: "subtopic-mastered";
      subtopicId: string;
      title: string;
    }
  | { id: string; type: "unit-mastered"; unitId: string; title: string }
  | {
      id: string;
      type: "badge-unlocked";
      badgeId: string;
      badgeName: string;
      icon?: string;
    };

interface ProgressActions {
  recordAnswer: (
    result: ActivityResult,
    difficulty?: 1 | 2 | 3,
    options?: RecordAnswerOptions,
  ) => number;
  recordDailyTaskCompletion: (taskId: string) => void;
  recordTimedActivityBest: (activityKey: string, elapsedMs: number) => boolean;
  refreshDailyProgress: () => void;
  setName: (name: string) => void;
  updateSettings: (settings: Partial<ProgressSnapshot["settings"]>) => void;
  switchProgressScope: (userId?: string | null) => void;
  importProgress: (snapshot: unknown) => boolean;
  resetProgress: () => void;
  consumeCelebrations: () => CelebrationEvent[];
}

export type ProgressState = ProgressSnapshot &
  ProgressActions & {
    celebrations: CelebrationEvent[];
  };

interface RecordAnswerOptions {
  onRankedXpPreview?: (amount: number) => void;
}

export const fixedDailyGoal = 5;
const dayMs = 24 * 60 * 60 * 1000;
export const maxNameLength = 30;
const maxHistoryEntries = 500;
const maxAttemptsPerItem = 500;
const maxTimedActivityMs = dayMs;
const intervals: Record<number, number> = {
  1: 0,
  2: dayMs,
  3: 3 * dayMs,
  4: 7 * dayMs,
  5: 16 * dayMs,
};

function todayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function levelFromXp(xp: number) {
  return Math.max(1, Math.floor(Math.sqrt(xp / 90)) + 1);
}

export function xpForLevel(level: number) {
  return Math.max(0, Math.pow(level - 1, 2) * 90);
}

export function getXpForAnswer(
  _result: Pick<ActivityResult, "activity" | "correct">,
  _difficulty?: 1 | 2 | 3,
  _previous?: Pick<ItemProgress, "correctCount" | "latestCorrect" | "nextDue">,
  _timestamp?: number,
) {
  void _result;
  void _difficulty;
  void _previous;
  void _timestamp;
  return 0;
}

export function getRankedXpPreviewForAnswer(
  result: Pick<ActivityResult, "activity" | "correct" | "ranked">,
  difficulty: 1 | 2 | 3 = 1,
  previous?: Pick<ItemProgress, "correctCount" | "nextDue">,
  timestamp = Date.now(),
) {
  if (
    !result.ranked ||
    !result.correct ||
    result.activity === "flashcards" ||
    (previous && previous.correctCount >= 2 && previous.nextDue > timestamp)
  ) {
    return 0;
  }

  return 10 * Math.max(1, Math.min(3, difficulty));
}

function freshProgress(): ProgressSnapshot {
  return {
    version: 1,
    name: undefined,
    xp: 0,
    level: 1,
    streak: 0,
    dailyGoal: fixedDailyGoal,
    dailyProgress: {
      date: todayKey(),
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
    timedActivityBests: {},
    itemProgress: {},
    history: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function isProgressSnapshot(value: unknown): value is ProgressSnapshot {
  if (!isRecord(value)) return false;
  if (value.version !== 1) return false;
  if (
    typeof value.xp !== "number" ||
    typeof value.level !== "number" ||
    typeof value.streak !== "number" ||
    typeof value.dailyGoal !== "number"
  ) {
    return false;
  }
  if (
    !isRecord(value.dailyProgress) ||
    !isRecord(value.settings) ||
    !isRecord(value.itemProgress)
  )
    return false;
  if (!Array.isArray(value.unlockedBadges) || !Array.isArray(value.history))
    return false;

  return true;
}

function isActivityType(value: unknown): value is ActivityType {
  return (
    value === "flashcards" ||
    value === "quiz" ||
    value === "match" ||
    value === "memory" ||
    value === "code" ||
    value === "convert"
  );
}

function boundedInteger(value: unknown, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function normaliseActivityResult(result: unknown): ActivityResult | null {
  if (!isRecord(result)) return null;
  if (
    typeof result.itemId !== "string" ||
    !contentIndex.allItemIds.includes(result.itemId) ||
    typeof result.correct !== "boolean" ||
    !isActivityType(result.activity)
  ) {
    return null;
  }

  return {
    itemId: result.itemId,
    correct: result.correct,
    activity: result.activity,
    timestamp: boundedInteger(result.timestamp, 0, Number.MAX_SAFE_INTEGER),
  };
}

function normaliseHistory(history: unknown) {
  if (!Array.isArray(history)) return [];
  return history
    .map(normaliseActivityResult)
    .filter((item): item is ActivityResult => Boolean(item))
    .slice(-maxHistoryEntries);
}

function normaliseItemProgress(progress: Record<string, unknown>) {
  const knownIds = new Set(contentIndex.allItemIds);
  const items: Record<string, ItemProgress> = {};

  for (const [id, rawItem] of Object.entries(progress)) {
    if (!knownIds.has(id) || !isRecord(rawItem)) continue;

    const attempts = boundedInteger(rawItem.attempts, 0, maxAttemptsPerItem);
    const correctCount = boundedInteger(rawItem.correctCount, 0, attempts);
    const correctAttempts = boundedInteger(
      rawItem.correctAttempts ?? correctCount,
      0,
      attempts,
    );
    const latestCorrect =
      typeof rawItem.latestCorrect === "boolean"
        ? rawItem.latestCorrect
        : correctCount > 0;
    const leitnerBox = boundedInteger(rawItem.leitnerBox, 1, 5);
    const nextDue = boundedInteger(rawItem.nextDue, 0, Number.MAX_SAFE_INTEGER);
    const lastActivity = isActivityType(rawItem.lastActivity)
      ? rawItem.lastActivity
      : "quiz";
    const lastAttemptAt = boundedInteger(
      rawItem.lastAttemptAt,
      0,
      Number.MAX_SAFE_INTEGER,
    );

    items[id] = {
      itemId: id,
      attempts,
      correctCount,
      correctAttempts,
      latestCorrect,
      leitnerBox,
      nextDue,
      lastActivity,
      lastAttemptAt,
    };
  }

  return items;
}

function normaliseTimedActivityBests(value: unknown) {
  if (!isRecord(value)) return {};
  const bests: Record<string, number> = {};

  for (const [key, rawMs] of Object.entries(value)) {
    if (!key.trim()) continue;
    const elapsedMs = boundedInteger(rawMs, 1, maxTimedActivityMs);
    if (elapsedMs > 0) bests[key] = elapsedMs;
  }

  return bests;
}

function normaliseSnapshot(
  snapshot: ProgressSnapshot | null,
): ProgressSnapshot {
  if (!snapshot || snapshot.version !== 1) return freshProgress();
  const base = freshProgress();
  const merged: ProgressSnapshot = {
    ...base,
    ...snapshot,
    name:
      typeof snapshot.name === "string"
        ? snapshot.name.trim().slice(0, maxNameLength) || undefined
        : undefined,
    xp: 0,
    level: 1,
    streak: boundedInteger(snapshot.streak, 0, 3650),
    dailyGoal: fixedDailyGoal,
    dailyProgress: {
      ...base.dailyProgress,
      ...snapshot.dailyProgress,
      answered: boundedInteger(snapshot.dailyProgress?.answered, 0, 1000),
      xp: 0,
      completed: Boolean(snapshot.dailyProgress?.completed),
      completedTasks: Array.isArray(snapshot.dailyProgress?.completedTasks)
        ? snapshot.dailyProgress.completedTasks.filter(
            (task): task is string => typeof task === "string",
          )
        : [],
    },
    settings: {
      sound: Boolean(snapshot.settings?.sound),
      reducedMotion: Boolean(snapshot.settings?.reducedMotion),
      darkMode: Boolean(snapshot.settings?.darkMode),
    },
    timedActivityBests: normaliseTimedActivityBests(
      snapshot.timedActivityBests,
    ),
    unlockedBadges: [],
    itemProgress: normaliseItemProgress(snapshot.itemProgress ?? {}),
    history: normaliseHistory(snapshot.history),
  };
  merged.level = 1;
  if (merged.dailyProgress.date !== todayKey()) {
    return withUnlockedBadges({
      ...merged,
      dailyProgress: {
        date: todayKey(),
        answered: 0,
        xp: 0,
        completed: false,
        completedTasks: [],
      },
    });
  }
  return withUnlockedBadges(merged);
}

function toProgressSnapshot(state: ProgressState): ProgressSnapshot {
  return {
    version: 1,
    name: state.name,
    xp: state.xp,
    level: state.level,
    streak: state.streak,
    dailyGoal: fixedDailyGoal,
    dailyProgress: state.dailyProgress,
    unlockedBadges: state.unlockedBadges,
    settings: state.settings,
    timedActivityBests: state.timedActivityBests,
    itemProgress: state.itemProgress,
    history: state.history,
  };
}

function freshDailyProgress() {
  return {
    date: todayKey(),
    answered: 0,
    xp: 0,
    completed: false,
    completedTasks: [],
  };
}

function currentDailyProgress(
  dailyProgress: ProgressSnapshot["dailyProgress"],
) {
  if (dailyProgress.date !== todayKey()) return freshDailyProgress();
  if (!dailyProgress.completedTasks)
    return { ...dailyProgress, completedTasks: [] };
  return dailyProgress;
}

function nextItemProgress(
  previous: ItemProgress | undefined,
  result: ActivityResult,
): ItemProgress {
  const currentBox = previous?.leitnerBox ?? 1;
  const protectedPrematureMiss = Boolean(
    !result.correct &&
    previous &&
    previous.correctCount >= 2 &&
    previous.nextDue > result.timestamp,
  );
  const leitnerBox = result.correct
    ? Math.min(5, currentBox + 1)
    : protectedPrematureMiss
      ? currentBox
      : 1;
  const nextDue = protectedPrematureMiss
    ? (previous?.nextDue ?? result.timestamp)
    : result.timestamp + intervals[leitnerBox];
  const correctAttempts =
    (previous?.correctAttempts ?? Math.max(0, previous?.correctCount ?? 0)) +
    (result.correct ? 1 : 0);
  const previousCorrectCount = previous?.correctCount ?? 0;

  return {
    itemId: result.itemId,
    attempts: (previous?.attempts ?? 0) + 1,
    correctAttempts,
    correctCount: result.correct
      ? previousCorrectCount + 1
      : protectedPrematureMiss
        ? previousCorrectCount
        : Math.max(0, previousCorrectCount - 1),
    latestCorrect: result.correct,
    leitnerBox,
    nextDue,
    lastActivity: result.activity,
    lastAttemptAt: result.timestamp,
  };
}

export function isKnown(progress?: ItemProgress) {
  return Boolean(
    progress && progress.correctCount >= 2 && progress.latestCorrect,
  );
}

function isDailyGoalComplete(answered: number, goal: number) {
  return answered >= Math.max(1, goal);
}

export function getItemAccuracyPercent(progress: {
  attempts: number;
  correctAttempts?: number;
  correctCount: number;
}) {
  if (progress.attempts <= 0) return 0;
  return Math.round(
    ((progress.correctAttempts ?? progress.correctCount) / progress.attempts) *
      100,
  );
}

function getContentItemSubtopics() {
  const subtopics = new Map<string, string>();
  for (const unit of contentIndex.units) {
    for (const item of [
      ...unit.flashcards,
      ...unit.mcqs,
      ...(unit.codeTasks ?? []),
    ]) {
      subtopics.set(item.id, item.subtopic);
    }
  }
  return subtopics;
}

function getPseudocodeParsonsIds() {
  return new Set(
    contentIndex.units.flatMap((unit) =>
      (unit.codeTasks ?? [])
        .filter(
          (task) => task.type === "parsons" && task.language === "pseudocode",
        )
        .map((task) => task.id),
    ),
  );
}

function getMaxCorrectQuizStreak(history: ActivityResult[]) {
  let current = 0;
  let best = 0;
  for (const item of history) {
    if (item.activity !== "quiz") continue;
    current = item.correct ? current + 1 : 0;
    best = Math.max(best, current);
  }
  return best;
}

function hasNinetyPercentHexAccuracy(history: ActivityResult[]) {
  const hexModeGroups = [
    ["convert-denary-hex", "u1-mcq-4"],
    ["convert-hex-denary", "u1-mcq-3"],
  ];

  return hexModeGroups.every((ids) => {
    const attempts = history.filter(
      (item) => item.activity === "convert" && ids.includes(item.itemId),
    );
    if (attempts.length < 5) return false;
    const correct = attempts.filter((item) => item.correct).length;
    return correct / attempts.length >= 0.9;
  });
}

function hasMasteredPreviouslyMissedSubtopic(snapshot: ProgressSnapshot) {
  const itemSubtopics = getContentItemSubtopics();
  const missedSubtopics = new Set(
    snapshot.history
      .filter((item) => !item.correct)
      .map((item) => itemSubtopics.get(item.itemId))
      .filter((subtopic): subtopic is string => Boolean(subtopic)),
  );

  if (!missedSubtopics.size) return false;

  return contentIndex.units.some((unit) =>
    unit.subtopics.some(
      (subtopic) =>
        missedSubtopics.has(subtopic.id) &&
        getSubtopicMastery(unit, subtopic.id, snapshot.itemProgress).state ===
          "Mastered",
    ),
  );
}

function withUnlockedBadges(snapshot: ProgressSnapshot): ProgressSnapshot {
  const unlocked = new Set<string>();
  const correctHistory = snapshot.history.filter((item) => item.correct);
  const pseudocodeParsonsIds = getPseudocodeParsonsIds();

  if (snapshot.history.length > 0) unlocked.add("first-steps");
  if (correctHistory.filter((item) => item.activity === "convert").length >= 50)
    unlocked.add("binary-boss");
  if (hasNinetyPercentHexAccuracy(snapshot.history)) unlocked.add("hex-hero");
  if (correctHistory.filter((item) => item.activity === "code").length >= 10)
    unlocked.add("loop-wizard");
  if (
    correctHistory.filter(
      (item) =>
        item.activity === "code" && pseudocodeParsonsIds.has(item.itemId),
    ).length >= 20
  ) {
    unlocked.add("pseudo-pro");
  }
  if (getMaxCorrectQuizStreak(snapshot.history) >= 10)
    unlocked.add("sharp-shooter");
  if (hasMasteredPreviouslyMissedSubtopic(snapshot)) unlocked.add("comeback");
  if (snapshot.streak >= 7) unlocked.add("perfect-week");

  const unit2 = contentIndex.unitsById.get("u2");
  const unit3 = contentIndex.unitsById.get("u3");
  if (
    unit2 &&
    getUnitMastery(unit2, snapshot.itemProgress).state === "Mastered"
  )
    unlocked.add("packet-master");
  if (
    unit3 &&
    getSubtopicMastery(unit3, "3.1", snapshot.itemProgress).state === "Mastered"
  )
    unlocked.add("architect");
  if (
    contentIndex.units.some(
      (unit) =>
        getUnitMastery(unit, snapshot.itemProgress).state === "Mastered",
    )
  ) {
    unlocked.add("unit-crusher");
  }

  return { ...snapshot, unlockedBadges: [...unlocked] };
}

function persist(snapshot: ProgressSnapshot) {
  const withBadges = withUnlockedBadges(snapshot);
  writeProgress(withBadges);
  return withBadges;
}

let celebrationCounter = 0;

function eventId(type: CelebrationEvent["type"]) {
  celebrationCounter += 1;
  return `${type}-${Date.now()}-${celebrationCounter}`;
}

function getMasteryStates(progress: Record<string, ItemProgress>) {
  const units = new Map<string, string>();
  const subtopics = new Map<string, string>();

  for (const unit of contentIndex.units) {
    units.set(unit.id, getUnitMastery(unit, progress).state);
    for (const subtopic of unit.subtopics) {
      subtopics.set(
        subtopic.id,
        getSubtopicMastery(unit, subtopic.id, progress).state,
      );
    }
  }

  return { units, subtopics };
}

export function getCelebrationEventsForAnswer({
  before,
  after,
  result,
  xpGained,
  dailyGoalCompletedByAnswer,
  streakIncrementedByAnswer,
}: {
  before: ProgressSnapshot;
  after: ProgressSnapshot;
  result: ActivityResult;
  xpGained: number;
  dailyGoalCompletedByAnswer: boolean;
  streakIncrementedByAnswer: boolean;
}): CelebrationEvent[] {
  const events: CelebrationEvent[] = [
    {
      id: eventId(result.correct ? "correct" : "incorrect"),
      type: result.correct ? "correct" : "incorrect",
      itemId: result.itemId,
      activity: result.activity,
      xpGained,
    },
  ];

  if (levelFromXp(after.xp) > levelFromXp(before.xp)) {
    events.push({
      id: eventId("level-up"),
      type: "level-up",
      level: levelFromXp(after.xp),
    });
  }

  if (dailyGoalCompletedByAnswer) {
    events.push({ id: eventId("daily-goal"), type: "daily-goal" });
  }

  if (streakIncrementedByAnswer) {
    events.push({
      id: eventId("streak-incremented"),
      type: "streak-incremented",
      streak: after.streak,
    });
  }

  const beforeMastery = getMasteryStates(before.itemProgress);
  const afterMastery = getMasteryStates(after.itemProgress);

  for (const unit of contentIndex.units) {
    if (
      beforeMastery.units.get(unit.id) !== "Mastered" &&
      afterMastery.units.get(unit.id) === "Mastered"
    ) {
      events.push({
        id: eventId("unit-mastered"),
        type: "unit-mastered",
        unitId: unit.id,
        title: `Unit ${unit.number} ${unit.title}`,
      });
    }

    for (const subtopic of unit.subtopics) {
      if (
        beforeMastery.subtopics.get(subtopic.id) !== "Mastered" &&
        afterMastery.subtopics.get(subtopic.id) === "Mastered"
      ) {
        events.push({
          id: eventId("subtopic-mastered"),
          type: "subtopic-mastered",
          subtopicId: subtopic.id,
          title: `${subtopic.id} ${subtopic.title}`,
        });
      }
    }
  }

  const previousBadges = new Set(before.unlockedBadges);
  const badges = contentIndex.bank.badges ?? [];
  for (const badgeId of after.unlockedBadges) {
    if (previousBadges.has(badgeId)) continue;
    const badge = badges.find((item) => item.id === badgeId);
    events.push({
      id: eventId("badge-unlocked"),
      type: "badge-unlocked",
      badgeId,
      badgeName: badge?.name ?? badgeId,
      icon: badge?.icon,
    });
  }

  return events;
}

export const useProgressStore = create<ProgressState>((set, get) => {
  const initial = normaliseSnapshot(readProgress());

  return {
    ...initial,
    celebrations: [],
    recordAnswer: (result, difficulty = 1, options) => {
      let awardedXp = 0;
      if (result.ranked && result.activity !== "flashcards") {
        const rankedXpPreview = getRankedXpPreviewForAnswer(
          result,
          difficulty,
          get().itemProgress[result.itemId],
          result.timestamp,
        );
        if (rankedXpPreview > 0) {
          options?.onRankedXpPreview?.(rankedXpPreview);
        }
        void recordRankedAnswer({
          rankedItemId: result.ranked.rankedItemId,
          activity: result.activity,
          submitted: result.ranked.submitted,
          suppressXpAwardedEvent: rankedXpPreview > 0,
        }).catch(() => undefined);
      }
      set((state) => {
        const before = toProgressSnapshot(state);
        const daily = currentDailyProgress(state.dailyProgress);
        const gainedXp = getXpForAnswer(
          result,
          difficulty,
          state.itemProgress[result.itemId],
          result.timestamp,
        );
        awardedXp = gainedXp;
        const answered = daily.answered + 1;
        const xp = 0;
        const completedNow = isDailyGoalComplete(answered, fixedDailyGoal);
        const dailyGoalCompletedByAnswer = !daily.completed && completedNow;
        const streak = dailyGoalCompletedByAnswer
          ? state.streak + 1
          : state.streak;
        const snapshot: ProgressSnapshot = {
          version: 1,
          name: state.name,
          xp,
          level: 1,
          streak,
          dailyGoal: fixedDailyGoal,
          dailyProgress: {
            date: daily.date,
            answered,
            xp: 0,
            completed: daily.completed || completedNow,
            completedTasks: daily.completedTasks,
          },
          unlockedBadges: state.unlockedBadges,
          settings: state.settings,
          timedActivityBests: state.timedActivityBests,
          itemProgress: {
            ...state.itemProgress,
            [result.itemId]: nextItemProgress(
              state.itemProgress[result.itemId],
              result,
            ),
          },
          history: [...state.history.slice(-(maxHistoryEntries - 1)), result],
        };
        const persisted = persist(snapshot);
        const celebrations = getCelebrationEventsForAnswer({
          before,
          after: persisted,
          result,
          xpGained: gainedXp,
          dailyGoalCompletedByAnswer,
          streakIncrementedByAnswer: dailyGoalCompletedByAnswer,
        });
        return {
          ...persisted,
          celebrations: [...state.celebrations, ...celebrations],
        };
      });
      return awardedXp;
    },
    recordDailyTaskCompletion: (taskId) => {
      set((state) => {
        const daily = currentDailyProgress(state.dailyProgress);
        if (daily.completedTasks.includes(taskId)) {
          if (daily === state.dailyProgress) return state;
          return {
            ...persist({ ...toProgressSnapshot(state), dailyProgress: daily }),
            celebrations: state.celebrations,
          };
        }
        const completedTasks = [...daily.completedTasks, taskId];
        return {
          ...persist({
            ...toProgressSnapshot(state),
            dailyProgress: {
              ...daily,
              completedTasks,
            },
          }),
          celebrations: state.celebrations,
        };
      });
    },
    recordTimedActivityBest: (activityKey, elapsedMs) => {
      const key = activityKey.trim();
      const elapsed = boundedInteger(elapsedMs, 1, maxTimedActivityMs);
      if (!key || elapsed <= 0) return false;

      let updated = false;
      set((state) => {
        const previousBest = state.timedActivityBests[key];
        if (previousBest && previousBest <= elapsed) return state;
        updated = true;
        return {
          ...persist({
            ...toProgressSnapshot(state),
            timedActivityBests: {
              ...state.timedActivityBests,
              [key]: elapsed,
            },
          }),
          celebrations: state.celebrations,
        };
      });
      return updated;
    },
    refreshDailyProgress: () => {
      set((state) => {
        const daily = currentDailyProgress(state.dailyProgress);
        if (
          daily.date === state.dailyProgress.date &&
          daily.completedTasks === state.dailyProgress.completedTasks
        ) {
          return state;
        }
        return {
          ...persist({ ...toProgressSnapshot(state), dailyProgress: daily }),
          celebrations: state.celebrations,
        };
      });
    },
    setName: (name) => {
      set((state) => {
        const trimmed = name.trim().slice(0, maxNameLength);
        return {
          ...persist({
            ...toProgressSnapshot(state),
            name: trimmed ? trimmed : undefined,
          }),
          celebrations: state.celebrations,
        };
      });
    },
    updateSettings: (settings) => {
      set((state) => ({
        ...persist({
          ...toProgressSnapshot(state),
          settings: { ...state.settings, ...settings },
        }),
        celebrations: state.celebrations,
      }));
    },
    switchProgressScope: (userId) => {
      setProgressStorageUser(userId);
      const next = normaliseSnapshot(readProgress());
      set((state) => ({
        ...next,
        celebrations: state.celebrations,
      }));
    },
    importProgress: (snapshot) => {
      if (!isProgressSnapshot(snapshot)) return false;
      const normalised = normaliseSnapshot(snapshot);
      set({ ...persist(normalised), celebrations: [] });
      return true;
    },
    resetProgress: () => {
      clearProgress();
      set({ ...freshProgress(), celebrations: [] });
    },
    consumeCelebrations: () => {
      const events = get().celebrations;
      if (events.length > 0) set({ celebrations: [] });
      return events;
    },
  };
});
