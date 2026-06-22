import type { Flashcard } from "../../data/contentTypes";

export function shuffle<T>(items: T[]) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }
  return shuffled;
}

export function takeRound(items: Flashcard[], target = 6) {
  return shuffle(items).slice(0, Math.max(1, Math.min(target, items.length)));
}

export function normaliseText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function formatElapsedTime(ms: number) {
  const totalTenths = Math.max(0, Math.floor(ms / 100));
  const minutes = Math.floor(totalTenths / 600);
  const seconds = Math.floor((totalTenths % 600) / 10);
  const tenths = totalTenths % 10;

  return `${minutes}:${String(seconds).padStart(2, "0")}.${tenths}`;
}
