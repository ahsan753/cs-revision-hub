import { create } from "zustand";
import { contentIndex } from "../content/contentIndex";
import { getSubtopicMastery, getUnitMastery } from "./mastery";
import { clearProgress, readProgress, writeProgress } from "./storage";

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
  itemProgress: Record<string, ItemProgress>;
  history: ActivityResult[];
}

interface ProgressActions {
  recordAnswer: (result: ActivityResult, difficulty?: 1 | 2 | 3) => void;
  recordDailyTaskCompletion: (taskId: string) => void;
  refreshDailyProgress: () => void;
  setDailyGoal: (goal: number) => void;
  updateSettings: (settings: Partial<ProgressSnapshot["settings"]>) => void;
  importProgress: (snapshot: unknown) => boolean;
  resetProgress: () => void;
}

export type ProgressState = ProgressSnapshot & ProgressActions;

const dayMs = 24 * 60 * 60 * 1000;
export const dailyTaskGoal = 3;
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

function freshProgress(): ProgressSnapshot {
  return {
    version: 1,
    xp: 0,
    level: 1,
    streak: 0,
    dailyGoal: 20,
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

function normaliseItemProgress(progress: Record<string, ItemProgress>) {
  return Object.fromEntries(
    Object.entries(progress).map(([id, item]) => [
      id,
      {
        ...item,
        correctAttempts: item.correctAttempts ?? Math.max(0, item.correctCount),
      },
    ]),
  );
}

function normaliseSnapshot(
  snapshot: ProgressSnapshot | null,
): ProgressSnapshot {
  if (!snapshot || snapshot.version !== 1) return freshProgress();
  const base = freshProgress();
  const merged: ProgressSnapshot = {
    ...base,
    ...snapshot,
    dailyProgress: {
      ...base.dailyProgress,
      ...snapshot.dailyProgress,
    },
    settings: {
      ...base.settings,
      ...snapshot.settings,
    },
    unlockedBadges: snapshot.unlockedBadges ?? [],
    itemProgress: normaliseItemProgress(snapshot.itemProgress ?? {}),
    history: snapshot.history ?? [],
  };
  if (merged.dailyProgress.date !== todayKey()) {
    return {
      ...merged,
      dailyProgress: {
        date: todayKey(),
        answered: 0,
        xp: 0,
        completed: false,
        completedTasks: [],
      },
    };
  }
  return merged;
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
  const leitnerBox = result.correct ? Math.min(5, currentBox + 1) : 1;
  const nextDue = result.timestamp + intervals[leitnerBox];
  const correctAttempts =
    (previous?.correctAttempts ?? Math.max(0, previous?.correctCount ?? 0)) +
    (result.correct ? 1 : 0);

  return {
    itemId: result.itemId,
    attempts: (previous?.attempts ?? 0) + 1,
    correctAttempts,
    correctCount: result.correct
      ? (previous?.correctCount ?? 0) + 1
      : Math.max(0, (previous?.correctCount ?? 0) - 1),
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

function withUnlockedBadges(snapshot: ProgressSnapshot): ProgressSnapshot {
  const unlocked = new Set(snapshot.unlockedBadges);
  const correctHistory = snapshot.history.filter((item) => item.correct);

  if (snapshot.history.length > 0) unlocked.add("first-steps");
  if (correctHistory.filter((item) => item.activity === "convert").length >= 50)
    unlocked.add("binary-boss");
  if (correctHistory.filter((item) => item.activity === "code").length >= 10)
    unlocked.add("loop-wizard");
  if (correctHistory.filter((item) => item.activity === "quiz").length >= 10)
    unlocked.add("sharp-shooter");
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

export const useProgressStore = create<ProgressState>((set) => {
  const initial = normaliseSnapshot(readProgress());

  return {
    ...initial,
    recordAnswer: (result, difficulty = 1) => {
      set((state) => {
        const daily = currentDailyProgress(state.dailyProgress);
        const gainedXp = result.correct ? 10 * difficulty : 2;
        const answered = daily.answered + 1;
        const xp = state.xp + gainedXp;
        const snapshot: ProgressSnapshot = {
          version: 1,
          xp,
          level: levelFromXp(xp),
          streak: state.streak,
          dailyGoal: state.dailyGoal,
          dailyProgress: {
            date: daily.date,
            answered,
            xp: daily.xp + gainedXp,
            completed: daily.completed,
            completedTasks: daily.completedTasks,
          },
          unlockedBadges: state.unlockedBadges,
          settings: state.settings,
          itemProgress: {
            ...state.itemProgress,
            [result.itemId]: nextItemProgress(
              state.itemProgress[result.itemId],
              result,
            ),
          },
          history: [...state.history.slice(-199), result],
        };
        return persist(snapshot);
      });
    },
    recordDailyTaskCompletion: (taskId) => {
      set((state) => {
        const daily = currentDailyProgress(state.dailyProgress);
        if (daily.completedTasks.includes(taskId)) {
          if (daily === state.dailyProgress) return state;
          return persist({ ...state, dailyProgress: daily });
        }
        const completedTasks = [...daily.completedTasks, taskId];
        const completedNow = completedTasks.length >= dailyTaskGoal;
        const streak =
          !daily.completed && completedNow ? state.streak + 1 : state.streak;
        return persist({
          ...state,
          streak,
          dailyProgress: {
            ...daily,
            completed: daily.completed || completedNow,
            completedTasks,
          },
        });
      });
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
        return persist({ ...state, dailyProgress: daily });
      });
    },
    setDailyGoal: (goal) => {
      set((state) =>
        persist({
          ...state,
          dailyGoal: Math.min(100, Math.max(5, Math.round(goal))),
        }),
      );
    },
    updateSettings: (settings) => {
      set((state) =>
        persist({ ...state, settings: { ...state.settings, ...settings } }),
      );
    },
    importProgress: (snapshot) => {
      if (!isProgressSnapshot(snapshot)) return false;
      const normalised = normaliseSnapshot(snapshot);
      set(persist(normalised));
      return true;
    },
    resetProgress: () => {
      clearProgress();
      set(freshProgress());
    },
  };
});
