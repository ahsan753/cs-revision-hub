import type { Flashcard } from "../../data/contentTypes";

export function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

export function takeRound(items: Flashcard[], target = 6) {
  return shuffle(items).slice(0, Math.max(1, Math.min(target, items.length)));
}

export function normaliseText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

