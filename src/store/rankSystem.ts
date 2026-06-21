export type RankTier = "bronze" | "silver" | "gold" | "platinum" | "prestige";

export interface RankDefinition {
  level: number;
  name: string;
  tier: RankTier;
  emblem: string;
  prestigeSuffix?: string;
}

export const rankLadder: RankDefinition[] = [
  {
    level: 1,
    name: "Code Spark",
    tier: "bronze",
    emblem: "rank-emblems/code-spark.png",
  },
  {
    level: 2,
    name: "Byte Rookie",
    tier: "bronze",
    emblem: "rank-emblems/byte-rookie.png",
  },
  {
    level: 3,
    name: "Logic Scout",
    tier: "silver",
    emblem: "rank-emblems/logic-scout.png",
  },
  {
    level: 4,
    name: "Bug Hunter",
    tier: "gold",
    emblem: "rank-emblems/bug-hunter.png",
  },
  {
    level: 5,
    name: "Loop Runner",
    tier: "platinum",
    emblem: "rank-emblems/loop-runner.png",
  },
  {
    level: 6,
    name: "Data Diver",
    tier: "platinum",
    emblem: "rank-emblems/data-diver.png",
  },
  {
    level: 7,
    name: "Algorithm Apprentice",
    tier: "platinum",
    emblem: "rank-emblems/algorithm-apprentice.png",
  },
  {
    level: 8,
    name: "Debug Master",
    tier: "prestige",
    emblem: "rank-emblems/debug-master.png",
  },
  {
    level: 9,
    name: "Cyber Sentinel",
    tier: "prestige",
    emblem: "rank-emblems/cyber-sentinel.png",
  },
];

const cyberSentinel = rankLadder[8];

export function getRankForLevel(level: number): RankDefinition {
  const safeLevel = normaliseLevel(level);
  if (safeLevel <= cyberSentinel.level) return rankLadder[safeLevel - 1];

  const prestigeSuffix = getPrestigeSuffix(safeLevel);
  return {
    ...cyberSentinel,
    level: safeLevel,
    name: `Cyber Sentinel Prestige ${prestigeSuffix}`,
    prestigeSuffix,
  };
}

export function getNextRankForLevel(level: number): RankDefinition {
  return getRankForLevel(normaliseLevel(level) + 1);
}

export function getPrestigeSuffix(level: number) {
  const prestigeLevel = Math.max(
    1,
    normaliseLevel(level) - cyberSentinel.level,
  );
  return toRomanNumeral(prestigeLevel);
}

function normaliseLevel(level: number) {
  if (!Number.isFinite(level)) return 1;
  return Math.max(1, Math.floor(level));
}

function toRomanNumeral(value: number) {
  const numerals: Array<[number, string]> = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let remaining = Math.max(1, Math.floor(value));
  let output = "";
  for (const [number, numeral] of numerals) {
    while (remaining >= number) {
      output += numeral;
      remaining -= number;
    }
  }
  return output;
}
