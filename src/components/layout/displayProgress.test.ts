import { describe, expect, it } from "vitest";
import type { RankedProgressTotals } from "../../ranked/rankedTypes";
import { chooseDisplayProgress } from "./displayProgress";

function rankedProgress(
  overrides: Partial<RankedProgressTotals>,
): RankedProgressTotals {
  return {
    xp: 0,
    level: 1,
    streak: 0,
    best_streak: 0,
    total_answered: 0,
    last_answer_at: null,
    updated_at: "2026-06-21T00:00:00.000Z",
    ...overrides,
  };
}

describe("chooseDisplayProgress", () => {
  it("does not let zero ranked progress hide local practice progress", () => {
    expect(
      chooseDisplayProgress({
        local: { xp: 160, level: 2, streak: 1 },
        ranked: rankedProgress({}),
      }),
    ).toEqual({ xp: 160, level: 2, streak: 1 });
  });

  it("uses ranked progress when it is ahead of local progress", () => {
    expect(
      chooseDisplayProgress({
        local: { xp: 20, level: 1, streak: 0 },
        ranked: rankedProgress({
          xp: 120,
          level: 2,
          streak: 4,
          best_streak: 4,
          total_answered: 12,
        }),
      }),
    ).toEqual({ xp: 120, level: 2, streak: 4 });
  });
});
