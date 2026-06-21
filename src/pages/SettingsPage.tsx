import { Download, FileText, RotateCcw, Sparkles, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { requestOnboardingReplay } from "../components/feedback/onboardingEvents";
import { Button } from "../components/ui/Button";
import { contentIndex } from "../content/contentIndex";
import { getUnitMastery } from "../store/mastery";
import { STORAGE_KEY } from "../store/storage";
import type { ItemProgress, ProgressSnapshot } from "../store/progressStore";
import {
  fixedDailyGoal,
  getItemAccuracyPercent,
  maxNameLength,
  useProgressStore,
} from "../store/progressStore";

export function SettingsPage() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const snapshot = useProgressStore();
  const resetProgress = useProgressStore((state) => state.resetProgress);
  const updateSettings = useProgressStore((state) => state.updateSettings);
  const setName = useProgressStore((state) => state.setName);
  const importProgress = useProgressStore((state) => state.importProgress);

  const exportProgressPdf = () => {
    const data = toSnapshot(snapshot);
    const reportWindow = window.open("", "_blank");
    if (!reportWindow) {
      setMessage("The PDF overview could not be opened.");
      return;
    }

    reportWindow.document.write(buildProgressReportHtml(data));
    reportWindow.document.close();
    reportWindow.focus();
    window.setTimeout(() => reportWindow.print(), 250);
    setMessage("PDF overview opened.");
  };

  const exportProgressBackup = () => {
    const data = toSnapshot(snapshot);
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cs-revision-hub-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage("Progress backup exported.");
  };

  const handleImport = async (file?: File) => {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const ok = importProgress(parsed);
      setMessage(
        ok ? "Progress imported." : "That progress file could not be imported.",
      );
    } catch {
      setMessage("That progress file could not be read.");
    }
  };

  return (
    <div className="max-w-4xl space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold">Settings</h1>
        <p className="mt-2 text-sm text-muted">
          Progress and preferences are saved locally on this device.
        </p>
      </div>

      {message ? (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-sm font-bold text-primary">
          {message}
        </div>
      ) : null}

      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <h2 className="text-lg font-extrabold">Preferences</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Toggle
            label="Sound"
            description="Play short cues for answers and achievements."
            checked={snapshot.settings.sound}
            onChange={(checked) => updateSettings({ sound: checked })}
          />
          <Toggle
            label="Dark mode"
            description="Use a darker classroom-friendly palette."
            checked={snapshot.settings.darkMode}
            onChange={(checked) => updateSettings({ darkMode: checked })}
          />
        </div>

        <label className="mt-5 block rounded-lg border border-line bg-slate-50 p-4">
          <span className="block text-sm font-extrabold">Name</span>
          <span className="mt-1 block text-xs leading-5 text-muted">
            Used only for your greeting on this device.
          </span>
          <input
            className="mt-3 min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm font-bold focus:border-primary"
            value={snapshot.name ?? ""}
            onChange={(event) => setName(event.target.value)}
            placeholder="Optional"
            autoComplete="given-name"
            maxLength={maxNameLength}
          />
        </label>

        <div className="mt-5 rounded-lg border border-line bg-slate-50 p-4">
          <span className="flex items-center justify-between gap-4">
            <span>
              <span className="block text-sm font-extrabold">Daily goal</span>
              <span className="mt-1 block text-xs leading-5 text-muted">
                Students complete 5 items before the daily streak is counted.
              </span>
            </span>
            <span className="shrink-0 rounded-lg bg-white px-3 py-2 text-sm font-extrabold text-primary shadow-sm">
              {fixedDailyGoal}
            </span>
          </span>
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <h2 className="text-lg font-extrabold">Local progress</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Progress is saved under{" "}
          <span className="font-mono text-ink">{STORAGE_KEY}</span>. Export a
          backup before resetting or moving device.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button onClick={exportProgressPdf}>
            <FileText size={18} /> Export PDF overview
          </Button>
          <Button variant="secondary" onClick={exportProgressBackup}>
            <Download size={18} /> Backup JSON
          </Button>
          <Button
            variant="secondary"
            onClick={() => fileInput.current?.click()}
          >
            <Upload size={18} /> Import progress
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(event) => handleImport(event.target.files?.[0])}
          />
          <Button
            variant="danger"
            onClick={() => {
              if (
                window.confirm(
                  "Reset all local progress for this revision hub?",
                )
              ) {
                resetProgress();
                setMessage("Progress reset.");
              }
            }}
          >
            <RotateCcw size={18} /> Reset progress
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              requestOnboardingReplay();
              setMessage("Intro opened.");
            }}
          >
            <Sparkles size={18} /> Replay intro
          </Button>
        </div>
      </section>
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-slate-50 p-4">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-5 w-5 accent-indigo-600"
      />
      <span>
        <span className="block text-sm font-extrabold">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-muted">
          {description}
        </span>
      </span>
    </label>
  );
}

function toSnapshot(
  state: ReturnType<typeof useProgressStore.getState>,
): ProgressSnapshot {
  return {
    version: 1,
    name: state.name,
    xp: state.xp,
    level: state.level,
    streak: state.streak,
    dailyGoal: state.dailyGoal,
    dailyProgress: state.dailyProgress,
    unlockedBadges: state.unlockedBadges,
    settings: state.settings,
    itemProgress: state.itemProgress,
    history: state.history,
  };
}

function buildProgressReportHtml(snapshot: ProgressSnapshot) {
  const history = snapshot.history;
  const correctRate = history.length
    ? Math.round(
        (history.filter((item) => item.correct).length / history.length) * 100,
      )
    : 0;
  const unitRows = contentIndex.units.map((unit) => {
    const mastery = getUnitMastery(unit, snapshot.itemProgress);
    return `
      <tr>
        <td>Unit ${unit.number}: ${escapeHtml(unit.title)}</td>
        <td>${mastery.known}/${mastery.total}</td>
        <td>${mastery.percent}%</td>
      </tr>`;
  });
  const totalKnown = contentIndex.units.reduce(
    (sum, unit) => sum + getUnitMastery(unit, snapshot.itemProgress).known,
    0,
  );
  const totalItems = contentIndex.units.reduce(
    (sum, unit) => sum + getUnitMastery(unit, snapshot.itemProgress).total,
    0,
  );
  const overallMastery = totalItems
    ? Math.round((totalKnown / totalItems) * 100)
    : 0;
  const weakSpots = getWeakSpotsForReport(snapshot.itemProgress).slice(0, 5);
  const weakRows = weakSpots.length
    ? weakSpots
        .map(
          (item) => `
      <tr>
        <td>${escapeHtml(item.label)}</td>
        <td>${item.accuracy}%</td>
        <td>${item.latestCorrect ? "Correct" : "Missed"}</td>
      </tr>`,
        )
        .join("")
    : `<tr><td colspan="3">No weak spots recorded yet.</td></tr>`;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>CS Revision Hub Progress Overview</title>
  <style>
    @page { size: A4; margin: 10mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #111827;
      font-family: Inter, Arial, sans-serif;
      font-size: 11px;
      line-height: 1.35;
    }
    h1, h2, p { margin: 0; }
    h1 { font-size: 22px; }
    h2 { margin-bottom: 6px; font-size: 13px; }
    .page { display: grid; gap: 10px; }
    .top {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      border-bottom: 2px solid #4f46e5;
      padding-bottom: 8px;
    }
    .muted { color: #64748b; }
    .stats {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
    }
    .stat, .panel {
      border: 1px solid #dbe3f0;
      border-radius: 8px;
      padding: 9px;
    }
    .stat strong {
      display: block;
      margin-top: 3px;
      color: #4f46e5;
      font-size: 17px;
    }
    .grid {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 10px;
    }
    table { width: 100%; border-collapse: collapse; }
    th, td {
      border-top: 1px solid #e5e7eb;
      padding: 5px 4px;
      text-align: left;
      vertical-align: top;
    }
    th { color: #64748b; font-size: 10px; text-transform: uppercase; }
    .badges { display: flex; flex-wrap: wrap; gap: 5px; }
    .badge {
      border-radius: 999px;
      background: #eef2ff;
      color: #3730a3;
      padding: 4px 7px;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <main class="page">
    <section class="top">
      <div>
        <p class="muted">CS Revision Hub</p>
        <h1>Progress Overview${snapshot.name ? `: ${escapeHtml(snapshot.name)}` : ""}</h1>
      </div>
      <div class="muted">${new Date().toLocaleDateString()}</div>
    </section>

    <section class="stats">
      <div class="stat">Level<strong>${snapshot.level}</strong></div>
      <div class="stat">XP<strong>${snapshot.xp}</strong></div>
      <div class="stat">Streak<strong>${snapshot.streak}</strong></div>
      <div class="stat">Mastery<strong>${overallMastery}%</strong></div>
      <div class="stat">Accuracy<strong>${correctRate}%</strong></div>
    </section>

    <section class="grid">
      <div class="panel">
        <h2>Unit Mastery</h2>
        <table>
          <thead><tr><th>Unit</th><th>Known</th><th>Mastery</th></tr></thead>
          <tbody>${unitRows.join("")}</tbody>
        </table>
      </div>

      <div class="panel">
        <h2>Weak Spots</h2>
        <table>
          <thead><tr><th>Item</th><th>Accuracy</th><th>Latest</th></tr></thead>
          <tbody>${weakRows}</tbody>
        </table>
      </div>
    </section>

    <section class="grid">
      <div class="panel">
        <h2>Daily Progress</h2>
        <table>
          <tbody>
            <tr><td>Today's answered items</td><td>${snapshot.dailyProgress.answered}/${snapshot.dailyGoal}</td></tr>
            <tr><td>Today's XP</td><td>${snapshot.dailyProgress.xp}</td></tr>
            <tr><td>Daily goal complete</td><td>${snapshot.dailyProgress.completed ? "Yes" : "No"}</td></tr>
            <tr><td>Total attempts recorded</td><td>${history.length}</td></tr>
          </tbody>
        </table>
      </div>

      <div class="panel">
        <h2>Badges</h2>
        <div class="badges">
          ${
            snapshot.unlockedBadges.length
              ? snapshot.unlockedBadges
                  .slice(0, 12)
                  .map(
                    (badge) =>
                      `<span class="badge">${escapeHtml(badge)}</span>`,
                  )
                  .join("")
              : `<span class="muted">No badges unlocked yet.</span>`
          }
        </div>
      </div>
    </section>
  </main>
</body>
</html>`;
}

function getWeakSpotsForReport(progress: Record<string, ItemProgress>) {
  const labels = new Map<string, string>();
  for (const unit of contentIndex.units) {
    for (const item of unit.flashcards)
      labels.set(item.id, `${item.subtopic} ${item.term}`);
    for (const item of unit.mcqs)
      labels.set(item.id, `${item.subtopic} ${item.question}`);
    for (const item of unit.codeTasks ?? [])
      labels.set(item.id, `${item.subtopic} ${item.prompt}`);
  }

  return Object.values(progress)
    .filter((item) => item.attempts > 0)
    .map((item) => ({
      label: labels.get(item.itemId) ?? item.itemId,
      latestCorrect: item.latestCorrect,
      accuracy: getItemAccuracyPercent(item),
      attempts: item.attempts,
    }))
    .filter((item) => !item.latestCorrect || item.accuracy < 50)
    .sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    if (character === "&") return "&amp;";
    if (character === "<") return "&lt;";
    if (character === ">") return "&gt;";
    if (character === '"') return "&quot;";
    return "&#39;";
  });
}
