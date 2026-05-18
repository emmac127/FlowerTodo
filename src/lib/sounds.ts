import { COMPLETED_MOVE_DELAY_MS } from './sortTasks';

let audioCtx: AudioContext | null = null;

type AudioContextCtor = typeof AudioContext;

function getAudioContextClass(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & { webkitAudioContext?: AudioContextCtor };
  return window.AudioContext ?? w.webkitAudioContext ?? null;
}

function playSilentBuffer(ctx: AudioContext) {
  const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start(0);
}

/**
 * Must run inside a user gesture (click/tap). Resumes the context and plays a
 * silent buffer so iOS/Safari allow tones scheduled in the same turn (and later).
 */
export async function unlockAudio(): Promise<AudioContext | null> {
  const Ctx = getAudioContextClass();
  if (!Ctx) return null;

  if (!audioCtx) {
    audioCtx = new Ctx();
  }

  if (audioCtx.state === 'suspended') {
    try {
      await audioCtx.resume();
    } catch {
      return null;
    }
  }

  playSilentBuffer(audioCtx);

  if (audioCtx.state === 'suspended') {
    try {
      await audioCtx.resume();
    } catch {
      return null;
    }
  }

  return audioCtx.state === 'running' ? audioCtx : null;
}

/** @deprecated Prefer `await unlockAudio()` in gesture handlers. */
export function unlockAudioSync(): AudioContext | null {
  void unlockAudio();
  return audioCtx;
}

async function getContext(): Promise<AudioContext | null> {
  if (!audioCtx) return unlockAudio();
  if (audioCtx.state === 'suspended') {
    try {
      await audioCtx.resume();
    } catch {
      return null;
    }
  }
  return audioCtx.state === 'running' ? audioCtx : null;
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  volume: number,
  type: OscillatorType = 'sine',
) {
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

function playBellStrike(
  ctx: AudioContext,
  frequency: number,
  startTime: number,
  volume: number,
  decay = 0.55,
) {
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

function scheduleGrowAt(
  ctx: AudioContext,
  completedCount: number,
  durationMs: number,
  startTime: number,
) {
  const baseFreq = 320 + completedCount * 18;
  const steps = 4;
  const stepDur = durationMs / 1000 / steps;

  for (let i = 0; i < steps; i++) {
    playTone(
      ctx,
      baseFreq + i * 40,
      startTime + i * stepDur * 0.85,
      stepDur * 1.2,
      0.06,
      'sine',
    );
  }
}

function scheduleBloomAt(ctx: AudioContext, completedCount: number, startTime: number) {
  const ding = 988 + Math.min(completedCount, 10) * 5;
  playBellStrike(ctx, ding, startTime, 0.09, 0.5);
  playBellStrike(ctx, ding * 2.02, startTime + 0.01, 0.028, 0.22);
  playBellStrike(ctx, ding * 1.498, startTime + 0.11, 0.055, 0.38);
}

function scheduleTaskDropAt(ctx: AudioContext, startTime: number) {
  playBellStrike(ctx, 587, startTime, 0.065, 0.28);
  playBellStrike(ctx, 740, startTime + 0.07, 0.042, 0.22);
}

function scheduleWiltAt(ctx: AudioContext, completedCount: number, startTime: number) {
  const base = 420 + completedCount * 10;
  playTone(ctx, base, startTime, 0.2, 0.06, 'triangle');
  playTone(ctx, base * 0.85, startTime + 0.12, 0.25, 0.05, 'sine');
}

function scheduleRetractAt(
  ctx: AudioContext,
  completedCount: number,
  durationMs: number,
  startTime: number,
) {
  const baseFreq = 380 + completedCount * 12;
  const steps = 3;
  const stepDur = durationMs / 1000 / steps;

  for (let i = 0; i < steps; i++) {
    playTone(
      ctx,
      baseFreq - i * 35,
      startTime + i * stepDur * 0.85,
      stepDur * 1.1,
      0.05,
      'sine',
    );
  }
}

/** Petal bloom settle — keep in sync with TaskRow.getFlowerBloomSettleMs. */
export function getFlowerBloomSettleMs(petalCount: number): number {
  const PETAL_BLOOM_MS = 350;
  const PETAL_BLOOM_STAGGER_MS = 40;
  return PETAL_BLOOM_MS + (petalCount - 1) * PETAL_BLOOM_STAGGER_MS;
}

/**
 * Schedule grow, bloom, and list-drop sounds during the completing tap so iOS
 * allows them even though animations finish later.
 */
export function scheduleCompletionSounds(
  ctx: AudioContext,
  completionIndex: number,
  growDurationMs: number,
  petalCount: number,
) {
  const now = ctx.currentTime;
  const growSec = growDurationMs / 1000;
  const bloomSettleSec = getFlowerBloomSettleMs(petalCount) / 1000;
  const moveDelaySec = COMPLETED_MOVE_DELAY_MS / 1000;

  scheduleGrowAt(ctx, completionIndex, growDurationMs, now);
  scheduleBloomAt(ctx, completionIndex, now + growSec);
  scheduleTaskDropAt(ctx, now + growSec + bloomSettleSec + moveDelaySec);
}

/** Schedule wilt + stem retract during the uncheck tap (iOS-safe). */
export function scheduleUncompleteSounds(
  ctx: AudioContext,
  completionIndex: number,
  retractDurationMs: number,
  wiltDurationMs: number,
) {
  const now = ctx.currentTime;
  const wiltSec = wiltDurationMs / 1000;
  scheduleWiltAt(ctx, completionIndex, now);
  scheduleRetractAt(ctx, completionIndex, retractDurationMs, now + wiltSec);
}

export async function playGrowSound(
  completedCount: number,
  durationMs: number,
  muted: boolean,
) {
  if (muted) return;
  const ctx = await getContext();
  if (!ctx) return;
  scheduleGrowAt(ctx, completedCount, durationMs, ctx.currentTime);
}

export async function playBloomSound(completedCount: number, muted: boolean) {
  if (muted) return;
  const ctx = await getContext();
  if (!ctx) return;
  scheduleBloomAt(ctx, completedCount, ctx.currentTime);
}

export async function playAddTaskSound(muted: boolean) {
  if (muted) return;
  const ctx = await getContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [392, 494, 587];
  const noteDur = 0.09;
  const gap = 0.025;

  notes.forEach((freq, i) => {
    const start = now + i * (noteDur + gap);
    playTone(ctx, freq, start, noteDur * 1.15, 0.055, i === 0 ? 'triangle' : 'sine');
  });
}

export async function playWiltSound(completedCount: number, muted: boolean) {
  if (muted) return;
  const ctx = await getContext();
  if (!ctx) return;
  scheduleWiltAt(ctx, completedCount, ctx.currentTime);
}

export async function playRetractSound(
  completedCount: number,
  durationMs: number,
  muted: boolean,
) {
  if (muted) return;
  const ctx = await getContext();
  if (!ctx) return;
  scheduleRetractAt(ctx, completedCount, durationMs, ctx.currentTime);
}

export async function playTaskDropSound(muted: boolean) {
  if (muted) return;
  const ctx = await getContext();
  if (!ctx) return;
  scheduleTaskDropAt(ctx, ctx.currentTime);
}

export async function playCelebrationTune(muted: boolean): Promise<number> {
  if (muted) return 0;
  const ctx = await getContext();
  if (!ctx) return 0;

  const now = ctx.currentTime;
  const notes = [523, 659, 784, 988, 784, 988, 1175];
  const noteDur = 0.14;
  const gap = 0.02;

  notes.forEach((freq, i) => {
    const start = now + i * (noteDur + gap);
    playTone(ctx, freq, start, noteDur * 1.1, 0.07, i % 2 === 0 ? 'triangle' : 'sine');
  });

  return Math.round((notes.length * (noteDur + gap) + 0.1) * 1000);
}
