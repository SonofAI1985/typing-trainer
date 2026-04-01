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
