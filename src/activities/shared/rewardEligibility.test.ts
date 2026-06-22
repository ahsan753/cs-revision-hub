import { describe, expect, it } from "vitest";
import { shouldSubmitRankedAttempt } from "./rewardEligibility";

describe("shouldSubmitRankedAttempt", () => {
  it("allows ranked submission before an answer has been revealed", () => {
    expect(
      shouldSubmitRankedAttempt({ answerRevealedBeforeAttempt: false }),
    ).toBe(true);
  });

  it("blocks ranked submission after an answer has been revealed", () => {
    expect(
      shouldSubmitRankedAttempt({ answerRevealedBeforeAttempt: true }),
    ).toBe(false);
  });

  it("blocks ranked submission for incorrect flashcard-pair attempts", () => {
    expect(shouldSubmitRankedAttempt({ correct: false })).toBe(false);
  });

  it("allows correct attempts when no answer was revealed first", () => {
    expect(shouldSubmitRankedAttempt({ correct: true })).toBe(true);
  });
});
