// Background music player — plays /public/bgm.mp3 (Stranger Things theme)
// Exposes the same API as before so MusicControl and App.tsx need no changes.

class BgMusicEngine {
  private audio: HTMLAudioElement | null = null
  private volume = 0.4
  private started = false

  private getAudio(): HTMLAudioElement {
    if (!this.audio) {
      this.audio = new Audio('/bgm.mp3')
      this.audio.loop = true
      this.audio.volume = this.volume
    }
    return this.audio
  }

  start(_newState: 'ready' | 'typing' = 'typing'): void {
    const a = this.getAudio()
    if (!this.started) {
      this.started = true
      a.currentTime = 0
    }
    a.play().catch(() => {})
  }

  setState(_newState: 'ready' | 'typing'): void {
    // No-op: MP3 plays continuously regardless of state
  }

  stop(): void {
    const a = this.getAudio()
    // Fade out over 0.8s then pause
    const steps = 16
    const interval = 800 / steps
    let step = 0
    const startVol = a.volume
    const timer = setInterval(() => {
      step++
      a.volume = Math.max(0, startVol * (1 - step / steps))
      if (step >= steps) {
        clearInterval(timer)
        a.pause()
        a.volume = this.volume  // restore for next play
      }
    }, interval)
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v))
    if (this.audio) this.audio.volume = this.volume
  }

  getVolume(): number {
    return this.volume
  }
}

export const bgMusic = new BgMusicEngine()
