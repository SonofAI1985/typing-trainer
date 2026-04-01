import { useState } from 'react'
import { TEXT_LIBRARY } from '../data/textLibrary'
import type { TextEntry } from '../data/textLibrary'
import type { PracticeMode } from '../types'

interface Props {
  onStart: (entry: TextEntry) => void
  onAiStart: () => void
  apiKey: string
  onSaveApiKey: (key: string) => void
  aiUnlocked: boolean
  sessionCount: number
  isGenerating: boolean
  generationError: string | null
}

export function PracticeSelector({
  onStart,
  onAiStart,
  apiKey,
  onSaveApiKey,
  aiUnlocked,
  sessionCount,
  isGenerating,
  generationError,
}: Props) {
  const [mode, setMode] = useState<PracticeMode>('chinese')
  const [apiKeyInput, setApiKeyInput] = useState(apiKey)
  const [showApiInput, setShowApiInput] = useState(false)

  const filtered = TEXT_LIBRARY.filter(t => t.mode === (mode === 'ai' ? 'chinese' : mode))

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-1">键盘练习</h1>
        <p className="text-gray-400 text-sm">SANWA 人体工学键盘指法训练</p>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2 bg-gray-800 p-1 rounded-xl">
        {[
          { id: 'chinese', label: '中文拼音' },
          { id: 'english', label: '英文' },
          { id: 'ai', label: `AI 强化${aiUnlocked ? '' : ` (还需 ${5 - sessionCount} 次)`}` },
        ].map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id as PracticeMode)}
            disabled={m.id === 'ai' && !aiUnlocked}
            className={[
              'flex-1 py-2 rounded-lg text-sm font-medium transition-colors',
              mode === m.id
                ? 'bg-blue-600 text-white'
                : m.id === 'ai' && !aiUnlocked
                ? 'text-gray-600 cursor-not-allowed'
                : 'text-gray-400 hover:text-white hover:bg-gray-700',
            ].join(' ')}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* AI mode */}
      {mode === 'ai' ? (
        <div className="flex flex-col gap-4">
          <div className="bg-gray-800 rounded-xl p-4 text-sm text-gray-300">
            <p>根据你的历史练习数据，AI 将生成针对你薄弱键位的练习文本。</p>
          </div>

          {/* API Key input */}
          <div className="bg-gray-800 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Claude API Key</span>
              <button
                onClick={() => setShowApiInput(v => !v)}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                {showApiInput ? '隐藏' : '编辑'}
              </button>
            </div>
            {showApiInput ? (
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={e => setApiKeyInput(e.target.value)}
                  placeholder="sk-ant-..."
                  className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => { onSaveApiKey(apiKeyInput); setShowApiInput(false) }}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm"
                >
                  保存
                </button>
              </div>
            ) : (
              <span className="text-xs text-gray-500">
                {apiKey ? `${apiKey.slice(0, 10)}...` : '未设置'}
              </span>
            )}
          </div>

          {generationError && (
            <div className="text-red-400 text-sm bg-red-900/20 rounded-lg px-4 py-2">
              {generationError}
            </div>
          )}

          <button
            onClick={onAiStart}
            disabled={!apiKey || isGenerating}
            className={[
              'py-3 rounded-xl font-semibold transition-colors',
              apiKey && !isGenerating
                ? 'bg-purple-600 hover:bg-purple-500 text-white'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed',
            ].join(' ')}
          >
            {isGenerating ? '生成中...' : '开始 AI 强化练习'}
          </button>
        </div>
      ) : (
        /* Text selection grid */
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {filtered.map(entry => (
            <button
              key={entry.id}
              onClick={() => onStart(entry)}
              className="bg-gray-800 hover:bg-gray-700 rounded-xl p-4 text-left transition-colors group"
            >
              <div className="text-sm font-medium text-white group-hover:text-blue-300 mb-2">
                {entry.title}
              </div>
              <div className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                {entry.content.slice(0, 20)}...
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
