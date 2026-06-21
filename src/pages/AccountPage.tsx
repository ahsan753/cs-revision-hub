import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { useAuth } from "../auth/useAuth";
import { SupabaseSetupNotice } from "./LoginPage";

export function AccountPage() {
  const {
    configured,
    user,
    profile,
    rankedProgress,
    isVerified,
    joinClass,
    updateLeaderboardOptIn,
    deleteAccount,
    signOut,
  } = useAuth();
  const [joinCode, setJoinCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const join = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const className = await joinClass(joinCode);
      setJoinCode("");
      setMessage(className ? `Joined ${className}.` : "Class joined.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not join class.");
    } finally {
      setBusy(false);
    }
  };

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
          Ranked XP is separate from local offline practice.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <AccountStat label="Ranked XP" value={rankedProgress?.xp ?? 0} />
        <AccountStat label="Ranked level" value={rankedProgress?.level ?? 1} />
        <AccountStat label="Best streak" value={rankedProgress?.best_streak ?? 0} />
      </section>

      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <h2 className="text-lg font-extrabold">Profile</h2>
        <div className="mt-4 grid gap-3 text-sm font-bold md:grid-cols-2">
          <p>Email: <span className="text-muted">{user?.email}</span></p>
          <p>Status: <span className="text-muted">{isVerified ? "Verified" : "Check email"}</span></p>
          <p>Role: <span className="text-muted">{profile?.role ?? "Loading"}</span></p>
          <p>Private name: <span className="text-muted">{profile?.full_name ?? "Pending"}</span></p>
          <p>Display name: <span className="text-muted">{profile?.display_name ?? "Teacher approval pending"}</span></p>
          <p>Class: <span className="text-muted">{profile?.class_id ? "Joined" : "Not joined"}</span></p>
          <p>Year group: <span className="text-muted">{profile?.year_group ?? "Not set"}</span></p>
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
            Create classes, share join codes, approve display names, and manage
            your roster.
          </p>
          <div className="mt-4">
            <Link to="/teacher">
              <Button>Open teacher dashboard</Button>
            </Link>
          </div>
        </section>
      ) : null}

      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <h2 className="text-lg font-extrabold">Join class</h2>
        <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={join}>
          <input
            className="min-h-11 flex-1 rounded-lg border border-line px-3 text-sm font-bold uppercase outline-none focus:border-primary"
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
            placeholder="CS-7QK2"
          />
          <Button disabled={!isVerified || busy || !joinCode.trim()}>
            Join
          </Button>
        </form>
        {message ? <p className="mt-3 text-sm font-bold text-primary">{message}</p> : null}
      </section>

      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <h2 className="text-lg font-extrabold">Privacy controls</h2>
        <label className="mt-4 flex items-center gap-3 text-sm font-bold">
          <input
            type="checkbox"
            checked={profile?.leaderboard_opt_in ?? true}
            onChange={(event) => {
              void updateLeaderboardOptIn(event.target.checked).catch((error) =>
                setMessage(error instanceof Error ? error.message : "Update failed."),
              );
            }}
          />
          Show my approved display name on leaderboards
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

function AccountStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-line bg-white p-5 shadow-soft">
      <p className="text-sm font-bold text-muted">{label}</p>
      <p className="mt-2 text-3xl font-extrabold text-primary">{value}</p>
    </div>
  );
}
