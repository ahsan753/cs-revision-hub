import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ANONYMOUS_STORAGE_KEY,
  getProgressStorageKey,
  readProgress,
  setProgressStorageUser,
  writeProgress,
} from "./storage";
import type { ProgressSnapshot } from "./progressStore";

const baseSnapshot: ProgressSnapshot = {
  version: 1,
  xp: 0,
  level: 1,
  streak: 0,
  dailyGoal: 5,
  dailyProgress: {
    date: "2026-06-21",
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

describe("progress storage", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear(),
    };
    Object.defineProperty(globalThis, "window", {
      value: { localStorage: storage },
      configurable: true,
    });
    Object.defineProperty(globalThis, "localStorage", {
      value: storage,
      configurable: true,
    });
  });

  afterEach(() => {
    localStorage.clear();
    setProgressStorageUser(null);
    Reflect.deleteProperty(globalThis, "window");
    Reflect.deleteProperty(globalThis, "localStorage");
  });

  it("uses anonymous and per-user keys", () => {
    expect(getProgressStorageKey(null)).toBe(ANONYMOUS_STORAGE_KEY);
    expect(getProgressStorageKey("user-1")).toBe("csrh:v1:progress:user-1");
  });

  it("keeps user caches isolated", () => {
    setProgressStorageUser("user-1");
    writeProgress({ ...baseSnapshot, xp: 10, level: 2 });
    setProgressStorageUser("user-2");
    writeProgress({ ...baseSnapshot, xp: 20, level: 3 });

    expect(readProgress()?.xp).toBe(20);
    setProgressStorageUser("user-1");
    expect(readProgress()?.xp).toBe(10);
  });
});
