import { useEffect, useRef, useState } from 'react'
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
  onUpdate: (id: string, patch: { name?: string; color?: string; avatar?: string }) => Promise<boolean>
  onLoad: () => void
}

interface AvatarCircleProps {
  name: string
  color: string
  avatar?: string
  size?: number
  fontSize?: number
}
function AvatarCircle({ name, color, avatar, size = 64, fontSize = 24 }: AvatarCircleProps) {
  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: `3px solid ${color}` }}
      />
    )
  }
  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%',
        backgroundColor: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize, fontWeight: 700, color: '#fff',
      }}
    >
      {name.slice(0, 1).toUpperCase()}
    </div>
  )
}

export function ProfileSelector({ users, loading, error, onSelect, onCreate, onUpdate, onLoad }: Props) {
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list')
  const [editTarget, setEditTarget] = useState<UserSummary | null>(null)

  // form state shared by create + edit
  const [name, setName] = useState('')
  const [color, setColor] = useState(PALETTE[0])
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>()
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { onLoad() }, [])

  const openCreate = () => {
    setName(''); setColor(PALETTE[0]); setAvatarPreview(undefined)
    setMode('create')
  }

  const openEdit = (u: UserSummary, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditTarget(u)
    setName(u.name); setColor(u.color); setAvatarPreview(u.avatar)
    setMode('edit')
  }

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setAvatarPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleCreate = () => {
    if (!name.trim()) return
    onCreate(name.trim(), color)
    setMode('list')
  }

  const handleEdit = async () => {
    if (!editTarget || !name.trim()) return
    await onUpdate(editTarget.id, { name: name.trim(), color, avatar: avatarPreview })
    setMode('list')
  }

  const removeAvatar = () => setAvatarPreview(undefined)

  const isFormMode = mode === 'create' || mode === 'edit'

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

      {loading && <div className="text-gray-500 animate-pulse">加载中...</div>}

      {!loading && mode === 'list' && (
        <div className="flex flex-wrap justify-center gap-4 max-w-2xl">
          {users.map(u => (
            <div key={u.id} className="relative group">
              <button
                onClick={() => onSelect(u.id)}
                className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-gray-800 hover:bg-gray-700 transition-colors w-36"
              >
                <div className="group-hover:scale-105 transition-transform">
                  <AvatarCircle name={u.name} color={u.color} avatar={u.avatar} />
                </div>
                <div className="text-center">
                  <div className="text-white font-medium text-sm">{u.name}</div>
                  <div className="text-gray-400 text-xs mt-0.5">{u.sessionCount} 次练习</div>
                  {u.lastWpm !== null && (
                    <div className="text-indigo-400 text-xs">最近 {u.lastWpm} WPM</div>
                  )}
                </div>
              </button>
              {/* Edit button — visible on hover */}
              <button
                onClick={e => openEdit(u, e)}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gray-600 hover:bg-gray-400 flex items-center justify-center text-xs text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
                title="编辑账号"
              >
                ✎
              </button>
            </div>
          ))}

          <button
            onClick={openCreate}
            className="flex flex-col items-center justify-center gap-3 p-5 rounded-2xl bg-gray-800/50 hover:bg-gray-700/50 border-2 border-dashed border-gray-600 hover:border-gray-400 transition-colors w-36 text-gray-400 hover:text-gray-200"
          >
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-current flex items-center justify-center text-3xl">
              +
            </div>
            <span className="text-sm">新建账号</span>
          </button>
        </div>
      )}

      {isFormMode && (
        <div className="bg-gray-800 rounded-2xl p-6 w-80 flex flex-col gap-4">
          <h3 className="text-white font-semibold text-center">
            {mode === 'create' ? '创建账号' : '编辑账号'}
          </h3>

          {/* Avatar preview + upload */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <AvatarCircle name={name || '?'} color={color} avatar={avatarPreview} size={72} fontSize={28} />
              {avatarPreview && (
                <button
                  onClick={removeAvatar}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center hover:bg-red-500"
                  title="移除头像图片"
                >
                  ×
                </button>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              上传头像图片
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarFile}
            />
          </div>

          <input
            autoFocus
            type="text"
            placeholder="输入名字"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (mode === 'create' ? handleCreate() : handleEdit())}
            className="bg-gray-700 text-white rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500"
          />

          <div>
            <p className="text-gray-400 text-xs mb-2">头像颜色</p>
            <div className="flex flex-wrap gap-2">
              {PALETTE.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-8 h-8 rounded-full transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    outline: color === c ? '3px solid white' : 'none',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setMode('list')}
              className="flex-1 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors text-sm"
            >
              取消
            </button>
            <button
              onClick={mode === 'create' ? handleCreate : handleEdit}
              disabled={!name.trim()}
              className="flex-1 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {mode === 'create' ? '创建' : '保存'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
