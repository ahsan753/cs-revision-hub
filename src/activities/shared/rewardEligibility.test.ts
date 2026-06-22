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
});
