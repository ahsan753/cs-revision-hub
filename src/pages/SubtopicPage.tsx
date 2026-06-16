import {
  ArrowLeft,
  BookOpen,
  Calculator,
  CheckCircle2,
  Code2,
  Grid2X2,
  HelpCircle,
  Puzzle,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { MasteryChip } from "../components/ui/MasteryChip";
import { ProgressRing } from "../components/ui/ProgressRing";
import { contentIndex } from "../content/contentIndex";
import { getSubtopicMastery } from "../store/mastery";
import { useProgressStore } from "../store/progressStore";

export function SubtopicPage() {
  const { unitId, subtopicId } = useParams();
  const unit = unitId ? contentIndex.unitsById.get(unitId) : undefined;
  const subtopic = unit?.subtopics.find((item) => item.id === subtopicId);
  const progress = useProgressStore((state) => state.itemProgress);

  if (!unit || !subtopic || !subtopicId) {
    return (
      <div className="rounded-lg border border-line bg-white p-6 shadow-soft">
        <h1 className="text-xl font-extrabold">Subtopic not found</h1>
        <Link to="/" className="mt-4 inline-flex text-primary hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const mastery = getSubtopicMastery(unit, subtopicId, progress);
  const flashcards = unit.flashcards.filter(
    (item) => item.subtopic === subtopicId,
  );
  const mcqs = unit.mcqs.filter((item) => item.subtopic === subtopicId);

  return (
    <div className="space-y-5">
      <Link
        to={`/unit/${unit.id}`}
        className="inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-primary"
      >
        <ArrowLeft size={16} /> Unit {unit.number}
      </Link>

      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-bold text-muted">
              Unit {unit.number} / {subtopic.id}
            </p>
            <h1 className="mt-1 text-3xl font-extrabold">{subtopic.title}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <MasteryChip state={mastery.state} />
              <span className="text-sm font-bold text-muted">
                {mastery.known} / {mastery.total} known
              </span>
            </div>
          </div>
          <ProgressRing value={mastery.percent} color={unit.accent} />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Link
          to={`/play/flashcards/subtopic-${subtopic.id}`}
          className="rounded-lg border border-blue-200 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-blue-400"
        >
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-lg bg-blue-50 text-blue-600">
              <BookOpen size={28} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold">Flashcards</h2>
              <p className="mt-1 text-sm text-muted">
                Review {flashcards.length} key facts and concepts.
              </p>
            </div>
          </div>
        </Link>

        <Link
          to={`/play/quiz/subtopic-${subtopic.id}`}
          className="rounded-lg border border-emerald-200 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-emerald-400"
        >
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
              <HelpCircle size={28} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold">Quiz</h2>
              <p className="mt-1 text-sm text-muted">
                Answer {mcqs.length} questions with explanations.
              </p>
            </div>
          </div>
        </Link>

        <Link
          to={`/play/match/subtopic-${subtopic.id}`}
          className="rounded-lg border border-violet-200 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-violet-400"
        >
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-lg bg-violet-50 text-violet-600">
              <Puzzle size={28} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold">Matching</h2>
              <p className="mt-1 text-sm text-muted">
                Pair terms with definitions.
              </p>
            </div>
          </div>
        </Link>

        <Link
          to={`/play/memory/subtopic-${subtopic.id}`}
          className="rounded-lg border border-amber-200 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-amber-400"
        >
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-lg bg-amber-50 text-amber-600">
              <Grid2X2 size={28} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold">Memory</h2>
              <p className="mt-1 text-sm text-muted">
                Find the term-definition pairs.
              </p>
            </div>
          </div>
        </Link>

        {(unit.codeTasks ?? []).some(
          (item) => item.subtopic === subtopic.id,
        ) ? (
          <Link
            to={`/play/code/subtopic-${subtopic.id}`}
            className="rounded-lg border border-indigo-200 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-indigo-400"
          >
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-lg bg-indigo-50 text-primary">
                <Code2 size={28} />
              </div>
              <div>
                <h2 className="text-xl font-extrabold">Code Lab</h2>
                <p className="mt-1 text-sm text-muted">
                  Reorder, complete, and predict code.
                </p>
              </div>
            </div>
          </Link>
        ) : null}

        {unit.number === 1 ? (
          <Link
            to="/play/convert"
            className="rounded-lg border border-pink-200 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-pink-400"
          >
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-lg bg-pink-50 text-pink-600">
                <Calculator size={28} />
              </div>
              <div>
                <h2 className="text-xl font-extrabold">Conversion trainer</h2>
                <p className="mt-1 text-sm text-muted">
                  Binary, hex, shifts and file sizes.
                </p>
              </div>
            </div>
          </Link>
        ) : null}
      </section>

      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <h2 className="text-lg font-extrabold">Topics in this subtopic</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {flashcards.slice(0, 10).map((item) => (
            <span
              key={item.id}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700"
            >
              <CheckCircle2 size={16} /> {item.term}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
