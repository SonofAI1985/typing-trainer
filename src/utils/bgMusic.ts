// Procedural space-electronic background music via Web Audio API
// Daft Punk inspired: 4/4 time, BPM 128, kick/snare/hihat + bass + pad

type BgState = 'idle' | 'ready' | 'typing'

class BgMusicEngine {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private state: BgState = 'idle'
  private schedulerTimer: ReturnType<typeof setTimeout> | null = null
  private nextBeatTime = 0
  private currentBeat = 0
  private volume = 0.5

  // quarter note = 60/128 s (BPM 128)
  private readonly BEAT = 60 / 128
  private readonly LOOK_AHEAD = 0.1  // seconds to schedule ahead

  private getCtx(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new AudioContext()
      this.masterGain = this.ctx.createGain()
      this.masterGain.connect(this.ctx.destination)
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime)
    }
    return this.ctx
  }

  private get master(): GainNode {
    this.getCtx()
    return this.masterGain!
  }

  // ─── Drum synthesis ───────────────────────────────────────────────────────

  private scheduleKick(t: number): void {
    const c = this.getCtx()
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.connect(gain); gain.connect(this.master)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(150, t)
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.15)
    gain.gain.setValueAtTime(1.0, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
    osc.start(t); osc.stop(t + 0.3)
  }

  private scheduleSnare(t: number): void {
    const c = this.getCtx()
    // Noise component
    const bufLen = c.sampleRate * 0.12
    const buf = c.createBuffer(1, bufLen, c.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1

    const noise = c.createBufferSource()
    noise.buffer = buf
    const bpf = c.createBiquadFilter()
    bpf.type = 'bandpass'
    bpf.frequency.value = 1500
    bpf.Q.value = 0.7
    const gain = c.createGain()
    gain.gain.setValueAtTime(0.4, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
    noise.connect(bpf); bpf.connect(gain); gain.connect(this.master)
    noise.start(t); noise.stop(t + 0.12)

    // Tone component
    const osc = c.createOscillator()
    const tGain = c.createGain()
    osc.type = 'triangle'
    osc.frequency.value = 200
    tGain.gain.setValueAtTime(0.2, t)
    tGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06)
    osc.connect(tGain); tGain.connect(this.master)
    osc.start(t); osc.stop(t + 0.06)
  }

  private scheduleHihat(t: number, open = false): void {
    const c = this.getCtx()
    const bufLen = c.sampleRate * (open ? 0.15 : 0.04)
    const buf = c.createBuffer(1, bufLen, c.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1

    const src = c.createBufferSource()
    src.buffer = buf
    const hpf = c.createBiquadFilter()
    hpf.type = 'highpass'
    hpf.frequency.value = 7000
    const gain = c.createGain()
    gain.gain.setValueAtTime(0.15, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + bufLen / c.sampleRate)
    src.connect(hpf); hpf.connect(gain); gain.connect(this.master)
    src.start(t); src.stop(t + bufLen / c.sampleRate)
  }

  // ─── Bass synth ───────────────────────────────────────────────────────────
  // 4-bar loop: C2 C2 G1 Bb1 (space-funk bassline)
  private readonly BASS_PATTERN = [65.41, 65.41, 49.00, 58.27]  // C2 C2 G1 Bb1

  private scheduleBass(t: number, barIndex: number): void {
    const c = this.getCtx()
    const freq = this.BASS_PATTERN[barIndex % this.BASS_PATTERN.length]
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(freq, t)
    const lpf = c.createBiquadFilter()
    lpf.type = 'lowpass'
    lpf.frequency.value = 400
    osc.connect(lpf); lpf.connect(gain); gain.connect(this.master)
    gain.gain.setValueAtTime(0.25, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + this.BEAT * 3.8)
    osc.start(t); osc.stop(t + this.BEAT * 4)
  }

  // ─── Pad (space atmosphere) ────────────────────────────────────────────────
  // Cm → Ab → Bb → Fm chord cycle
  private readonly PAD_CHORDS = [
    [130.81, 155.56, 196.00],  // Cm  (C3 Eb3 G3)
    [103.83, 130.81, 155.56],  // Ab  (Ab2 C3 Eb3)
    [116.54, 146.83, 174.61],  // Bb  (Bb2 D3 F3)
    [87.31,  130.81, 155.56],  // Fm  (F2 C3 Eb3)
  ]

  private schedulePad(t: number, chordIndex: number, gain = 0.06): void {
    const c = this.getCtx()
    const chord = this.PAD_CHORDS[chordIndex % this.PAD_CHORDS.length]
    for (const freq of chord) {
      const osc = c.createOscillator()
      const g = c.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(freq, t)
      g.gain.setValueAtTime(gain, t)
      g.gain.linearRampToValueAtTime(gain * 0.8, t + this.BEAT * 8)
      osc.connect(g); g.connect(this.master)
      osc.start(t); osc.stop(t + this.BEAT * 8)
    }
  }

  // ─── Scheduler ────────────────────────────────────────────────────────────

  private schedule(): void {
    if (!this.ctx || this.state === 'idle') return
    const c = this.ctx
    const lookAhead = this.nextBeatTime - c.currentTime

    while (this.nextBeatTime < c.currentTime + this.LOOK_AHEAD) {
      const t = this.nextBeatTime
      const beat = this.currentBeat  // 0..63 (8th-note steps)
      const quarterBeat = Math.floor(beat / 2)  // 0..3 quarter notes

      if (this.state === 'typing') {
        // Kick on beats 1 & 3 (quarter 0, 2)
        if (quarterBeat === 0 || quarterBeat === 2) {
          if (beat % 2 === 0) this.scheduleKick(t)
        }
        // Snare on beats 2 & 4 (quarter 1, 3)
        if (quarterBeat === 1 || quarterBeat === 3) {
          if (beat % 2 === 0) this.scheduleSnare(t)
        }
        // Hi-hat every 8th note
        this.scheduleHihat(t, beat % 4 === 2)  // slightly open on & of beat 2

        // Bass on beat 1 of each bar
        if (beat === 0) {
          const barNum = Math.floor(this.currentBeat / 8)
          this.scheduleBass(t, barNum)
        }
      }

      // Pad every 2 bars (16 8th notes)
      if (beat === 0 && (this.state === 'ready' || this.state === 'typing')) {
        const chordIndex = Math.floor(this.currentBeat / 16) % 4
        const padGain = this.state === 'ready' ? 0.04 : 0.06
        this.schedulePad(t, chordIndex, padGain)
      }

      this.nextBeatTime += this.BEAT / 2  // 8th note steps
      this.currentBeat = (this.currentBeat + 1) % 64  // 8 bars × 8 = 64 steps
    }

    void lookAhead  // silence unused-var warning
    this.schedulerTimer = setTimeout(() => this.schedule(), 25)
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  start(newState: 'ready' | 'typing' = 'typing'): void {
    const c = this.getCtx()
    if (c.state === 'suspended') c.resume().catch(() => {})

    if (this.state === 'idle') {
      this.nextBeatTime = c.currentTime + 0.05
      this.currentBeat = 0
    }
    this.state = newState
    if (!this.schedulerTimer) this.schedule()
  }

  setState(newState: 'ready' | 'typing'): void {
    this.state = newState
  }

  stop(): void {
    this.state = 'idle'
    if (this.schedulerTimer) {
      clearTimeout(this.schedulerTimer)
      this.schedulerTimer = null
    }
    // Fade out master gain
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime
      this.masterGain.gain.cancelScheduledValues(now)
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now)
      this.masterGain.gain.linearRampToValueAtTime(0, now + 0.8)
    }
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v))
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime)
    }
  }

  getVolume(): number {
    return this.volume
  }
}

export const bgMusic = new BgMusicEngine()
