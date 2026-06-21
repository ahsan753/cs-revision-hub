import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { useAuth } from "../auth/useAuth";
import { SupabaseSetupNotice } from "./LoginPage";
import { chooseDisplayProgress } from "../components/layout/displayProgress";
import { useProgressStore } from "../store/progressStore";
import { getRankForLevel } from "../store/rankSystem";

export function AccountPage() {
  const {
    configured,
    user,
    profile,
    rankedProgress,
    isVerified,
    updateLeaderboardOptIn,
    deleteAccount,
    signOut,
  } = useAuth();
  const localXp = useProgressStore((state) => state.xp);
  const localLevel = useProgressStore((state) => state.level);
  const localStreak = useProgressStore((state) => state.streak);
  const [message, setMessage] = useState<string | null>(null);
  const showClassNotice =
    isVerified && profile?.role === "student" && !profile.class_id;
  const displayedProgress = chooseDisplayProgress({
    local: { xp: localXp, level: localLevel, streak: localStreak },
    ranked: rankedProgress,
  });
  const displayedRank = getRankForLevel(displayedProgress.level);

  if (!configured) {
    return (
      <div className="mx-auto max-w-2xl">
        <SupabaseSetupNotice />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold">Account</h1>
        <p className="mt-2 text-sm font-bold text-muted">
          Your app rank follows the highest XP total available. Leaderboard XP
          only counts server-verified answers.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <AccountStat
          label="App rank"
          value={`Level ${displayedProgress.level}`}
          detail={displayedRank.name}
        />
        <AccountStat label="App XP" value={displayedProgress.xp} />
        <AccountStat label="Leaderboard XP" value={rankedProgress?.xp ?? 0} />
      </section>

      {message ? (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-sm font-bold text-primary">
          {message}
        </div>
      ) : null}

      {showClassNotice ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-soft">
          <h2 className="text-lg font-extrabold text-amber-900">
            Join your class
          </h2>
          <p className="mt-2 text-sm font-bold leading-6 text-amber-800">
            Enter your teacher's class code in Settings to appear on the right
            class and global leaderboards.
          </p>
          <div className="mt-4">
            <Link to="/settings">
              <Button>Open settings</Button>
            </Link>
          </div>
        </section>
      ) : null}

      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <h2 className="text-lg font-extrabold">Profile</h2>
        <div className="mt-4 grid gap-3 text-sm font-bold md:grid-cols-2">
          <p>
            Email: <span className="text-muted">{user?.email}</span>
          </p>
          <p>
            Status:{" "}
            <span className="text-muted">
              {isVerified ? "Verified" : "Check email"}
            </span>
          </p>
          <p>
            Role:{" "}
            <span className="text-muted">{profile?.role ?? "Loading"}</span>
          </p>
          <p>
            Private name:{" "}
            <span className="text-muted">
              {profile?.full_name ?? "Pending"}
            </span>
          </p>
          <p>
            Display name:{" "}
            <span className="text-muted">
              {profile?.display_name ??
                profile?.full_name?.split(" ")[0] ??
                "Pending"}
            </span>
          </p>
          <p>
            Class:{" "}
            <span className="text-muted">
              {profile?.class_id ? "Joined" : "Not joined"}
            </span>
          </p>
          <p>
            Year group:{" "}
            <span className="text-muted">
              {profile?.year_group ?? "Not set"}
            </span>
          </p>
        </div>
        {!isVerified ? (
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm font-bold text-amber-800">
            Verify your email before joining classes or earning ranked XP.
          </p>
        ) : null}
      </section>

      {profile?.role === "teacher" ? (
        <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
          <h2 className="text-lg font-extrabold">Teacher tools</h2>
          <p className="mt-2 text-sm font-bold text-muted">
            Create classes, generate student logins, and manage your roster.
          </p>
          <div className="mt-4">
            <Link to="/teacher">
              <Button>Open teacher dashboard</Button>
            </Link>
          </div>
        </section>
      ) : null}

      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <h2 className="text-lg font-extrabold">Privacy controls</h2>
        <label className="mt-4 flex items-center gap-3 text-sm font-bold">
          <input
            type="checkbox"
            checked={profile?.leaderboard_opt_in ?? true}
            onChange={(event) => {
              void updateLeaderboardOptIn(event.target.checked).catch((error) =>
                setMessage(
                  error instanceof Error ? error.message : "Update failed.",
                ),
              );
            }}
          />
          Show my display name on leaderboards
        </label>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => void signOut()}>
            Sign out
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (window.confirm("Delete this account and ranked history?")) {
                void deleteAccount().catch((error) =>
                  setMessage(
                    error instanceof Error ? error.message : "Delete failed.",
                  ),
                );
              }
            }}
          >
            Delete account
          </Button>
        </div>
      </section>
    </div>
  );
}

function AccountStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-white p-5 shadow-soft">
      <p className="text-sm font-bold text-muted">{label}</p>
      <p className="mt-2 text-3xl font-extrabold text-primary">{value}</p>
      {detail ? (
        <p className="mt-1 text-sm font-bold text-muted">{detail}</p>
      ) : null}
    </div>
  );
}
