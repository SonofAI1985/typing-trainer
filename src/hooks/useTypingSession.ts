import { useReducer, useEffect, useCallback, useRef } from 'react'
import type { KeySequenceItem, KeyResult, ItemResult, SessionResult, SessionState, FingerStat } from '../types'
import type { FingerName } from '../types'
import { KEY_FINGER_MAP, KEY_TO_ID, FINGER_COLORS, FINGER_NAMES } from '../data/fingerMap'
import { imeStep, getTargetDigit, IME_INITIAL, type IMEState } from '../core/imeEngine'

// ─── Session state ────────────────────────────────────────────────────────

interface TypingSession {
  status: SessionState
  items: KeySequenceItem[]
  currentIndex: number
  imeState: IMEState
  keyResults: KeyResult[]      // keystroke-level (for SM-2 / accuracy stats)
  itemResults: ItemResult[]    // item-level (for TextDisplay coloring)
  startTime: number | null
  endTime: number | null
  currentTime: number
}

type SessionAction =
  | { type: 'key'; key: string; now: number }
  | { type: 'reset'; items: KeySequenceItem[] }
  | { type: 'tick'; now: number }

// ─── Key-result generation for a committed Chinese item ───────────────────

/**
 * Build keystroke-level KeyResult records for a committed Chinese item.
 * Compares the final buffer to the expected pinyin letter-by-letter,
 * then records the digit selection.
 */
function buildKeyResults(
  expectedPinyin: string,
  finalBuffer: string,
  candidatesAtCommit: string[],
  target: string,
  pressedDigit: string,
  timestamp: number,
): KeyResult[] {
  const krs: KeyResult[] = []

  for (let i = 0; i < expectedPinyin.length; i++) {
    krs.push({
      expected: expectedPinyin[i],
      actual: finalBuffer[i] ?? '',
      correct: finalBuffer[i] === expectedPinyin[i],
      timestamp,
    })
  }

  const expectedDigit = getTargetDigit(candidatesAtCommit, target) ?? '1'
  krs.push({
    expected: expectedDigit,
    actual: pressedDigit,
    correct: pressedDigit === expectedDigit,
    timestamp,
  })

  return krs
}

// ─── Reducer ──────────────────────────────────────────────────────────────

function createInitialSession(items: KeySequenceItem[]): TypingSession {
  return {
    status: 'ready',
    items,
    currentIndex: 0,
    imeState: IME_INITIAL,
    keyResults: [],
    itemResults: [],
    startTime: null,
    endTime: null,
    currentTime: Date.now(),
  }
}

function sessionReducer(state: TypingSession, action: SessionAction): TypingSession {
  if (action.type === 'reset') return createInitialSession(action.items)
  if (action.type === 'tick') return { ...state, currentTime: action.now }
  if (action.type !== 'key') return state
  if (state.status === 'complete') return state

  const { key, now } = action
  const item = state.items[state.currentIndex]
  if (!item) return state

  const startTime = state.startTime ?? now

  // ── Chinese: route through IME ──────────────────────────────────────────
  if (item.type === 'chinese') {
    // Backspace only affects the buffer, never starts the timer
    if (key === 'backspace') {
      return { ...state, imeState: imeStep(state.imeState, key) }
    }

    const newIME = imeStep(state.imeState, key)

    if (newIME.committed !== null) {
      // User selected a candidate — record results and advance
      const krs = buildKeyResults(
        item.pinyin,
        state.imeState.buffer,       // pre-commit buffer
        state.imeState.candidates,   // pre-commit candidates
        item.char,
        action.key,
        now,
      )

      const itemRes: ItemResult = {
        itemIndex: state.currentIndex,
        committed: newIME.committed,
        correct: newIME.committed === item.char,
      }

      const nextIndex = state.currentIndex + 1
      const isComplete = nextIndex >= state.items.length

      return {
        ...state,
        currentIndex: nextIndex,
        imeState: newIME.buffer ? newIME : IME_INITIAL,
        keyResults: [...state.keyResults, ...krs],
        itemResults: [...state.itemResults, itemRes],
        startTime,
        endTime: isComplete ? now : null,
        status: isComplete ? 'complete' : 'typing',
        currentTime: now,
      }
    }

    // Still building buffer — start timer on first letter
    return {
      ...state,
      imeState: newIME,
      startTime,
      status: state.status === 'ready' ? 'typing' : state.status,
      currentTime: now,
    }
  }

  // ── English / space: direct keystroke matching ──────────────────────────
  const expectedKey = item.type === 'space' ? ' ' : item.char.toLowerCase()
  const correct = key === expectedKey

  const kr: KeyResult = { expected: expectedKey, actual: key, correct, timestamp: now }
  const itemRes: ItemResult = {
    itemIndex: state.currentIndex,
    committed: key,
    correct,
  }

  const nextIndex = state.currentIndex + 1
  const isComplete = nextIndex >= state.items.length

  return {
    ...state,
    currentIndex: nextIndex,
    keyResults: [...state.keyResults, kr],
    itemResults: [...state.itemResults, itemRes],
    startTime,
    endTime: isComplete ? now : null,
    status: isComplete ? 'complete' : 'typing',
    currentTime: now,
  }
}

// ─── Derived values ────────────────────────────────────────────────────────

/**
 * Compute the next key the user should press based on the current item and IME state.
 * For Chinese: the next expected pinyin letter, or the selection digit.
 * For English/space: the character itself.
 */
function computeExpectedKey(item: KeySequenceItem | null, imeState: IMEState): string | null {
  if (!item) return null
  if (item.type === 'space') return ' '
  if (item.type === 'english') return item.char.toLowerCase()

  // Chinese — guide through pinyin letters first, then digit
  const { buffer, candidates } = imeState
  if (buffer.length < item.pinyin.length) {
    return item.pinyin[buffer.length]
  }
  return getTargetDigit(candidates, item.char) ?? '1'
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useTypingSession(initialItems: KeySequenceItem[]) {
  const [session, dispatch] = useReducer(sessionReducer, null, () =>
    createInitialSession(initialItems),
  )

  // Live timer
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (session.startTime && session.status !== 'complete') {
      timerRef.current = setInterval(
        () => dispatch({ type: 'tick', now: Date.now() }),
        500,
      )
      return () => {
        if (timerRef.current) clearInterval(timerRef.current)
      }
    }
  }, [session.startTime, session.status])

  const handleKeyPress = useCallback((key: string) => {
    dispatch({ type: 'key', key, now: Date.now() })
  }, [])

  const reset = useCallback((items: KeySequenceItem[]) => {
    if (timerRef.current) clearInterval(timerRef.current)
    dispatch({ type: 'reset', items })
  }, [])

  // ── Derived stats ────────────────────────────────────────────────────────

  const elapsed = session.endTime
    ? session.endTime - session.startTime!
    : session.startTime
      ? session.currentTime - session.startTime
      : 0

  const correctCount = session.keyResults.filter(r => r.correct).length
  const totalCount = session.keyResults.length
  const wpm = elapsed > 0 ? Math.round((correctCount / 5) / (elapsed / 60_000)) : 0
  const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 100

  const currentItem = session.currentIndex < session.items.length
    ? session.items[session.currentIndex]
    : null

  const expectedKey = computeExpectedKey(currentItem, session.imeState)

  // ── Build final session result ─────────────────────────────────────────

  const buildResult = (): SessionResult | null => {
    if (session.status !== 'complete') return null

    const fingerStats: Record<string, FingerStat> = {}
    const allFingers: FingerName[] = [
      'left-pinky', 'left-ring', 'left-middle', 'left-index', 'left-thumb',
      'right-thumb', 'right-index', 'right-middle', 'right-ring', 'right-pinky',
    ]
    for (const f of allFingers) {
      fingerStats[f] = { finger: f, name: FINGER_NAMES[f], color: FINGER_COLORS[f], correct: 0, wrong: 0 }
    }
    for (const r of session.keyResults) {
      const keyId = r.expected === ' ' ? 'Space' : KEY_TO_ID[r.expected]
      const fi = keyId ? KEY_FINGER_MAP[keyId] : null
      if (fi) {
        if (r.correct) fingerStats[fi.finger].correct++
        else fingerStats[fi.finger].wrong++
      }
    }

    return {
      totalKeys: totalCount,
      correctKeys: correctCount,
      wpm,
      accuracy,
      keyResults: session.keyResults,
      duration: elapsed,
      fingerStats: Object.values(fingerStats),
    }
  }

  return {
    state: session.status,
    currentIndex: session.currentIndex,
    totalItems: session.items.length,
    keyResults: session.keyResults,
    itemResults: session.itemResults,
    imeBuffer: session.imeState.buffer,
    imeCandidates: session.imeState.candidates,
    expectedKey,
    elapsed,
    wpm,
    accuracy,
    handleKeyPress,
    reset,
    result: buildResult(),
  }
}
