import type { ProgressSnapshot } from "./progressStore";

export const STORAGE_KEY = "csrh:v1:progress";

export function readProgress(): ProgressSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (!value) return null;
    return JSON.parse(value) as ProgressSnapshot;
  } catch {
    return null;
  }
}

export function writeProgress(snapshot: ProgressSnapshot) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

export function clearProgress() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
