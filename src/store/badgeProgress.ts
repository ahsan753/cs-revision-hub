import { contentIndex } from "../content/contentIndex";
import type { ActivityResult, ItemProgress } from "./progressStore";
import { getSubtopicMastery, getUnitMastery } from "./mastery";

export interface BadgeProgress {
  badgeId: string;
  current: number;
  target: number;
  label: string;
  detail?: string;
}

interface BadgeProgressInput {
  history: ActivityResult[];
  itemProgress: Record<string, ItemProgress>;
  streak: number;
}

const hexModeGroups = [
  {
    label: "Denary to hex",
    ids: ["convert-denary-hex", "u1-mcq-4"],
  },
  {
    label: "Hex to denary",
    ids: ["convert-hex-denary", "u1-mcq-3"],
  },
];

export function getBadgeProgress({
  history,
  itemProgress,
  streak,
}: BadgeProgressInput): Record<string, BadgeProgress> {
  const correctHistory = history.filter((item) => item.correct);
  const pseudocodeParsonsIds = getPseudocodeParsonsIds();
  const unit2 = contentIndex.unitsById.get("u2");
  const unit3 = contentIndex.unitsById.get("u3");
  const unit2Mastery = unit2 ? getUnitMastery(unit2, itemProgress) : null;
  const architectureMastery = unit3
    ? getSubtopicMastery(unit3, "3.1", itemProgress)
    : null;
  const firstMasteredUnit = contentIndex.units
    .map((unit) => getUnitMastery(unit, itemProgress))
    .filter((mastery) => mastery.state === "Mastered").length;
  const comebackSubtopics = getMasteredPreviouslyMissedSubtopicCount({
    history,
    itemProgress,
  });
  const hexProgress = getHexHeroProgress(history);

  return {
    "first-steps": makeBadgeProgress({
      badgeId: "first-steps",
      current: history.length > 0 ? 1 : 0,
      target: 1,
      label: `${Math.min(1, history.length)} / 1 activity`,
    }),
    "binary-boss": makeBadgeProgress({
      badgeId: "binary-boss",
      current: correctHistory.filter((item) => item.activity === "convert")
        .length,
      target: 50,
      label: `${correctHistory.filter((item) => item.activity === "convert").length} / 50 conversions`,
    }),
    "hex-hero": makeBadgeProgress({
      badgeId: "hex-hero",
      current: hexProgress.readyModes,
      target: hexModeGroups.length,
      label: `${hexProgress.readyModes} / ${hexModeGroups.length} hex modes`,
      detail: hexProgress.detail,
    }),
    "packet-master": makeBadgeProgress({
      badgeId: "packet-master",
      current: unit2Mastery?.earned ?? 0,
      target: unit2Mastery?.required ?? 1,
      label: `${unit2Mastery?.earned ?? 0} / ${unit2Mastery?.required ?? 1} mastery points`,
    }),
    architect: makeBadgeProgress({
      badgeId: "architect",
      current: architectureMastery?.earned ?? 0,
      target: architectureMastery?.required ?? 1,
      label: `${architectureMastery?.earned ?? 0} / ${architectureMastery?.required ?? 1} mastery points`,
    }),
    "loop-wizard": makeBadgeProgress({
      badgeId: "loop-wizard",
      current: correctHistory.filter((item) => item.activity === "code")
        .length,
      target: 10,
      label: `${correctHistory.filter((item) => item.activity === "code").length} / 10 code tasks`,
    }),
    "pseudo-pro": makeBadgeProgress({
      badgeId: "pseudo-pro",
      current: correctHistory.filter(
        (item) =>
          item.activity === "code" && pseudocodeParsonsIds.has(item.itemId),
      ).length,
      target: 20,
      label: `${
        correctHistory.filter(
          (item) =>
            item.activity === "code" && pseudocodeParsonsIds.has(item.itemId),
        ).length
      } / 20 reorder tasks`,
    }),
    "sharp-shooter": makeBadgeProgress({
      badgeId: "sharp-shooter",
      current: getMaxCorrectQuizStreak(history),
      target: 10,
      label: `${getMaxCorrectQuizStreak(history)} / 10 quiz streak`,
    }),
    comeback: makeBadgeProgress({
      badgeId: "comeback",
      current: comebackSubtopics,
      target: 1,
      label: `${Math.min(1, comebackSubtopics)} / 1 comeback mastery`,
      detail:
        comebackSubtopics > 0
          ? `${comebackSubtopics} previously missed subtopic${comebackSubtopics === 1 ? "" : "s"} mastered`
          : undefined,
    }),
    "perfect-week": makeBadgeProgress({
      badgeId: "perfect-week",
      current: streak,
      target: 7,
      label: `${streak} / 7 day streak`,
    }),
    "unit-crusher": makeBadgeProgress({
      badgeId: "unit-crusher",
      current: firstMasteredUnit,
      target: 1,
      label: `${Math.min(1, firstMasteredUnit)} / 1 unit mastered`,
      detail:
        firstMasteredUnit > 0
          ? `${firstMasteredUnit} unit${firstMasteredUnit === 1 ? "" : "s"} mastered`
          : undefined,
    }),
  };
}

export function getBadgeProgressPercent(progress: BadgeProgress) {
  if (progress.target <= 0) return 0;
  return Math.round(
    (Math.min(progress.current, progress.target) / progress.target) * 100,
  );
}

function makeBadgeProgress(progress: BadgeProgress): BadgeProgress {
  return {
    ...progress,
    current: Math.max(0, progress.current),
    target: Math.max(1, progress.target),
  };
}

function getPseudocodeParsonsIds() {
  return new Set(
    contentIndex.units.flatMap((unit) =>
      (unit.codeTasks ?? [])
        .filter(
          (task) => task.type === "parsons" && task.language === "pseudocode",
        )
        .map((task) => task.id),
    ),
  );
}

function getMaxCorrectQuizStreak(history: ActivityResult[]) {
  let current = 0;
  let best = 0;
  for (const item of history) {
    if (item.activity !== "quiz") continue;
    current = item.correct ? current + 1 : 0;
    best = Math.max(best, current);
  }
  return best;
}

function getHexHeroProgress(history: ActivityResult[]) {
  const modeStats = hexModeGroups.map((group) => {
    const attempts = history.filter(
      (item) => item.activity === "convert" && group.ids.includes(item.itemId),
    );
    const correct = attempts.filter((item) => item.correct).length;
    const accuracy =
      attempts.length > 0 ? Math.round((correct / attempts.length) * 100) : 0;

    return {
      ...group,
      attempts: attempts.length,
      correct,
      accuracy,
      ready: attempts.length >= 5 && accuracy >= 90,
    };
  });

  return {
    readyModes: modeStats.filter((mode) => mode.ready).length,
    detail: modeStats
      .map(
        (mode) =>
          `${mode.label}: ${mode.correct}/${Math.max(5, mode.attempts)} correct, ${mode.accuracy}%`,
      )
      .join("; "),
  };
}

function getContentItemSubtopics() {
  const subtopics = new Map<string, string>();
  for (const unit of contentIndex.units) {
    for (const item of [
      ...unit.flashcards,
      ...unit.mcqs,
      ...(unit.codeTasks ?? []),
    ]) {
      subtopics.set(item.id, item.subtopic);
    }
  }
  return subtopics;
}

function getMasteredPreviouslyMissedSubtopicCount({
  history,
  itemProgress,
}: Pick<BadgeProgressInput, "history" | "itemProgress">) {
  const itemSubtopics = getContentItemSubtopics();
  const missedSubtopics = new Set(
    history
      .filter((item) => !item.correct)
      .map((item) => itemSubtopics.get(item.itemId))
      .filter((subtopic): subtopic is string => Boolean(subtopic)),
  );

  if (!missedSubtopics.size) return 0;

  return contentIndex.units.reduce(
    (count, unit) =>
      count +
      unit.subtopics.filter(
        (subtopic) =>
          missedSubtopics.has(subtopic.id) &&
          getSubtopicMastery(unit, subtopic.id, itemProgress).state ===
            "Mastered",
      ).length,
    0,
  );
}
