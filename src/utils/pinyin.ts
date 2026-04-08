import { pinyin as getPinyin } from 'pinyin-pro'
import type { KeySequenceItem } from '../types'
import candidatesData from '../data/pinyinCandidates.json'

const CANDIDATES = candidatesData as Record<string, string[]>

// Strip tone marks from pinyin to get base form (e.g. "tiān" -> "tian")
function stripTones(s: string): string {
  return s.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ü/g, 'v')
    .replace(/[ūúǔù]/g, 'u')
}

// Return ordered candidate list for a given base pinyin (max 9)
export function getCandidates(basePinyin: string): string[] {
  return CANDIDATES[basePinyin] ?? []
}

// Return which number key (1-9) to press for a character.
// Falls back to '1' if the char isn't in our dict for this pinyin.
export function getCandidateNum(char: string, basePinyin: string): string {
  const list = CANDIDATES[basePinyin]
  if (!list) return '1'
  const idx = list.indexOf(char)
  if (idx < 0) return '1'
  return String(idx + 1)   // 1-based
}

function isChinese(char: string): boolean {
  return /[\u4e00-\u9fff]/.test(char)
}

export function textToKeySequence(text: string, mode: 'chinese' | 'english'): KeySequenceItem[] {
  if (mode === 'english') return englishToKeySequence(text)
  return chineseToKeySequence(text)
}

function chineseToKeySequence(text: string): KeySequenceItem[] {
  const result: KeySequenceItem[] = []

  const pinyinArray = getPinyin(text, {
    toneType: 'none',
    type: 'array',
    nonZh: 'consecutive',
  }) as string[]

  const chars = Array.from(text)

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i]
    const py = pinyinArray[i] ?? char

    if (isChinese(char)) {
      const base = stripTones(py.toLowerCase())
      const numKey = getCandidateNum(char, base)
      const keys = [...base.split(''), numKey]
      // Store the full candidate list so TextDisplay can render the candidate bar
      const candidates = getCandidates(base)
      result.push({ char, pinyin: py, keys, hasImeSelect: true, candidates })
    } else if (char === ' ') {
      result.push({ char: ' ', pinyin: ' ', keys: [' '] })
    } else if (char.match(/[a-zA-Z0-9]/)) {
      result.push({ char, pinyin: char.toLowerCase(), keys: [char.toLowerCase()] })
    }
    // Skip punctuation
  }

  return result
}

function englishToKeySequence(text: string): KeySequenceItem[] {
  const result: KeySequenceItem[] = []
  const words = text.trim().split(/\s+/)
  for (let wi = 0; wi < words.length; wi++) {
    const word = words[wi]
    for (const char of word.toLowerCase()) {
      if (char.match(/[a-z0-9]/)) {
        result.push({ char, pinyin: char, keys: [char] })
      }
    }
    if (wi < words.length - 1) {
      result.push({ char: ' ', pinyin: ' ', keys: [' '] })
    }
  }
  return result
}

export function flattenToKeys(sequence: KeySequenceItem[]): Array<{ key: string; itemIndex: number; keyIndex: number }> {
  const flat: Array<{ key: string; itemIndex: number; keyIndex: number }> = []
  sequence.forEach((item, itemIndex) => {
    item.keys.forEach((key, keyIndex) => {
      flat.push({ key, itemIndex, keyIndex })
    })
  })
  return flat
}
