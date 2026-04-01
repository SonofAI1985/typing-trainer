import { useEffect, useState } from 'react'

interface KeyboardState {
  lastKey: string | null
}

export function useKeyboard(
  onKeyPress: (key: string) => void,
  active: boolean,
) {
  const [lastKey, setLastKey] = useState<string | null>(null)

  useEffect(() => {
    if (!active) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore modifier-only keys
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab',
           'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
           'Home', 'End', 'PageUp', 'PageDown', 'Insert', 'Delete',
           'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
      ].includes(e.key)) return

      // Prevent default to stop browser/IME from intercepting
      e.preventDefault()

      const key = e.key === ' ' ? ' ' : e.key.toLowerCase()

      // Only handle printable single characters and space
      if (key.length !== 1) return

      setLastKey(key)
      onKeyPress(key)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [active, onKeyPress])

  return { lastKey } satisfies KeyboardState
}
