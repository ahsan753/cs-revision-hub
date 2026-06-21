import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { useAuth } from "../auth/useAuth";
import { SupabaseSetupNotice } from "./LoginPage";
import { getRankForLevel } from "../store/rankSystem";
import { isTeacherManagedAuthEmail } from "../auth/nameFromEmail";

export function AccountPage() {
  const {
    configured,
    user,
    profile,
    rankedProgress,
    isVerified,
    updateLeaderboardOptIn,
    signOut,
  } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const showClassNotice = profile?.role === "student" && !profile.class_id;
  const leaderboardLevel = rankedProgress?.level ?? 1;
  const displayedRank = getRankForLevel(leaderboardLevel);
  const statusLabel = isTeacherManagedAuthEmail(user?.email)
    ? "Managed login"
    : isVerified
      ? "Ready"
      : "Check email";

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
          XP and rank only count online answers checked by the server.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <AccountStat
          label="Rank"
          value={`Level ${leaderboardLevel}`}
          detail={displayedRank.name}
        />
        <AccountStat label="XP" value={rankedProgress?.xp ?? 0} />
        <AccountStat
          label="Best streak"
          value={rankedProgress?.best_streak ?? 0}
        />
      </section>

      {message ? (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-sm font-bold text-primary">
          {message}
        </div>
      ) : null}

      {showClassNotice ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-soft">
          <h2 className="text-lg font-extrabold text-amber-900">
            Class not assigned
          </h2>
          <p className="mt-2 text-sm font-bold leading-6 text-amber-800">
            Your teacher needs to assign this login to a class before class and
            global leaderboards appear.
          </p>
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
            <span className="text-muted">{statusLabel}</span>
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
            Check your email before earning leaderboard XP.
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
