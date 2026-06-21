import { createContext } from "react";
import type { Session, User } from "@supabase/supabase-js";
import type { RankedProgressTotals } from "../ranked/rankedTypes";

export interface Profile {
  id: string;
  display_name: string | null;
  full_name: string;
  class_id: string | null;
  year_group: string | null;
  role: "student" | "teacher";
  leaderboard_opt_in: boolean;
  created_at: string;
}

export interface AuthContextValue {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  rankedProgress: RankedProgressTotals | null;
  isVerified: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshRankedProgress: () => Promise<void>;
  updateLeaderboardOptIn: (optIn: boolean) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
