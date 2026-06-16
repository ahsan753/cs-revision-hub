# IGCSE Computer Science — Interactive Revision Hub

## Master Build Plan (feed this whole document to your AI coding agent)

> **What this is.** A complete, build-ready blueprint for a fun, interactive revision website that helps Year 10 IGCSE Computer Science students _consolidate and develop_ what they have already been taught. Hand this document, plus the companion `content-bank.json`, to an AI coding agent (Cursor, Claude Code, v0, Lovable, Bolt, etc.) and it should be able to build the app end-to-end.
>
> **Subject:** Cambridge IGCSE (9–1) Computer Science **0984**, syllabus v5 (for exams 2026–2028).
> **School:** United School International (USI). **Author/owner:** Mr A Shah.
> **Audience:** Year 10 students (ages ~14–16). **Language:** British English throughout.

---

## 0. How to use this plan

1. Read Sections 1–4 to understand goals, scope and architecture.
2. Build the shell and data layer first (Section 11, Phase 1–2).
3. Wire up the activities one at a time (Section 7), each reading from `content-bank.json`.
4. Layer in mastery + gamification (Sections 8–9).
5. Polish UI/UX and accessibility (Section 10), then run the acceptance checklist (Section 13).

**Two files make up the project seed:**

- `BUILD_PLAN.md` — this blueprint.
- `content-bank.json` — the ready-to-use question/flashcard/code-task data. The schema is documented in Section 12; the app reads everything from here so content can grow without code changes.

---

## 1. Goals & guiding principles

**Primary goal.** Give students a single, enjoyable place to _practise until they have mastered_ every sub-topic they have been taught — not just read notes, but actively retrieve, apply and self-test.

**Design principles**

- **Active recall over passive reading.** Every screen asks the student to _do_ something.
- **Mastery, not completion.** Progress is earned by demonstrating understanding (getting items right, repeatedly, over time), not by clicking "next".
- **Fun is a feature.** Animation, drag-and-drop, games, streaks and badges keep students coming back — but they always serve a learning objective.
- **Low friction.** No login, no install, works on a school PC or a phone, opens in any modern browser, saves progress automatically on the device.
- **Spec-faithful.** Wording, command words and examples match Cambridge 0984. Exam-style algorithm answers use **Cambridge pseudocode**; practical code is **Python** (mirrors how the subject is taught).
- **Self-correcting.** Every question has a worked explanation so students learn from mistakes immediately.

**Non-goals (for v1)**

- No student accounts, no server, no teacher dashboard, no class leaderboards across devices (progress is per-device only). These are listed as future work in Section 14.

---

## 2. Scope — exactly what content the app covers

Build the app so it is **content-driven**: every unit/sub-topic comes from `content-bank.json`, and units the student has not yet covered are simply absent from the data (or flagged `"locked": true`). The seed content covers **only what has been taught so far**:

| Unit  | Title                              | Paper | Coverage in v1                                                                                                                                                                                                                    |
| ----- | ---------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1** | Data Representation                | 1     | **Full** — 1.1 Number systems, 1.2 Text/sound/images, 1.3 Data storage & compression                                                                                                                                              |
| **2** | Data Transmission                  | 1     | **Full** — 2.1 Types/methods, 2.2 Error detection, 2.3 Encryption                                                                                                                                                                 |
| **3** | Hardware                           | 1     | **Full** — 3.1 Architecture, 3.2 I/O devices, 3.3 Data storage, 3.4 Network hardware                                                                                                                                              |
| **7** | Algorithm Design & Problem-Solving | 2     | **Partial** — 7.1 PDLC, 7.2 design tools (structure diagrams, flowcharts) and **pseudocode up to and including WHILE loops**.                                                                                                     |
| **8** | Programming                        | 2     | **Partial** — 8.1 concepts **up to and including WHILE loops**: variables/constants, data types, casting, input/output, sequence, selection (IF + CASE), iteration (FOR + WHILE), totalling/counting, string handling, operators. |

**Scope boundary — do NOT include in v1 content (not yet taught):**

- Unit 4 (Software), Unit 5, Unit 6, Unit 9 (Databases/SQL), Unit 10 (Boolean logic).
- Unit 7: validation/verification, test data, **formal trace tables**, standard search/sort algorithms (these come in Year 11).
- Unit 8: **arrays**, **procedures/functions/parameters**, **file handling**, library routines beyond simple `MOD`/`DIV`/`ROUND`/`RANDOM` used in passing.

> The app must make it trivial to add the remaining units later by appending to `content-bank.json` — design the UI to render whatever units exist in the data.

**Pseudocode constructs in scope (Cambridge conventions):** `←` assignment, `DECLARE x : INTEGER/REAL/CHAR/STRING/BOOLEAN`, `INPUT`/`OUTPUT`, arithmetic (`+ - * / ^ MOD DIV`), relational (`= < <= > >= <>`), logical (`AND OR NOT`), `IF…THEN…ELSE…ENDIF`, `CASE OF…OTHERWISE…ENDCASE`, `FOR…TO…NEXT`, `WHILE…DO…ENDWHILE`. (Post-condition `REPEAT…UNTIL` may appear as a "stretch" item but flag `difficulty: 3`.)

---

## 3. Tech stack

Choose a modern, static, client-only React stack. Recommended:

| Concern           | Choice                                             | Notes                                                                          |
| ----------------- | -------------------------------------------------- | ------------------------------------------------------------------------------ |
| Framework         | **React 18 + Vite**                                | Fast dev server, simple static build.                                          |
| Language          | **TypeScript**                                     | Type the content + progress schemas (Section 12) for safety.                   |
| Styling           | **Tailwind CSS**                                   | Fast, consistent, responsive. Include a small design-token layer (Section 10). |
| Routing           | **React Router v6**                                | Client-side routes (Section 5).                                                |
| State             | **Zustand** (or React Context + `useReducer`)      | One store for progress/gamification; persisted to `localStorage`.              |
| Animation         | **Framer Motion**                                  | Card flips, transitions, confetti-friendly.                                    |
| Drag & drop       | **@dnd-kit/core**                                  | Accessible drag-and-drop for matching, memory, Parsons (line reorder) tasks.   |
| Persistence       | **`localStorage`** via a thin `storage` module     | No backend. Namespaced keys, versioned (Section 8.4).                          |
| Icons             | **lucide-react**                                   | Clean, consistent icon set.                                                    |
| Confetti/feedback | **canvas-confetti** (optional)                     | Reward animations on mastery.                                                  |
| Charts (progress) | lightweight (e.g. **Recharts**) or hand-rolled SVG | For the progress dashboard rings/bars.                                         |
| Build/Deploy      | Static build → **Netlify / Vercel / GitHub Pages** | Output is a folder of static files; can also be opened locally.                |

**Constraints**

- **No external network calls at runtime.** All content is bundled (`content-bank.json` imported, or fetched from `/public`). The app must work offline.
- Keep bundle lean; lazy-load heavier activities/routes.
- Make it a **PWA** (installable, offline cache) as a nice-to-have, not required.

---

## 4. Architecture overview

```
┌─────────────────────────────────────────────────────────┐
│  React SPA (static, client-only)                         │
│                                                          │
│  content-bank.json ──► ContentProvider ──► Activities    │
│        (seed data)        (typed, indexed)   (UI)        │
│                                                          │
│  ProgressStore (Zustand) ◄──► localStorage (versioned)   │
│        ▲           ▲                                      │
│        │           └── gamification (XP, badges, streak)  │
│        └── mastery engine (Leitner spaced repetition)     │
└─────────────────────────────────────────────────────────┘
```

- **ContentProvider** loads and indexes `content-bank.json` once at startup (build maps by unit, sub-topic, item id).
- **Activities** are pure UI components that take items as props and emit results (`onAnswer(itemId, correct)`).
- **ProgressStore** records every answer, updates mastery state + XP + streak, and persists to `localStorage`.
- **Mastery engine** decides what to show next (spaced repetition) and when a sub-topic is "Mastered".

---

## 5. Information architecture & routes

| Route                       | Screen                 | Purpose                                                                                                     |
| --------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------- |
| `/`                         | **Home / Dashboard**   | Greeting, daily goal ring, streak, "Continue practising" CTA, per-unit mastery cards, recent badges.        |
| `/unit/:unitId`             | **Unit overview**      | Sub-topic list with mastery state; choose an activity; "Mixed mastery quiz" button.                         |
| `/unit/:unitId/:subtopicId` | **Sub-topic hub**      | The activities available for that sub-topic (flashcards, matching, memory, quiz, code tasks as applicable). |
| `/play/flashcards/:scope`   | **Flashcards**         | Flip-card deck for a scope (unit or sub-topic).                                                             |
| `/play/match/:scope`        | **Matching game**      | Drag term ↔ definition.                                                                                     |
| `/play/memory/:scope`       | **Memory game**        | Pairs (term/definition) grid.                                                                               |
| `/play/quiz/:scope`         | **Mastery quiz**       | MCQ + short-answer with mastery logic.                                                                      |
| `/play/code/:scope`         | **Code lab**           | Parsons reorder, fill-the-blank, predict-output (Units 7 & 8).                                              |
| `/play/convert`             | **Conversion trainer** | Procedurally generated binary/hex/denary + file-size drills (Unit 1).                                       |
| `/progress`                 | **Progress**           | Mastery map across all units, XP history, badges, weak-spot list.                                           |
| `/settings`                 | **Settings**           | Sound on/off, reduced motion, dark mode, daily goal, **reset progress**, **export/import progress (JSON)**. |

`:scope` is an encoded selector, e.g. `unit-1`, `subtopic-1.2`, or `mixed`.

Navigation: persistent top bar (logo "CS Revision Hub", streak flame + XP, links: Home, Progress, Settings) and a per-unit breadcrumb. Mobile: bottom tab bar (Home, Units, Progress, Settings).

---

## 6. Core UX flows

**First visit.** Friendly welcome → short "how it works" (3 cards) → name prompt (stored locally, optional, used only for greetings) → dashboard.

**Daily loop.** Dashboard shows a **daily goal** (e.g. "Answer 20 items" / "Earn 100 XP"). "Continue" launches a **smart mixed session** that pulls due items (spaced repetition) across covered units, mixing activity types. Completing the goal triggers a celebration + streak increment.

**Targeted practice.** Student picks Unit → Sub-topic → Activity. Each activity ends with a results card: score, XP earned, items to review, "Practise again" / "Next activity".

**Mastery feedback.** Every unit/sub-topic shows a state chip: **Not started → Learning → Practising → Mastered** (Section 8). Mastering a sub-topic fires confetti + a badge check.

---

## 7. Activity specifications

All activities: keyboard accessible, mobile-friendly, instant feedback, and they report each answer to the ProgressStore as `{itemId, correct, activity, timestamp}`.

### 7.1 Flashcards (flip)

- Card shows **front** (term/prompt); tap/click/Space flips to **back** (definition/answer) with a 3D flip animation (Framer Motion).
- Self-rating buttons after flip: **"Got it"** / **"Almost"** / **"Missed"** → feed the Leitner engine (Section 8.3). "Got it" promotes the card; "Missed" resets it.
- Controls: previous/next, shuffle, "star" to favourite, progress dots, restart.
- Source: `flashcards[]` for the scope. Front = `term` (or `front`), Back = `definition` (or `back`).
- Stretch: "type the answer" mode for key terms (fuzzy match against `definition`/`term`).

### 7.2 Matching game (drag-and-drop)

- Two columns: **terms** (left, draggable) and **definitions** (right, drop zones) — or a single shuffled pool the student pairs up.
- Built on `@dnd-kit`. Correct pair snaps + turns green; wrong pair shakes + returns. Timer + move counter.
- Round size 5–8 pairs from the scope's flashcards. On completion: accuracy %, time, XP.
- **Small-scope fallback (required):** if the chosen scope has fewer flashcards than the round size, automatically reduce the round to the number available, or top up from the parent unit's pool. Never render a broken round. (All seeded sub-topics now have ≥6 flashcards, but the rule must still exist for future content.)
- Accessibility: keyboard alternative — select a term (Enter), then select its match (Enter).

### 7.3 Memory game (pairs)

- Grid of face-down cards; each pair = a **term** and its **definition** (so matching reinforces meaning, not just visuals).
- Flip two; match stays up, non-match flips back. Track moves + time; fewer moves = more XP.
- Grid sizes: 4×3 (6 pairs) default, 4×4 (8 pairs) for stretch. Built from scope flashcards.
- **Small-scope fallback (required):** if a sub-topic has fewer than 6 flashcards, drop to a smaller grid (e.g. 3×2) or pull extra pairs from the parent unit so the game always works.

### 7.4 Mastery quiz (MCQ + short answer)

- Pulls `mcqs[]` for the scope. Each item: question, 4 options (or true/false), one correct, **explanation** shown after answering.
- **Question types supported:** single-best-answer MCQ, multiple-response (select all), true/false, and short text entry (accept-list matching, case-insensitive, trimmed).
- **v1 implementation decision:** all seeded MCQs are `single` (single-best-answer). **Build single-answer first** (true/false is just a 2-option single). The schema already allows `multi` and `text` so the wider types can be added later without a rewrite — implement them when content that needs them arrives.
- Flow: present → student answers → reveal correct + explanation → "Next". No moving on without seeing feedback.
- **Mastery logic (Section 8):** a quiz runs until the student has answered each due item correctly the required number of times, re-queuing missed items later in the session (interleaving). Show a live mastery bar.
- Difficulty-aware: `difficulty` (1–3) used to scale XP and to order easier → harder.
- End card: score, mastery gained per sub-topic, "items to review" list with the explanations.

### 7.5 Code lab (Units 7 & 8) — three task types

Reads `codeTasks[]`. Render code in a monospaced block with syntax-aware colouring (light styling is enough; do **not** require a full code editor). Each task has `language: "pseudocode" | "python"`.

**(a) Parsons / line reorder.** Given scrambled lines, drag them into the correct order (and correct indentation for stretch). Validate against `lines` (the correct sequence). Optional `distractors` (extra lines that should _not_ be used). Built on `@dnd-kit`. Great for teaching the _shape_ of IF/CASE/FOR/WHILE blocks.

**(b) Fill-in-the-blank.** Code `template` contains numbered blanks (`___1___`). Student types or drags tokens into blanks. Validate each blank against its `accept` list (case-sensitive for keywords like `WHILE`, case-insensitive where sensible). Use for keywords, conditions, operators, loop bounds.

**(c) Predict-the-output.** Show a short complete program/pseudocode snippet; student types the exact output. Validate against `answer` / `accept`. This is "mental tracing" — ideal for consolidating FOR/WHILE loops, MOD/DIV, string handling. After submit, optionally reveal a **step table** (provided in the task as `trace`) so students _see_ how the values changed — informal, not the formal Year-11 trace-table technique.

> **Pseudocode rendering note for the AI:** preserve two-space indentation, show `←` for assignment, keep `THEN`/`ELSE` on their own indented lines, and never auto-"correct" pseudocode into Python.

### 7.6 Conversion trainer (Unit 1) — procedural generator

A self-contained drill generator (no content needed in JSON, though a few seed examples are included):

- **Modes:** denary→binary, binary→denary, denary→hex, hex→denary, hex→binary, binary→hex, **8-bit binary addition** (with overflow detection), **logical shift** (left/right, show ×2 / ÷2 effect), **two's complement** (positive/negative 8-bit), **file-size calculator** (image: resolution × colour depth; sound: sample rate × resolution × time) — **always use 1024, never 1000**, answers in the units requested.
- Generates random valid problems within syllabus limits (max 16-bit; addition uses two positive 8-bit integers), checks the student's answer, gives step-by-step worked solutions on request, and tracks accuracy per mode.
- Gamified as **"streak drills"**: how many correct in a row; speed bonus XP.

---

## 8. Mastery & progression model

### 8.1 Mastery states (per sub-topic)

- **Not started** — no items attempted.
- **Learning** — some items attempted; < 50% of items reached "known".
- **Practising** — 50–99% of items "known".
- **Mastered** — 100% of the sub-topic's items reached "known" _and_ retained (each known correctly at least twice, most-recent attempt correct).

A unit's state is derived from its sub-topics (e.g. Mastered when all sub-topics mastered; a ring shows % mastered).

### 8.2 "Known" per item

An item (flashcard/MCQ/code task) is **known** when the student has answered it correctly **≥ 2 times** with the latest attempt correct. A wrong answer demotes it (drops its Leitner box and clears one "correct" credit).

### 8.3 Spaced repetition (Leitner system)

- Each item sits in a **box 1–5**. Correct → move up a box; wrong → back to box 1.
- Boxes map to review intervals: box1 = same session, box2 = +1 day, box3 = +3 days, box4 = +7 days, box5 = +16 days (store `nextDue` timestamp).
- The **smart mixed session** and quizzes prioritise items whose `nextDue ≤ now`, then new items, then everything else. This drives genuine long-term retention, not cramming.

### 8.4 Progress persistence (localStorage)

- Single versioned object under key `csrh:v1:progress` (bump version to migrate).
- Debounce writes; never block UI. Provide **export/import** (download/upload JSON) in Settings so a student can move devices or hand evidence to the teacher.
- Provide **reset progress** (with confirm).

---

## 9. Gamification

Keep it motivating but not noisy; everything respects the "reduced motion" and "sound off" settings.

- **XP** — awarded per correct answer (base × difficulty × speed/streak bonus). Levels: XP thresholds with a level-up animation. Show level + XP bar in the top bar.
- **Streaks** — consecutive days with the daily goal met. Flame icon + count; gentle "don't break your streak" nudge on the dashboard (never guilt-trippy).
- **Daily goal** — configurable (default 20 items or 100 XP). Completing it = celebration + streak++.
- **Badges** (examples — store definitions in code or JSON):
  - _First Steps_ (complete any activity), _Binary Boss_ (50 conversion drills correct), _Hex Hero_ (all hex modes 90%+), _Packet Master_ (Unit 2 mastered), _Architect_ (Unit 3.1 mastered), _Loop Wizard_ (10 WHILE/FOR code tasks correct), _Pseudo Pro_ (20 Parsons tasks), _Sharp Shooter_ (10 quiz answers in a row), _Comeback_ (master a sub-topic you previously failed), _Perfect Week_ (7-day streak), _Unit Crusher_ (master a full unit).
- **Progress visuals** — per-unit mastery rings on the dashboard; a full **mastery map** on `/progress`; confetti on mastering a sub-topic/unit.
- **Optional sound** — subtle correct/incorrect/level-up cues; off by default-respecting a global toggle.
- **No competitive leaderboard in v1** (per-device only). A local "personal best" per drill is enough.

---

## 10. UI/UX & visual design

**Tone:** clean, bright, modern, a little playful — think Duolingo/Quizlet energy, but classroom-appropriate and uncluttered.

**Design tokens (suggested; the AI may refine):**

- Palette: a friendly primary (e.g. indigo/violet `#6366F1`), success green `#22C55E`, warning amber `#F59E0B`, error red `#EF4444`, neutral slate greys. Each **unit gets an accent colour** for quick recognition (e.g. U1 violet, U2 teal, U3 blue, U7 orange, U8 pink).
- Typography: a rounded, readable sans (e.g. Inter/Nunito) for UI; a clear monospace (e.g. JetBrains Mono / Fira Code) for all code & pseudocode.
- Rounded corners (`rounded-2xl`), soft shadows, generous spacing, large tap targets (min 44×44px).
- Light **and** dark mode.

**Responsive:** mobile-first. Must work well on a phone (portrait), a tablet, and a school desktop/laptop. Drag-and-drop activities need touch support and a keyboard fallback.

**Accessibility (target WCAG 2.1 AA):**

- Full keyboard operability for every activity (including drag-and-drop alternatives).
- Colour is never the only signal (use icons/labels for correct/incorrect).
- Contrast ≥ 4.5:1 for text; visible focus rings.
- Respect `prefers-reduced-motion` (disable flips/confetti when set).
- Proper semantics/ARIA for cards, drop zones, live regions for feedback.
- Alt text for any images/diagrams.

**Micro-interactions:** card flips, satisfying snap on correct matches, gentle shake on wrong, XP "+10" floats, level-up burst, streak flame pulse. All skippable/reduced-motion-aware.

---

## 11. Component breakdown & build phases

### Suggested file structure

```
src/
  main.tsx
  App.tsx
  data/
    content-bank.json          # seed content (Section 12)
    contentTypes.ts            # TS types for content
  content/
    ContentProvider.tsx        # loads + indexes content
  store/
    progressStore.ts           # Zustand store + persistence
    mastery.ts                 # Leitner + mastery state engine
    gamification.ts            # XP, levels, streaks, badges
    storage.ts                 # localStorage wrapper (versioned)
  components/
    layout/ (TopBar, BottomTabs, Breadcrumb, PageShell)
    ui/ (Button, Card, Chip, ProgressRing, Bar, Modal, Toast, CodeBlock)
    feedback/ (Confetti, XPFloat, LevelUp)
  activities/
    Flashcards/
    MatchGame/
    MemoryGame/
    Quiz/
    CodeLab/ (Parsons, FillBlank, PredictOutput)
    ConversionTrainer/
  pages/
    Home, Unit, Subtopic, Progress, Settings, Play
  hooks/ (useDueItems, useScopeItems, useSound, useReducedMotion)
  styles/ (tokens.css, tailwind config)
```

### Phased roadmap (build in this order)

1. **Phase 1 — Shell & data.** Vite + TS + Tailwind + Router. Load `content-bank.json`, build ContentProvider + types. Home/Unit/Subtopic pages render from data (no activities yet). Dark mode + responsive layout.
2. **Phase 2 — Progress core.** ProgressStore + storage + mastery engine (states, "known", Leitner). Mastery chips/rings reflect real data.
3. **Phase 3 — Flashcards + Quiz.** First two activities, full feedback + explanations, reporting to store.
4. **Phase 4 — Matching + Memory.** dnd-kit drag-and-drop + keyboard fallbacks.
5. **Phase 5 — Code lab.** Parsons, fill-blank, predict-output, with pseudocode-safe rendering.
6. **Phase 6 — Conversion trainer.** Procedural generator + worked solutions.
7. **Phase 7 — Gamification.** XP/levels/streaks/badges/daily goal + celebrations + sound toggle.
8. **Phase 8 — Progress dashboard + Settings.** Mastery map, weak-spot list, export/import/reset.
9. **Phase 9 — Polish & a11y.** Animations, reduced-motion, contrast, keyboard pass, PWA (optional).

Each phase should be independently runnable and demoable.

---

## 12. Content data — schema reference

The app reads everything from `content-bank.json`. Shape (TypeScript-style):

```ts
interface ContentBank {
  meta: {
    syllabus: string;
    version: string;
    scope: string;
    updated: string;
    conventions: object;
  };
  badges?: Badge[];
  units: Unit[];
}

interface Unit {
  id: string; // "u1"
  number: number; // 1
  title: string; // "Data Representation"
  paper: 1 | 2;
  accent?: string; // hex colour
  subtopics: { id: string; title: string }[]; // "1.1" ...
  flashcards: Flashcard[];
  mcqs: MCQ[];
  codeTasks?: CodeTask[]; // Units 7 & 8
}

interface Flashcard {
  id: string;
  subtopic: string;
  term: string; // front
  definition: string; // back
  difficulty?: 1 | 2 | 3;
}

interface MCQ {
  id: string;
  subtopic: string;
  type?: "single" | "multi" | "truefalse" | "text";
  question: string;
  options?: string[]; // omit for "text"
  answerIndex?: number; // single
  answerIndices?: number[]; // multi
  answer?: string; // text
  accept?: string[]; // text alternative answers
  explanation: string; // shown after answering
  difficulty?: 1 | 2 | 3;
}

type CodeTask = ParsonsTask | FillBlankTask | PredictOutputTask;

interface BaseTask {
  id: string;
  subtopic: string;
  language: "pseudocode" | "python";
  prompt: string;
  difficulty?: 1 | 2 | 3;
}
interface ParsonsTask extends BaseTask {
  type: "parsons";
  lines: string[];
  distractors?: string[];
}
interface FillBlankTask extends BaseTask {
  type: "fill-blank";
  template: string;
  blanks: { id: string; accept: string[]; caseSensitive?: boolean }[];
}
interface PredictOutputTask extends BaseTask {
  type: "predict-output";
  code: string;
  answer: string;
  accept?: string[];
  trace?: string[];
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon?: string;
}
```

**Defaults & fallbacks (required behaviour)**

- `meta.defaults` carries app-wide defaults: `{ "difficulty": 1, "mcqType": "single" }`.
- **Difficulty:** if an item omits `difficulty`, treat it as **1** for XP scaling and mastery weighting. (Most flashcards/MCQs are difficulty 1 and omit the field; only harder items set 2 or 3.)
- **MCQ type:** if an MCQ omits `type`, treat it as **`single`**.
- **Flashcard sides:** front = `term`, back = `definition`.
- **Small-scope fallback:** any activity whose scope yields fewer items than its round size must shrink the round to what's available or borrow from the parent unit — never render an empty or broken activity (see §7.2/§7.3).

**Authoring rules baked into the seed content**

- Wording mirrors Cambridge 0984 command words and the published notes/guidance.
- Distractors in MCQs are plausible misconceptions, not nonsense.
- Pseudocode uses `←`, `DECLARE`, `IF/THEN/ELSE/ENDIF`, `CASE OF/OTHERWISE/ENDCASE`, `FOR/TO/NEXT`, `WHILE/DO/ENDWHILE`.
- Python uses idiomatic Year-10 style (`input()`, `int()`, `print()`, `for i in range()`, `while`, `len()`, `.upper()`, `%`, `//`).
- Every code task stays within the taught scope (no arrays/functions/files).

---

## 13. Acceptance criteria (test checklist)

Functional

- [ ] App loads with no network; works offline after first load.
- [ ] All units/sub-topics in `content-bank.json` render automatically; adding a unit needs no code change.
- [ ] Each activity reports answers to the store; mastery states and rings update live.
- [ ] Leitner scheduling surfaces due items first in mixed sessions and quizzes.
- [ ] A sub-topic flips to **Mastered** only when every item is "known" (≥2 correct, latest correct).
- [ ] XP, levels, streaks, daily goal and at least 8 badges work and persist across reloads.
- [ ] Export → reset → import restores identical progress.
- [ ] Conversion trainer generates valid in-spec problems and marks them correctly (incl. overflow, 1024-based file sizes).
- [ ] Code lab never mangles pseudocode; predict-output marks exact output (whitespace-tolerant where specified).

Quality

- [ ] Fully usable on a phone (portrait) and a desktop.
- [ ] Every activity operable by keyboard; drag-and-drop has a keyboard alternative.
- [ ] `prefers-reduced-motion` disables non-essential animation; sound respects the toggle.
- [ ] Text contrast ≥ AA; focus states visible.
- [ ] Activities degrade gracefully on small scopes (reduced round size or unit-level pool); no activity ever renders empty or broken.
- [ ] Items with no `difficulty` are treated as 1; XP/mastery weighting is consistent.
- [ ] No console errors; Lighthouse PWA/Best-Practices reasonable.

Content integrity

- [ ] Spot-check: every covered sub-topic (1.1–1.3, 2.1–2.3, 3.1–3.4, 7.1–7.2, 8.1) has flashcards **and** quiz items.
- [ ] No content from out-of-scope topics (Units 4–6, 9, 10; arrays/functions/files; formal trace tables).

---

## 14. Future work (post-v1)

- Add Units 4–6, 9, 10 and the rest of 7 & 8 by appending to `content-bank.json`.
- Optional cloud sync + **teacher dashboard** (class mastery heatmap) — would require a backend (e.g. Supabase) and logins.
- Diagram-based activities (label the FDE cycle, drag packet structure, build truth tables) once Unit 10 is taught.
- "Exam mode": timed mixed paper-style questions pulled from the topical past-paper bank.
- Shareable progress certificate / printable mastery report for parents' evenings.

---

---

## 15. Review notes (v1.1 — addressed in this revision)

Changes made after a detailed review of the seed files:

1. **Default difficulty rule.** `meta.defaults.difficulty = 1`. Any item without a `difficulty` is treated as 1 for XP/mastery weighting (§12). Most easy items deliberately omit the field.
2. **Scope-boundary clean-up.** Removed the out-of-scope wording/distractors that weren't yet taught: the "Testing" flashcard no longer mentions "test data"; the "Validation" distractor became "Selection"; the "Trace table" distractor became "Decomposition". The content bank now contains **zero** occurrences of `test data`, `Validation`, or `Trace table`.
3. **Thin sub-topics filled out.** Added flashcards and MCQs so **every covered sub-topic has ≥6 flashcards and ≥5 MCQs**. Totals rose from 208 → **225 items** (128 flashcards, 82 MCQs, 15 code tasks). Specifically: +5 flashcards (2.3, 3.2×2, 3.4×2) and +12 MCQs (1.2×2, 2.3×2, 3.2×2, 3.3×2, 3.4×2, 7.1×2).
4. **MCQ-type decision.** v1 builds **single-best-answer only** (true/false is a 2-option single). The schema keeps `multi`/`text` for future content; `meta.defaults.mcqType = "single"` (§7.4, §12).
5. **Small-scope fallback rule.** Matching and memory games must shrink the round or borrow from the parent unit when a scope is small, so no activity ever renders empty/broken (§7.2, §7.3, §13). All seeded sub-topics now clear the 6-item bar, but the rule still applies for future content.

**Phasing reminder.** The feature set is intentionally ambitious. Build strictly in the §11 phase order (shell → progress → flashcards+quiz → match+memory → code lab → conversion trainer → gamification → dashboard/settings → polish) so there's a working app at every step.

---

_Companion file: `content-bank.json`. Built 15 June 2026, revised 15 June 2026 (v1.1) for USI Year 10 IGCSE CS (0984)._
