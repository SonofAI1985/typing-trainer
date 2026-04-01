// Web Audio API — Mario Bros retro sounds

let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx || ctx.state === 'closed') ctx = new AudioContext()
  return ctx
}

// Capture-phase listener: pre-warm resume before React handlers fire
if (typeof window !== 'undefined') {
  const tryResume = () => {
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {})
  }
  window.addEventListener('click',      tryResume, true)
  window.addEventListener('keydown',    tryResume, true)
  window.addEventListener('touchstart', tryResume, { capture: true, passive: true })
}

export function unlockAudio(): void {
  const c = getCtx()
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
  const c = getCtx()
  // Always resume (no-op if already running), then schedule — avoids any
  // race between state-check and async resume completing.
  c.resume().then(() => {
    const t = c.currentTime + startTime
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
  }).catch(() => {})
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

// SMB 1-Up jingle: 6 ascending notes (B4 D5 F#5 B5 D6 F#6)
const ONE_UP = [494, 587, 740, 988, 1175, 1480]
export function playStreak(level: number): void {
  const count = Math.min(level + 2, ONE_UP.length)
  let t = 0
  for (let i = 0; i < count; i++) {
    playTone(ONE_UP[i], 0.08, 'square', 0.20, t)
    t += 0.09
  }
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
