import type { ProgressSnapshot } from "./progressStore";

export const ANONYMOUS_STORAGE_KEY = "csrh:v1:progress";
export const STORAGE_KEY = ANONYMOUS_STORAGE_KEY;

let activeStorageKey = ANONYMOUS_STORAGE_KEY;

export function getProgressStorageKey(userId?: string | null) {
  return userId ? `csrh:v1:progress:${userId}` : ANONYMOUS_STORAGE_KEY;
}

export function setProgressStorageUser(userId?: string | null) {
  activeStorageKey = getProgressStorageKey(userId);
}

export function readProgress(): ProgressSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(activeStorageKey);
    if (!value) return null;
    return JSON.parse(value) as ProgressSnapshot;
  } catch {
    return null;
  }
}

export function writeProgress(snapshot: ProgressSnapshot) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(activeStorageKey, JSON.stringify(snapshot));
}

export function clearProgress() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(activeStorageKey);
}
