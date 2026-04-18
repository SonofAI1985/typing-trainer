import { createPinyinEngine } from 'pinyin-ime'
import { dict } from 'pinyin-ime/dictionary/google_pinyin_dict'
import type { CandidateItem } from 'pinyin-ime'

// ── Singleton engine instance ────────────────────────────────────────────────

const engine = createPinyinEngine(dict)

// ── Public helpers (same signatures as before) ───────────────────────────────

/**
 * Generate an ordered candidate list (strings only) for the given pinyin buffer.
 * Delegates to pinyin-ime's engine which handles syllable segmentation,
 * trie prefix lookup, and frequency-based ranking.
 */
export function getCandidates(buffer: string): string[] {
  if (!buffer) return []
  const result = engine.getCandidates(buffer)
  return result.candidates.slice(0, 9).map(c => c.word)
}

/**
 * Generate candidate items with matchedLength info (internal use).
 */
function getCandidateItems(buffer: string): CandidateItem[] {
  if (!buffer) return []
  return engine.getCandidates(buffer).candidates.slice(0, 9)
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
  /** matchedLength per candidate (parallel to candidates array). */
  matchedLengths: number[]
  /** Set to the committed word when user presses a digit; null otherwise. */
  committed: string | null
  /** The digit key pressed that triggered a commit. */
  pressedDigit: string | null
}

export const IME_INITIAL: IMEState = {
  buffer: '',
  candidates: [],
  matchedLengths: [],
  committed: null,
  pressedDigit: null,
}

/**
 * Pure transition function for the IME state machine.
 * Handles: a-z letters (append to buffer), backspace (remove last), 1-9 digits (commit).
 *
 * Key difference from the old engine: on digit selection, only the matched
 * portion of the buffer is consumed. The remainder stays in the buffer with
 * fresh candidates — enabling continuous long-sentence input.
 */
export function imeStep(state: IMEState, key: string): IMEState {
  // Always clear committed/pressedDigit on a new key
  const base: IMEState = { ...state, committed: null, pressedDigit: null }

  if (/^[a-z]$/.test(key)) {
    const buffer = base.buffer + key
    const items = getCandidateItems(buffer)
    return {
      ...base,
      buffer,
      candidates: items.map(c => c.word),
      matchedLengths: items.map(c => c.matchedLength),
    }
  }

  if (key === 'backspace') {
    const buffer = base.buffer.slice(0, -1)
    if (!buffer) return IME_INITIAL
    const items = getCandidateItems(buffer)
    return {
      ...base,
      buffer,
      candidates: items.map(c => c.word),
      matchedLengths: items.map(c => c.matchedLength),
    }
  }

  if (/^[1-9]$/.test(key)) {
    const idx = Number(key) - 1
    const word = base.candidates[idx]
    const consumed = base.matchedLengths[idx]
    if (word && consumed !== undefined) {
      const remaining = base.buffer.slice(consumed)
      const items = remaining ? getCandidateItems(remaining) : []
      return {
        buffer: remaining,
        candidates: items.map(c => c.word),
        matchedLengths: items.map(c => c.matchedLength),
        committed: word,
        pressedDigit: key,
      }
    }
  }

  return base
}
