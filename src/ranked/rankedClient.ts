import { requireSupabase, supabase } from "../lib/supabaseClient";
import type {
  DailyStat,
  LeaderboardRow,
  RankedActivity,
  RankedProgressTotals,
  RankedSubmission,
} from "./rankedTypes";

export interface RankedAnswerResponse {
  correct: boolean;
  xp_awarded: number;
  totals: RankedProgressTotals;
}

export const rankedProgressEvent = "csrh:ranked-progress";

export async function recordRankedAnswer({
  rankedItemId,
  activity,
  submitted,
}: {
  rankedItemId: string;
  activity: RankedActivity;
  submitted: RankedSubmission;
}) {
  if (!supabase || typeof navigator !== "undefined" && !navigator.onLine) {
    return null;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user.email_confirmed_at) return null;

  const eventId = crypto.randomUUID();
  const { data, error } = await supabase.functions.invoke<RankedAnswerResponse>(
    "record-ranked-answer",
    {
      body: {
        event_id: eventId,
        ranked_item_id: rankedItemId,
        activity,
        submitted,
      },
    },
  );
  if (error) throw error;
  if (data?.totals && typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(rankedProgressEvent, { detail: data.totals }),
    );
  }
  return data ?? null;
}

export async function getMyRankedProgress() {
  const client = requireSupabase();
  const { data, error } = await client
    .from("progress")
    .select("xp, level, streak, best_streak, total_answered, last_answer_at, updated_at")
    .maybeSingle<RankedProgressTotals>();
  if (error) throw error;
  return data;
}

export async function getMyDailyStats(limit = 30) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("progress_daily_stats")
    .select("date, xp_gained, answered")
    .order("date", { ascending: false })
    .limit(limit)
    .returns<DailyStat[]>();
  if (error) throw error;
  return data ?? [];
}

export async function getClassLeaderboard() {
  const client = requireSupabase();
  const { data, error } = await client
    .rpc("get_class_leaderboard");
  if (error) throw error;
  return (data ?? []) as LeaderboardRow[];
}

export async function getYearLeaderboard() {
  const client = requireSupabase();
  const { data, error } = await client
    .rpc("get_year_leaderboard");
  if (error) throw error;
  return (data ?? []) as LeaderboardRow[];
}
