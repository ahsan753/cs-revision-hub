import type { Session } from "@supabase/supabase-js";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { requireSupabase, supabase } from "../lib/supabaseClient";
import {
  getMyRankedProgress,
  rankedProgressEvent,
} from "../ranked/rankedClient";
import type { RankedProgressTotals } from "../ranked/rankedTypes";
import { useProgressStore } from "../store/progressStore";
import {
  AuthContext,
  type AuthContextValue,
  type Profile,
} from "./authContext";
import { getAuthRedirectTo } from "./authRedirect";
import { isAllowedStudentEmail, nameFromEmail } from "./nameFromEmail";
import { normaliseLoginIdentifier } from "./studentCredentials";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rankedProgress, setRankedProgress] =
    useState<RankedProgressTotals | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));

  const user = session?.user ?? null;
  const isVerified = Boolean(user?.email_confirmed_at);

  const refreshProfile = useCallback(async () => {
    if (!supabase) return;
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();
    const currentUser = currentSession?.user;
    if (!currentUser) {
      setProfile(null);
      return;
    }
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, display_name, full_name, class_id, year_group, role, leaderboard_opt_in, created_at",
      )
      .eq("id", currentUser.id)
      .maybeSingle<Profile>();
    if (error) throw error;
    setProfile(data);
  }, []);

  const refreshRankedProgress = useCallback(async () => {
    if (!supabase) return;
    const totals = await getMyRankedProgress();
    setRankedProgress(totals);
  }, []);

  useEffect(() => {
    if (!supabase) return;

    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session);
        useProgressStore
          .getState()
          .switchProgressScope(data.session?.user.id ?? null);
      })
      .finally(() => active && setLoading(false));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setRankedProgress(null);
      setProfile(null);
      useProgressStore
        .getState()
        .switchProgressScope(nextSession?.user.id ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user || !isVerified) {
      setProfile(null);
      setRankedProgress(null);
      return;
    }
    void refreshProfile().catch(() => undefined);
    void refreshRankedProgress().catch(() => undefined);
  }, [isVerified, refreshProfile, refreshRankedProgress, user]);

  useEffect(() => {
    const update = (event: Event) => {
      setRankedProgress((event as CustomEvent<RankedProgressTotals>).detail);
    };
    window.addEventListener(rankedProgressEvent, update);
    return () => window.removeEventListener(rankedProgressEvent, update);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      configured: Boolean(supabase),
      loading,
      session,
      user,
      profile,
      rankedProgress,
      isVerified,
      signIn: async (email, password) => {
        const client = requireSupabase();
        const { error } = await client.auth.signInWithPassword({
          email: normaliseLoginIdentifier(email),
          password,
        });
        if (error) throw error;
      },
      signUp: async (email, password) => {
        const client = requireSupabase();
        if (!isAllowedStudentEmail(email)) {
          throw new Error("Use your @student.orbital.education email address.");
        }
        const { error } = await client.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: getAuthRedirectTo(),
            data: {
              full_name: nameFromEmail(email),
            },
          },
        });
        if (error) throw error;
      },
      resetPassword: async (email) => {
        const client = requireSupabase();
        const { error } = await client.auth.resetPasswordForEmail(email);
        if (error) throw error;
      },
      signOut: async () => {
        const client = requireSupabase();
        const { error } = await client.auth.signOut();
        if (error) throw error;
        useProgressStore.getState().switchProgressScope(null);
      },
      refreshProfile,
      refreshRankedProgress,
      updateLeaderboardOptIn: async (optIn) => {
        const client = requireSupabase();
        const { error } = await client
          .from("profiles")
          .update({ leaderboard_opt_in: optIn })
          .eq("id", user?.id ?? "");
        if (error) throw error;
        await refreshProfile();
      },
      deleteAccount: async () => {
        const client = requireSupabase();
        const { error } = await client.functions.invoke("delete-account");
        if (error) throw error;
        await client.auth.signOut();
        useProgressStore.getState().switchProgressScope(null);
      },
    }),
    [
      isVerified,
      loading,
      profile,
      rankedProgress,
      refreshProfile,
      refreshRankedProgress,
      session,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
