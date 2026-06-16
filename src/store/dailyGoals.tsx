import { BookOpen, Calculator, Code2, Puzzle, Target } from "lucide-react";
import type { ReactNode } from "react";
import { contentIndex, getShortUnitTitle } from "../content/contentIndex";
import { getUnitMastery } from "./mastery";
import type { ItemProgress } from "./progressStore";

export interface DailySuggestion {
  title: string;
  copy: string;
  to: string;
  taskId: string;
  icon: ReactNode;
  tone: string;
}

export function getDailySuggestions(progress: Record<string, ItemProgress>): DailySuggestion[] {
  const unitSummaries = contentIndex.units.map((unit) => ({
    unit,
    mastery: getUnitMastery(unit, progress),
  }));
  const focus = [...unitSummaries]
    .filter(({ mastery }) => mastery.percent < 100)
    .sort((a, b) => a.mastery.percent - b.mastery.percent || a.unit.number - b.unit.number)[0] ?? unitSummaries[0];
  const now = Date.now();
  const dueCount = contentIndex.allItemIds.filter((id) => {
    const itemProgress = progress[id];
    return itemProgress && itemProgress.attempts > 0 && itemProgress.nextDue <= now;
  }).length;

  if (!focus) {
    return [
      {
        title: "Take a mixed quiz",
        copy: "Keep practising across the syllabus",
        to: "/play/quiz/mixed",
        taskId: "/play/quiz/mixed",
        icon: <Target size={18} />,
        tone: "bg-indigo-50 text-primary",
      },
      {
        title: "Try flashcards",
        copy: "Refresh key definitions",
        to: "/play/flashcards/mixed",
        taskId: "/play/flashcards/mixed",
        icon: <BookOpen size={18} />,
        tone: "bg-blue-50 text-blue-700",
      },
      {
        title: "Use the conversion trainer",
        copy: "Practise binary, hex, storage and sound",
        to: "/play/convert",
        taskId: "/play/convert",
        icon: <Calculator size={18} />,
        tone: "bg-pink-50 text-pink-700",
      },
    ];
  }

  const focusScope = `unit-${focus.unit.id}`;
  const suggestions: DailySuggestion[] = [
    {
      title: `Do the Unit ${focus.unit.number} quiz`,
      copy: getShortUnitTitle(focus.unit),
      to: `/play/quiz/${focusScope}`,
      taskId: `/play/quiz/${focusScope}`,
      icon: <Target size={18} />,
      tone: "bg-indigo-50 text-primary",
    },
    dueCount >= 3
      ? {
          title: "Review due flashcards",
          copy: `${dueCount} items are ready to revisit`,
          to: "/play/flashcards/mixed",
          taskId: "/play/flashcards/mixed",
          icon: <BookOpen size={18} />,
          tone: "bg-blue-50 text-blue-700",
        }
      : {
          title: `Try Unit ${focus.unit.number} flashcards`,
          copy: "Build confidence with key terms",
          to: `/play/flashcards/${focusScope}`,
          taskId: `/play/flashcards/${focusScope}`,
          icon: <BookOpen size={18} />,
          tone: "bg-blue-50 text-blue-700",
        },
  ];

  if ((focus.unit.codeTasks?.length ?? 0) > 0) {
    suggestions.push({
      title: `Practise Unit ${focus.unit.number} code`,
      copy: "Solve a short programming task",
      to: `/play/code/${focusScope}`,
      taskId: `/play/code/${focusScope}`,
      icon: <Code2 size={18} />,
      tone: "bg-violet-50 text-violet-700",
    });
  } else {
    suggestions.push({
      title: `Match Unit ${focus.unit.number} terms`,
      copy: "Pair concepts with definitions",
      to: `/play/match/${focusScope}`,
      taskId: `/play/match/${focusScope}`,
      icon: <Puzzle size={18} />,
      tone: "bg-amber-50 text-amber-700",
    });
  }

  return suggestions;
}
