import type { KeySequenceItem, ItemResult } from '../types'

interface Props {
  sequence: KeySequenceItem[]
  currentIndex: number
  itemResults: ItemResult[]
  imeBuffer: string
  imeCandidates: string[]
  imePage?: number
  imeTotalPages?: number
}

// ─── Live candidate bar ───────────────────────────────────────────────────

function CandidateBar({
  candidates,
  target,
  page = 0,
  totalPages = 1,
}: {
  candidates: string[]
  target: string
  page?: number
  totalPages?: number
}) {
  if (!candidates.length) return null
  return (
    <div className="flex items-center gap-1 bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 text-xs shadow-lg">
      {candidates.map((c, i) => {
        const isTarget = c === target
        return (
          <span
            key={i}
            className={[
              'flex items-center gap-0.5 px-1.5 py-0.5 rounded transition-colors',
              isTarget
                ? 'bg-yellow-500 text-gray-900 font-bold'
                : 'text-gray-300',
            ].join(' ')}
          >
            <span className="text-[10px] opacity-70">{i + 1}.</span>
            <span className="text-sm leading-none">{c}</span>
          </span>
        )
      })}
      {totalPages > 1 && (
        <span className="text-[10px] text-gray-500 ml-1 whitespace-nowrap">
          {page + 1}/{totalPages} (+/-)
        </span>
      )}
    </div>
  )
}

// ─── Pinyin progress row (shown below each char) ──────────────────────────

/** For a Chinese item being actively typed: overlays the (per-item) buffer slice on expected pinyin. */
function LivePinyinRow({
  pinyin,
  buffer,
  showCursor,
  overflow = '',
}: {
  pinyin: string
  buffer: string
  showCursor: boolean
  overflow?: string
}) {
  return (
    <div className="flex items-center gap-px">
      {pinyin.split('').map((expected, i) => {
        const typed = buffer[i]
        let cls = 'text-xs leading-none '
        if (typed === undefined) {
          cls += 'text-gray-500'
        } else if (typed === expected) {
          cls += 'text-green-400'
        } else {
          cls += 'text-red-400'
        }
        return (
          <span key={i} className={cls}>
            {typed ?? expected}
          </span>
        )
      })}

      {/* Overflow only on the last Chinese item if buffer exceeds combined pinyin */}
      {overflow && (
        <span className="text-xs leading-none text-orange-400">{overflow}</span>
      )}

      {showCursor && (
        <span className="text-xs leading-none text-yellow-300 animate-pulse">_</span>
      )}
    </div>
  )
}

/** For COMPLETED Chinese items: show expected pinyin with green/red coloring. */
function DonePinyinRow({ pinyin, correct }: { pinyin: string; correct: boolean }) {
  return (
    <span className={`text-xs leading-none ${correct ? 'text-green-400' : 'text-red-400'}`}>
      {pinyin}
    </span>
  )
}

// ─── Main component ───────────────────────────────────────────────────────

export function TextDisplay({ sequence, currentIndex, itemResults, imeBuffer, imeCandidates, imePage = 0, imeTotalPages = 1 }: Props) {
  // Build a lookup: itemIndex → ItemResult
  const resultByIndex = new Map(itemResults.map(r => [r.itemIndex, r]))

  const currentItem = sequence[currentIndex] ?? null
  const showCandidateBar =
    currentItem?.type === 'chinese' &&
    imeCandidates.length > 0

  // Distribute IME buffer letters across consecutive Chinese items from currentIndex.
  // Lets phrases like "chuangqian" color correctly across "床" and "前" pinyin rows.
  const liveMap = new Map<number, { slice: string; showCursor: boolean; overflow: string }>()
  if (currentItem?.type === 'chinese') {
    let offset = 0
    let cursorPlaced = false
    let lastIdx = currentIndex
    for (let i = currentIndex; i < sequence.length; i++) {
      const it = sequence[i]
      if (it.type !== 'chinese') break
      if (i > currentIndex && offset >= imeBuffer.length) break
      const pinyinLen = it.pinyin.length
      const slice = imeBuffer.slice(offset, Math.min(imeBuffer.length, offset + pinyinLen))
      const ends = offset + pinyinLen
      const showCursor = !cursorPlaced && imeBuffer.length < ends
      if (showCursor) cursorPlaced = true
      liveMap.set(i, { slice, showCursor, overflow: '' })
      offset += pinyinLen
      lastIdx = i
    }
    // Buffer overruns combined pinyin: show tail as overflow on last item; cursor there too.
    if (!cursorPlaced && imeBuffer.length > offset - (sequence[lastIdx]?.pinyin.length ?? 0)) {
      const entry = liveMap.get(lastIdx)
      if (entry) {
        entry.overflow = imeBuffer.slice(offset)
        entry.showCursor = true
      }
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Live candidate bar — shown above text when candidates are available */}
      {showCandidateBar && currentItem && (
        <CandidateBar candidates={imeCandidates} target={currentItem.char} page={imePage} totalPages={imeTotalPages} />
      )}

      {/* Text + pinyin grid */}
      <div className="flex flex-wrap gap-x-2 gap-y-5 p-4 bg-gray-800 rounded-xl min-h-24 select-none">
        {sequence.map((item, idx) => {
          const isDone = idx < currentIndex
          const isCurrent = idx === currentIndex
          const result = resultByIndex.get(idx)

          // ── Space ──────────────────────────────────────────────────────
          if (item.type === 'space') {
            return (
              <div
                key={idx}
                className={[
                  'w-3 flex items-end pb-1',
                  isCurrent ? 'border-b-2 border-yellow-400 animate-pulse' : '',
                  isDone
                    ? result?.correct
                      ? 'border-b-2 border-green-500'
                      : 'border-b-2 border-red-500'
                    : '',
                ].join(' ')}
              />
            )
          }

          // ── Char color ─────────────────────────────────────────────────
          const charColor = isDone
            ? (result?.correct ? 'text-green-400' : 'text-red-400')
            : isCurrent
            ? 'text-yellow-200'
            : 'text-gray-500'

          // ── English / Chinese item ─────────────────────────────────────
          return (
            <div key={idx} className="flex flex-col items-center gap-0.5">
              {/* Character */}
              <span className={`text-xl font-bold leading-none ${charColor}`}>
                {item.char}
              </span>

              {/* Pinyin row */}
              {item.type === 'chinese' && (
                <div className="flex items-center">
                  {isDone ? (
                    <DonePinyinRow pinyin={item.pinyin} correct={result?.correct ?? false} />
                  ) : liveMap.has(idx) ? (
                    <LivePinyinRow
                      pinyin={item.pinyin}
                      buffer={liveMap.get(idx)!.slice}
                      showCursor={liveMap.get(idx)!.showCursor}
                      overflow={liveMap.get(idx)!.overflow}
                    />
                  ) : (
                    <span className="text-xs leading-none text-gray-600">{item.pinyin}</span>
                  )}
                </div>
              )}

              {/* English: single-char cursor underline */}
              {item.type === 'english' && isCurrent && (
                <div className="w-full border-b-2 border-yellow-400 animate-pulse" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
