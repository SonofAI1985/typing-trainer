import { useState } from 'react'
import { bgMusic } from '../utils/bgMusic'

export function MusicControl() {
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(bgMusic.getVolume())

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    bgMusic.setVolume(next ? 0 : volume)
  }

  const handleVolume = (v: number) => {
    setVolume(v)
    if (!muted) bgMusic.setVolume(v)
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggleMute}
        className="text-gray-400 hover:text-gray-200 transition-colors text-lg leading-none"
        title={muted ? '取消静音' : '静音'}
      >
        {muted ? '🔇' : '🎵'}
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={muted ? 0 : volume}
        onChange={e => handleVolume(Number(e.target.value))}
        className="w-20 accent-indigo-500"
        title="音乐音量"
      />
    </div>
  )
}
