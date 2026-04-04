import { useEffect, useState } from 'react'
import type { UserSummary } from '../types'

const PALETTE = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#06b6d4',
]

interface Props {
  users: UserSummary[]
  loading: boolean
  error: string | null
  onSelect: (id: string) => void
  onCreate: (name: string, color: string) => void
  onLoad: () => void
}

export function ProfileSelector({ users, loading, error, onSelect, onCreate, onLoad }: Props) {
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState(PALETTE[0])

  useEffect(() => {
    onLoad()
  }, [])

  const handleCreate = () => {
    if (!name.trim()) return
    onCreate(name.trim(), color)
    setName('')
    setCreating(false)
  }

  return (
    <div className="flex flex-col items-center gap-8 py-12">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">盲打练习</h1>
        <p className="text-gray-400">选择你的账号开始练习</p>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-700 rounded-lg px-4 py-3 text-red-300 text-sm max-w-sm text-center">
          无法连接后端服务（{error}）
          <br />
          <span className="text-red-400 text-xs">请先运行 start.command 或 node server.js</span>
        </div>
      )}

      {loading && (
        <div className="text-gray-500 animate-pulse">加载中...</div>
      )}

      {!loading && (
        <div className="flex flex-wrap justify-center gap-4 max-w-2xl">
          {users.map(u => (
            <button
              key={u.id}
              onClick={() => onSelect(u.id)}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-gray-800 hover:bg-gray-700 transition-colors w-36 group"
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg group-hover:scale-105 transition-transform"
                style={{ backgroundColor: u.color }}
              >
                {u.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="text-center">
                <div className="text-white font-medium text-sm">{u.name}</div>
                <div className="text-gray-400 text-xs mt-0.5">
                  {u.sessionCount} 次练习
                </div>
                {u.lastWpm !== null && (
                  <div className="text-indigo-400 text-xs">
                    最近 {u.lastWpm} WPM
                  </div>
                )}
              </div>
            </button>
          ))}

          {!creating && (
            <button
              onClick={() => setCreating(true)}
              className="flex flex-col items-center justify-center gap-3 p-5 rounded-2xl bg-gray-800/50 hover:bg-gray-700/50 border-2 border-dashed border-gray-600 hover:border-gray-400 transition-colors w-36 text-gray-400 hover:text-gray-200"
            >
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-current flex items-center justify-center text-3xl">
                +
              </div>
              <span className="text-sm">新建账号</span>
            </button>
          )}
        </div>
      )}

      {creating && (
        <div className="bg-gray-800 rounded-2xl p-6 w-80 flex flex-col gap-4">
          <h3 className="text-white font-semibold text-center">创建账号</h3>

          <input
            autoFocus
            type="text"
            placeholder="输入名字"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            className="bg-gray-700 text-white rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500"
          />

          <div>
            <p className="text-gray-400 text-xs mb-2">选择头像颜色</p>
            <div className="flex flex-wrap gap-2">
              {PALETTE.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-8 h-8 rounded-full transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    outline: color === c ? `3px solid white` : 'none',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setCreating(false)}
              className="flex-1 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors text-sm"
            >
              取消
            </button>
            <button
              onClick={handleCreate}
              disabled={!name.trim()}
              className="flex-1 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              创建
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
