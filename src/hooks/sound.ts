export type SoundCue =
  | "correct"
  | "incorrect"
  | "level-up"
  | "badge-unlocked"
  | "daily-goal"
  | "mastered";

let audioContext: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const AudioContextConstructor =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioContextConstructor) return null;
  audioContext ??= new AudioContextConstructor();
  return audioContext;
}

export async function resumeAudioContext() {
  const context = getAudioContext();
  if (!context || context.state !== "suspended") return;
  try {
    await context.resume();
  } catch {
    // Browsers may still block audio; cues are decorative, so stay silent.
  }
}

export function playCue(type: SoundCue, enabled: boolean) {
  if (!enabled) return;
  const context = getAudioContext();
  if (!context) return;

  void resumeAudioContext();
  if (context.state === "suspended") return;

  const now = context.currentTime;
  const gain = context.createGain();
  gain.connect(context.destination);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.08, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);

  const notes = getCueNotes(type);
  notes.forEach((note, index) => {
    const oscillator = context.createOscillator();
    oscillator.type = note.wave;
    oscillator.frequency.setValueAtTime(note.frequency, now + index * 0.07);
    oscillator.connect(gain);
    oscillator.start(now + index * 0.07);
    oscillator.stop(now + index * 0.07 + note.duration);
  });
}

function getCueNotes(type: SoundCue) {
  if (type === "correct") {
    return [
      { frequency: 523.25, duration: 0.11, wave: "sine" as OscillatorType },
      { frequency: 659.25, duration: 0.15, wave: "sine" as OscillatorType },
    ];
  }
  if (type === "incorrect") {
    return [
      {
        frequency: 220,
        duration: 0.18,
        wave: "triangle" as OscillatorType,
      },
    ];
  }
  if (type === "level-up") {
    return [523.25, 659.25, 783.99, 1046.5].map((frequency) => ({
      frequency,
      duration: 0.12,
      wave: "sine" as OscillatorType,
    }));
  }
  if (type === "badge-unlocked") {
    return [659.25, 783.99, 987.77].map((frequency) => ({
      frequency,
      duration: 0.1,
      wave: "sine" as OscillatorType,
    }));
  }
  return [392, 523.25, 659.25].map((frequency) => ({
    frequency,
    duration: 0.12,
    wave: "triangle" as OscillatorType,
  }));
}
