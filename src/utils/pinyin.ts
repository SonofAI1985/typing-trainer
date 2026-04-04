import { pinyin } from 'pinyin-pro'
import type { KeySequenceItem } from '../types'

// Chinese characters that are actually Chinese (not punctuation/space)
function isChinese(char: string): boolean {
  return /[\u4e00-\u9fff]/.test(char)
}

export function textToKeySequence(text: string, mode: 'chinese' | 'english'): KeySequenceItem[] {
  if (mode === 'english') {
    return englishToKeySequence(text)
  }
  return chineseToKeySequence(text)
}

function chineseToKeySequence(text: string): KeySequenceItem[] {
  const result: KeySequenceItem[] = []

  // Get pinyin for all characters at once (handles multi-char words correctly)
  const pinyinArray = pinyin(text, {
    toneType: 'none',
    type: 'array',
    nonZh: 'consecutive',
  }) as string[]

  const chars = Array.from(text)

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i]
    const py = pinyinArray[i] ?? char

    if (isChinese(char)) {
      // Each Chinese character: type pinyin then press '1' to select first candidate
      const keys = [...py.toLowerCase().split(''), '1']
      result.push({ char, pinyin: py, keys, hasImeSelect: true })
    } else if (char === ' ') {
      // Explicit space in source text
      result.push({ char: ' ', pinyin: ' ', keys: [' '] })
    } else if (char.match(/[a-zA-Z0-9]/)) {
      // ASCII characters embedded in Chinese text
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
    // Add space between words (but not after last word)
    if (wi < words.length - 1) {
      result.push({ char: ' ', pinyin: ' ', keys: [' '] })
    }
  }

  return result
}

// Flatten KeySequenceItem array into a flat list of expected keys with their source item index
export function flattenToKeys(sequence: KeySequenceItem[]): Array<{ key: string; itemIndex: number; keyIndex: number }> {
  const flat: Array<{ key: string; itemIndex: number; keyIndex: number }> = []
  sequence.forEach((item, itemIndex) => {
    item.keys.forEach((key, keyIndex) => {
      flat.push({ key, itemIndex, keyIndex })
    })
  })
  return flat
}
