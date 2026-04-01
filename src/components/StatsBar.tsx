interface Props {
  wpm: number
  accuracy: number
  currentFlatIndex: number
  totalKeys: number
  elapsed: number
  state: 'ready' | 'typing' | 'complete'
}

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-2xl font-bold text-white font-mono">{value}</span>
      <span className="text-xs text-gray-400 uppercase tracking-wider">{label}</span>
    </div>
  )
}

export function StatsBar({ wpm, accuracy, currentFlatIndex, totalKeys, elapsed, state }: Props) {
  const progress = totalKeys > 0 ? Math.round((currentFlatIndex / totalKeys) * 100) : 0

  return (
    <div className="flex items-center justify-around bg-gray-800 rounded-xl px-6 py-3">
      <Stat label="用时" value={state === 'ready' ? '0:00' : formatTime(elapsed)} />
      <div className="w-px h-8 bg-gray-600" />
      <Stat label="WPM" value={state === 'ready' ? '-' : String(wpm)} />
      <div className="w-px h-8 bg-gray-600" />
      <Stat label="正确率" value={state === 'ready' ? '-' : `${accuracy}%`} />
      <div className="w-px h-8 bg-gray-600" />
      <Stat label="进度" value={`${currentFlatIndex}/${totalKeys}`} />
      <div className="w-px h-8 bg-gray-600" />
      {/* Progress bar */}
      <div className="flex flex-col items-center gap-1 w-24">
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-gray-400">{progress}%</span>
      </div>
    </div>
  )
}
