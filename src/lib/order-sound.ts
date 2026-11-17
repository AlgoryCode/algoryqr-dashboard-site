"use client";

/**
 * The new-order sound, shared by every orders screen.
 *
 * Each browser keeps its own volume (0–1) and ringtone in localStorage. The old chime peaked at 0.18–0.25 of full scale
 * on a pure sine and was barely audible in a noisy kitchen; the default is now full volume, so each user can only turn
 * it down. Every tone is synthesised with WebAudio, so there are no sound files to ship or load.
 */

export const ORDER_SOUND_VOLUME_KEY = "algory-orders-volume";
export const ORDER_SOUND_TONE_KEY = "algory-orders-tone";
export const ORDER_SOUND_VOLUME_EVENT = "algory-orders-volume-change";
export const DEFAULT_ORDER_SOUND_VOLUME = 1;

export const ORDER_TONES = [
  { id: "alarm", label: "Alarm zili", hint: "Uzun, dikkat çekici zil trili" },
  { id: "melody", label: "Melodi", hint: "Kısa, neşeli marimba melodisi" },
  { id: "doorbell", label: "Kapı zili", hint: "Klasik ding-dong" },
  { id: "service-bell", label: "Servis zili", hint: "Tezgâh zili, üç vuruş" },
  { id: "chime", label: "Üçlü çağrı", hint: "Yükselen üç notalı çan" },
  { id: "phone", label: "Telefon", hint: "Çalan telefon gibi, iki kez" },
  { id: "kitchen", label: "Mutfak alarmı", hint: "Keskin bip-bip, en duyulanı" },
] as const;

export type OrderToneId = (typeof ORDER_TONES)[number]["id"];
export const DEFAULT_ORDER_TONE: OrderToneId = "alarm";

function isToneId(value: unknown): value is OrderToneId {
  return ORDER_TONES.some((tone) => tone.id === value);
}

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

export function readOrderSoundTone(): OrderToneId {
  try {
    const stored = window.localStorage.getItem(ORDER_SOUND_TONE_KEY);
    return isToneId(stored) ? stored : DEFAULT_ORDER_TONE;
  } catch {
    return DEFAULT_ORDER_TONE;
  }
}

export function writeOrderSoundTone(tone: OrderToneId) {
  try {
    window.localStorage.setItem(ORDER_SOUND_TONE_KEY, tone);
  } catch {
    /* the choice then lasts until the page closes */
  }
  window.dispatchEvent(new Event(ORDER_SOUND_VOLUME_EVENT));
}

/** Fires when the volume or the ringtone changes, in this tab or another one. */
export function subscribeOrderSoundVolume(onChange: () => void) {
  window.addEventListener(ORDER_SOUND_VOLUME_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(ORDER_SOUND_VOLUME_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

let context: AudioContext | null = null;
/** The bus of the sound that is playing, so a new one (e.g. pressing another "Dinle") cuts it off instead of overlapping. */
let playing: GainNode | null = null;

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

type Overtone = { ratio: number; gain: number; decay: number; type?: OscillatorType };

/** A struck note: every overtone starts at once and fades out on its own. */
function strike(audio: AudioContext, out: AudioNode, at: number, frequency: number, overtones: Overtone[], gain = 1) {
  overtones.forEach((overtone) => {
    // Overtones above ~9 kHz only sound harsh on tablet and laptop speakers.
    if (frequency * overtone.ratio > 9000) return;
    const oscillator = audio.createOscillator();
    const envelope = audio.createGain();
    const end = at + overtone.decay;
    oscillator.type = overtone.type ?? "sine";
    oscillator.frequency.value = frequency * overtone.ratio;
    envelope.gain.setValueAtTime(0.0001, at);
    envelope.gain.exponentialRampToValueAtTime(overtone.gain * gain, at + 0.004);
    envelope.gain.exponentialRampToValueAtTime(0.0001, end);
    oscillator.connect(envelope).connect(out);
    oscillator.start(at);
    oscillator.stop(end + 0.02);
  });
}

/** A held electronic tone with short fades so it does not click; `alternateEvery` flips between the frequencies. */
function beep(
  audio: AudioContext,
  out: AudioNode,
  at: number,
  seconds: number,
  frequencies: number[],
  type: OscillatorType,
  gain: number,
  alternateEvery?: number,
) {
  const oscillator = audio.createOscillator();
  const envelope = audio.createGain();
  oscillator.type = type;
  if (alternateEvery && frequencies.length > 1) {
    for (let t = 0, index = 0; t < seconds; t += alternateEvery, index += 1) {
      oscillator.frequency.setValueAtTime(frequencies[index % frequencies.length], at + t);
    }
  } else {
    oscillator.frequency.value = frequencies[0];
  }
  envelope.gain.setValueAtTime(0.0001, at);
  envelope.gain.exponentialRampToValueAtTime(gain, at + 0.01);
  envelope.gain.setValueAtTime(gain, at + seconds - 0.02);
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + seconds);
  oscillator.connect(envelope).connect(out);
  oscillator.start(at);
  oscillator.stop(at + seconds + 0.02);
}

const MARIMBA: Overtone[] = [
  { ratio: 1, gain: 1, decay: 0.55 },
  { ratio: 2, gain: 0.22, decay: 0.33, type: "triangle" },
  { ratio: 4, gain: 0.3, decay: 0.14 },
];
/** Inharmonic overtones of a real bell, so it rings like metal rather than beeping. */
const BELL: Overtone[] = [
  { ratio: 1, gain: 1, decay: 1.6 },
  { ratio: 2.0, gain: 0.5, decay: 1.2 },
  { ratio: 2.76, gain: 0.4, decay: 0.9 },
  { ratio: 5.4, gain: 0.22, decay: 0.45 },
  { ratio: 8.93, gain: 0.12, decay: 0.25 },
];
const SERVICE_BELL: Overtone[] = [
  { ratio: 1, gain: 1, decay: 1.4 },
  { ratio: 2.32, gain: 0.55, decay: 1.0 },
  { ratio: 4.25, gain: 0.35, decay: 0.6 },
  { ratio: 6.63, gain: 0.2, decay: 0.35 },
];

/** The alarm bell: each overtone fades faster the higher it is (0.25 s / (ratio * 0.6 + 0.4)). */
const ALARM_BELL: Overtone[] = [
  { ratio: 1, gain: 1 },
  { ratio: 2, gain: 0.5 },
  { ratio: 2.76, gain: 0.35 },
  { ratio: 5.4, gain: 0.18 },
  { ratio: 8.93, gain: 0.08 },
].map((overtone) => ({ ...overtone, decay: 0.25 / (overtone.ratio * 0.6 + 0.4) }));

/** How a tone is mixed: extra gain before the compressor and the compressor's grip. Most tones use the defaults. */
type Mix = { boost: number; threshold: number; ratio: number };
const DEFAULT_MIX: Mix = { boost: 1, threshold: -3, ratio: 12 };
const TONE_MIX: Partial<Record<OrderToneId, Mix>> = {
  // Pushed into a softer compressor so the overlapping strikes ring as one loud, even trill.
  alarm: { boost: 1.6, threshold: -14, ratio: 4 },
};

const C5 = 523.25;
const E5 = 659.25;
const G5 = 783.99;
const A5 = 880;
const C6 = 1046.5;
const E6 = 1318.51;
const G6 = 1567.98;

/** Schedules a tone from `start` on `out` and returns how long it lasts, in seconds. */
const TONES: Record<OrderToneId, (audio: AudioContext, out: AudioNode, start: number) => number> = {
  alarm(audio, out, start) {
    // A trill of 34 strikes, 50 ms apart, alternating A5 and B♭5 (about 1.9 s), played twice with a short gap.
    const strikes = 34;
    const gap = 0.05;
    const play = strikes * gap + 0.2;
    for (let repeat = 0; repeat < 2; repeat += 1) {
      for (let index = 0; index < strikes; index += 1) {
        strike(audio, out, start + repeat * (play + 0.25) + index * gap, index % 2 === 0 ? 880 : 932, ALARM_BELL, 0.3);
      }
    }
    return 2 * play + 0.25;
  },
  melody(audio, out, start) {
    const beat = 0.14;
    const notes: [number, number][] = [
      [C5, 0], [E5, 1], [G5, 2], [C6, 3], [A5, 6], [G5, 7], [E5, 8], [G5, 9], [C6, 10],
    ];
    for (let repeat = 0; repeat < 2; repeat += 1) {
      notes.forEach(([frequency, step]) => strike(audio, out, start + repeat * 2.31 + step * beat, frequency, MARIMBA));
    }
    return 4.6;
  },
  doorbell(audio, out, start) {
    for (let repeat = 0; repeat < 2; repeat += 1) {
      const at = start + repeat * 1.6;
      strike(audio, out, at, E5, BELL);
      strike(audio, out, at + 0.55, C5, BELL);
    }
    return 4.4;
  },
  "service-bell"(audio, out, start) {
    [0, 0.32, 0.64, 1.7, 2.02, 2.34].forEach((offset) => strike(audio, out, start + offset, 2093, SERVICE_BELL, 0.8));
    return 3.9;
  },
  chime(audio, out, start) {
    for (let repeat = 0; repeat < 2; repeat += 1) {
      [C6, E6, G6].forEach((frequency, index) =>
        strike(audio, out, start + repeat * 1.5 + index * 0.22, frequency, BELL, 0.8),
      );
    }
    return 4.4;
  },
  phone(audio, out, start) {
    // Two "trrring" bursts, a pause, two more: a warbling tone that flips pitch 25 times a second.
    [0, 0.6, 2.0, 2.6].forEach((offset) => beep(audio, out, start + offset, 0.45, [1150, 1450], "triangle", 0.9, 0.04));
    return 3.1;
  },
  kitchen(audio, out, start) {
    for (let group = 0; group < 3; group += 1) {
      for (let index = 0; index < 4; index += 1) {
        beep(audio, out, start + group * 0.95 + index * 0.15, 0.09, [2300], "square", 0.45);
      }
    }
    return 2.8;
  },
};

/** Plays the stored ringtone at the stored volume; the preview buttons pass `volume` or `tone` to try another one. */
export function playOrderChime(volume = readOrderSoundVolume(), tone: OrderToneId = readOrderSoundTone()) {
  const level = clampVolume(volume);
  // Once the page has had a click, a context made now is allowed to run.
  if (!context || context.state !== "running") unlockOrderSound();
  if (!context || context.state !== "running" || level <= 0) return;
  const audio = context;

  if (playing) {
    const previous = playing;
    previous.gain.setTargetAtTime(0, audio.currentTime, 0.02);
    window.setTimeout(() => previous.disconnect(), 200);
  }

  // A compressor lets the tones peak near full scale without clipping where notes overlap.
  const compressor = audio.createDynamicsCompressor();
  const mix = TONE_MIX[tone] ?? DEFAULT_MIX;
  compressor.threshold.value = mix.threshold;
  compressor.knee.value = 2;
  compressor.ratio.value = mix.ratio;
  compressor.attack.value = 0.002;
  compressor.release.value = 0.15;
  const master = audio.createGain();
  master.gain.value = level * mix.boost;
  master.connect(compressor).connect(audio.destination);
  playing = master;

  const seconds = TONES[tone](audio, master, audio.currentTime + 0.01);
  window.setTimeout(() => {
    if (playing === master) playing = null;
  }, seconds * 1000 + 300);
}
