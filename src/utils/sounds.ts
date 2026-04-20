// Web Audio API — Mario Bros retro sounds with escalating streak system

let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx || ctx.state === 'closed') ctx = new AudioContext()
  return ctx
}

// Resume the context whenever it isn't running (suspended or interrupted).
function tryResume(): void {
  if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {})
}

if (typeof window !== 'undefined') {
  // Capture-phase: pre-warm resume before React handlers fire on user gestures
  window.addEventListener('click',      tryResume, true)
  window.addEventListener('keydown',    tryResume, true)
  window.addEventListener('touchstart', tryResume, { capture: true, passive: true })
  // Proactive resume when tab regains focus — prevents "sounds gone after switching tabs"
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') tryResume()
  })
}

export function unlockAudio(): void {
  let c: AudioContext
  try {
    c = getCtx()
  } catch (_) {
    return  // AudioContext unavailable (e.g. browser restriction); skip silently
  }
  // iOS Safari: must start a real BufferSource synchronously inside the gesture
  try {
    const buf = c.createBuffer(1, 1, c.sampleRate)
    const src = c.createBufferSource()
    src.buffer = buf
    src.connect(c.destination)
    src.start(0)
  } catch (_) {}
  c.resume().catch(() => {})
}

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = 'square',
  gainVal = 0.25,
  startTime = 0,
  freqEnd?: number,
): void {
  try {
    const c = getCtx()
    if (c.state !== 'running') c.resume().catch(() => {})
    const t = c.currentTime + 0.005 + startTime
    const osc  = c.createOscillator()
    const gain = c.createGain()
    osc.connect(gain)
    gain.connect(c.destination)
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    if (freqEnd !== undefined) {
      osc.frequency.linearRampToValueAtTime(freqEnd, t + duration * 0.8)
    }
    gain.gain.setValueAtTime(gainVal, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration)
    osc.start(t)
    osc.stop(t + duration)
  } catch (_) {}
}

// SMB coin pickup: quick two-note blip (B5 → E6)
export function playCorrect(): void {
  playTone(988,  0.04, 'square', 0.25)
  playTone(1319, 0.09, 'square', 0.22, 0.04)
}

// SMB bump / wall-hit: descending noise
export function playWrong(): void {
  playTone(230, 0.12, 'square', 0.30, 0, 90)
}

// SMB stage-clear fanfare
export function playComplete(): void {
  const seq: [number, number][] = [
    [523, 0.10], [659, 0.10], [784, 0.10],
    [1047, 0.10], [784, 0.08], [1047, 0.40],
  ]
  let t = 0
  for (const [f, d] of seq) {
    playTone(f, d, 'square', 0.22, t)
    t += d + 0.01
  }
}

// SMB power-up: quick ascending arpeggio
export function playStart(): void {
  const notes = [330, 415, 523, 622, 784, 1047]
  let t = 0
  for (const f of notes) {
    playTone(f, 0.06, 'square', 0.20, t)
    t += 0.07
  }
}

// ─── Escalating Streak System ──────────────────────────────────────────────
//
// level 1 (streak  5): SMB 1-Up, 6 notes, normal speed
// level 2 (streak 10): 1-Up transposed up one semitone
// level 3 (streak 20): double-time 1-Up
// level 4 (streak 30): SMB star power sweep (fast scan up)
// level 5 (streak 50): star sweep + harmony layer
//
// streak breaks: dramatic descending crash

const ONE_UP = [494, 587, 740, 988, 1175, 1480]

function semitone(freq: number, steps: number) {
  return freq * Math.pow(2, steps / 12)
}

// Base 1-Up jingle (adjustable pitch and speed)
function playOneUp(pitchShift = 0, speed = 1.0, gainMult = 1.0): void {
  const notes = ONE_UP.map(f => semitone(f, pitchShift))
  let t = 0
  const step = 0.09 / speed
  for (let i = 0; i < notes.length; i++) {
    playTone(notes[i], 0.08, 'square', 0.20 * gainMult, t)
    t += step
  }
}

// Star power: fast ascending sweep (all 12 notes of a scale)
function playStarSweep(gainMult = 1.0): void {
  const base = 330
  let t = 0
  for (let i = 0; i < 12; i++) {
    const f = semitone(base, i * 2)
    playTone(f, 0.05, 'sawtooth', 0.18 * gainMult, t)
    t += 0.04
  }
}

// Harmony layer for level 5 (a fifth above)
function playHarmony(): void {
  const notes = ONE_UP.map(f => semitone(f, 7))
  let t = 0
  for (const freq of notes) {
    playTone(freq, 0.08, 'triangle', 0.12, t)
    t += 0.04
  }
}

export function playStreak(level: number): void {
  // level = Math.floor(streak / 5), so:
  //   streak  5 → level 1
  //   streak 10 → level 2
  //   streak 20 → level 4
  //   streak 30 → level 6
  //   streak 50 → level 10
  if (level <= 1)  return playOneUp(0, 1.0)
  if (level === 2) return playOneUp(1, 1.0)           // +1 semitone
  if (level <= 3)  return playOneUp(2, 1.6)           // +2 st, double-time
  if (level <= 5)  return playStarSweep(1.0)          // star power
  // level 6+ (streak 30+): star sweep + harmony
  playStarSweep(1.0)
  playHarmony()
}

// Streak break: dramatic falling crash
export function playStreakBreak(): void {
  playTone(440, 0.08, 'sawtooth', 0.30, 0)
  playTone(330, 0.08, 'sawtooth', 0.28, 0.08)
  playTone(220, 0.12, 'sawtooth', 0.25, 0.16, 80)
}
