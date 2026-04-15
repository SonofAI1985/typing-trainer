import candidatesData from '../data/pinyinCandidates.json'
import phraseData from '../data/phraseCandidates.json'

const SINGLE: Record<string, string[]> = candidatesData as Record<string, string[]>
const PHRASES: Record<string, { word: string; frequency: number }[]> =
  phraseData as Record<string, { word: string; frequency: number }[]>

/**
 * Generate an ordered candidate list for the given pinyin buffer.
 * Priority: direct phrase match > single-char match > split-pair combinations.
 */
export function getCandidates(buffer: string): string[] {
  if (!buffer) return []

  type Scored = { word: string; score: number }
  const scored: Scored[] = []
  const seen = new Set<string>()

  const add = (word: string, score: number) => {
    if (!seen.has(word)) { seen.add(word); scored.push({ word, score }) }
  }

  // 1. Direct phrase match (highest priority)
  for (const p of PHRASES[buffer] ?? []) add(p.word, p.frequency + 10_000)

  // 2. Direct single-char match
  ;(SINGLE[buffer] ?? []).forEach((c, i) => add(c, 1000 - i * 10))

  // 3. Split into two segments and combine top candidates from each side
  for (let i = 1; i < buffer.length; i++) {
    const left = buffer.slice(0, i)
    const right = buffer.slice(i)

    const lefts = [
      ...(PHRASES[left]?.map(p => p.word) ?? []),
      ...(SINGLE[left] ?? []),
    ].slice(0, 3)

    const rights = [
      ...(PHRASES[right]?.map(p => p.word) ?? []),
      ...(SINGLE[right] ?? []),
    ].slice(0, 3)

    if (lefts.length && rights.length) {
      for (const l of lefts)
        for (const r of rights)
          add(l + r, 100)
    }
  }

  scored.sort((a, b) => b.score - a.score)
  return scored.map(s => s.word).slice(0, 9)
}

/**
 * Find the 1-based digit key that selects `target` from candidates.
 * Returns null if target isn't in the list.
 */
export function getTargetDigit(candidates: string[], target: string): string | null {
  const idx = candidates.indexOf(target)
  return idx >= 0 ? String(idx + 1) : null
}

// ── IME state machine (pure, no React) ─────────────────────────────────────

export interface IMEState {
  buffer: string
  candidates: string[]
  /** Set to the committed word when user presses a digit; null otherwise. */
  committed: string | null
  /** The digit key pressed that triggered a commit. */
  pressedDigit: string | null
}

export const IME_INITIAL: IMEState = {
  buffer: '',
  candidates: [],
  committed: null,
  pressedDigit: null,
}

/**
 * Pure transition function for the IME state machine.
 * Handles: a-z letters (append to buffer), backspace (remove last), 1-9 digits (commit).
 */
export function imeStep(state: IMEState, key: string): IMEState {
  // Always clear committed/pressedDigit on a new key
  const base: IMEState = { ...state, committed: null, pressedDigit: null }

  if (/^[a-z]$/.test(key)) {
    const buffer = base.buffer + key
    return { ...base, buffer, candidates: getCandidates(buffer) }
  }

  if (key === 'backspace') {
    const buffer = base.buffer.slice(0, -1)
    return { ...base, buffer, candidates: buffer ? getCandidates(buffer) : [] }
  }

  if (/^[1-9]$/.test(key)) {
    const idx = Number(key) - 1
    const word = base.candidates[idx]
    if (word) return { buffer: '', candidates: [], committed: word, pressedDigit: key }
  }

  return base
}
