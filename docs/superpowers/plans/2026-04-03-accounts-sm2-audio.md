# 多账号 + SM-2 + 音效升级 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为盲打练习软件添加多用户账号系统（本地文件存储）、SM-2 间隔重复算法、连击音效升级和太空背景音乐。

**Architecture:** Express 后端监听 3001 端口，负责读写 `data/users/<id>.json`；前端通过 `useProfile` hook 调用 API；SM-2 为纯函数；背景音乐全程通过 Web Audio API 程序生成，无音频文件依赖。

**Tech Stack:** React 19 + TypeScript + Vite 8 + Tailwind 4 + Express (新增) + Web Audio API

---

## 文件变更总览

| 操作 | 文件 | 说明 |
|------|------|------|
| 新建 | `src/utils/sm2.ts` | SM-2 纯函数算法 |
| 新建 | `server.js` | Express 本地后端 |
| 新建 | `start.command` | 双击启动脚本 |
| 新建 | `data/users/.gitkeep` | 数据目录占位 |
| 修改 | `src/types.ts` | 添加 UserProfile, KeyStat, SessionSummary |
| 新建 | `src/hooks/useProfile.ts` | 账号读写 hook |
| 新建 | `src/components/ProfileSelector.tsx` | 账号选择界面 |
| 修改 | `src/App.tsx` | 添加 profile screen，接入 useProfile，升级连击逻辑 |
| 修改 | `src/hooks/useAdaptiveLearning.ts` | 接入 SM-2 keyStats，优化弱键选取 |
| 修改 | `src/utils/sounds.ts` | 连击升级音效 + 崩塌音 |
| 新建 | `src/utils/bgMusic.ts` | 太空背景音乐生成器 |
| 修改 | `package.json` | 添加 express, cors 依赖 |

---

## Task 1: SM-2 纯函数算法

**Files:**
- Create: `src/utils/sm2.ts`

- [ ] **Step 1: 创建 sm2.ts**

```typescript
// src/utils/sm2.ts

export interface KeyStat {
  interval: number       // 下次复习间隔（天），初始 1
  repetitions: number    // 连续答对次数，初始 0
  ef: number             // 难度因子，初始 2.5，最低 1.3
  nextReview: string     // ISO 日期字符串
  totalCorrect: number
  totalWrong: number
}

export function defaultKeyStat(): KeyStat {
  return {
    interval: 1,
    repetitions: 0,
    ef: 2.5,
    nextReview: new Date().toISOString().slice(0, 10),
    totalCorrect: 0,
    totalWrong: 0,
  }
}

/**
 * SM-2 质量评分映射：
 *   correct=true,  reactionMs < 1000  → q=5
 *   correct=true,  reactionMs 1000-2000 → q=4
 *   correct=true,  reactionMs > 2000  → q=3
 *   correct=false                     → q=1
 */
export function keyResultToQ(correct: boolean, reactionMs: number): number {
  if (!correct) return 1
  if (reactionMs < 1000) return 5
  if (reactionMs <= 2000) return 4
  return 3
}

/**
 * 标准 SM-2 算法更新
 */
export function updateKeyStat(stat: KeyStat, q: number): KeyStat {
  const today = new Date().toISOString().slice(0, 10)

  let { interval, repetitions, ef } = stat

  if (q >= 3) {
    if (repetitions === 0) interval = 1
    else if (repetitions === 1) interval = 6
    else interval = Math.round(interval * ef)
    repetitions += 1
  } else {
    interval = 1
    repetitions = 0
  }

  ef = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  ef = Math.max(1.3, ef)

  const nextDate = new Date(today)
  nextDate.setDate(nextDate.getDate() + interval)

  return {
    ...stat,
    interval,
    repetitions,
    ef,
    nextReview: nextDate.toISOString().slice(0, 10),
    totalCorrect: stat.totalCorrect + (q >= 3 ? 1 : 0),
    totalWrong: stat.totalWrong + (q < 3 ? 1 : 0),
  }
}

/**
 * 从 keyStats 中按优先级选出需要练习的键列表：
 * 1. 今天到期 (nextReview <= today)
 * 2. 从未练习 (不在 keyStats 里)
 * 3. ef 最低的键
 */
export function selectWeakKeys(
  keyStats: Record<string, KeyStat>,
  allKeys: string[],
  maxCount = 8,
): string[] {
  const today = new Date().toISOString().slice(0, 10)

  const due = allKeys.filter(k => keyStats[k] && keyStats[k].nextReview <= today)
  const never = allKeys.filter(k => !keyStats[k])
  const byEf = allKeys
    .filter(k => keyStats[k] && keyStats[k].nextReview > today)
    .sort((a, b) => keyStats[a].ef - keyStats[b].ef)

  return [...due, ...never, ...byEf].slice(0, maxCount)
}
```

- [ ] **Step 2: 验证类型无误**

```bash
cd /Users/erbaodejia/typing-trainer && npx tsc --noEmit
```

期望：无错误输出。

- [ ] **Step 3: Commit**

```bash
git add src/utils/sm2.ts
git commit -m "feat: add SM-2 spaced repetition algorithm"
```

---

## Task 2: Express 后端 + 启动脚本

**Files:**
- Create: `server.js`
- Create: `start.command`
- Create: `data/users/.gitkeep`
- Modify: `package.json`

- [ ] **Step 1: 安装 express 和 cors**

```bash
cd /Users/erbaodejia/typing-trainer && npm install express cors
npm install --save-dev @types/express @types/cors
```

期望：package.json 的 dependencies 里出现 express 和 cors。

- [ ] **Step 2: 创建 server.js**

```javascript
// server.js
import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, 'data', 'users')

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

const app = express()
app.use(cors())
app.use(express.json())

// GET /api/users — 返回所有账号摘要
app.get('/api/users', (_req, res) => {
  try {
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'))
    const users = files.map(f => {
      const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf-8'))
      return {
        id: data.id,
        name: data.name,
        color: data.color,
        sessionCount: data.sessions?.length ?? 0,
        lastWpm: data.sessions?.at(-1)?.wpm ?? null,
      }
    })
    res.json(users)
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

// GET /api/users/:id — 返回完整账号数据
app.get('/api/users/:id', (req, res) => {
  const file = path.join(DATA_DIR, `${req.params.id}.json`)
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'not found' })
  res.json(JSON.parse(fs.readFileSync(file, 'utf-8')))
})

// POST /api/users — 创建新账号
app.post('/api/users', (req, res) => {
  const { name, color } = req.body
  if (!name || !color) return res.status(400).json({ error: 'name and color required' })
  const id = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now()
  const profile = {
    id,
    name,
    color,
    createdAt: new Date().toISOString(),
    keyStats: {},
    sessions: [],
  }
  fs.writeFileSync(path.join(DATA_DIR, `${id}.json`), JSON.stringify(profile, null, 2))
  res.json(profile)
})

// POST /api/users/:id/save — 保存练习数据
app.post('/api/users/:id/save', (req, res) => {
  const file = path.join(DATA_DIR, `${req.params.id}.json`)
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'not found' })
  const profile = JSON.parse(fs.readFileSync(file, 'utf-8'))
  const { session, keyStats } = req.body
  if (session) profile.sessions.push(session)
  if (keyStats) profile.keyStats = { ...profile.keyStats, ...keyStats }
  fs.writeFileSync(file, JSON.stringify(profile, null, 2))
  res.json({ ok: true })
})

app.listen(3001, () => console.log('typing-trainer server running on http://localhost:3001'))
```

- [ ] **Step 3: 创建 start.command**

```bash
cat > /Users/erbaodejia/typing-trainer/start.command << 'SCRIPT'
#!/bin/bash
cd "$(dirname "$0")"

# Install deps if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Start backend
node server.js &
SERVER_PID=$!

# Start Vite dev server
npm run dev &
VITE_PID=$!

# Wait for Vite to be ready then open browser
sleep 3
open http://localhost:5173

echo "Typing Trainer running. Close this window to stop."
wait $VITE_PID
kill $SERVER_PID 2>/dev/null
SCRIPT
chmod +x /Users/erbaodejia/typing-trainer/start.command
```

- [ ] **Step 4: 创建数据目录占位**

```bash
mkdir -p /Users/erbaodejia/typing-trainer/data/users
touch /Users/erbaodejia/typing-trainer/data/users/.gitkeep
```

- [ ] **Step 5: 验证后端启动**

```bash
cd /Users/erbaodejia/typing-trainer && node server.js &
sleep 1 && curl http://localhost:3001/api/users
```

期望：输出 `[]`（空数组）。

```bash
kill %1
```

- [ ] **Step 6: Commit**

```bash
git add server.js start.command data/ package.json package-lock.json
git commit -m "feat: add Express backend and start.command launcher"
```

---

## Task 3: TypeScript 类型 + useProfile hook

**Files:**
- Modify: `src/types.ts`
- Create: `src/hooks/useProfile.ts`

- [ ] **Step 1: 在 src/types.ts 末尾追加新类型**

在文件末尾 `export type PracticeMode = ...` 之后添加：

```typescript
// ── User profile types ─────────────────────────────────────────
export interface UserProfile {
  id: string
  name: string
  color: string
  createdAt: string
  keyStats: Record<string, import('./utils/sm2').KeyStat>
  sessions: SessionSummary[]
}

export interface SessionSummary {
  date: string
  wpm: number
  accuracy: number
  duration: number
  weakKeys: string[]
}

export interface UserSummary {
  id: string
  name: string
  color: string
  sessionCount: number
  lastWpm: number | null
}
```

- [ ] **Step 2: 创建 src/hooks/useProfile.ts**

```typescript
// src/hooks/useProfile.ts
import { useState, useCallback } from 'react'
import type { UserProfile, UserSummary, SessionSummary } from '../types'
import type { KeyStat } from '../utils/sm2'

const API = 'http://localhost:3001/api'

export function useProfile() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [users, setUsers] = useState<UserSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/users`)
      setUsers(await res.json())
    } catch {
      setError('无法连接本地服务，请确认已通过 start.command 启动')
    } finally {
      setLoading(false)
    }
  }, [])

  const selectUser = useCallback(async (id: string) => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/users/${id}`)
      const profile: UserProfile = await res.json()
      setCurrentUser(profile)
    } catch {
      setError('加载账号失败')
    } finally {
      setLoading(false)
    }
  }, [])

  const createUser = useCallback(async (name: string, color: string) => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color }),
      })
      const profile: UserProfile = await res.json()
      setCurrentUser(profile)
      await fetchUsers()
      return profile
    } catch {
      setError('创建账号失败')
      return null
    } finally {
      setLoading(false)
    }
  }, [fetchUsers])

  const saveSession = useCallback(async (
    session: SessionSummary,
    keyStats: Record<string, KeyStat>,
  ) => {
    if (!currentUser) return
    try {
      await fetch(`${API}/users/${currentUser.id}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session, keyStats }),
      })
      // Update local state
      setCurrentUser(prev => prev ? {
        ...prev,
        sessions: [...prev.sessions, session],
        keyStats: { ...prev.keyStats, ...keyStats },
      } : null)
    } catch {
      setError('保存数据失败')
    }
  }, [currentUser])

  return {
    currentUser,
    setCurrentUser,
    users,
    loading,
    error,
    fetchUsers,
    selectUser,
    createUser,
    saveSession,
  }
}
```

- [ ] **Step 3: 验证类型**

```bash
cd /Users/erbaodejia/typing-trainer && npx tsc --noEmit
```

期望：无错误。

- [ ] **Step 4: Commit**

```bash
git add src/types.ts src/hooks/useProfile.ts
git commit -m "feat: add UserProfile types and useProfile hook"
```

---

## Task 4: ProfileSelector 界面组件

**Files:**
- Create: `src/components/ProfileSelector.tsx`

- [ ] **Step 1: 创建 ProfileSelector.tsx**

```typescript
// src/components/ProfileSelector.tsx
import { useEffect, useState } from 'react'
import type { UserSummary } from '../types'

const AVATAR_COLORS = [
  '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B',
  '#EF4444', '#EC4899', '#06B6D4', '#F97316',
]

interface Props {
  users: UserSummary[]
  loading: boolean
  error: string | null
  onSelect: (id: string) => void
  onCreate: (name: string, color: string) => void
  onRefresh: () => void
}

export function ProfileSelector({ users, loading, error, onSelect, onCreate, onRefresh }: Props) {
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(AVATAR_COLORS[0])

  useEffect(() => { onRefresh() }, [])

  const handleCreate = () => {
    if (!newName.trim()) return
    onCreate(newName.trim(), newColor)
    setShowCreate(false)
    setNewName('')
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center gap-8 px-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white tracking-tight">⌨️ 盲打训练</h1>
        <p className="text-gray-400 mt-2">选择你的账号开始练习</p>
      </div>

      {error && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm max-w-md text-center">
          {error}
          <br />
          <span className="text-red-400 text-xs">请双击 start.command 启动服务</span>
        </div>
      )}

      {loading && <p className="text-gray-500 animate-pulse">加载中...</p>}

      <div className="flex flex-wrap gap-4 justify-center">
        {users.map(u => (
          <button
            key={u.id}
            onClick={() => onSelect(u.id)}
            className="flex flex-col items-center gap-3 p-5 bg-gray-800 hover:bg-gray-700 rounded-2xl border border-gray-700 hover:border-gray-500 transition-all w-36"
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg"
              style={{ backgroundColor: u.color }}
            >
              {u.name.slice(0, 1).toUpperCase()}
            </div>
            <span className="text-white font-semibold text-sm">{u.name}</span>
            <div className="text-center text-xs text-gray-400">
              <div>{u.sessionCount} 次练习</div>
              {u.lastWpm && <div>{u.lastWpm} WPM</div>}
            </div>
          </button>
        ))}

        {/* 新建账号按钮 */}
        {!showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex flex-col items-center gap-3 p-5 bg-gray-800/50 hover:bg-gray-700/50 rounded-2xl border border-dashed border-gray-600 hover:border-gray-400 transition-all w-36"
          >
            <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center text-3xl text-gray-400">
              +
            </div>
            <span className="text-gray-400 text-sm">新建账号</span>
          </button>
        )}
      </div>

      {showCreate && (
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 flex flex-col gap-4 w-72">
          <h3 className="text-white font-semibold">新建账号</h3>
          <input
            autoFocus
            type="text"
            placeholder="输入名字..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            className="bg-gray-700 text-white rounded-lg px-3 py-2 text-sm outline-none border border-gray-600 focus:border-blue-500"
          />
          <div className="flex flex-wrap gap-2">
            {AVATAR_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className="w-8 h-8 rounded-full border-2 transition-all"
                style={{
                  backgroundColor: c,
                  borderColor: newColor === c ? '#fff' : 'transparent',
                }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg py-2 text-sm font-semibold transition-colors"
            >
              创建
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg py-2 text-sm transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 验证类型**

```bash
cd /Users/erbaodejia/typing-trainer && npx tsc --noEmit
```

期望：无错误。

- [ ] **Step 3: Commit**

```bash
git add src/components/ProfileSelector.tsx
git commit -m "feat: add ProfileSelector account selection screen"
```

---

## Task 5: 接入 App.tsx + useAdaptiveLearning

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/hooks/useAdaptiveLearning.ts`

- [ ] **Step 1: 更新 useAdaptiveLearning.ts 接入 SM-2**

用以下内容完全替换 `src/hooks/useAdaptiveLearning.ts`：

```typescript
// src/hooks/useAdaptiveLearning.ts
import { useState, useCallback } from 'react'
import type { SessionResult } from '../types'
import type { UserProfile, SessionSummary } from '../types'
import { updateKeyStat, keyResultToQ, selectWeakKeys, defaultKeyStat } from '../utils/sm2'
import type { KeyStat } from '../utils/sm2'
import { generatePracticeText } from '../utils/claudeApi'

const STORAGE_KEY_APIKEY = 'typing-trainer-api-key'

interface UseAdaptiveLearningProps {
  currentUser: UserProfile | null
  onSaveSession: (session: SessionSummary, keyStats: Record<string, KeyStat>) => Promise<void>
}

export function useAdaptiveLearning({ currentUser, onSaveSession }: UseAdaptiveLearningProps) {
  const [apiKey, setApiKeyState] = useState<string>(() =>
    localStorage.getItem(STORAGE_KEY_APIKEY) ?? ''
  )
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)

  const sessionCount = currentUser?.sessions.length ?? 0

  const saveApiKey = useCallback((key: string) => {
    setApiKeyState(key)
    localStorage.setItem(STORAGE_KEY_APIKEY, key)
  }, [])

  const saveResult = useCallback(async (result: SessionResult) => {
    if (!currentUser) return

    // Build per-key SM-2 updates from keyResults
    // Track reaction time: time between consecutive keyResults
    const updatedStats: Record<string, KeyStat> = {}
    const keyTimings: Record<string, number[]> = {}

    let prevTime = result.keyResults[0]?.timestamp ?? Date.now()
    for (const r of result.keyResults) {
      const reactionMs = r.timestamp - prevTime
      prevTime = r.timestamp
      if (!keyTimings[r.expected]) keyTimings[r.expected] = []
      keyTimings[r.expected].push(reactionMs)

      const existing = currentUser.keyStats[r.expected] ?? defaultKeyStat()
      const q = keyResultToQ(r.correct, reactionMs)
      updatedStats[r.expected] = updateKeyStat(existing, q)
    }

    // Find weak keys (accuracy < 85% in this session)
    const weakKeys = Object.entries(keyTimings)
      .filter(([key]) => {
        const keyResults = result.keyResults.filter(r => r.expected === key)
        const correct = keyResults.filter(r => r.correct).length
        return keyResults.length >= 2 && correct / keyResults.length < 0.85
      })
      .map(([key]) => key)

    const session: SessionSummary = {
      date: new Date().toISOString(),
      wpm: result.wpm,
      accuracy: result.accuracy,
      duration: result.duration,
      weakKeys,
    }

    await onSaveSession(session, updatedStats)
  }, [currentUser, onSaveSession])

  const getWeakKeys = useCallback((): string[] => {
    if (!currentUser) return []
    const allKeys = 'abcdefghijklmnopqrstuvwxyz'.split('')
    return selectWeakKeys(currentUser.keyStats, allKeys, 8)
  }, [currentUser])

  const generateAiText = useCallback(async (): Promise<string | null> => {
    if (!apiKey) {
      setGenerationError('请先设置 Claude API Key')
      return null
    }
    const weakKeys = getWeakKeys()
    if (weakKeys.length === 0) {
      setGenerationError('暂无足够的薄弱键位数据')
      return null
    }
    setIsGenerating(true)
    setGenerationError(null)
    try {
      const text = await generatePracticeText(weakKeys, apiKey)
      return text
    } catch (e) {
      setGenerationError(e instanceof Error ? e.message : '生成失败')
      return null
    } finally {
      setIsGenerating(false)
    }
  }, [apiKey, getWeakKeys])

  return {
    sessionCount,
    apiKey,
    saveApiKey,
    saveResult,
    generateAiText,
    isGenerating,
    generationError,
    aiUnlocked: sessionCount >= 5,
  }
}
```

- [ ] **Step 2: 更新 App.tsx**

用以下内容完全替换 `src/App.tsx`：

```typescript
import { useState, useCallback, useEffect, useRef } from 'react'
import { ProfileSelector } from './components/ProfileSelector'
import { PracticeSelector } from './components/PracticeSelector'
import { TextDisplay } from './components/TextDisplay'
import { KeyboardVisual } from './components/KeyboardVisual'
import { FingerHint } from './components/FingerHint'
import { StatsBar } from './components/StatsBar'
import { ResultsScreen } from './components/ResultsScreen'
import { useTypingSession } from './hooks/useTypingSession'
import { useKeyboard } from './hooks/useKeyboard'
import { useAdaptiveLearning } from './hooks/useAdaptiveLearning'
import { useProfile } from './hooks/useProfile'
import { textToKeySequence } from './utils/pinyin'
import { unlockAudio, playCorrect, playWrong, playStreak, playStreakBreak, playComplete, playStart } from './utils/sounds'
import type { TextEntry } from './data/textLibrary'
import type { KeySequenceItem } from './types'

type AppScreen = 'profile' | 'select' | 'practice' | 'results'

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('profile')
  const [sequence, setSequence] = useState<KeySequenceItem[]>([])
  const [currentEntry, setCurrentEntry] = useState<TextEntry | null>(null)
  const [lastKey, setLastKey] = useState<string | null>(null)
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null)
  const streakRef = useRef(0)

  const profile = useProfile()
  const adaptive = useAdaptiveLearning({
    currentUser: profile.currentUser,
    onSaveSession: profile.saveSession,
  })
  const session = useTypingSession(sequence)

  const expectedKeyRef = useRef<string | null>(null)
  expectedKeyRef.current = session.expectedKey

  const handleKeyPress = useCallback((key: string) => {
    unlockAudio()
    const expected = expectedKeyRef.current
    const correct = expected === key
    session.handleKeyPress(key)
    setLastKey(key)
    setLastCorrect(correct)

    if (correct) {
      streakRef.current += 1
      const streak = streakRef.current
      // Milestone streaks get escalating sounds
      if (streak >= 50) {
        playStreak(10)   // max level: star + harmony
      } else if (streak >= 30) {
        playStreak(6)    // star
      } else if (streak >= 20) {
        playStreak(4)    // fast 1-up
      } else if (streak >= 10) {
        playStreak(2)    // high 1-up
      } else if (streak % 5 === 0) {
        playStreak(1)    // standard 1-up
      } else {
        playCorrect()
      }
    } else {
      if (streakRef.current >= 5) playStreakBreak()
      else playWrong()
      streakRef.current = 0
    }
  }, [session])

  useKeyboard(
    handleKeyPress,
    screen === 'practice' && session.state !== 'complete',
  )

  useEffect(() => {
    if (session.state === 'complete' && screen === 'practice') {
      playComplete()
      if (session.result) {
        adaptive.saveResult(session.result)
      }
      const t = setTimeout(() => setScreen('results'), 800)
      return () => clearTimeout(t)
    }
  }, [session.state, screen])

  const startPractice = useCallback((entry: TextEntry, seq?: KeySequenceItem[]) => {
    unlockAudio()
    const finalSeq = seq ?? textToKeySequence(entry.content, entry.mode)
    setSequence(finalSeq)
    setCurrentEntry(entry)
    session.reset(finalSeq)
    setLastKey(null)
    setLastCorrect(null)
    streakRef.current = 0
    playStart()
    setScreen('practice')
  }, [session])

  const startAiPractice = useCallback(async () => {
    const text = await adaptive.generateAiText()
    if (!text) return
    const aiEntry: TextEntry = {
      id: 'ai-generated',
      title: 'AI 强化练习',
      mode: 'chinese',
      content: text,
    }
    startPractice(aiEntry)
  }, [adaptive, startPractice])

  const handleRetry = useCallback(() => {
    if (!currentEntry) return
    startPractice(currentEntry)
  }, [currentEntry, startPractice])

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">

      {screen === 'profile' && (
        <ProfileSelector
          users={profile.users}
          loading={profile.loading}
          error={profile.error}
          onSelect={async (id) => {
            await profile.selectUser(id)
            setScreen('select')
          }}
          onCreate={async (name, color) => {
            await profile.createUser(name, color)
            setScreen('select')
          }}
          onRefresh={profile.fetchUsers}
        />
      )}

      {screen !== 'profile' && (
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-5">

          {/* 顶部用户信息栏 */}
          {profile.currentUser && (
            <div className="flex items-center justify-between">
              <button
                onClick={() => setScreen('profile')}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: profile.currentUser.color }}
                >
                  {profile.currentUser.name.slice(0, 1).toUpperCase()}
                </div>
                {profile.currentUser.name}
              </button>
              {screen === 'practice' && (
                <button
                  onClick={() => setScreen('select')}
                  className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
                >
                  ← 返回选择
                </button>
              )}
            </div>
          )}

          {screen === 'select' && (
            <PracticeSelector
              onStart={startPractice}
              onAiStart={startAiPractice}
              apiKey={adaptive.apiKey}
              onSaveApiKey={adaptive.saveApiKey}
              aiUnlocked={adaptive.aiUnlocked}
              sessionCount={adaptive.sessionCount}
              isGenerating={adaptive.isGenerating}
              generationError={adaptive.generationError}
            />
          )}

          {screen === 'practice' && (
            <>
              <TextDisplay
                sequence={sequence}
                currentFlatIndex={session.currentFlatIndex}
                keyResults={session.keyResults}
              />
              <StatsBar
                wpm={session.wpm}
                accuracy={session.accuracy}
                currentFlatIndex={session.currentFlatIndex}
                totalKeys={session.totalKeys}
                elapsed={session.elapsed}
                state={session.state}
              />
              <FingerHint expectedKey={session.expectedKey} />
              <KeyboardVisual
                expectedKey={session.expectedKey}
                lastKey={lastKey}
                lastCorrect={lastCorrect}
              />
              {session.state === 'ready' && (
                <p className="text-center text-gray-500 text-sm animate-pulse">
                  按任意字母键开始练习
                </p>
              )}
            </>
          )}

          {screen === 'results' && session.result && (
            <>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white">练习完成！</h2>
                {currentEntry && (
                  <p className="text-gray-400 text-sm mt-1">{currentEntry.title}</p>
                )}
              </div>
              <ResultsScreen
                result={session.result}
                sessionCount={adaptive.sessionCount}
                onRetry={handleRetry}
                onNewText={() => setScreen('select')}
                onAiPractice={startAiPractice}
                apiKeySet={!!adaptive.apiKey}
              />
            </>
          )}

        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: 验证编译**

```bash
cd /Users/erbaodejia/typing-trainer && npx tsc --noEmit
```

期望：无错误。

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/hooks/useAdaptiveLearning.ts
git commit -m "feat: wire profile + SM-2 into App and useAdaptiveLearning"
```

---

## Task 6: 连击音效升级

**Files:**
- Modify: `src/utils/sounds.ts`

- [ ] **Step 1: 用以下内容完全替换 sounds.ts**

```typescript
// src/utils/sounds.ts — Web Audio API, Mario Bros retro sounds

let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx || ctx.state === 'closed') ctx = new AudioContext()
  return ctx
}

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

// SMB coin pickup
export function playCorrect(): void {
  playTone(988,  0.04, 'square', 0.25)
  playTone(1319, 0.09, 'square', 0.22, 0.04)
}

// SMB bump
export function playWrong(): void {
  playTone(230, 0.12, 'square', 0.30, 0, 90)
}

// Streak break — descending cascade (连击崩塌音)
export function playStreakBreak(): void {
  const freqs = [880, 659, 494, 330, 220]
  let t = 0
  for (const f of freqs) {
    playTone(f, 0.06, 'square', 0.18, t, f * 0.7)
    t += 0.05
  }
}

// Escalating streak rewards — level 1-10+
// level 1: standard 1-Up (×5 streak)
// level 2: higher pitch 1-Up (×10)
// level 4: double-speed 1-Up (×20)
// level 6: star sweep (×30)
// level 10: star + harmony (×50+)
const ONE_UP_BASE = [494, 587, 740, 988, 1175, 1480]

export function playStreak(level: number): void {
  const pitchMult = level >= 2 ? 1 + (level - 1) * 0.08 : 1
  const speedMult = level >= 4 ? 0.6 : 1           // faster at level 4+
  const notes = level >= 6
    ? [...ONE_UP_BASE, 1760, 2093, 2637]            // extra notes for star
    : ONE_UP_BASE

  let t = 0
  const step = 0.09 * speedMult
  for (const f of notes) {
    const freq = f * pitchMult
    playTone(freq, 0.08 * speedMult, 'square', 0.20, t)
    // Add harmony layer at level 10+
    if (level >= 10) {
      playTone(freq * 1.5, 0.08 * speedMult, 'square', 0.10, t)
    }
    t += step
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

// SMB power-up
export function playStart(): void {
  const notes = [330, 415, 523, 622, 784, 1047]
  let t = 0
  for (const f of notes) {
    playTone(f, 0.06, 'square', 0.20, t)
    t += 0.07
  }
}
```

- [ ] **Step 2: 验证编译**

```bash
cd /Users/erbaodejia/typing-trainer && npx tsc --noEmit
```

期望：无错误（App.tsx 已引用 `playStreakBreak`，Task 5 已添加该调用）。

- [ ] **Step 3: Commit**

```bash
git add src/utils/sounds.ts
git commit -m "feat: escalating streak SFX with break sound"
```

---

## Task 7: 太空背景音乐

**Files:**
- Create: `src/utils/bgMusic.ts`
- Modify: `src/App.tsx` (添加音量控制按钮)

- [ ] **Step 1: 创建 src/utils/bgMusic.ts**

```typescript
// src/utils/bgMusic.ts — Procedural space electronic BGM via Web Audio API
// Style: Daft Punk "Harder Better Faster Stronger" — 4/4, BPM 128

const BPM = 128
const BEAT = 60 / BPM              // seconds per beat = 0.469s
const BAR  = BEAT * 4              // 4 beats per bar = 1.875s

// Bass line notes (Hz): C2 C2 G1 A#1 over 4 bars
const BASS_NOTES = [65.41, 65.41, 49.00, 58.27]

class BgMusicEngine {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private schedulerTimer: ReturnType<typeof setInterval> | null = null
  private nextNoteTime = 0
  private barIndex = 0
  private running = false
  private _volume = 0.5

  private getCtx(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new AudioContext()
      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.value = this._volume
      this.masterGain.connect(this.ctx.destination)
    }
    return this.ctx
  }

  private get gain(): GainNode {
    this.getCtx()
    return this.masterGain!
  }

  // ── Drum machines ───────────────────────────────────────────

  private scheduleKick(t: number) {
    const c = this.getCtx()
    const osc = c.createOscillator()
    const g   = c.createGain()
    osc.connect(g); g.connect(this.gain)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(120, t)
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.15)
    g.gain.setValueAtTime(1.0, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
    osc.start(t); osc.stop(t + 0.3)
  }

  private scheduleSnare(t: number) {
    const c = this.getCtx()
    const buf = c.createBuffer(1, c.sampleRate * 0.15, c.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    const src = c.createBufferSource()
    const bpf = c.createBiquadFilter()
    const g   = c.createGain()
    src.buffer = buf
    bpf.type = 'bandpass'; bpf.frequency.value = 1800; bpf.Q.value = 0.8
    src.connect(bpf); bpf.connect(g); g.connect(this.gain)
    g.gain.setValueAtTime(0.5, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15)
    src.start(t)
  }

  private scheduleHihat(t: number, closed = true) {
    const c = this.getCtx()
    const buf = c.createBuffer(1, c.sampleRate * 0.04, c.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    const src = c.createBufferSource()
    const hpf = c.createBiquadFilter()
    const g   = c.createGain()
    src.buffer = buf
    hpf.type = 'highpass'; hpf.frequency.value = 7000
    src.connect(hpf); hpf.connect(g); g.connect(this.gain)
    g.gain.setValueAtTime(closed ? 0.25 : 0.12, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.04)
    src.start(t)
  }

  // ── Bass synth ──────────────────────────────────────────────

  private scheduleBass(t: number, freq: number) {
    const c = this.getCtx()
    const osc = c.createOscillator()
    const g   = c.createGain()
    osc.connect(g); g.connect(this.gain)
    osc.type = 'square'
    osc.frequency.value = freq
    g.gain.setValueAtTime(0.35, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + BAR * 0.9)
    osc.start(t); osc.stop(t + BAR)
  }

  // ── Space pad ───────────────────────────────────────────────

  private schedulePad(t: number, freq: number) {
    const c = this.getCtx()
    const osc = c.createOscillator()
    const lfo = c.createOscillator()
    const lfoG = c.createGain()
    const g   = c.createGain()
    lfo.connect(lfoG); lfoG.connect(osc.frequency)
    osc.connect(g); g.connect(this.gain)
    osc.type = 'sawtooth'; osc.frequency.value = freq
    lfo.type = 'sine'; lfo.frequency.value = 0.4
    lfoG.gain.value = 3
    g.gain.setValueAtTime(0.06, t)
    g.gain.setValueAtTime(0.06, t + BAR * 2 - 0.1)
    g.gain.linearRampToValueAtTime(0.001, t + BAR * 2)
    lfo.start(t); osc.start(t)
    lfo.stop(t + BAR * 2); osc.stop(t + BAR * 2)
  }

  // ── Bar scheduler ───────────────────────────────────────────

  private scheduleBar(startT: number, barIdx: number) {
    const b = barIdx % 4  // 4-bar loop

    // Kick: beats 1 and 3
    this.scheduleKick(startT)
    this.scheduleKick(startT + BEAT * 2)

    // Snare: beats 2 and 4
    this.scheduleSnare(startT + BEAT)
    this.scheduleSnare(startT + BEAT * 3)

    // Hi-hat: every 8th note
    for (let i = 0; i < 8; i++) {
      this.scheduleHihat(startT + (BEAT / 2) * i)
    }

    // Bass: one note per bar from 4-bar pattern
    this.scheduleBass(startT, BASS_NOTES[b])

    // Pad: every 2 bars, chord root (Cm scale: C3 G#2 A#2 F2)
    const PAD_NOTES = [130.81, 103.83, 116.54, 87.31]
    if (b % 2 === 0) {
      this.schedulePad(startT, PAD_NOTES[b / 2])
    }
  }

  private tick() {
    const c = this.getCtx()
    const lookahead = 0.2  // schedule 200ms ahead
    while (this.nextNoteTime < c.currentTime + lookahead) {
      this.scheduleBar(this.nextNoteTime, this.barIndex)
      this.nextNoteTime += BAR
      this.barIndex++
    }
  }

  // ── Public API ──────────────────────────────────────────────

  start() {
    if (this.running) return
    const c = this.getCtx()
    c.resume().catch(() => {})
    this.nextNoteTime = c.currentTime + 0.1
    this.barIndex = 0
    this.running = true
    this.schedulerTimer = setInterval(() => this.tick(), 50)
  }

  stop() {
    if (!this.running) return
    this.running = false
    if (this.schedulerTimer !== null) {
      clearInterval(this.schedulerTimer)
      this.schedulerTimer = null
    }
    // Fade out
    if (this.masterGain && this.ctx) {
      const t = this.ctx.currentTime
      this.masterGain.gain.setValueAtTime(this._volume, t)
      this.masterGain.gain.linearRampToValueAtTime(0, t + 1.0)
    }
  }

  setVolume(v: number) {
    this._volume = Math.max(0, Math.min(1, v))
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this._volume, this.ctx.currentTime)
    }
  }

  get isRunning() { return this.running }
}

export const bgMusic = new BgMusicEngine()
```

- [ ] **Step 2: 在 App.tsx 的 practice screen 顶部加音量控制**

在 `src/App.tsx` 中，找到 practice screen 的 `<>` 开始后，在第一个子元素前插入音量控制按钮：

找到这一段：
```typescript
        {screen === 'practice' && (
          <>
            <TextDisplay
```

替换为：
```typescript
        {screen === 'practice' && (
          <>
            <MusicControl />
            <TextDisplay
```

然后在文件顶部 import 区域添加：
```typescript
import { bgMusic } from './utils/bgMusic'
```

并在 `App` 组件内（`return` 之前）添加内嵌组件和 effect：

在 `const handleRetry` 之后添加：
```typescript
  // Start/stop BGM with practice screen
  useEffect(() => {
    if (screen === 'practice') {
      bgMusic.start()
    } else {
      bgMusic.stop()
    }
  }, [screen])

  function MusicControl() {
    const [muted, setMuted] = useState(false)
    const [vol, setVol] = useState(0.5)
    const toggle = () => {
      const next = !muted
      setMuted(next)
      bgMusic.setVolume(next ? 0 : vol)
    }
    const changeVol = (v: number) => {
      setVol(v)
      if (!muted) bgMusic.setVolume(v)
    }
    return (
      <div className="flex items-center gap-2 self-end">
        <button onClick={toggle} className="text-gray-500 hover:text-gray-300 text-lg">
          {muted ? '🔇' : '🔊'}
        </button>
        <input
          type="range" min={0} max={1} step={0.05} value={muted ? 0 : vol}
          onChange={e => changeVol(Number(e.target.value))}
          className="w-20 accent-blue-500"
        />
      </div>
    )
  }
```

- [ ] **Step 3: 验证编译**

```bash
cd /Users/erbaodejia/typing-trainer && npx tsc --noEmit
```

期望：无错误。

- [ ] **Step 4: 启动测试**

```bash
cd /Users/erbaodejia/typing-trainer
node server.js &
npm run dev
```

打开浏览器，创建账号，进入练习，验证：
- 背景音乐在进入练习时自动播放
- 🔊 按钮可以静音/恢复
- 连击 5/10/20/30 次时音效升级
- 练习完成后音乐淡出

- [ ] **Step 5: 停止测试服务**

```bash
kill %1 %2 2>/dev/null
```

- [ ] **Step 6: Final commit**

```bash
git add src/utils/bgMusic.ts src/App.tsx
git commit -m "feat: space BGM generator + volume control"
```

---

## 验收检查清单

- [ ] 双击 `start.command` 可以打开浏览器，无需命令行
- [ ] 可以创建两个账号（如"爸爸"和"儿子"），数据分别存入 `data/users/`
- [ ] 每次练习结束后，账号的 `keyStats` 被更新（SM-2 数据）
- [ ] AI 强化练习优先选取 SM-2 标记的弱键
- [ ] 连击 5/10/20/30/50 音效各不相同且越来越燃
- [ ] 断连击时有崩塌音
- [ ] 练习中有背景音乐，🔊 可控制音量
