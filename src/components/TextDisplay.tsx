import type { KeySequenceItem, KeyResult } from '../types'

interface Props {
  sequence: KeySequenceItem[]
  currentFlatIndex: number
  keyResults: KeyResult[]
}

export function TextDisplay({ sequence, currentFlatIndex, keyResults }: Props) {
  const keyStatusMap: Record<number, 'correct' | 'wrong'> = {}
  keyResults.forEach((r, i) => {
    keyStatusMap[i] = r.correct ? 'correct' : 'wrong'
  })

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

        const isDone = end <= currentFlatIndex
        const isCurrent = start <= currentFlatIndex && currentFlatIndex < end

        const charColor = isDone
          ? (keyResults.slice(start, end).every(r => r.correct) ? 'text-green-400' : 'text-red-400')
          : isCurrent
          ? 'text-yellow-200'
          : 'text-gray-500'

        // For Chinese chars with IME select: last key is the digit, rest are pinyin
        const pinyinKeyCount = item.hasImeSelect ? item.keys.length - 1 : item.keys.length
        const imeSelectIdx = item.hasImeSelect ? start + pinyinKeyCount : null

        return (
          <div key={itemIdx} className="flex flex-col items-center gap-0.5">
            {/* Character */}
            <span className={`text-xl font-bold leading-none ${charColor}`}>
              {item.char}
            </span>

            {/* Keys row */}
            <div className="flex items-center gap-px">
              {/* Pinyin letters */}
              {item.keys.slice(0, pinyinKeyCount).map((k, ki) => {
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
                return <span key={ki} className={cls}>{k}</span>
              })}

              {/* IME candidate selection digit */}
              {item.hasImeSelect && imeSelectIdx !== null && (() => {
                const flatIdx = imeSelectIdx
                const done = flatIdx < currentFlatIndex
                const current = flatIdx === currentFlatIndex
                const status = keyStatusMap[flatIdx]

                const bgColor = done
                  ? (status === 'correct' ? 'bg-green-700' : 'bg-red-700')
                  : current
                  ? 'bg-yellow-500'
                  : 'bg-gray-700'
                const textColor = done || current ? 'text-white' : 'text-gray-400'

                return (
                  <span
                    key="ime"
                    className={`ml-0.5 text-[9px] font-bold leading-none px-1 rounded ${bgColor} ${textColor} ${current ? 'animate-pulse' : ''}`}
                    title="按数字键选择候选词"
                  >
                    ①
                  </span>
                )
              })()}
            </div>
          </div>
        )
      })}
    </div>
  )
}
