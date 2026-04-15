import { useState, useCallback, useEffect, useRef } from 'react'
import { imeStep, IME_INITIAL, getCandidates, getTargetDigit, type IMEState } from '../core/imeEngine'

export interface UseIMEReturn {
  buffer: string
  candidates: string[]
  /** The digit key that would select the current target (null if not in candidates). */
  expectedDigit: string | null
  handleKey: (key: string) => void
  reset: () => void
}

/**
 * React hook wrapping the IME state machine.
 *
 * @param onCommit  Called when the user commits a word via a digit key.
 * @param target    The current target character/word — used to compute expectedDigit.
 */
export function useIME(
  onCommit: (word: string, digit: string) => void,
  target: string | null,
): UseIMEReturn {
  const [state, setState] = useState<IMEState>(IME_INITIAL)

  // Stable ref so the effect below doesn't need onCommit in its deps
  const onCommitRef = useRef(onCommit)
  onCommitRef.current = onCommit

  const handleKey = useCallback((key: string) => {
    setState(prev => imeStep(prev, key))
  }, [])

  // Fire onCommit after the state update that produced a committed word
  useEffect(() => {
    if (state.committed && state.pressedDigit) {
      onCommitRef.current(state.committed, state.pressedDigit)
    }
  }, [state.committed, state.pressedDigit])

  const reset = useCallback(() => setState(IME_INITIAL), [])

  const expectedDigit = target ? getTargetDigit(state.candidates, target) : null

  return {
    buffer: state.buffer,
    candidates: state.candidates,
    expectedDigit,
    handleKey,
    reset,
  }
}

// Re-export helpers so consumers don't need a separate import
export { getCandidates, getTargetDigit }
