"use client";

/**
 * The new-order chime, shared by every orders screen.
 *
 * The volume is kept per browser in localStorage (0–1). The old chime peaked at 0.18–0.25 of full scale on a pure sine,
 * which is barely audible on laptop and tablet speakers in a noisy kitchen. The default is now full volume (1) and the
 * sound is a short, bright marimba-like melody (about four seconds), so each user can only turn it down.
 */

export const ORDER_SOUND_VOLUME_KEY = "algory-orders-volume";
export const ORDER_SOUND_VOLUME_EVENT = "algory-orders-volume-change";
export const DEFAULT_ORDER_SOUND_VOLUME = 1;

/** One beat of the melody, in seconds. */
const BEAT = 0.14;

/** An original, upbeat phrase in C major: a rising arpeggio, then an answer that lands back on the top C. */
const MELODY: { frequency: number; beat: number; beats: number }[] = [
  { frequency: 523.25, beat: 0, beats: 1 }, // C5
  { frequency: 659.25, beat: 1, beats: 1 }, // E5
  { frequency: 783.99, beat: 2, beats: 1 }, // G5
  { frequency: 1046.5, beat: 3, beats: 2.5 }, // C6
  { frequency: 880, beat: 6, beats: 1 }, // A5
  { frequency: 783.99, beat: 7, beats: 1 }, // G5
  { frequency: 659.25, beat: 8, beats: 1 }, // E5
  { frequency: 783.99, beat: 9, beats: 1 }, // G5
  { frequency: 1046.5, beat: 10, beats: 4 }, // C6
];
const PHRASE_BEATS = 14;
/** The phrase plays twice so it is noticed over background noise. */
const REPEATS = 2;
const REPEAT_GAP = 0.35;

/** Marimba-like tone: a round fundamental, a quickly fading bright overtone and a little edge for small speakers. */
const PARTIALS: { type: OscillatorType; ratio: number; gain: number; decay: number }[] = [
  { type: "sine", ratio: 1, gain: 1, decay: 1 },
  { type: "triangle", ratio: 2, gain: 0.22, decay: 0.6 },
  { type: "sine", ratio: 4, gain: 0.3, decay: 0.25 },
];

function clampVolume(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_ORDER_SOUND_VOLUME;
  return Math.min(1, Math.max(0, value));
}

export function readOrderSoundVolume(): number {
  try {
    const stored = window.localStorage.getItem(ORDER_SOUND_VOLUME_KEY);
    return stored == null ? DEFAULT_ORDER_SOUND_VOLUME : clampVolume(Number(stored));
  } catch {
    return DEFAULT_ORDER_SOUND_VOLUME;
  }
}

export function writeOrderSoundVolume(volume: number) {
  try {
    window.localStorage.setItem(ORDER_SOUND_VOLUME_KEY, String(clampVolume(volume)));
  } catch {
    /* the choice then lasts until the page closes */
  }
  window.dispatchEvent(new Event(ORDER_SOUND_VOLUME_EVENT));
}

export function subscribeOrderSoundVolume(onChange: () => void) {
  window.addEventListener(ORDER_SOUND_VOLUME_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(ORDER_SOUND_VOLUME_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

let context: AudioContext | null = null;

/** Browsers only allow sound after the user has interacted with the page, so call this from a click or key press. */
export function unlockOrderSound() {
  if (context) {
    void context.resume().catch(() => undefined);
    return;
  }
  try {
    const Context =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Context) context = new Context();
  } catch {
    context = null;
  }
}

/** Plays the chime at the stored volume, or at `volume` when given (used by the preview button). */
export function playOrderChime(volume = readOrderSoundVolume()) {
  const level = clampVolume(volume);
  // Once the page has had a click, a context made now is allowed to run.
  if (!context || context.state !== "running") unlockOrderSound();
  if (!context || context.state !== "running" || level <= 0) return;
  const audio = context;

  // A compressor lets the tones peak near full scale without clipping where the partials overlap.
  const compressor = audio.createDynamicsCompressor();
  compressor.threshold.value = -3;
  compressor.knee.value = 2;
  compressor.ratio.value = 12;
  compressor.attack.value = 0.002;
  compressor.release.value = 0.15;
  const master = audio.createGain();
  master.gain.value = level;
  master.connect(compressor).connect(audio.destination);

  const start = audio.currentTime + 0.01;
  const phraseSeconds = PHRASE_BEATS * BEAT + REPEAT_GAP;
  for (let repeat = 0; repeat < REPEATS; repeat += 1) {
    MELODY.forEach((note) => {
      const at = start + repeat * phraseSeconds + note.beat * BEAT;
      const length = Math.max(0.35, note.beats * BEAT + 0.2);

      PARTIALS.forEach((partial) => {
        const oscillator = audio.createOscillator();
        const envelope = audio.createGain();
        const end = at + length * partial.decay;
        oscillator.type = partial.type;
        oscillator.frequency.value = note.frequency * partial.ratio;
        envelope.gain.setValueAtTime(0.0001, at);
        envelope.gain.exponentialRampToValueAtTime(partial.gain, at + 0.006);
        envelope.gain.exponentialRampToValueAtTime(0.0001, end);
        oscillator.connect(envelope).connect(master);
        oscillator.start(at);
        oscillator.stop(end + 0.02);
      });
    });
  }
}
