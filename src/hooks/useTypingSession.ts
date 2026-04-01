import { useState, useCallback, useRef } from 'react'
import type { KeySequenceItem, KeyResult, SessionResult, SessionState, FingerStat } from '../types'
import { flattenToKeys } from '../utils/pinyin'
import { KEY_FINGER_MAP, KEY_TO_ID, FINGER_COLORS, FINGER_NAMES } from '../data/fingerMap'
import type { FingerName } from '../types'

interface FlatKey {
  key: string
  itemIndex: number
  keyIndex: number
}

interface TypingSession {
  state: SessionState
  currentFlatIndex: number
  flatKeys: FlatKey[]
  keyResults: KeyResult[]
  startTime: number | null
  currentTime: number
}

export function useTypingSession(sequence: KeySequenceItem[]) {
  const flatKeys = flattenToKeys(sequence)

  const [session, setSession] = useState<TypingSession>({
    state: 'ready',
    currentFlatIndex: 0,
    flatKeys,
    keyResults: [],
    startTime: null,
    currentTime: Date.now(),
  })

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      setSession(s => ({ ...s, currentTime: Date.now() }))
    }, 500)
  }, [])

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const handleKeyPress = useCallback((key: string) => {
    setSession(prev => {
      if (prev.state === 'complete') return prev
      if (prev.currentFlatIndex >= prev.flatKeys.length) return prev

      const expectedKey = prev.flatKeys[prev.currentFlatIndex].key
      const correct = key === expectedKey
      const now = Date.now()

      const newResult: KeyResult = {
        expected: expectedKey,
        actual: key,
        correct,
        timestamp: now,
      }

      const newResults = [...prev.keyResults, newResult]
      const nextIndex = prev.currentFlatIndex + 1
      const isComplete = nextIndex >= prev.flatKeys.length

      // Start timer on first key press
      let startTime = prev.startTime
      if (!startTime) {
        startTime = now
        startTimer()
      }

      if (isComplete) {
        stopTimer()
      }

      return {
        ...prev,
        state: isComplete ? 'complete' : 'typing',
        startTime,
        currentFlatIndex: nextIndex,
        keyResults: newResults,
        currentTime: now,
      }
    })
  }, [startTimer, stopTimer])

  const reset = useCallback((newSequence: KeySequenceItem[]) => {
    stopTimer()
    setSession({
      state: 'ready',
      currentFlatIndex: 0,
      flatKeys: flattenToKeys(newSequence),
      keyResults: [],
      startTime: null,
      currentTime: Date.now(),
    })
  }, [stopTimer])

  // Computed values
  const elapsed = session.startTime ? session.currentTime - session.startTime : 0
  const correctCount = session.keyResults.filter(r => r.correct).length
  const totalCount = session.keyResults.length
  const wpm = elapsed > 0 ? Math.round((correctCount / 5) / (elapsed / 60000)) : 0
  const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 100

  const expectedKey = session.state !== 'complete' && session.currentFlatIndex < flatKeys.length
    ? flatKeys[session.currentFlatIndex]?.key ?? null
    : null

  // Build result when complete
  const buildResult = (): SessionResult | null => {
    if (session.state !== 'complete') return null

    const fingerStats: Record<string, FingerStat> = {}
    const allFingers: FingerName[] = [
      'left-pinky', 'left-ring', 'left-middle', 'left-index', 'left-thumb',
      'right-thumb', 'right-index', 'right-middle', 'right-ring', 'right-pinky',
    ]
    for (const f of allFingers) {
      fingerStats[f] = {
        finger: f,
        name: FINGER_NAMES[f],
        color: FINGER_COLORS[f],
        correct: 0,
        wrong: 0,
      }
    }

    const keyStats: Record<string, { correct: number; wrong: number }> = {}

    for (const result of session.keyResults) {
      const keyId = KEY_TO_ID[result.expected]
      const fi = keyId ? KEY_FINGER_MAP[keyId] : null
      if (fi) {
        if (result.correct) fingerStats[fi.finger].correct++
        else fingerStats[fi.finger].wrong++
      }
      if (!keyStats[result.expected]) keyStats[result.expected] = { correct: 0, wrong: 0 }
      if (result.correct) keyStats[result.expected].correct++
      else keyStats[result.expected].wrong++
    }

    return {
      totalKeys: session.keyResults.length,
      correctKeys: correctCount,
      wpm,
      accuracy,
      keyResults: session.keyResults,
      duration: elapsed,
      fingerStats: Object.values(fingerStats),
    }
  }

  return {
    state: session.state,
    currentFlatIndex: session.currentFlatIndex,
    keyResults: session.keyResults,
    expectedKey,
    elapsed,
    wpm,
    accuracy,
    totalKeys: flatKeys.length,
    handleKeyPress,
    reset,
    result: buildResult(),
  }
}
