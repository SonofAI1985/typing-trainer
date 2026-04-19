import { useReducer, useEffect, useCallback, useRef } from 'react'
import type { KeySequenceItem, KeyResult, ItemResult, SessionResult, SessionState, FingerStat } from '../types'
import type { FingerName } from '../types'
import { KEY_FINGER_MAP, KEY_TO_ID, FINGER_COLORS, FINGER_NAMES } from '../data/fingerMap'
import { imeStep, getTargetDigit, IME_INITIAL, PAGE_SIZE, type IMEState } from '../core/imeEngine'

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

// ─── Multi-item matching ─────────────────────────────────────────────────

/**
 * Given a committed word and the items from currentIndex onward,
 * find how many consecutive Chinese items it covers.
 *
 * E.g. committed = "床前", items = [{char:"床"}, {char:"前"}, ...] → 2
 * E.g. committed = "床前", items = [{char:"床前"}, ...] → 1  (phrase item)
 * E.g. committed = "传", items = [{char:"床"}, ...] → 1  (wrong but still advance)
 */
function matchCommittedToItems(committed: string, items: KeySequenceItem[], startIdx: number): number {
  // First check: does it match the current item exactly (phrase mode)?
  const first = items[startIdx]
  if (first && first.char === committed) return 1

  // Count how many items the committed word covers by character count.
  // Even if the characters are wrong (e.g. committed "窗前" vs target "床前"),
  // we advance by the number of characters — correctness is tracked in itemResults.
  const committedChars = [...committed]
  let charPos = 0
  let itemsCovered = 0

  for (let i = startIdx; i < items.length && charPos < committedChars.length; i++) {
    const item = items[i]
    if (item.type !== 'chinese') break
    const itemCharCount = [...item.char].length
    charPos += itemCharCount
    itemsCovered++
  }

  // At minimum advance 1 item
  return Math.max(1, itemsCovered)
}

/**
 * Build keystroke-level KeyResult records for committed Chinese items.
 * Records the pinyin letters typed and the digit selection.
 */
function buildKeyResultsForCommit(
  items: KeySequenceItem[],
  startIdx: number,
  itemCount: number,
  bufferBeforeCommit: string,
  candidatesAtCommit: string[],
  committed: string,
  pressedDigit: string,
  timestamp: number,
): KeyResult[] {
  const krs: KeyResult[] = []

  // Concatenate expected pinyin for all matched items
  let expectedPinyin = ''
  for (let i = startIdx; i < startIdx + itemCount && i < items.length; i++) {
    if (items[i].type === 'chinese') expectedPinyin += items[i].pinyin
  }

  for (let i = 0; i < expectedPinyin.length; i++) {
    krs.push({
      expected: expectedPinyin[i],
      actual: bufferBeforeCommit[i] ?? '',
      correct: bufferBeforeCommit[i] === expectedPinyin[i],
      timestamp,
    })
  }

  // The digit/space selection
  const target = items.slice(startIdx, startIdx + itemCount).map(it => it.char).join('')
  const expectedDigit = getTargetDigit(candidatesAtCommit, target) ?? getTargetDigit(candidatesAtCommit, committed) ?? '1'
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

  // If IME has an active buffer, route all keys through the Chinese handler
  // regardless of current item type (handles carry-over from previous word)
  const hasIMEBuffer = state.imeState.buffer.length > 0

  // ── Chinese: route through IME ──────────────────────────────────────────
  if (item.type === 'chinese' || hasIMEBuffer) {
    // Backspace only affects the buffer, never starts the timer
    if (key === 'backspace') {
      return { ...state, imeState: imeStep(state.imeState, key) }
    }

    // Page navigation doesn't start the timer either
    if (key === '+' || key === '=' || key === '-' || key === 'pagedown' || key === 'pageup') {
      if (!state.imeState.buffer) return state
      return { ...state, imeState: imeStep(state.imeState, key) }
    }

    const newIME = imeStep(state.imeState, key)

    if (newIME.committed !== null) {
      // User selected a candidate — figure out how many items it covers
      const itemsCovered = matchCommittedToItems(
        newIME.committed,
        state.items,
        state.currentIndex,
      )

      const krs = buildKeyResultsForCommit(
        state.items,
        state.currentIndex,
        itemsCovered,
        state.imeState.buffer,
        state.imeState.candidates,
        newIME.committed,
        newIME.pressedDigit ?? key,
        now,
      )

      // Build item results for each covered item
      const newItemResults: ItemResult[] = []
      const committedChars = [...newIME.committed]
      let charPos = 0
      for (let i = 0; i < itemsCovered; i++) {
        const idx = state.currentIndex + i
        const it = state.items[idx]
        if (!it) break
        const itemChars = [...it.char]
        const slice = committedChars.slice(charPos, charPos + itemChars.length).join('')
        charPos += itemChars.length
        newItemResults.push({
          itemIndex: idx,
          committed: slice || newIME.committed,
          correct: slice === it.char,
        })
      }

      const nextIndex = state.currentIndex + itemsCovered
      const isComplete = nextIndex >= state.items.length

      return {
        ...state,
        currentIndex: nextIndex,
        imeState: newIME.buffer ? newIME : IME_INITIAL,
        keyResults: [...state.keyResults, ...krs],
        itemResults: [...state.itemResults, ...newItemResults],
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

// ─── Key-correctness check (for live audio/streak feedback) ──────────────
// A keystroke is correct if it moves the current item(s) forward along any
// valid path: typing the next pinyin letter, or selecting a candidate whose
// characters match items starting at currentIndex.

function wordMatchesItems(committed: string, items: KeySequenceItem[], startIdx: number): boolean {
  const chars = [...committed]
  let pos = 0
  for (let i = startIdx; i < items.length && pos < chars.length; i++) {
    const it = items[i]
    if (it.type !== 'chinese') return false
    for (const ch of [...it.char]) {
      if (pos >= chars.length) break
      if (chars[pos] !== ch) return false
      pos++
    }
  }
  return pos === chars.length
}

function checkKey(state: TypingSession, key: string): boolean {
  if (state.status === 'complete') return false
  const item = state.items[state.currentIndex]
  if (!item) return false

  const hasIMEBuffer = state.imeState.buffer.length > 0

  if (item.type === 'chinese' || hasIMEBuffer) {
    if (/^[a-z]$/.test(key)) {
      let combined = ''
      for (let i = state.currentIndex; i < state.items.length; i++) {
        if (state.items[i].type !== 'chinese') break
        combined += state.items[i].pinyin
      }
      return combined[state.imeState.buffer.length] === key
    }
    if (key === ' ' || /^[1-9]$/.test(key)) {
      const pageIdx = key === ' ' ? 0 : Number(key) - 1
      const word = state.imeState.candidates[pageIdx]
      if (!word) return false
      return wordMatchesItems(word, state.items, state.currentIndex)
    }
    return false
  }

  const expected = item.type === 'space' ? ' ' : item.char.toLowerCase()
  return key === expected
}

// ─── Derived values ────────────────────────────────────────────────────────

/**
 * Compute the next key the user should press based on the current item and IME state.
 *
 * For continuous Chinese typing: concatenates pinyin for all consecutive Chinese
 * items from currentIndex onward. If the buffer is still shorter than the combined
 * pinyin, guide the next letter — allowing the user to type multiple words without
 * stopping to press a digit for each one.
 *
 * When the buffer covers at least the current item's pinyin AND has candidates,
 * the user MAY press digit/space to commit, but they can also keep typing.
 */
function computeExpectedKey(
  items: KeySequenceItem[],
  currentIndex: number,
  imeState: IMEState,
): string | null {
  const item = items[currentIndex] ?? null
  if (!item) return null
  if (item.type === 'space') return ' '
  if (item.type === 'english') return item.char.toLowerCase()

  const { buffer, candidates, allCandidates } = imeState

  // Build combined pinyin for consecutive Chinese items starting from currentIndex
  let combinedPinyin = ''
  for (let i = currentIndex; i < items.length; i++) {
    if (items[i].type !== 'chinese') break
    combinedPinyin += items[i].pinyin
  }

  // If buffer is shorter than combined pinyin, guide the next letter
  if (buffer.length < combinedPinyin.length) {
    return combinedPinyin[buffer.length]
  }

  // Buffer covers all remaining pinyin — guide to digit/space
  const pageDigit = getTargetDigit(candidates, item.char)
  if (pageDigit) return pageDigit

  if (allCandidates.includes(item.char)) return '+'

  return '1'
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

  const sessionRef = useRef(session)
  sessionRef.current = session

  const handleKeyPress = useCallback((key: string) => {
    dispatch({ type: 'key', key, now: Date.now() })
  }, [])

  const isKeyCorrect = useCallback((key: string) => {
    return checkKey(sessionRef.current, key)
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

  const expectedKey = computeExpectedKey(session.items, session.currentIndex, session.imeState)

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
    imePage: session.imeState.page,
    imeTotalPages: Math.max(1, Math.ceil(session.imeState.allCandidates.length / PAGE_SIZE)),
    expectedKey,
    elapsed,
    wpm,
    accuracy,
    handleKeyPress,
    isKeyCorrect,
    reset,
    result: buildResult(),
  }
}
