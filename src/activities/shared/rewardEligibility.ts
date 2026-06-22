export function shouldSubmitRankedAttempt({
  answerRevealedBeforeAttempt = false,
  correct = true,
}: {
  answerRevealedBeforeAttempt?: boolean;
  correct?: boolean;
}) {
  return correct && !answerRevealedBeforeAttempt;
}
