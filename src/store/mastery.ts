import type { Unit } from "../data/contentTypes";
import {
  getItemIdsForSubtopic,
  getItemIdsForUnit,
} from "../content/contentIndex";
import type { ItemProgress } from "./progressStore";
import { isKnown } from "./progressStore";

export type MasteryState =
  | "Not started"
  | "Learning"
  | "Practising"
  | "Mastered";

export interface MasterySummary {
  state: MasteryState;
  total: number;
  attempted: number;
  known: number;
  earned: number;
  required: number;
  percent: number;
}

export function getMasteryCredit(progress?: ItemProgress) {
  if (!progress) return 0;
  if (isKnown(progress)) return 2;
  return Math.min(1, Math.max(0, progress.correctCount));
}

export function getMasteryForItemIds(
  ids: string[],
  progress: Record<string, ItemProgress>,
): MasterySummary {
  const total = ids.length;
  const attempted = ids.filter((id) => progress[id]?.attempts > 0).length;
  const known = ids.filter((id) => isKnown(progress[id])).length;
  const earned = ids.reduce(
    (sum, id) => sum + getMasteryCredit(progress[id]),
    0,
  );
  const required = total * 2;
  const percent = required > 0 ? Math.round((earned / required) * 100) : 0;

  let state: MasteryState = "Not started";
  if (attempted > 0 && percent < 50) state = "Learning";
  if (percent >= 50 && percent < 100) state = "Practising";
  if (total > 0 && percent === 100) state = "Mastered";

  return { state, total, attempted, known, earned, required, percent };
}

export function getUnitMastery(
  unit: Unit,
  progress: Record<string, ItemProgress>,
) {
  return getMasteryForItemIds(getItemIdsForUnit(unit), progress);
}

export function getSubtopicMastery(
  unit: Unit,
  subtopicId: string,
  progress: Record<string, ItemProgress>,
) {
  return getMasteryForItemIds(
    getItemIdsForSubtopic(unit, subtopicId),
    progress,
  );
}
