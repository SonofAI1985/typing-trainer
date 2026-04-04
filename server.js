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
