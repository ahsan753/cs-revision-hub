import { Download, RotateCcw, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "../components/ui/Button";
import { STORAGE_KEY } from "../store/storage";
import type { ProgressSnapshot } from "../store/progressStore";
import { useProgressStore } from "../store/progressStore";

export function SettingsPage() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const snapshot = useProgressStore();
  const resetProgress = useProgressStore((state) => state.resetProgress);
  const updateSettings = useProgressStore((state) => state.updateSettings);
  const setDailyGoal = useProgressStore((state) => state.setDailyGoal);
  const importProgress = useProgressStore((state) => state.importProgress);

  const exportProgress = () => {
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
    setMessage("Progress exported.");
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
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Toggle
            label="Sound"
            description="Reserve sound effects for later polish."
            checked={snapshot.settings.sound}
            onChange={(checked) => updateSettings({ sound: checked })}
          />
          <Toggle
            label="Reduced motion"
            description="Minimise non-essential movement."
            checked={snapshot.settings.reducedMotion}
            onChange={(checked) => updateSettings({ reducedMotion: checked })}
          />
          <Toggle
            label="Dark mode"
            description="Use a darker classroom-friendly palette."
            checked={snapshot.settings.darkMode}
            onChange={(checked) => updateSettings({ darkMode: checked })}
          />
        </div>

        <label className="mt-5 block rounded-lg border border-line bg-slate-50 p-4">
          <span className="flex items-center justify-between gap-4">
            <span>
              <span className="block text-sm font-extrabold">Daily goal</span>
              <span className="mt-1 block text-xs leading-5 text-muted">
                Items to answer before the daily streak is counted.
              </span>
            </span>
            <span className="shrink-0 rounded-lg bg-white px-3 py-2 text-sm font-extrabold text-primary shadow-sm">
              {snapshot.dailyGoal}
            </span>
          </span>
          <input
            className="mt-4 w-full accent-indigo-600"
            type="range"
            min="5"
            max="100"
            step="5"
            value={snapshot.dailyGoal}
            onChange={(event) => setDailyGoal(Number(event.target.value))}
            aria-label="Daily goal items"
          />
        </label>
      </section>

      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <h2 className="text-lg font-extrabold">Local progress</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Progress is saved under{" "}
          <span className="font-mono text-ink">{STORAGE_KEY}</span>. Export a
          backup before resetting or moving device.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button onClick={exportProgress}>
            <Download size={18} /> Export progress
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
