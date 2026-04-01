import { useMemo } from 'react'
import { KEY_FINGER_MAP, KEY_TO_ID } from '../data/fingerMap'

interface Props {
  expectedKey: string | null
}

export function FingerHint({ expectedKey }: Props) {
  const fingerInfo = useMemo(() => {
    if (!expectedKey) return null
    const keyId = expectedKey === ' ' ? 'Space' : KEY_TO_ID[expectedKey] ?? null
    if (!keyId) return null
    return KEY_FINGER_MAP[keyId] ?? null
  }, [expectedKey])

  if (!fingerInfo || !expectedKey) {
    return (
      <div className="h-8 flex items-center justify-center text-gray-600 text-sm">
        准备好后开始打字
      </div>
    )
  }

  const displayKey = expectedKey === ' ' ? 'Space' : expectedKey.toUpperCase()

  return (
    <div className="h-8 flex items-center justify-center gap-3">
      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: fingerInfo.color }} />
      <span className="text-sm font-semibold" style={{ color: fingerInfo.color }}>
        {fingerInfo.name}
      </span>
      <span className="text-gray-500">→</span>
      <span
        className="px-2 py-0.5 rounded text-sm font-mono font-bold bg-gray-800 border"
        style={{ color: fingerInfo.color, borderColor: fingerInfo.color + '88' }}
      >
        {displayKey}
      </span>
    </div>
  )
}
