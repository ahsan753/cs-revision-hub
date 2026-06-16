import rawContent from "../../content-bank.json";
import type {
  CodeTask,
  ContentBank,
  Flashcard,
  MCQ,
  Unit,
} from "../data/contentTypes";

export type Scope =
  | { kind: "unit"; unitId: string }
  | { kind: "subtopic"; subtopicId: string }
  | { kind: "mixed" };

export interface IndexedContent {
  bank: ContentBank;
  units: Unit[];
  unitsById: Map<string, Unit>;
  unitsByNumber: Map<number, Unit>;
  subtopicToUnit: Map<string, Unit>;
  allFlashcards: Flashcard[];
  allMcqs: MCQ[];
  allCodeTasks: CodeTask[];
  allItemIds: string[];
}

const bank = rawContent as ContentBank;

function buildIndex(): IndexedContent {
  const unitsById = new Map<string, Unit>();
  const unitsByNumber = new Map<number, Unit>();
  const subtopicToUnit = new Map<string, Unit>();
  const allFlashcards: Flashcard[] = [];
  const allMcqs: MCQ[] = [];
  const allCodeTasks: CodeTask[] = [];
  const seenIds = new Set<string>();

  for (const unit of bank.units) {
    unitsById.set(unit.id, unit);
    unitsByNumber.set(unit.number, unit);
    for (const subtopic of unit.subtopics) {
      subtopicToUnit.set(subtopic.id, unit);
    }
    for (const item of [
      ...unit.flashcards,
      ...unit.mcqs,
      ...(unit.codeTasks ?? []),
    ]) {
      if (seenIds.has(item.id)) {
        throw new Error(`Duplicate content id: ${item.id}`);
      }
      seenIds.add(item.id);
    }
    allFlashcards.push(...unit.flashcards);
    allMcqs.push(...unit.mcqs);
    allCodeTasks.push(...(unit.codeTasks ?? []));
  }

  return {
    bank,
    units: bank.units,
    unitsById,
    unitsByNumber,
    subtopicToUnit,
    allFlashcards,
    allMcqs,
    allCodeTasks,
    allItemIds: [...allFlashcards, ...allMcqs, ...allCodeTasks].map(
      (item) => item.id,
    ),
  };
}

export const contentIndex = buildIndex();

export function parseScope(scopeParam?: string): Scope {
  if (!scopeParam || scopeParam === "mixed") return { kind: "mixed" };
  if (scopeParam.startsWith("unit-"))
    return { kind: "unit", unitId: scopeParam.replace("unit-", "") };
  if (scopeParam.startsWith("subtopic-")) {
    return {
      kind: "subtopic",
      subtopicId: scopeParam.replace("subtopic-", ""),
    };
  }
  return { kind: "mixed" };
}

export function getScopeLabel(scope: Scope): string {
  if (scope.kind === "mixed") return "Mixed practice";
  if (scope.kind === "unit") {
    const unit = contentIndex.unitsById.get(scope.unitId);
    return unit ? `Unit ${unit.number} ${unit.title}` : "Unit practice";
  }
  const unit = contentIndex.subtopicToUnit.get(scope.subtopicId);
  const subtopic = unit?.subtopics.find((item) => item.id === scope.subtopicId);
  return subtopic
    ? `${scope.subtopicId} ${subtopic.title}`
    : "Subtopic practice";
}

export function getFlashcardsForScope(scope: Scope): Flashcard[] {
  if (scope.kind === "mixed") return contentIndex.allFlashcards;
  if (scope.kind === "unit")
    return contentIndex.unitsById.get(scope.unitId)?.flashcards ?? [];
  const unit = contentIndex.subtopicToUnit.get(scope.subtopicId);
  return (
    unit?.flashcards.filter((item) => item.subtopic === scope.subtopicId) ?? []
  );
}

export function getMcqsForScope(scope: Scope): MCQ[] {
  if (scope.kind === "mixed") return contentIndex.allMcqs;
  if (scope.kind === "unit")
    return contentIndex.unitsById.get(scope.unitId)?.mcqs ?? [];
  const unit = contentIndex.subtopicToUnit.get(scope.subtopicId);
  return unit?.mcqs.filter((item) => item.subtopic === scope.subtopicId) ?? [];
}

export function getCodeTasksForScope(scope: Scope): CodeTask[] {
  if (scope.kind === "mixed") return contentIndex.allCodeTasks;
  if (scope.kind === "unit")
    return contentIndex.unitsById.get(scope.unitId)?.codeTasks ?? [];
  const unit = contentIndex.subtopicToUnit.get(scope.subtopicId);
  return (
    unit?.codeTasks?.filter((item) => item.subtopic === scope.subtopicId) ?? []
  );
}

export function getItemIdsForUnit(unit: Unit): string[] {
  return [...unit.flashcards, ...unit.mcqs, ...(unit.codeTasks ?? [])].map(
    (item) => item.id,
  );
}

export function getItemIdsForSubtopic(
  unit: Unit,
  subtopicId: string,
): string[] {
  return [
    ...unit.flashcards.filter((item) => item.subtopic === subtopicId),
    ...unit.mcqs.filter((item) => item.subtopic === subtopicId),
    ...(unit.codeTasks ?? []).filter((item) => item.subtopic === subtopicId),
  ].map((item) => item.id);
}

export function getShortUnitTitle(unit: Unit): string {
  if (unit.number === 7) return "Algorithms";
  return unit.title;
}

export function getDefaultDifficulty(difficulty?: 1 | 2 | 3): 1 | 2 | 3 {
  return difficulty ?? bank.meta.defaults?.difficulty ?? 1;
}
