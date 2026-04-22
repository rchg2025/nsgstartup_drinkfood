"use client";

// Helper to create a shared AudioContext (reuse to avoid iOS limit)
let _ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!_ctx || _ctx.state === "closed") {
      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctor) return null;
      _ctx = new Ctor();
    }
    if (_ctx.state === "suspended") _ctx.resume();
    return _ctx;
  } catch {
    return null;
  }
}

function playNote(
  ctx: AudioContext,
  type: OscillatorType,
  freq: number,
  startTime: number,
  duration: number,
  volume = 0.5
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);

  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.start(startTime);
  osc.stop(startTime + duration);
}

/**
 * 🔔 New Order Alert — played when a new PENDING order arrives
 * Energetic 4-note ascending ding
 */
export const playNewOrder = () => {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  // Four ascending chime notes
  playNote(ctx, "sine", 659.25, t + 0.0, 0.45, 0.55);  // E5
  playNote(ctx, "sine", 783.99, t + 0.18, 0.45, 0.55); // G5
  playNote(ctx, "sine", 987.77, t + 0.36, 0.50, 0.55); // B5
  playNote(ctx, "sine", 1318.5, t + 0.54, 0.70, 0.60); // E6 — loud finish
  // Add a slight harmonic layer
  playNote(ctx, "triangle", 659.25, t + 0.0, 0.8, 0.20);
  playNote(ctx, "triangle", 1318.5, t + 0.54, 0.8, 0.20);
};

/**
 * 🔄 Status Change Alert — played when an order changes to PREPARING/READY/COMPLETED
 * Double-ding clear notification
 */
export const playStatusChange = () => {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  // Two soft chimes with a pause
  playNote(ctx, "sine", 880, t + 0.0, 0.5, 0.5);     // A5
  playNote(ctx, "triangle", 880, t + 0.0, 0.5, 0.15);
  playNote(ctx, "sine", 1108.73, t + 0.28, 0.5, 0.5); // C#6
  playNote(ctx, "triangle", 1108.73, t + 0.28, 0.5, 0.15);
  // Echo repeat slightly quieter  
  playNote(ctx, "sine", 880, t + 0.70, 0.5, 0.35);
  playNote(ctx, "sine", 1108.73, t + 0.98, 0.5, 0.35);
};

/**
 * ✅ Order Ready / Completed — played when order is READY or COMPLETED
 * Pleasant ascending success fanfare
 */
export const playSuccess = () => {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  playNote(ctx, "triangle", 523.25, t,        0.25, 0.4); // C5
  playNote(ctx, "triangle", 659.25, t + 0.18, 0.25, 0.4); // E5
  playNote(ctx, "triangle", 783.99, t + 0.36, 0.25, 0.4); // G5
  playNote(ctx, "triangle", 1046.5, t + 0.54, 0.70, 0.5); // C6
  playNote(ctx, "sine",     1046.5, t + 0.54, 0.70, 0.2);
};

/** @deprecated use playNewOrder or playStatusChange */
export const playTingTing = playNewOrder;
