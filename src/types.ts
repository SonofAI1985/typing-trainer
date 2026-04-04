export type Section = 'left' | 'right'

export interface KeyDef {
  id: string
  label: string
  x: number
  y: number
  w: number
  h: number
  section: Section
}

export type FingerName =
  | 'left-pinky'
  | 'left-ring'
  | 'left-middle'
  | 'left-index'
  | 'left-thumb'
  | 'right-thumb'
  | 'right-index'
  | 'right-middle'
  | 'right-ring'
  | 'right-pinky'

export interface FingerInfo {
  finger: FingerName
  hand: 'left' | 'right'
  name: string
  color: string
}

export interface KeySequenceItem {
  char: string
  pinyin: string
  keys: string[]
  // For Chinese characters: the last key is an IME candidate number (e.g. '1').
  // hasImeSelect=true means keys[keys.length-1] is a digit selector, not a pinyin letter.
  hasImeSelect?: boolean
}

export interface KeyResult {
  expected: string
  actual: string
  correct: boolean
  timestamp: number
}

export type SessionState = 'ready' | 'typing' | 'complete'

export interface FingerStat {
  finger: FingerName
  name: string
  color: string
  correct: number
  wrong: number
}

export interface SessionResult {
  totalKeys: number
  correctKeys: number
  wpm: number
  accuracy: number
  keyResults: KeyResult[]
  duration: number
  fingerStats: FingerStat[]
}

export interface HistoryEntry {
  date: string
  wpm: number
  accuracy: number
  keyStats: Record<string, { correct: number; wrong: number }>
}

export type PracticeMode = 'chinese' | 'english' | 'ai'

export interface KeyStat {
  interval: number       // next review interval in days
  repetitions: number    // consecutive correct count
  ef: number             // easiness factor, init 2.5, min 1.3
  nextReview: string     // ISO date
  totalCorrect: number
  totalWrong: number
}

export interface SessionSummary {
  date: string
  wpm: number
  accuracy: number
  duration: number
  weakKeys: string[]
}

export interface UserProfile {
  id: string
  name: string
  color: string
  avatar?: string        // base64 data URL for custom avatar image
  createdAt: string
  keyStats: Record<string, KeyStat>
  sessions: SessionSummary[]
}

export interface UserSummary {
  id: string
  name: string
  color: string
  avatar?: string
  sessionCount: number
  lastWpm: number | null
}
