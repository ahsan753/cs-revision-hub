import { motion } from "framer-motion";
import { Lock, Sparkles } from "lucide-react";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import {
  getNextRankForLevel,
  getRankForLevel,
  rankLadder,
  type RankDefinition,
  type RankTier,
} from "../../store/rankSystem";
import { xpForLevel } from "../../store/progressStore";

const tierStyles: Record<
  RankTier,
  {
    label: string;
    ring: string;
    chip: string;
    progress: string;
    surface: string;
  }
> = {
  bronze: {
    label: "Bronze tier",
    ring: "from-orange-300 via-amber-600 to-stone-800",
    chip: "bg-orange-100 text-orange-800",
    progress: "bg-orange-500",
    surface: "rank-card-surface-bronze",
  },
  silver: {
    label: "Silver tier",
    ring: "from-slate-100 via-slate-400 to-slate-800",
    chip: "bg-slate-100 text-slate-600",
    progress: "bg-slate-500",
    surface: "rank-card-surface-silver",
  },
  gold: {
    label: "Gold tier",
    ring: "from-yellow-200 via-amber-400 to-yellow-700",
    chip: "bg-amber-100 text-amber-800",
    progress: "bg-amber-400",
    surface: "rank-card-surface-gold",
  },
  platinum: {
    label: "Platinum tier",
    ring: "from-cyan-200 via-violet-300 to-indigo-700",
    chip: "bg-cyan-100 text-cyan-800",
    progress: "bg-cyan-500",
    surface: "rank-card-surface-platinum",
  },
  prestige: {
    label: "Prestige tier",
    ring: "from-fuchsia-300 via-indigo-400 to-amber-300",
    chip: "bg-violet-100 text-violet-800",
    progress: "bg-violet-500",
    surface: "rank-card-surface-prestige",
  },
};

const emblemSizes = {
  xs: "h-10 w-10 p-0.5",
  sm: "h-14 w-14 p-1",
  md: "h-20 w-20 p-1.5",
  lg: "h-28 w-28 p-2",
};

function assetUrl(path: string) {
  const base = import.meta.env.BASE_URL || "/";
  const normalisedBase = base.endsWith("/") ? base : `${base}/`;
  return `${normalisedBase}${path.replace(/^\/+/, "")}`;
}

export function RankEmblem({
  rank,
  size = "md",
  locked = false,
  className = "",
}: {
  rank: RankDefinition;
  size?: keyof typeof emblemSizes;
  locked?: boolean;
  className?: string;
}) {
  const reducedMotion = useReducedMotion();
  const prestige = rank.tier === "prestige" && !locked;
  const imageSrc = assetUrl(rank.emblem);

  return (
    <motion.div
      className={`relative grid shrink-0 place-items-center rounded-xl bg-gradient-to-br ${tierStyles[rank.tier].ring} ${emblemSizes[size]} ${locked ? "opacity-50 grayscale" : ""} ${className}`}
      animate={
        prestige && !reducedMotion
          ? {
              boxShadow: [
                "0 0 0 rgba(124, 58, 237, 0)",
                "0 0 26px rgba(124, 58, 237, 0.42)",
                "0 0 0 rgba(124, 58, 237, 0)",
              ],
            }
          : undefined
      }
      transition={
        prestige && !reducedMotion
          ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
          : undefined
      }
    >
      <img
        src={imageSrc}
        alt={`${rank.name} emblem`}
        className="h-full w-full rounded-lg object-cover shadow-soft"
      />
      {locked ? (
        <span className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-slate-900 text-white shadow-soft">
          <Lock size={13} />
        </span>
      ) : null}
      {prestige ? (
        <Sparkles
          size={16}
          className="absolute -right-1 -top-1 text-amber-300 drop-shadow"
          aria-hidden="true"
        />
      ) : null}
    </motion.div>
  );
}

export function LevelRankCard({
  level,
  xp,
  variant = "card",
}: {
  level: number;
  xp: number;
  variant?: "card" | "inline";
}) {
  const rank = getRankForLevel(level);
  const nextRank = getNextRankForLevel(level);
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const remainingXp = Math.max(0, nextLevelXp - xp);
  const levelPercent = Math.round(
    ((xp - currentLevelXp) / Math.max(1, nextLevelXp - currentLevelXp)) * 100,
  );
  const tier = tierStyles[rank.tier];

  return (
    <div
      className={`${tier.surface} ${
        variant === "card"
          ? "rounded-lg border border-line p-5 shadow-soft"
          : "rounded-lg p-4"
      }`}
    >
      <div className="flex items-center gap-4">
        <RankEmblem rank={rank} size={variant === "card" ? "lg" : "md"} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-indigo-50 px-2 py-1 text-[0.7rem] font-black uppercase leading-none text-primary">
              Level {level}
            </span>
            <span
              className={`rounded-md px-2 py-1 text-xs font-extrabold leading-none ${tier.chip}`}
            >
              {tier.label}
            </span>
          </div>
          <h2 className="mt-2 text-xl font-extrabold leading-tight text-ink">
            {rank.name}
          </h2>
          <p className="mt-1 text-sm font-semibold text-muted">
            Next: {nextRank.name}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex justify-between gap-3 text-xs font-extrabold text-muted">
          <span>{Math.min(100, Math.max(0, levelPercent))}% through level</span>
          <span>
            {remainingXp} XP to level {level + 1}
          </span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/70">
          <div
            className={`h-full rounded-full ${tier.progress}`}
            style={{
              width: `${Math.min(100, Math.max(0, levelPercent))}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function RankLadder({ currentLevel }: { currentLevel: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {rankLadder.map((rank) => {
        const unlocked = currentLevel >= rank.level;
        const current =
          currentLevel === rank.level ||
          (currentLevel > rankLadder.length &&
            rank.level === rankLadder.length);
        const tier = tierStyles[rank.tier];

        return (
          <article
            key={rank.level}
            className={`rounded-lg border p-3 ${
              current
                ? "border-violet-300 bg-violet-50"
                : unlocked
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-line bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-3">
              <RankEmblem
                rank={rank}
                size="sm"
                locked={!unlocked}
                className={current ? "ring-2 ring-violet-300" : ""}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-black text-primary">
                    Level {rank.level}
                  </span>
                  <span
                    className={`rounded-md px-2 py-1 text-[0.65rem] font-black leading-none ${tier.chip}`}
                  >
                    {tier.label}
                  </span>
                </div>
                <h3 className="mt-1 truncate text-sm font-extrabold text-ink">
                  {rank.name}
                </h3>
                <p className="mt-1 text-xs font-semibold text-muted">
                  {current ? "Current rank" : unlocked ? "Unlocked" : "Locked"}
                </p>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
