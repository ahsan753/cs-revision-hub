export interface ContentBank {
  meta: {
    syllabus: string;
    version: string;
    school?: string;
    scope: string;
    updated: string;
    conventions: Record<string, unknown>;
    defaults?: {
      difficulty?: 1 | 2 | 3;
      mcqType?: MCQType;
    };
  };
  badges?: Badge[];
  units: Unit[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon?: string;
}

export interface Unit {
  id: string;
  number: number;
  title: string;
  paper: 1 | 2;
  accent?: string;
  subtopics: Subtopic[];
  flashcards: Flashcard[];
  mcqs: MCQ[];
  codeTasks?: CodeTask[];
}

export interface Subtopic {
  id: string;
  title: string;
}

export interface Flashcard {
  id: string;
  subtopic: string;
  term: string;
  definition: string;
  difficulty?: 1 | 2 | 3;
}

export type MCQType = "single" | "multi" | "truefalse" | "text";

export interface MCQ {
  id: string;
  subtopic: string;
  type?: MCQType;
  question: string;
  options?: string[];
  answerIndex?: number;
  answerIndices?: number[];
  answer?: string;
  accept?: string[];
  explanation: string;
  difficulty?: 1 | 2 | 3;
}

export type CodeTask = ParsonsTask | FillBlankTask | PredictOutputTask;

interface BaseTask {
  id: string;
  subtopic: string;
  language: "pseudocode" | "python";
  prompt: string;
  difficulty?: 1 | 2 | 3;
}

export interface ParsonsTask extends BaseTask {
  type: "parsons";
  lines: string[];
  distractors?: string[];
}

export interface FillBlankTask extends BaseTask {
  type: "fill-blank";
  template: string;
  blanks: { id: string; accept: string[]; caseSensitive?: boolean }[];
}

export interface PredictOutputTask extends BaseTask {
  type: "predict-output";
  code: string;
  answer: string;
  accept?: string[];
  trace?: string[];
}

export type ContentItem = Flashcard | MCQ | CodeTask;
