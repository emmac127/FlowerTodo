let audioCtx: AudioContext | null = null;

/**
 * Must run synchronously inside a user gesture (click/tap).
 * Resumes a suspended context and plays a silent buffer so iOS/Safari
 * allow scheduled tones immediately afterward.
 */
export function unlockAudio(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  if (!audioCtx) {
    audioCtx = new AudioContext();
  }

  if (audioCtx.state === 'suspended') {
    void audioCtx.resume();
  }

  const buffer = audioCtx.createBuffer(1, 1, audioCtx.sampleRate);
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(audioCtx.destination);
  source.start(0);

  return audioCtx;
}

function getContext(): AudioContext | null {
  if (!audioCtx) return unlockAudio();
  if (audioCtx.state === 'suspended') {
    return unlockAudio();
  }
  return audioCtx;
}

function playTone(
  frequency: number,
  startTime: number,
  duration: number,
  volume: number,
  type: OscillatorType = 'sine',
) {
  const ctx = getContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startTime);

  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

/** Bell-like strike with a longer, brighter decay (for completion dings). */
function playBellStrike(
  frequency: number,
  startTime: number,
  volume: number,
  decay = 0.55,
) {
  const ctx = getContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(frequency, startTime);

  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + decay);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + decay + 0.05);
}

export function playGrowSound(completedCount: number, durationMs: number, muted: boolean) {
  if (muted) return;
  const ctx = getContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const baseFreq = 320 + completedCount * 18;
  const steps = 4;
  const stepDur = durationMs / 1000 / steps;

  for (let i = 0; i < steps; i++) {
    playTone(baseFreq + i * 40, now + i * stepDur * 0.85, stepDur * 1.2, 0.06, 'sine');
  }
}

/** Bright completion ding when the flower blooms (distinct from wilt/retract). */
export function playBloomSound(completedCount: number, muted: boolean) {
  if (muted) return;
  const ctx = getContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const ding = 988 + Math.min(completedCount, 10) * 5;
  playBellStrike(ding, now, 0.09, 0.5);
  playBellStrike(ding * 2.02, now + 0.01, 0.028, 0.22);
  playBellStrike(ding * 1.498, now + 0.11, 0.055, 0.38);
}

/** Gentle arpeggio when a new task is added. */
export function playAddTaskSound(muted: boolean) {
  if (muted) return;
  const ctx = getContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [392, 494, 587];
  const noteDur = 0.09;
  const gap = 0.025;

  notes.forEach((freq, i) => {
    const start = now + i * (noteDur + gap);
    playTone(freq, start, noteDur * 1.15, 0.055, i === 0 ? 'triangle' : 'sine');
  });
}

export function playWiltSound(completedCount: number, muted: boolean) {
  if (muted) return;
  const ctx = getContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const base = 420 + completedCount * 10;
  playTone(base, now, 0.2, 0.06, 'triangle');
  playTone(base * 0.85, now + 0.12, 0.25, 0.05, 'sine');
}

export function playRetractSound(completedCount: number, durationMs: number, muted: boolean) {
  if (muted) return;
  const ctx = getContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const baseFreq = 380 + completedCount * 12;
  const steps = 3;
  const stepDur = durationMs / 1000 / steps;

  for (let i = 0; i < steps; i++) {
    playTone(baseFreq - i * 35, now + i * stepDur * 0.85, stepDur * 1.1, 0.05, 'sine');
  }
}

/** Cheerful short tune for completing the picked task. Returns duration in ms. */
/** Short upward chime when a task settles to the bottom of the list. */
export function playTaskDropSound(muted: boolean) {
  if (muted) return;
  const ctx = getContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  playBellStrike(587, now, 0.065, 0.28);
  playBellStrike(740, now + 0.07, 0.042, 0.22);
}

export function playCelebrationTune(muted: boolean): number {
  if (muted) return 0;
  const ctx = getContext();
  if (!ctx) return 0;

  const now = ctx.currentTime;
  const notes = [523, 659, 784, 988, 784, 988, 1175];
  const noteDur = 0.14;
  const gap = 0.02;

  notes.forEach((freq, i) => {
    const start = now + i * (noteDur + gap);
    playTone(freq, start, noteDur * 1.1, 0.07, i % 2 === 0 ? 'triangle' : 'sine');
  });

  return Math.round((notes.length * (noteDur + gap) + 0.1) * 1000);
}
