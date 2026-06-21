import type { RankedProgressTotals } from "../../ranked/rankedTypes";
import { levelFromXp } from "../../store/progressStore";

export function chooseDisplayProgress({
  local,
  ranked,
}: {
  local: { xp: number; level: number; streak: number };
  ranked: RankedProgressTotals | null;
}) {
  const selected = ranked ?? local;

  return {
    xp: selected.xp,
    level: levelFromXp(selected.xp),
    streak: selected.streak,
  };
}
