import type { RankedProgressTotals } from "../../ranked/rankedTypes";

export function chooseDisplayProgress({
  local,
  ranked,
}: {
  local: { xp: number; level: number; streak: number };
  ranked: RankedProgressTotals | null;
}) {
  if (!ranked || local.xp >= ranked.xp) {
    return local;
  }

  return {
    xp: ranked.xp,
    level: ranked.level,
    streak: ranked.streak,
  };
}
