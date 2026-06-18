import {
  ArrowRight,
  BookOpen,
  Calculator,
  CheckCircle2,
  Code2,
  Flame,
  Grid2X2,
  Puzzle,
  Target,
  Trophy,
} from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  contentIndex,
  getItemIdsForUnit,
  getShortUnitTitle,
} from "../content/contentIndex";
import { BadgeShelf } from "../components/ui/BadgeShelf";
import { Button } from "../components/ui/Button";
import { MasteryChip } from "../components/ui/MasteryChip";
import { ProgressRing } from "../components/ui/ProgressRing";
import { getUnitMastery } from "../store/mastery";
import { getDailySuggestions } from "../store/dailyGoals";
import { useProgressStore, xpForLevel } from "../store/progressStore";

export function HomePage() {
  const progress = useProgressStore((state) => state.itemProgress);
  const daily = useProgressStore((state) => state.dailyProgress);
  const refreshDailyProgress = useProgressStore(
    (state) => state.refreshDailyProgress,
  );
  const streak = useProgressStore((state) => state.streak);
  const xp = useProgressStore((state) => state.xp);
  const level = useProgressStore((state) => state.level);
  const dailyGoal = useProgressStore((state) => state.dailyGoal);
  const unlockedBadges = useProgressStore((state) => state.unlockedBadges);
  const name = useProgressStore((state) => state.name);
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const levelPercent = Math.round(
    ((xp - currentLevelXp) / Math.max(1, nextLevelXp - currentLevelXp)) * 100,
  );
  const dailySuggestions = getDailySuggestions(progress);
  const completedDailyTaskIds = new Set(daily.completedTasks ?? []);
  const dailyAnswered = Math.min(dailyGoal, daily.answered);
  const remainingDailyItems = Math.max(0, dailyGoal - dailyAnswered);
  const dailyPercent = Math.min(
    100,
    Math.round((dailyAnswered / Math.max(1, dailyGoal)) * 100),
  );
  const dailyComplete = daily.completed || remainingDailyItems === 0;

  useEffect(() => {
    refreshDailyProgress();
  }, [refreshDailyProgress]);

  return (
    <div className="space-y-5">
      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr_0.9fr]">
        <div className="rounded-lg border border-line bg-white p-5 shadow-soft">
          <div className="flex items-start gap-4">
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-lg bg-ink text-white">
              <BookOpen size={34} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold md:text-3xl">
                {name ? `Keep it up, ${name}!` : "Keep it up!"}
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
                You are building mastery by practising, checking explanations,
                and coming back to due items.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-sm font-bold">
                <span className="inline-flex items-center gap-1 rounded-lg bg-orange-50 px-3 py-2 text-orange-700">
                  <Flame size={17} /> {streak} day streak
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-3 py-2 text-amber-700">
                  <Trophy size={17} /> {xp} XP
                </span>
              </div>
              <div className="mt-4 max-w-sm">
                <div className="flex justify-between text-xs font-extrabold text-muted">
                  <span>Level {level}</span>
                  <span>
                    {Math.max(0, nextLevelXp - xp)} XP to Level {level + 1}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-amber-400"
                    style={{
                      width: `${Math.min(100, Math.max(0, levelPercent))}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-line bg-white p-5 shadow-soft">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-extrabold">
                <Target className="text-rose-500" size={18} /> Daily goals
              </div>
              <p className="mt-2 text-sm leading-5 text-muted">
                {dailyComplete
                  ? "Daily goal complete. Pick another activity if you want to stretch."
                  : `${remainingDailyItems} ${remainingDailyItems === 1 ? "item" : "items"} left. Answer questions or cards to update this.`}
              </p>
            </div>
            <div className="shrink-0 text-center">
              <ProgressRing
                value={dailyPercent}
                label={`${dailyPercent}%`}
                color="#4f46e5"
              />
            </div>
          </div>
          <div
            className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100"
            aria-label={`${dailyAnswered} of ${dailyGoal} daily items completed`}
          >
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${dailyPercent}%` }}
            />
          </div>
          <p className="mt-2 text-xs font-bold text-muted">
            {dailyAnswered} / {dailyGoal} items today
          </p>
          <div className="mt-4 space-y-2">
            {dailySuggestions.map((suggestion) => {
              const isComplete = completedDailyTaskIds.has(suggestion.taskId);
              return (
                <Link
                  key={suggestion.title}
                  to={suggestion.to}
                  className={`group flex items-center gap-3 rounded-lg px-2 py-2 transition ${isComplete ? "bg-emerald-50" : "hover:bg-slate-50"}`}
                >
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${isComplete ? "bg-emerald-100 text-emerald-700" : suggestion.tone}`}
                  >
                    {isComplete ? <CheckCircle2 size={18} /> : suggestion.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-extrabold text-ink">
                      {suggestion.title}
                    </span>
                    <span className="block truncate text-xs font-semibold text-muted">
                      {isComplete ? "Completed today" : suggestion.copy}
                    </span>
                  </span>
                  {isComplete ? null : (
                    <ArrowRight
                      size={16}
                      className="shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-primary"
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg bg-primary p-5 text-white shadow-pop">
          <div className="flex h-full flex-col justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-lg font-extrabold">
                <BookOpen size={22} /> Continue practising
              </div>
              <p className="mt-2 text-sm text-indigo-100">
                Review due items first, then top up with fresh practice.
              </p>
            </div>
            <Link to="/play/session">
              <Button className="w-full border border-white/25 bg-white/10 text-white hover:bg-white/20">
                Continue practising <ArrowRight size={18} />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">Your units</h2>
          <Link
            className="text-sm font-bold text-primary hover:underline"
            to="/progress"
          >
            View progress
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {contentIndex.units.map((unit) => {
            const mastery = getUnitMastery(unit, progress);
            return (
              <article
                key={unit.id}
                className="rounded-lg border bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-pop"
                style={{ borderColor: unit.accent ?? "#dbe3f0" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className="grid h-12 w-12 place-items-center rounded-lg text-lg font-black text-white"
                    style={{ background: unit.accent }}
                  >
                    {unit.number}
                  </div>
                  <ProgressRing
                    value={mastery.percent}
                    size={54}
                    stroke={6}
                    color={unit.accent}
                  />
                </div>
                <h3 className="mt-4 text-base font-extrabold">
                  Unit {unit.number}
                </h3>
                <p className="min-h-10 text-sm font-bold text-ink">
                  {getShortUnitTitle(unit)}
                </p>
                <div className="mt-3 flex items-center justify-between text-xs text-muted">
                  <MasteryChip state={mastery.state} />
                  <span>
                    {mastery.known} / {mastery.total} items
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Link to={`/play/flashcards/unit-${unit.id}`}>
                    <Button variant="secondary" className="w-full px-2">
                      Flashcards
                    </Button>
                  </Link>
                  <Link to={`/play/quiz/unit-${unit.id}`}>
                    <Button variant="secondary" className="w-full px-2">
                      Quiz
                    </Button>
                  </Link>
                </div>
                <Link
                  to={`/unit/${unit.id}`}
                  className="mt-3 inline-flex w-full items-center justify-center gap-1 text-sm font-bold text-primary hover:underline"
                  aria-label={`Open Unit ${unit.number}`}
                >
                  Open unit <ArrowRight size={15} />
                </Link>
                <p className="sr-only">
                  {getItemIdsForUnit(unit).length} total items
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-extrabold">Activity shortcuts</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <Shortcut
            to="/play/match/mixed"
            icon={<Puzzle size={21} />}
            title="Matching"
            copy="Pair terms with definitions"
          />
          <Shortcut
            to="/play/memory/mixed"
            icon={<Grid2X2 size={21} />}
            title="Memory"
            copy="Find term-definition pairs"
          />
          <Shortcut
            to="/play/code/mixed"
            icon={<Code2 size={21} />}
            title="Code Lab"
            copy="Practise algorithms and Python"
          />
          <Shortcut
            to="/play/convert"
            icon={<Calculator size={21} />}
            title="Conversion trainer"
            copy="Binary, hex and file sizes"
          />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">Badges</h2>
          <span className="text-sm font-bold text-muted">
            {unlockedBadges.length} / {contentIndex.bank.badges?.length ?? 0}{" "}
            unlocked
          </span>
        </div>
        <div className="rounded-lg border border-line bg-white p-4 shadow-soft">
          <BadgeShelf unlockedIds={unlockedBadges} compact />
        </div>
      </section>
    </div>
  );
}

function Shortcut({
  to,
  icon,
  title,
  copy,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  copy: string;
}) {
  return (
    <Link
      to={to}
      className="rounded-lg border border-line bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-primary"
    >
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-lg bg-indigo-50 text-primary">
          {icon}
        </div>
        <div>
          <h3 className="font-extrabold">{title}</h3>
          <p className="text-sm text-muted">{copy}</p>
        </div>
      </div>
    </Link>
  );
}
