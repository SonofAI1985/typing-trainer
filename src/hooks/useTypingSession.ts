import { useState, useCallback, useEffect, useRef } from 'react'
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
  endTime: number | null   // frozen at completion — fixes timer-still-running bug
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
    endTime: null,
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

  // Stop the interval via useEffect (not inside a state updater)
  useEffect(() => {
    if (session.state === 'complete') stopTimer()
  }, [session.state])

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

      let startTime = prev.startTime
      if (!startTime) {
        startTime = now
        startTimer()
      }

      return {
        ...prev,
        state: isComplete ? 'complete' : 'typing',
        startTime,
        endTime: isComplete ? now : null,   // freeze the end timestamp
        currentFlatIndex: nextIndex,
        keyResults: newResults,
        currentTime: now,
      }
    })
  }, [startTimer])

  const reset = useCallback((newSequence: KeySequenceItem[]) => {
    stopTimer()
    setSession({
      state: 'ready',
      currentFlatIndex: 0,
      flatKeys: flattenToKeys(newSequence),
      keyResults: [],
      startTime: null,
      endTime: null,
      currentTime: Date.now(),
    })
  }, [stopTimer])

  // elapsed: frozen at endTime when complete, otherwise live
  const elapsed = session.endTime
    ? session.endTime - session.startTime!
    : session.startTime
      ? session.currentTime - session.startTime
      : 0

  const correctCount = session.keyResults.filter(r => r.correct).length
  const totalCount = session.keyResults.length
  const wpm = elapsed > 0 ? Math.round((correctCount / 5) / (elapsed / 60000)) : 0
  const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 100

  const expectedKey = session.state !== 'complete' && session.currentFlatIndex < flatKeys.length
    ? flatKeys[session.currentFlatIndex]?.key ?? null
    : null

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

    for (const result of session.keyResults) {
      const keyId = KEY_TO_ID[result.expected]
      const fi = keyId ? KEY_FINGER_MAP[keyId] : null
      if (fi) {
        if (result.correct) fingerStats[fi.finger].correct++
        else fingerStats[fi.finger].wrong++
      }
    }

    return {
      totalKeys: session.keyResults.length,
      correctKeys: correctCount,
      wpm,
      accuracy,
      keyResults: session.keyResults,
      duration: elapsed,   // elapsed is already frozen via endTime
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
