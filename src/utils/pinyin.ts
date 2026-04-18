import { pinyin as getPinyin, segment as getWords } from 'pinyin-pro'
import type { KeySequenceItem } from '../types'
import { getCandidates } from '../core/imeEngine'

function isChinese(char: string): boolean {
  return /[\u4e00-\u9fff]/.test(char)
}

/** Strip tone marks → base pinyin, e.g. "nǐ" → "ni". */
function stripTones(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[ūúǔù]/g, 'u')
    .replace(/ü/g, 'v')
}

/** Concatenated tone-stripped pinyin for a word, e.g. "你好" → "nihao". */
function wordBasePinyin(word: string): string {
  return getPinyin(word, { toneType: 'none', type: 'string' })
    .replace(/\s+/g, '')
}

// ─────────────────────────────────────────────────────────────────────────────

export function textToKeySequence(text: string, mode: 'chinese' | 'english'): KeySequenceItem[] {
  if (mode === 'english') return englishToItems(text)
  return chineseToItems(text)
}

function chineseToItems(text: string): KeySequenceItem[] {
  const result: KeySequenceItem[] = []

  // pinyin-pro segment splits into meaningful words
  const rawSegments = getWords(text) as { origin: string; result: string }[]
  const segments: string[] = rawSegments.map(s => s.origin).filter(Boolean)

  if (segments.length === 0) {
    // Fallback: character by character
    for (const char of [...text]) {
      if (isChinese(char)) {
        const py = stripTones(getPinyin(char, { toneType: 'symbol', type: 'string' }))
        result.push({ char, pinyin: py, type: 'chinese' })
      }
    }
    return result
  }

  for (const seg of segments) {
    if (!seg || seg === ' ') {
      result.push({ char: ' ', pinyin: ' ', type: 'space' })
      continue
    }

    const chars = [...seg]
    const hasChinese = chars.some(isChinese)
    if (!hasChinese) {
      // ASCII / punctuation inside Chinese text — skip silently
      continue
    }

    if (chars.length >= 2) {
      const pinyin = wordBasePinyin(seg)
      // Use phrase mode if this word appears in the IME engine's candidates
      if (getCandidates(pinyin).includes(seg)) {
        result.push({ char: seg, pinyin, type: 'chinese' })
        continue
      }
    }

    // Fall back to character-by-character
    for (const char of chars) {
      if (isChinese(char)) {
        const py = stripTones(getPinyin(char, { toneType: 'symbol', type: 'string' }))
        result.push({ char, pinyin: py, type: 'chinese' })
      }
    }
  }

  return result
}

function englishToItems(text: string): KeySequenceItem[] {
  const result: KeySequenceItem[] = []
  const words = text.trim().split(/\s+/)
  for (let wi = 0; wi < words.length; wi++) {
    for (const char of words[wi].toLowerCase()) {
      if (/[a-z0-9]/.test(char)) {
        result.push({ char, pinyin: char, type: 'english' })
      }
    }
    if (wi < words.length - 1) {
      result.push({ char: ' ', pinyin: ' ', type: 'space' })
    }
  }
  return result
}
