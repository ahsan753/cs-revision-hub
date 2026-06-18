import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  Shuffle,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import {
  getDefaultDifficulty,
  getFlashcardsForScope,
  getScopeLabel,
  parseScope,
} from "../../content/contentIndex";
import { useProgressStore } from "../../store/progressStore";

function shuffled<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

type FlashcardRating = "correct" | "almost" | "missed";

export function FlashcardsPage() {
  const { scope: scopeParam } = useParams();
  const location = useLocation();
  const scope = useMemo(() => parseScope(scopeParam), [scopeParam]);
  const sourceCards = useMemo(() => getFlashcardsForScope(scope), [scope]);
  const [cards, setCards] = useState(sourceCards);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [ratings, setRatings] = useState<Record<string, FlashcardRating>>({});
  const recordAnswer = useProgressStore((state) => state.recordAnswer);
  const recordDailyTaskCompletion = useProgressStore(
    (state) => state.recordDailyTaskCompletion,
  );

  const current = cards[index];
  const flipCard = () => setFlipped((value) => !value);

  useEffect(() => {
    setCards(sourceCards);
    setIndex(0);
    setFlipped(false);
    setRatings({});
  }, [sourceCards]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        (event.key !== " " && event.code !== "Space") ||
        event.repeat ||
        !current
      )
        return;

      const target = event.target;
      if (target instanceof HTMLElement) {
        const isTextInput =
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target instanceof HTMLSelectElement ||
          target.isContentEditable;
        const isControl = target.closest(
          "button, a, input, textarea, select, [role='button']",
        );

        if (isTextInput || isControl) return;
      }

      event.preventDefault();
      flipCard();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [current]);

  if (!current || cards.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-white p-6 shadow-soft">
        <h1 className="text-xl font-extrabold">No flashcards available</h1>
        <Link className="mt-4 inline-flex text-primary hover:underline" to="/">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const move = (direction: 1 | -1) => {
    setFlipped(false);
    setIndex((value) => (value + direction + cards.length) % cards.length);
  };

  const rate = (rating: FlashcardRating) => {
    const correct = rating === "correct";
    const nextRatings = { ...ratings, [current.id]: rating };
    setRatings(nextRatings);
    const difficulty = getDefaultDifficulty(current.difficulty);
    recordAnswer(
      {
        itemId: current.id,
        correct,
        activity: "flashcards",
        timestamp: Date.now(),
      },
      difficulty,
    );
    if (Object.keys(nextRatings).length >= cards.length) {
      recordDailyTaskCompletion(location.pathname);
    }
    move(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-line bg-white p-4 shadow-soft md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="grid h-10 w-10 place-items-center rounded-lg hover:bg-slate-100"
            aria-label="Back to dashboard"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <p className="text-sm font-bold text-muted">
              {getScopeLabel(scope)}
            </p>
            <h1 className="text-xl font-extrabold">Flashcards</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-extrabold text-primary">
            {index + 1} / {cards.length}
          </span>
          <Button
            variant="ghost"
            onClick={() => {
              setCards(shuffled(cards));
              setIndex(0);
              setFlipped(false);
              setRatings({});
            }}
          >
            <Shuffle size={17} /> Shuffle
          </Button>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="rounded-lg border border-line bg-white p-4 shadow-soft md:p-6">
          <div className="mx-auto max-w-4xl">
            <button
              className="block w-full rounded-lg text-left"
              onClick={flipCard}
              aria-label={flipped ? "Show front of card" : "Show back of card"}
            >
              <div className="relative min-h-[320px] perspective-1000">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${current.id}-${flipped ? "back" : "front"}`}
                    initial={{ rotateY: flipped ? -90 : 90, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    exit={{ rotateY: flipped ? 90 : -90, opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    className="flashcard-surface grid min-h-[320px] place-items-center rounded-lg border border-line bg-gradient-to-br from-white to-indigo-50 p-8 text-center shadow-soft"
                  >
                    <div>
                      <p className="mb-5 text-xs font-extrabold uppercase text-muted">
                        {flipped ? "Back" : "Front"}
                      </p>
                      <p className="text-2xl font-extrabold leading-snug md:text-4xl">
                        {flipped ? current.definition : current.term}
                      </p>
                      <p className="mt-6 text-sm font-bold text-primary">
                        Tap or press Space to flip
                      </p>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </button>

            <div className="mt-5 flex justify-center gap-2">
              {cards.map((card, cardIndex) => (
                <span
                  key={card.id}
                  className={`h-2.5 w-2.5 rounded-full ${cardIndex === index ? "bg-primary" : "bg-slate-300"}`}
                  aria-hidden="true"
                />
              ))}
            </div>

            {flipped ? (
              <div className="mt-6 grid gap-3 md:grid-cols-3">
                <Button variant="success" onClick={() => rate("correct")}>
                  <CheckCircle2 size={20} /> Got it
                </Button>
                <Button variant="warning" onClick={() => rate("almost")}>
                  <RotateCcw size={20} /> Almost
                </Button>
                <Button variant="danger" onClick={() => rate("missed")}>
                  <XCircle size={20} /> Missed
                </Button>
              </div>
            ) : null}

            <div className="mt-5 flex items-center justify-between">
              <Button variant="ghost" onClick={() => move(-1)}>
                <ArrowLeft size={18} /> Previous
              </Button>
              <Button variant="ghost" onClick={() => move(1)}>
                Next <ArrowRight size={18} />
              </Button>
            </div>
          </div>
        </div>

        <aside className="rounded-lg border border-line bg-white shadow-soft">
          <div className="border-b border-line bg-slate-50 p-4">
            <h2 className="text-sm font-extrabold">Review list</h2>
            <p className="mt-1 text-xs font-semibold text-muted">
              {Object.keys(ratings).length} / {cards.length} rated
            </p>
          </div>
          <div className="max-h-[560px] space-y-2 overflow-auto p-3">
            {cards.map((card, cardIndex) => (
              <button
                key={card.id}
                className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition ${
                  cardIndex === index
                    ? "border-primary bg-indigo-50"
                    : "border-line bg-white hover:border-primary"
                }`}
                onClick={() => {
                  setIndex(cardIndex);
                  setFlipped(false);
                }}
              >
                <ReviewStatus rating={ratings[card.id]} />
                <span className="min-w-0">
                  <span className="block text-sm font-extrabold">
                    {card.term}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-muted">
                    {ratings[card.id]
                      ? getRatingLabel(ratings[card.id])
                      : "Not rated yet"}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}

function ReviewStatus({ rating }: { rating?: FlashcardRating }) {
  if (rating === "correct")
    return (
      <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={18} />
    );
  if (rating === "almost")
    return <RotateCcw className="mt-0.5 shrink-0 text-amber-600" size={18} />;
  if (rating === "missed")
    return <XCircle className="mt-0.5 shrink-0 text-rose-600" size={18} />;
  return <span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-slate-300" />;
}

function getRatingLabel(rating: FlashcardRating) {
  if (rating === "correct") return "Got it";
  if (rating === "almost") return "Almost";
  return "Missed";
}
