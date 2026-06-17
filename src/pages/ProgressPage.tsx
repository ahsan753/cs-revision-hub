import { useEffect } from "react";
import { contentIndex } from "../content/contentIndex";
import { BadgeShelf } from "../components/ui/BadgeShelf";
import { MasteryChip } from "../components/ui/MasteryChip";
import { ProgressRing } from "../components/ui/ProgressRing";
import { getSubtopicMastery, getUnitMastery } from "../store/mastery";
import {
  getItemAccuracyPercent,
  useProgressStore,
} from "../store/progressStore";

export function ProgressPage() {
  const progress = useProgressStore((state) => state.itemProgress);
  const daily = useProgressStore((state) => state.dailyProgress);
  const dailyGoal = useProgressStore((state) => state.dailyGoal);
  const refreshDailyProgress = useProgressStore(
    (state) => state.refreshDailyProgress,
  );
  const unlockedBadges = useProgressStore((state) => state.unlockedBadges);
  const history = useProgressStore((state) => state.history);
  const dailyAnswered = Math.min(dailyGoal, daily.answered);
  const correctRate = history.length
    ? Math.round(
        (history.filter((item) => item.correct).length / history.length) * 100,
      )
    : 0;
  const weakSpots = getWeakSpots(progress).slice(0, 8);

  useEffect(() => {
    refreshDailyProgress();
  }, [refreshDailyProgress]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold">Progress</h1>
        <p className="mt-2 text-sm text-muted">
          Mastery is earned when each item is correct at least twice and the
          latest attempt is correct.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Daily goals"
          value={`${dailyAnswered}/${dailyGoal} items`}
        />
        <StatCard label="Attempts recorded" value={history.length} />
        <StatCard label="Correct rate" value={`${correctRate}%`} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {contentIndex.units.map((unit) => {
          const unitMastery = getUnitMastery(unit, progress);
          return (
            <article
              key={unit.id}
              className="rounded-lg border border-line bg-white p-5 shadow-soft"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-extrabold">
                    Unit {unit.number} {unit.title}
                  </h2>
                  <div className="mt-3 flex items-center gap-3">
                    <MasteryChip state={unitMastery.state} />
                    <span className="text-sm font-bold text-muted">
                      {unitMastery.known} / {unitMastery.total} known
                    </span>
                  </div>
                </div>
                <ProgressRing value={unitMastery.percent} color={unit.accent} />
              </div>

              <div className="mt-5 space-y-3">
                {unit.subtopics.map((subtopic) => {
                  const mastery = getSubtopicMastery(
                    unit,
                    subtopic.id,
                    progress,
                  );
                  return (
                    <div
                      key={subtopic.id}
                      className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center"
                    >
                      <div>
                        <div className="flex items-center gap-2 text-sm font-bold">
                          <span className="text-primary">{subtopic.id}</span>
                          <span>{subtopic.title}</span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${mastery.percent}%`,
                              background: unit.accent,
                            }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-bold text-muted">
                        {mastery.percent}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>

      <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-lg border border-line bg-white p-5 shadow-soft">
          <h2 className="text-lg font-extrabold">Weak spots</h2>
          <p className="mt-1 text-sm text-muted">
            Items with recent misses or low accuracy.
          </p>
          <div className="mt-4 space-y-3">
            {weakSpots.length ? (
              weakSpots.map((item) => (
                <div key={item.id} className="rounded-lg bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold">{item.label}</p>
                    <span className="text-xs font-extrabold text-rose-600">
                      {item.accuracy}%
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {item.attempts} attempts / latest{" "}
                    {item.latestCorrect ? "correct" : "missed"}
                  </p>
                </div>
              ))
            ) : (
              <p className="rounded-lg bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
                No weak spots yet. Start practising to build a review list.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-line bg-white p-5 shadow-soft">
          <h2 className="text-lg font-extrabold">Badges</h2>
          <p className="mt-1 text-sm text-muted">
            {unlockedBadges.length} unlocked from{" "}
            {(contentIndex.bank.badges ?? []).length} available.
          </p>
          <div className="mt-4">
            <BadgeShelf unlockedIds={unlockedBadges} />
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-line bg-white p-5 shadow-soft">
      <p className="text-sm font-bold text-muted">{label}</p>
      <p className="mt-2 text-3xl font-extrabold text-primary">{value}</p>
    </div>
  );
}

function getWeakSpots(
  progress: ReturnType<typeof useProgressStore.getState>["itemProgress"],
) {
  const labels = new Map<string, string>();
  for (const unit of contentIndex.units) {
    for (const item of unit.flashcards)
      labels.set(item.id, `${item.subtopic} ${item.term}`);
    for (const item of unit.mcqs)
      labels.set(item.id, `${item.subtopic} ${item.question}`);
    for (const item of unit.codeTasks ?? [])
      labels.set(item.id, `${item.subtopic} ${item.prompt}`);
  }

  return Object.values(progress)
    .filter((item) => item.attempts > 0)
    .map((item) => ({
      id: item.itemId,
      label: labels.get(item.itemId) ?? item.itemId,
      attempts: item.attempts,
      latestCorrect: item.latestCorrect,
      accuracy: getItemAccuracyPercent(item),
    }))
    .filter((item) => !item.latestCorrect || item.accuracy < 50)
    .sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts);
}
