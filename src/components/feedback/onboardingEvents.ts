export const ONBOARDED_KEY = "csrh:v1:onboarded";
export const REPLAY_ONBOARDING_EVENT = "csrh:replay-onboarding";

export function requestOnboardingReplay() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(REPLAY_ONBOARDING_EVENT));
}
