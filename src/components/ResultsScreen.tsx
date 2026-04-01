import type { SessionResult } from '../types'

interface Props {
  result: SessionResult
  sessionCount: number
  onRetry: () => void
  onNewText: () => void
  onAiPractice: () => void
  apiKeySet: boolean
}

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function ResultsScreen({ result, sessionCount, onRetry, onNewText, onAiPractice, apiKeySet }: Props) {
  const sorted = [...result.fingerStats].sort((a, b) => {
    const ra = a.correct + a.wrong > 0 ? a.correct / (a.correct + a.wrong) : 1
    const rb = b.correct + b.wrong > 0 ? b.correct / (b.correct + b.wrong) : 1
    return ra - rb
  })

  // Top 5 wrong keys
  const keyErrors: Record<string, number> = {}
  for (const r of result.keyResults) {
    if (!r.correct) keyErrors[r.expected] = (keyErrors[r.expected] ?? 0) + 1
  }
  const topErrors = Object.entries(keyErrors)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const aiUnlocked = sessionCount >= 5

  return (
    <div className="flex flex-col gap-6">
      {/* Score cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'WPM', value: String(result.wpm), sub: '字/分钟' },
          { label: '正确率', value: `${result.accuracy}%`, sub: `${result.correctKeys}/${result.totalKeys} 键` },
          { label: '用时', value: formatTime(result.duration), sub: '' },
        ].map(item => (
          <div key={item.label} className="bg-gray-800 rounded-xl p-4 text-center">
            <div className="text-4xl font-bold text-white font-mono">{item.value}</div>
            <div className="text-sm text-gray-400 mt-1">{item.label}</div>
            {item.sub && <div className="text-xs text-gray-600">{item.sub}</div>}
          </div>
        ))}
      </div>

      {/* Finger stats */}
      <div className="bg-gray-800 rounded-xl p-4">
        <h3 className="text-sm text-gray-400 mb-4 uppercase tracking-wider">指法正确率</h3>
        <div className="flex items-end gap-2 h-24">
          {result.fingerStats.map(fs => {
            const total = fs.correct + fs.wrong
            const rate = total > 0 ? fs.correct / total : 1
            const height = Math.max(4, Math.round(rate * 80))
            return (
              <div key={fs.finger} className="flex flex-col items-center gap-1 flex-1">
                <span className="text-[9px] text-gray-500">{Math.round(rate * 100)}%</span>
                <div
                  className="w-full rounded-t transition-all duration-500"
                  style={{
                    height,
                    backgroundColor: total === 0 ? '#374151' : fs.color,
                    opacity: total === 0 ? 0.3 : 0.85,
                  }}
                />
                <span className="text-[8px] text-gray-600 text-center leading-tight"
                  title={fs.name}
                >
                  {fs.name.replace('手', '').replace('指', '')}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Top error keys */}
      {topErrors.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-4">
          <h3 className="text-sm text-gray-400 mb-3 uppercase tracking-wider">错误最多的键</h3>
          <div className="flex gap-3 flex-wrap">
            {topErrors.map(([key, count]) => (
              <div key={key} className="flex items-center gap-2 bg-gray-700 rounded-lg px-3 py-1.5">
                <span className="font-mono text-red-400 font-bold">
                  {key === ' ' ? 'Space' : key.toUpperCase()}
                </span>
                <span className="text-gray-400 text-sm">{count} 次错误</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 justify-center flex-wrap">
        <button
          onClick={onRetry}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
        >
          重新练习
        </button>
        <button
          onClick={onNewText}
          className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
        >
          换一段文本
        </button>
        {aiUnlocked ? (
          <button
            onClick={onAiPractice}
            disabled={!apiKeySet}
            className={[
              'px-5 py-2.5 rounded-lg font-medium transition-colors',
              apiKeySet
                ? 'bg-purple-600 hover:bg-purple-500 text-white'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed',
            ].join(' ')}
            title={!apiKeySet ? '请先在设置中填入 Claude API Key' : ''}
          >
            AI 强化练习
          </button>
        ) : (
          <div className="px-5 py-2.5 bg-gray-800 text-gray-500 rounded-lg text-sm flex items-center">
            再练 {5 - sessionCount} 次解锁 AI 强化
          </div>
        )}
      </div>

      {/* Weakest finger hint */}
      {sorted[0] && (sorted[0].correct + sorted[0].wrong) > 0 && (sorted[0].correct / (sorted[0].correct + sorted[0].wrong)) < 0.85 && (
        <div
          className="text-center text-sm px-4 py-2 rounded-lg"
          style={{ backgroundColor: sorted[0].color + '22', color: sorted[0].color }}
        >
          薄弱点：{sorted[0].name}（正确率 {Math.round(sorted[0].correct / (sorted[0].correct + sorted[0].wrong) * 100)}%）
        </div>
      )}
    </div>
  )
}
