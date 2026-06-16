import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calculator,
  Code2,
  Grid2X2,
  HelpCircle,
  Puzzle,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { MasteryChip } from "../components/ui/MasteryChip";
import { ProgressRing } from "../components/ui/ProgressRing";
import { contentIndex, getShortUnitTitle } from "../content/contentIndex";
import { getSubtopicMastery, getUnitMastery } from "../store/mastery";
import { useProgressStore } from "../store/progressStore";

export function UnitPage() {
  const { unitId } = useParams();
  const unit = unitId ? contentIndex.unitsById.get(unitId) : undefined;
  const progress = useProgressStore((state) => state.itemProgress);

  if (!unit) {
    return (
      <div className="rounded-lg border border-line bg-white p-6 shadow-soft">
        <h1 className="text-xl font-extrabold">Unit not found</h1>
        <Link to="/" className="mt-4 inline-flex text-primary hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const unitMastery = getUnitMastery(unit, progress);

  return (
    <div className="space-y-5">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-primary"
      >
        <ArrowLeft size={16} /> Dashboard
      </Link>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-line bg-white p-5 shadow-soft">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-muted">Unit {unit.number}</p>
              <h1 className="mt-1 text-3xl font-extrabold">{unit.title}</h1>
              <p className="mt-2 text-sm text-muted">
                Paper {unit.paper} revision practice
              </p>
            </div>
            <ProgressRing value={unitMastery.percent} color={unit.accent} />
          </div>
          <div className="mt-5 flex items-center justify-between rounded-lg bg-slate-50 p-3">
            <MasteryChip state={unitMastery.state} />
            <span className="text-sm font-bold text-muted">
              {unitMastery.known} / {unitMastery.total} known
            </span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Link to={`/play/flashcards/unit-${unit.id}`}>
              <Button variant="secondary" className="w-full">
                <BookOpen size={18} /> Flashcards
              </Button>
            </Link>
            <Link to={`/play/quiz/unit-${unit.id}`}>
              <Button variant="secondary" className="w-full">
                <HelpCircle size={18} /> Quiz
              </Button>
            </Link>
            <Link to={`/play/match/unit-${unit.id}`}>
              <Button variant="secondary" className="w-full">
                <Puzzle size={18} /> Match
              </Button>
            </Link>
            <Link to={`/play/memory/unit-${unit.id}`}>
              <Button variant="secondary" className="w-full">
                <Grid2X2 size={18} /> Memory
              </Button>
            </Link>
            {unit.codeTasks?.length ? (
              <Link to={`/play/code/unit-${unit.id}`} className="col-span-2">
                <Button variant="secondary" className="w-full">
                  <Code2 size={18} /> Code Lab
                </Button>
              </Link>
            ) : null}
            {unit.number === 1 ? (
              <Link to="/play/convert" className="col-span-2">
                <Button variant="secondary" className="w-full">
                  <Calculator size={18} /> Conversion trainer
                </Button>
              </Link>
            ) : null}
          </div>
        </div>

        <div className="rounded-lg border border-line bg-white shadow-soft">
          <div className="border-b border-line p-5">
            <h2 className="text-lg font-extrabold">
              {getShortUnitTitle(unit)} subtopics
            </h2>
          </div>
          <div className="divide-y divide-line">
            {unit.subtopics.map((subtopic) => {
              const mastery = getSubtopicMastery(unit, subtopic.id, progress);
              return (
                <Link
                  key={subtopic.id}
                  to={`/unit/${unit.id}/${subtopic.id}`}
                  className="flex items-center justify-between gap-4 p-5 transition hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-extrabold text-primary">
                        {subtopic.id}
                      </span>
                      <h3 className="truncate text-base font-extrabold">
                        {subtopic.title}
                      </h3>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="h-2 w-36 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${mastery.percent}%`,
                            background: unit.accent,
                          }}
                        />
                      </div>
                      <MasteryChip state={mastery.state} />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm font-bold text-muted">
                    {mastery.percent}% <ArrowRight size={18} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
