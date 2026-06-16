import { Award, Lock } from "lucide-react";
import { contentIndex } from "../../content/contentIndex";

export function BadgeShelf({ unlockedIds, compact = false }: { unlockedIds: string[]; compact?: boolean }) {
  const unlocked = new Set(unlockedIds);
  const badges = contentIndex.bank.badges ?? [];

  return (
    <div
      className={
        compact
          ? "-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2"
          : "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      }
      aria-label="Badge progress"
      role="list"
    >
      {badges.map((badge) => {
        const isUnlocked = unlocked.has(badge.id);
        return (
          <div
            key={badge.id}
            role="listitem"
            aria-label={`${badge.name}: ${isUnlocked ? "unlocked" : "locked"}`}
            className={`rounded-lg border p-3 ${
              compact ? "min-w-[13.75rem] max-w-[13.75rem] snap-start" : ""
            } ${isUnlocked ? "border-amber-200 bg-amber-50 text-amber-800" : "border-line bg-slate-50 text-slate-500"}`}
          >
            <div className="flex items-center gap-3">
              <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${isUnlocked ? "bg-amber-100" : "bg-slate-100"}`}>
                {isUnlocked ? <Award size={20} /> : <Lock size={18} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 text-sm font-extrabold leading-5">{badge.name}</p>
                  {compact ? (
                    <span className={`shrink-0 rounded-md px-2 py-1 text-[0.65rem] font-black uppercase leading-none ${isUnlocked ? "bg-amber-100" : "bg-white"}`}>
                      {isUnlocked ? "Earned" : "Locked"}
                    </span>
                  ) : null}
                </div>
                <p className={`mt-1 text-xs leading-5 opacity-80 ${compact ? "line-clamp-2" : ""}`}>{badge.description}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
