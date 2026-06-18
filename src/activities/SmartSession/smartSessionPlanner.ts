import { contentIndex } from "../../content/contentIndex";
import type { Flashcard, MCQ } from "../../data/contentTypes";
import type { ItemProgress } from "../../store/progressStore";

export type SmartSessionItem =
  | {
      id: string;
      type: "mcq";
      bucket: "due" | "unseen" | "other";
      item: MCQ;
    }
  | {
      id: string;
      type: "flashcard";
      bucket: "due" | "unseen" | "other";
      item: Flashcard;
    };

export interface SmartSessionPlan {
  items: SmartSessionItem[];
  dueCount: number;
  newCount: number;
  reviewCount: number;
  cappedDueCount: number;
}

export interface SmartSessionOptions {
  dueCap?: number;
  floor?: number;
  content?: {
    mcqs: MCQ[];
    flashcards: Flashcard[];
  };
}

const defaultOptions = {
  dueCap: 30,
  floor: 10,
};

export function planSmartSession(
  itemProgress: Record<string, ItemProgress>,
  now: number,
  opts: SmartSessionOptions = {},
): SmartSessionPlan {
  const dueCap = opts.dueCap ?? defaultOptions.dueCap;
  const floor = opts.floor ?? defaultOptions.floor;
  const content = opts.content ?? {
    mcqs: contentIndex.allMcqs.filter(
      (item) => (item.type ?? "single") === "single",
    ),
    flashcards: contentIndex.allFlashcards,
  };

  const allItems: SmartSessionItem[] = [
    ...content.mcqs.map((item) =>
      makeItem("mcq" as const, item, itemProgress, now),
    ),
    ...content.flashcards.map((item) =>
      makeItem("flashcard" as const, item, itemProgress, now),
    ),
  ];

  const due = allItems
    .filter((item) => item.bucket === "due")
    .sort(
      (a, b) =>
        (itemProgress[a.id]?.nextDue ?? 0) -
          (itemProgress[b.id]?.nextDue ?? 0) || a.id.localeCompare(b.id),
    );
  const unseen = interleaveTypes(
    allItems.filter((item) => item.bucket === "unseen"),
  );
  const other = interleaveTypes(
    allItems.filter((item) => item.bucket === "other"),
  );

  const cappedDue = due.slice(0, dueCap);
  const selected = [...cappedDue];

  if (selected.length < floor) {
    selected.push(...unseen.slice(0, floor - selected.length));
  }
  if (selected.length < floor) {
    selected.push(...other.slice(0, floor - selected.length));
  }
  if (selected.length === 0) {
    selected.push(...interleaveTypes(allItems).slice(0, floor));
  }

  return {
    items: selected,
    dueCount: selected.filter((item) => item.bucket === "due").length,
    newCount: selected.filter((item) => item.bucket === "unseen").length,
    reviewCount: selected.filter((item) => item.bucket === "other").length,
    cappedDueCount: Math.max(0, due.length - cappedDue.length),
  };
}

function makeItem<T extends "mcq" | "flashcard">(
  type: T,
  item: T extends "mcq" ? MCQ : Flashcard,
  itemProgress: Record<string, ItemProgress>,
  now: number,
): SmartSessionItem {
  const progress = itemProgress[item.id];
  const bucket =
    progress && progress.attempts > 0 && progress.nextDue <= now
      ? "due"
      : progress
        ? "other"
        : "unseen";

  if (type === "mcq") {
    return { id: item.id, type, bucket, item: item as MCQ };
  }
  return { id: item.id, type, bucket, item: item as Flashcard };
}

function interleaveTypes(items: SmartSessionItem[]) {
  const mcqs = items.filter((item) => item.type === "mcq");
  const flashcards = items.filter((item) => item.type === "flashcard");
  const result: SmartSessionItem[] = [];
  let nextType: SmartSessionItem["type"] =
    mcqs.length >= flashcards.length ? "mcq" : "flashcard";

  while (mcqs.length || flashcards.length) {
    const preferred = nextType === "mcq" ? mcqs : flashcards;
    const fallback = nextType === "mcq" ? flashcards : mcqs;
    const next = preferred.shift() ?? fallback.shift();
    if (next) result.push(next);
    nextType = next?.type === "mcq" ? "flashcard" : "mcq";
  }

  return result;
}
