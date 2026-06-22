export function shouldSubmitRankedAttempt({
  answerRevealedBeforeAttempt,
}: {
  answerRevealedBeforeAttempt: boolean;
}) {
  return !answerRevealedBeforeAttempt;
}
