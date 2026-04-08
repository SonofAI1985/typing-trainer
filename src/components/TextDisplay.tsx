import type { KeySequenceItem, KeyResult } from '../types'

interface Props {
  sequence: KeySequenceItem[]
  currentFlatIndex: number
  keyResults: KeyResult[]
}

// IME candidate bar — shows up to 9 numbered candidates, highlights the target
function CandidateBar({ candidates, targetChar }: {
  candidates: string[]
  targetChar: string
}) {
  if (!candidates.length) return null
  return (
    <div className="flex items-center gap-1 bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 text-xs mb-1 shadow-lg">
      {candidates.map((c, i) => {
        const num = String(i + 1)
        const isTarget = c === targetChar
        return (
          <span
            key={i}
            className={[
              'flex items-center gap-0.5 px-1.5 py-0.5 rounded',
              isTarget
                ? 'bg-yellow-500 text-gray-900 font-bold'
                : 'text-gray-300',
            ].join(' ')}
          >
            <span className="text-[10px] opacity-70">{num}.</span>
            <span className="text-sm leading-none">{c}</span>
          </span>
        )
      })}
    </div>
  )
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

  // Find the current item for IME bar rendering
  const currentItemIdx = sequence.findIndex((_, idx) => {
    const [s, e] = itemRanges[idx]
    return s <= currentFlatIndex && currentFlatIndex < e
  })
  const currentItem = currentItemIdx >= 0 ? sequence[currentItemIdx] : null
  const currentItemRange = currentItemIdx >= 0 ? itemRanges[currentItemIdx] : null

  // Show candidate bar only when waiting for IME selection digit
  const showCandidateBar = !!(
    currentItem?.hasImeSelect &&
    currentItem.candidates?.length &&
    currentItemRange &&
    currentFlatIndex === currentItemRange[1] - 1   // on the last key (the digit)
  )

  return (
    <div className="flex flex-col gap-2">
      {/* IME candidate bar */}
      {showCandidateBar && currentItem && (
        <CandidateBar
          candidates={currentItem.candidates!}
          targetChar={currentItem.char}
        />
      )}

      {/* Text + pinyin display */}
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

          const pinyinKeyCount = item.hasImeSelect ? item.keys.length - 1 : item.keys.length
          const imeSelectIdx = item.hasImeSelect ? start + pinyinKeyCount : null
          const selectKey = item.hasImeSelect ? item.keys[item.keys.length - 1] : null

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
                  if (done) cls += status === 'correct' ? 'text-green-400' : 'text-red-400'
                  else if (current) cls += 'text-yellow-300 font-bold underline underline-offset-2'
                  else cls += 'text-gray-500'
                  return <span key={ki} className={cls}>{k}</span>
                })}

                {/* IME selection digit badge */}
                {item.hasImeSelect && imeSelectIdx !== null && (() => {
                  const flatIdx = imeSelectIdx
                  const done = flatIdx < currentFlatIndex
                  const current = flatIdx === currentFlatIndex
                  const status = keyStatusMap[flatIdx]

                  const bgColor = done
                    ? (status === 'correct' ? 'bg-green-700' : 'bg-red-700')
                    : current ? 'bg-yellow-500' : 'bg-gray-700'
                  const textColor = done || current ? 'text-white' : 'text-gray-400'

                  return (
                    <span
                      key="ime"
                      className={`ml-0.5 text-[9px] font-bold leading-none px-1 rounded ${bgColor} ${textColor} ${current ? 'animate-pulse' : ''}`}
                      title={`按 ${selectKey} 选择候选词`}
                    >
                      {selectKey}
                    </span>
                  )
                })()}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
