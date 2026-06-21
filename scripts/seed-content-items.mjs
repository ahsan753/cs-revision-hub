import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bank = JSON.parse(
  fs.readFileSync(path.join(root, "content-bank.json"), "utf8"),
);

const rows = [];

function difficulty(item) {
  return item.difficulty ?? bank.meta?.defaults?.difficulty ?? 1;
}

function addRow(itemId, contentKind, rankedActivities, itemDifficulty, answerKey) {
  rows.push({
    item_id: itemId,
    content_kind: contentKind,
    ranked_activities: rankedActivities,
    difficulty: itemDifficulty,
    answer_key: answerKey,
    ranked_enabled: rankedActivities.length > 0,
  });
}

for (const unit of bank.units) {
  for (const item of unit.flashcards) {
    addRow(item.id, "flashcard", ["match", "memory"], difficulty(item), {
      term: item.term,
      definition: item.definition,
    });
  }

  for (const item of unit.mcqs) {
    const type = item.type ?? "single";
    const answerKey =
      type === "multi"
        ? { answerIndices: item.answerIndices ?? [] }
        : type === "text"
          ? { answer: item.answer ?? "", accept: item.accept ?? [] }
          : { answerIndex: item.answerIndex ?? 0 };
    addRow(item.id, "mcq", ["quiz"], difficulty(item), answerKey);
  }

  for (const item of unit.codeTasks ?? []) {
    if (item.type === "predict-output") {
      addRow(item.id, "code-predict", ["code"], difficulty(item), {
        answer: item.answer,
        accept: item.accept ?? [],
      });
    } else if (item.type === "fill-blank") {
      addRow(item.id, "code-fill", ["code"], difficulty(item), {
        blanks: item.blanks,
      });
    } else if (item.type === "parsons") {
      addRow(item.id, "code-parsons", ["code"], difficulty(item), {
        lines: item.lines,
        distractors: item.distractors ?? [],
      });
    }
  }
}

for (const id of [
  "convert-denary-binary:value",
  "convert-binary-denary:value",
  "convert-denary-hex:value",
  "convert-hex-denary:value",
  "convert-binary-add:8bit",
  "convert-shift:1bit",
  "convert-twos-complement:8bit",
  "convert-file-size:image",
  "convert-file-size:sound",
]) {
  addRow(id, "conversion", ["convert"], 2, null);
}

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlArray(values) {
  return `array[${values.map(sqlString).join(", ")}]::text[]`;
}

function sqlJson(value) {
  if (value === null) return "null";
  return `${sqlString(JSON.stringify(value))}::jsonb`;
}

const values = rows
  .map(
    (row) =>
      `(${sqlString(row.item_id)}, ${sqlString(row.content_kind)}, ${sqlArray(
        row.ranked_activities,
      )}, ${row.difficulty}, ${sqlJson(row.answer_key)}, ${row.ranked_enabled})`,
  )
  .join(",\n");

const sql = `insert into public.content_items(item_id, content_kind, ranked_activities, difficulty, answer_key, ranked_enabled)
values
${values}
on conflict (item_id) do update set
  content_kind = excluded.content_kind,
  ranked_activities = excluded.ranked_activities,
  difficulty = excluded.difficulty,
  answer_key = excluded.answer_key,
  ranked_enabled = excluded.ranked_enabled;
`;

const outPath = path.join(
  root,
  "supabase/migrations/202606210002_seed_content_items.sql",
);
fs.writeFileSync(outPath, sql);
