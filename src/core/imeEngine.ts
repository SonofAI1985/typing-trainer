import { createPinyinEngine } from 'pinyin-ime'
import { dict } from 'pinyin-ime/dictionary/google_pinyin_dict'
import type { CandidateItem } from 'pinyin-ime'

// ── Singleton engine instance ────────────────────────────────────────────────

const engine = createPinyinEngine(dict)

/** Candidates per page (digits 1–9). */
export const PAGE_SIZE = 9

// ── Public helpers ───────────────────────────────────────────────────────────

/**
 * Generate an ordered candidate list (strings only) for the given pinyin buffer.
 */
export function getCandidates(buffer: string): string[] {
  if (!buffer) return []
  return engine.getCandidates(buffer).candidates.map(c => c.word)
}

/**
 * Get all candidate items with matchedLength info.
 */
function getAllCandidateItems(buffer: string): CandidateItem[] {
  if (!buffer) return []
  return engine.getCandidates(buffer).candidates
}

/**
 * Find the 1-based digit key that selects `target` from the visible page.
 * Returns null if target isn't on the current page.
 */
export function getTargetDigit(candidates: string[], target: string): string | null {
  const idx = candidates.indexOf(target)
  return idx >= 0 ? String(idx + 1) : null
}

// ── IME state machine (pure, no React) ─────────────────────────────────────

export interface IMEState {
  buffer: string
  /** All candidates (not just current page). */
  allCandidates: string[]
  /** matchedLength per candidate (parallel to allCandidates). */
  allMatchedLengths: number[]
  /** Current page index (0-based). */
  page: number
  /** Visible candidates on the current page (derived, for convenience). */
  candidates: string[]
  /** matchedLengths for current page (derived). */
  matchedLengths: number[]
  /** Set to the committed word when user presses a digit; null otherwise. */
  committed: string | null
  /** The digit key pressed that triggered a commit. */
  pressedDigit: string | null
}

function buildPagedState(
  buffer: string,
  allItems: CandidateItem[],
  page: number,
  extra?: { committed: string | null; pressedDigit: string | null },
): IMEState {
  const totalPages = Math.max(1, Math.ceil(allItems.length / PAGE_SIZE))
  const safePage = Math.max(0, Math.min(page, totalPages - 1))
  const start = safePage * PAGE_SIZE
  const pageItems = allItems.slice(start, start + PAGE_SIZE)
  return {
    buffer,
    allCandidates: allItems.map(c => c.word),
    allMatchedLengths: allItems.map(c => c.matchedLength),
    page: safePage,
    candidates: pageItems.map(c => c.word),
    matchedLengths: pageItems.map(c => c.matchedLength),
    committed: extra?.committed ?? null,
    pressedDigit: extra?.pressedDigit ?? null,
  }
}

export const IME_INITIAL: IMEState = {
  buffer: '',
  allCandidates: [],
  allMatchedLengths: [],
  page: 0,
  candidates: [],
  matchedLengths: [],
  committed: null,
  pressedDigit: null,
}

/**
 * Pure transition function for the IME state machine.
 *
 * Keys handled:
 * - a-z: append to buffer, reset to page 0
 * - backspace: remove last char
 * - 1-9: commit candidate at that position on current page
 * - +/=: next page
 * - -: previous page
 * - space: commit first candidate on current page (same as pressing 1)
 */
export function imeStep(state: IMEState, key: string): IMEState {
  // ── Letters: append to buffer, reset page ──────────────────────────────
  if (/^[a-z]$/.test(key)) {
    const buffer = state.buffer + key
    return buildPagedState(buffer, getAllCandidateItems(buffer), 0)
  }

  // ── Backspace ──────────────────────────────────────────────────────────
  if (key === 'backspace') {
    const buffer = state.buffer.slice(0, -1)
    if (!buffer) return IME_INITIAL
    return buildPagedState(buffer, getAllCandidateItems(buffer), 0)
  }

  // ── Page navigation ────────────────────────────────────────────────────
  if (key === '+' || key === '=' || key === 'pagedown') {
    return buildPagedState(
      state.buffer,
      state.allCandidates.map((w, i) => ({ word: w, matchedLength: state.allMatchedLengths[i] })),
      state.page + 1,
    )
  }
  if (key === '-' || key === 'pageup') {
    return buildPagedState(
      state.buffer,
      state.allCandidates.map((w, i) => ({ word: w, matchedLength: state.allMatchedLengths[i] })),
      state.page - 1,
    )
  }

  // ── Space: shortcut for selecting first candidate ──────────────────────
  if (key === ' ') {
    return commitAtIndex(state, 0)
  }

  // ── Digit selection ────────────────────────────────────────────────────
  if (/^[1-9]$/.test(key)) {
    return commitAtIndex(state, Number(key) - 1)
  }

  return { ...state, committed: null, pressedDigit: null }
}

/**
 * Commit the candidate at the given index on the current page.
 * Remaining buffer gets fresh candidates at page 0.
 */
function commitAtIndex(state: IMEState, pageIdx: number): IMEState {
  const word = state.candidates[pageIdx]
  const consumed = state.matchedLengths[pageIdx]
  if (!word || consumed === undefined) {
    return { ...state, committed: null, pressedDigit: null }
  }

  const remaining = state.buffer.slice(consumed)
  const items = remaining ? getAllCandidateItems(remaining) : []
  return buildPagedState(remaining, items, 0, {
    committed: word,
    pressedDigit: String(pageIdx + 1),
  })
}
