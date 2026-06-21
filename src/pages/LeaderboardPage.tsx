import { RefreshCw, Trophy } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Button } from "../components/ui/Button";
import { RankEmblem } from "../components/ui/RankEmblem";
import { getRankForLevel } from "../store/rankSystem";
import { useAuth } from "../auth/useAuth";
import {
  getClassLeaderboard,
  getMyDailyStats,
  getYearLeaderboard,
} from "../ranked/rankedClient";
import type { DailyStat, LeaderboardRow } from "../ranked/rankedTypes";
import { SupabaseSetupNotice } from "./LoginPage";

type Tab = "class" | "year" | "personal";

export function LeaderboardPage() {
  const { configured, profile, rankedProgress, isVerified } = useAuth();
  const [tab, setTab] = useState<Tab>("class");
  const [classRows, setClassRows] = useState<LeaderboardRow[]>([]);
  const [yearRows, setYearRows] = useState<LeaderboardRow[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!configured || !isVerified) return;
    setLoading(true);
    setMessage(null);
    try {
      const [classData, yearData, daily] = await Promise.all([
        getClassLeaderboard(),
        getYearLeaderboard(),
        getMyDailyStats(30),
      ]);
      setClassRows(classData);
      setYearRows(yearData);
      setDailyStats(daily);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not load leaderboard.",
      );
    } finally {
      setLoading(false);
    }
  }, [configured, isVerified]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const personal = useMemo(() => {
    const weekXp = dailyStats
      .slice(0, 7)
      .reduce((total, day) => total + day.xp_gained, 0);
    const bestDay = dailyStats.reduce(
      (best, day) => Math.max(best, day.xp_gained),
      0,
    );
    return { weekXp, bestDay };
  }, [dailyStats]);

  if (!configured) {
    return (
      <div className="mx-auto max-w-2xl">
        <SupabaseSetupNotice />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold">Leaderboard</h1>
          <p className="mt-2 text-sm font-bold text-muted">
            Only server-verified ranked XP appears here.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => void refresh()}
          disabled={loading}
        >
          <RefreshCw size={17} /> Refresh
        </Button>
      </div>

      {!isVerified ? (
        <Notice>Verify your email before using ranked leaderboards.</Notice>
      ) : !profile?.class_id ? (
        <Notice>
          Your teacher needs to assign this login to a class before class and
          global leaderboards appear.
        </Notice>
      ) : null}

      {message ? <Notice>{message}</Notice> : null}

      <div className="inline-flex rounded-lg border border-line bg-white p-1 shadow-soft">
        {(["class", "year", "personal"] as const).map((item) => (
          <button
            key={item}
            className={`rounded-md px-4 py-2 text-sm font-extrabold capitalize ${
              tab === item ? "bg-indigo-50 text-primary" : "text-muted"
            }`}
            onClick={() => setTab(item)}
          >
            {item === "year" ? "Global" : item}
          </button>
        ))}
      </div>

      {tab === "personal" ? (
        <PersonalPanel
          totalXp={rankedProgress?.xp ?? 0}
          level={rankedProgress?.level ?? 1}
          streak={rankedProgress?.streak ?? 0}
          bestStreak={rankedProgress?.best_streak ?? 0}
          weekXp={personal.weekXp}
          bestDay={personal.bestDay}
          dailyStats={dailyStats}
        />
      ) : (
        <LeaderboardTable
          rows={tab === "class" ? classRows : yearRows}
          showClassName={tab === "year"}
        />
      )}
    </div>
  );
}

function LeaderboardTable({
  rows,
  showClassName,
}: {
  rows: LeaderboardRow[];
  showClassName: boolean;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-white p-6 text-sm font-bold text-muted shadow-soft">
        No leaderboard rows yet.
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-lg border border-line bg-white shadow-soft">
      <div className="grid grid-cols-[70px_1fr_90px_90px] border-b border-line bg-slate-50 px-4 py-3 text-xs font-extrabold uppercase text-muted md:grid-cols-[80px_1fr_190px_120px_120px]">
        <span>Rank</span>
        <span>Name</span>
        <span className="hidden md:block">Level</span>
        <span>XP</span>
        <span>Streak</span>
      </div>
      {rows.map((row) => {
        const rank = getRankForLevel(row.level);
        return (
          <div
            key={`${row.rank}-${row.display_name}`}
            className={`grid grid-cols-[70px_1fr_90px_90px] items-center px-4 py-3 text-sm font-bold md:grid-cols-[80px_1fr_190px_120px_120px] ${
              row.is_me ? "bg-indigo-50 text-primary" : "border-t border-line"
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <Trophy size={16} className="text-amber-500" />
              {row.rank}
            </span>
            <span className="min-w-0">
              <span className="block truncate">{row.display_name}</span>
              {showClassName && row.class_name ? (
                <span className="mt-1 block truncate text-xs text-muted">
                  {row.class_name}
                </span>
              ) : null}
            </span>
            <span className="hidden min-w-0 items-center gap-2 md:inline-flex">
              <RankEmblem rank={rank} size="xs" />
              <span className="min-w-0">
                <span className="block">Level {row.level}</span>
                <span className="block truncate text-xs text-muted">
                  {rank.name}
                </span>
              </span>
            </span>
            <span>{row.xp}</span>
            <span>{row.streak}</span>
          </div>
        );
      })}
    </section>
  );
}

function PersonalPanel({
  totalXp,
  level,
  streak,
  bestStreak,
  weekXp,
  bestDay,
  dailyStats,
}: {
  totalXp: number;
  level: number;
  streak: number;
  bestStreak: number;
  weekXp: number;
  bestDay: number;
  dailyStats: DailyStat[];
}) {
  const rank = getRankForLevel(level);

  return (
    <div className="space-y-4">
      <section className="grid gap-4 md:grid-cols-4">
        <PersonalStat label="Leaderboard XP" value={totalXp} />
        <PersonalStat
          label="Leaderboard rank"
          value={`Level ${level}`}
          detail={rank.name}
        />
        <PersonalStat label="This week" value={weekXp} />
        <PersonalStat label="Best day" value={bestDay} />
      </section>
      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <h2 className="text-lg font-extrabold">Leaderboard history</h2>
        <p className="mt-1 text-sm font-bold text-muted">
          Current streak {streak}; best streak {bestStreak}.
        </p>
        <div className="mt-4 space-y-2">
          {dailyStats.length ? (
            dailyStats.slice(0, 14).map((day) => (
              <div
                key={day.date}
                className="grid grid-cols-[110px_1fr_80px] items-center gap-3 text-sm font-bold"
              >
                <span className="text-muted">{day.date}</span>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${Math.min(100, (day.xp_gained / Math.max(10, bestDay)) * 100)}%`,
                    }}
                  />
                </div>
                <span className="text-right">{day.xp_gained} XP</span>
              </div>
            ))
          ) : (
            <p className="rounded-lg bg-slate-50 p-4 text-sm font-bold text-muted">
              No leaderboard days yet.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function PersonalStat({
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

function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
      {children}
    </div>
  );
}
