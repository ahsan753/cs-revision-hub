import type { MasteryState } from "../../store/mastery";

const styles: Record<MasteryState, string> = {
  "Not started": "bg-slate-100 text-slate-600",
  Learning: "bg-amber-100 text-amber-700",
  Practising: "bg-sky-100 text-sky-700",
  Mastered: "bg-emerald-100 text-emerald-700",
};

export function MasteryChip({ state }: { state: MasteryState }) {
  return <span className={`rounded-md px-2.5 py-1 text-xs font-bold ${styles[state]}`}>{state}</span>;
}

