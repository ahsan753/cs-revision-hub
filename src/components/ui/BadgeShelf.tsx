import { Award, Lock } from "lucide-react";
import { contentIndex } from "../../content/contentIndex";

export function BadgeShelf({ unlockedIds, compact = false }: { unlockedIds: string[]; compact?: boolean }) {
  const unlocked = new Set(unlockedIds);
  const badges = compact ? (contentIndex.bank.badges ?? []).slice(0, 5) : contentIndex.bank.badges ?? [];

  return (
    <div className={compact ? "flex flex-wrap gap-2" : "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"}>
      {badges.map((badge) => {
        const isUnlocked = unlocked.has(badge.id);
        return (
          <div
            key={badge.id}
            className={`rounded-lg border p-3 ${isUnlocked ? "border-amber-200 bg-amber-50 text-amber-800" : "border-line bg-slate-50 text-slate-500"}`}
          >
            <div className="flex items-center gap-3">
              <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${isUnlocked ? "bg-amber-100" : "bg-slate-100"}`}>
                {isUnlocked ? <Award size={20} /> : <Lock size={18} />}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold">{badge.name}</p>
                {!compact ? <p className="mt-1 text-xs leading-5 opacity-80">{badge.description}</p> : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
