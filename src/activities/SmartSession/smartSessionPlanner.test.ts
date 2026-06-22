import { describe, expect, it } from "vitest";
import type { Flashcard, MCQ } from "../../data/contentTypes";
import type { ItemProgress } from "../../store/progressStore";
import {
  countRemainingSmartSessionBuckets,
  planSmartSession,
} from "./smartSessionPlanner";

const now = 1_000_000;

function mcq(id: string): MCQ {
  return {
    id,
    subtopic: "1.1",
    question: id,
    options: ["A", "B"],
    answerIndex: 0,
    explanation: "Because.",
  };
}

function flashcard(id: string): Flashcard {
  return {
    id,
    subtopic: "1.1",
    term: id,
    definition: `${id} definition`,
  };
}

function progress(id: string, nextDue: number, attempts = 1): ItemProgress {
  return {
    itemId: id,
    attempts,
    correctCount: 1,
    correctAttempts: 1,
    latestCorrect: true,
    leitnerBox: 2,
    nextDue,
    lastActivity: "quiz",
    lastAttemptAt: now - 100,
  };
}

describe("planSmartSession", () => {
  it("orders due items by most-overdue first", () => {
    const plan = planSmartSession(
      {
        later: progress("later", now - 100),
        earliest: progress("earliest", now - 500),
      },
      now,
      {
        floor: 2,
        content: {
          mcqs: [mcq("later"), mcq("earliest")],
          flashcards: [],
        },
      },
    );

    expect(plan.items.map((item) => item.id)).toEqual(["earliest", "later"]);
    expect(plan.dueCount).toBe(2);
  });

  it("caps due items at the default 30 item ceiling", () => {
    const ids = Array.from({ length: 35 }, (_, index) => `m${index}`);
    const plan = planSmartSession(
      Object.fromEntries(
        ids.map((id, index) => [id, progress(id, now - 1_000 + index)]),
      ),
      now,
      {
        content: {
          mcqs: ids.map(mcq),
          flashcards: [],
        },
      },
    );

    expect(plan.items).toHaveLength(30);
    expect(plan.cappedDueCount).toBe(5);
  });

  it("tops up short due sessions to the default 10 item floor", () => {
    const plan = planSmartSession(
      {
        due: progress("due", now - 100),
      },
      now,
      {
        content: {
          mcqs: [mcq("due"), mcq("new-1"), mcq("new-2"), mcq("new-3")],
          flashcards: [
            flashcard("new-4"),
            flashcard("new-5"),
            flashcard("new-6"),
            flashcard("new-7"),
            flashcard("new-8"),
            flashcard("new-9"),
          ],
        },
      },
    );

    expect(plan.items).toHaveLength(10);
    expect(plan.dueCount).toBe(1);
    expect(plan.newCount).toBe(9);
  });

  it("interleaves MCQs and flashcards when breaking ties", () => {
    const plan = planSmartSession({}, now, {
      floor: 4,
      content: {
        mcqs: [mcq("m1"), mcq("m2")],
        flashcards: [flashcard("f1"), flashcard("f2")],
      },
    });

    expect(plan.items.map((item) => item.type)).toEqual([
      "mcq",
      "flashcard",
      "mcq",
      "flashcard",
    ]);
  });

  it("uses other attempted items when nothing is due or unseen", () => {
    const plan = planSmartSession(
      {
        m1: progress("m1", now + 100),
        f1: progress("f1", now + 100),
      },
      now,
      {
        floor: 2,
        content: {
          mcqs: [mcq("m1")],
          flashcards: [flashcard("f1")],
        },
      },
    );

    expect(plan.items.map((item) => item.bucket)).toEqual(["other", "other"]);
    expect(plan.reviewCount).toBe(2);
  });

  it("counts remaining due and new items after answers are recorded", () => {
    const plan = planSmartSession(
      {
        due: progress("due", now - 100),
        review: progress("review", now + 100),
      },
      now,
      {
        floor: 4,
        content: {
          mcqs: [mcq("due"), mcq("new-1"), mcq("review")],
          flashcards: [flashcard("new-2")],
        },
      },
    );

    expect(
      countRemainingSmartSessionBuckets(plan.items, ["due", "new-1"]),
    ).toEqual({
      dueCount: 0,
      newCount: 1,
      reviewCount: 1,
    });
  });
});
