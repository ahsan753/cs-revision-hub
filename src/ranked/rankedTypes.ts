import type { ActivityType } from "../store/progressStore";

export type RankedActivity = Exclude<ActivityType, "flashcards">;

export type ConversionOperand =
  | { kind: "value"; value: number }
  | { kind: "binary-add"; left: number; right: number }
  | { kind: "shift"; value: number; direction: "left" | "right" }
  | { kind: "image"; width: number; height: number; depth: number }
  | {
      kind: "sound";
      seconds: number;
      sampleRate: number;
      resolution: number;
    };

export type RankedSubmission =
  | { kind: "mcq"; selectedIndex: number }
  | { kind: "match"; termId: string; definitionId: string }
  | {
      kind: "memory";
      firstPairId: string;
      secondPairId: string;
      firstKind: "term" | "definition";
      secondKind: "term" | "definition";
      sessionId?: string;
    }
  | { kind: "code-predict"; answer: string }
  | { kind: "code-fill"; answersByBlankId: Record<string, string> }
  | { kind: "code-parsons"; lines: string[] }
  | {
      kind: "conversion";
      mode: string;
      operands: ConversionOperand;
      submittedAnswer: string;
    };

export interface RankedPayload {
  rankedItemId: string;
  submitted: RankedSubmission;
}

export interface RankedProgressTotals {
  xp: number;
  level: number;
  streak: number;
  best_streak: number;
  total_answered: number;
  last_answer_at: string | null;
  updated_at: string | null;
}

export interface LeaderboardRow {
  rank: number;
  display_name: string;
  class_name?: string | null;
  level: number;
  xp: number;
  streak: number;
  is_me: boolean;
}

export interface DailyStat {
  date: string;
  xp_gained: number;
  answered: number;
}
