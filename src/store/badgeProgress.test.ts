import { describe, expect, it } from "vitest";
import type { ActivityResult } from "./progressStore";
import { getBadgeProgress, getBadgeProgressPercent } from "./badgeProgress";

function answer(
  itemId: string,
  activity: ActivityResult["activity"],
  correct = true,
): ActivityResult {
  return {
    itemId,
    activity,
    correct,
    timestamp: 1_000,
  };
}

describe("getBadgeProgress", () => {
  it("tracks Binary Boss conversion progress", () => {
    const progress = getBadgeProgress({
      history: Array.from({ length: 12 }, (_, index) =>
        answer(`convert-${index}`, "convert"),
      ),
      itemProgress: {},
      streak: 0,
    });

    expect(progress["binary-boss"]).toMatchObject({
      current: 12,
      target: 50,
      label: "12 / 50 conversions",
    });
    expect(getBadgeProgressPercent(progress["binary-boss"])).toBe(24);
  });

  it("tracks streak and quiz-streak badges", () => {
    const progress = getBadgeProgress({
      history: [
        answer("q1", "quiz"),
        answer("q2", "quiz"),
        answer("q3", "quiz", false),
        answer("q4", "quiz"),
      ],
      itemProgress: {},
      streak: 3,
    });

    expect(progress["perfect-week"].label).toBe("3 / 7 day streak");
    expect(progress["sharp-shooter"].label).toBe("2 / 10 quiz streak");
  });

  it("clamps progress percentages after the target is reached", () => {
    const progress = getBadgeProgress({
      history: Array.from({ length: 55 }, (_, index) =>
        answer(`convert-${index}`, "convert"),
      ),
      itemProgress: {},
      streak: 9,
    });

    expect(getBadgeProgressPercent(progress["binary-boss"])).toBe(100);
    expect(getBadgeProgressPercent(progress["perfect-week"])).toBe(100);
  });
});
