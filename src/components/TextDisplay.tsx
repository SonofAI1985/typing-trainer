import type { KeySequenceItem, KeyResult } from '../types'

interface Props {
  sequence: KeySequenceItem[]
  currentFlatIndex: number
  keyResults: KeyResult[]
}

export function TextDisplay({ sequence, currentFlatIndex, keyResults }: Props) {
  // Build a flat index → status map
  const keyStatusMap: Record<number, 'correct' | 'wrong'> = {}
  keyResults.forEach((r, i) => {
    keyStatusMap[i] = r.correct ? 'correct' : 'wrong'
  })

  // Per-item flat key ranges: itemIndex → [startFlat, endFlat)
  const itemRanges: Array<[number, number]> = []
  let cursor = 0
  for (const item of sequence) {
    itemRanges.push([cursor, cursor + item.keys.length])
    cursor += item.keys.length
  }

  return (
    <div className="flex flex-wrap gap-x-1 gap-y-4 p-4 bg-gray-800 rounded-xl min-h-24 select-none">
      {sequence.map((item, itemIdx) => {
        const [start, end] = itemRanges[itemIdx]

        if (item.char === ' ') {
          // Space separator – show as thin gap
          const flatIdx = start
          const isDone = flatIdx < currentFlatIndex
          const isCurrent = flatIdx === currentFlatIndex
          return (
            <div
              key={itemIdx}
              className={[
                'flex items-end pb-1 w-3',
                isCurrent ? 'border-b-2 border-yellow-400 animate-pulse' : '',
                isDone
                  ? (keyStatusMap[flatIdx] === 'correct' ? 'border-b-2 border-green-500' : 'border-b-2 border-red-500')
                  : '',
              ].join(' ')}
            />
          )
        }

        // Determine item-level status
        const isDone = end <= currentFlatIndex
        const isCurrent = start <= currentFlatIndex && currentFlatIndex < end

        const charColor = isDone
          ? (keyResults.slice(start, end).every(r => r.correct) ? 'text-green-400' : 'text-red-400')
          : isCurrent
          ? 'text-yellow-200'
          : 'text-gray-500'

        return (
          <div key={itemIdx} className="flex flex-col items-center gap-0.5">
            {/* Chinese character */}
            <span className={`text-xl font-bold leading-none ${charColor}`}>
              {item.char}
            </span>

            {/* Pinyin letters */}
            <div className="flex">
              {item.keys.map((k, ki) => {
                const flatIdx = start + ki
                const done = flatIdx < currentFlatIndex
                const current = flatIdx === currentFlatIndex
                const status = keyStatusMap[flatIdx]

                let cls = 'text-xs leading-none '
                if (done) {
                  cls += status === 'correct' ? 'text-green-400' : 'text-red-400'
                } else if (current) {
                  cls += 'text-yellow-300 font-bold underline underline-offset-2'
                } else {
                  cls += 'text-gray-500'
                }

                return (
                  <span key={ki} className={cls}>
                    {k === ' ' ? '␣' : k}
                  </span>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
