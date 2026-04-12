import { pinyin as getPinyin, segment as getWords } from 'pinyin-pro'
import type { KeySequenceItem } from '../types'
import candidatesData from '../data/pinyinCandidates.json'
import phraseData from '../data/phraseCandidates.json'

const CANDIDATES = candidatesData as Record<string, string[]>
const PHRASES = phraseData as Record<string, { word: string; frequency: number }[]>

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

// Return phrase candidates for given concatenated base pinyin (e.g., "jutou")
// Returns list of words sorted by frequency descending
export function getPhraseCandidates(basePinyin: string): string[] {
  const phraseList = PHRASES[basePinyin] ?? []
  return phraseList.map(p => p.word)
}

// Return phrase number to press for a given word and its concatenated pinyin
export function getPhraseCandidateNum(word: string, basePinyin: string): string {
  const list = PHRASES[basePinyin] ?? []
  const idx = list.findIndex(p => p.word === word)
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

  // Step 1: Try to segment into meaningful words using pinyin-pro
  const rawSegments = getWords(text) as { origin: string; result: string }[]
  const segments = rawSegments.map(s => s.origin).filter(s => s !== ' ' && !s.match(/[^\u4e00-\u9fff\s]/))

  // Process unsegmentable parts as individual characters
  if (segments.length === 0) {
    const chars = Array.from(text).filter(c => c !== ' ')
    for (const char of chars) {
      if (isChinese(char)) {
        const charPinyin = getPinyin(char)
        if (charPinyin.length > 0) {
          const basePy = stripTones(charPinyin[0])
          const numKey = getCandidateNum(char, basePy)
          const keys = [...basePy.split(''), numKey]
          result.push({
            char,
            pinyin: charPinyin[0],
            keys,
            hasImeSelect: true,
            candidates: getCandidates(basePy)
          })
        }
      }
    }
    return result
  }

  // Step 2: Find ranges of the text covered by segments
  let index = 0
  for (const word of segments) {
    // Skip any non-Chinese characters that might have been left unprocessed
    while (index < text.length && !isChinese(text[index])) {
      const char = text[index]
      if (char === ' ') {
        result.push({ char: ' ', pinyin: ' ', keys: [' '] })
      } else if (char.match(/[a-zA-Z0-9]/)) {
        result.push({ char, pinyin: char.toLowerCase(), keys: [char.toLowerCase()] })
      }
      index++
    }

    // Process the word
    if (index >= text.length) continue

    const wordLen = [...word].length
    const wordText = text.slice(index, index + wordLen)

    // Try phrase mode if word is > 1 char and has phrase candidates
    let wordProcessed = false
    if (wordLen >= 2) {
      const wordPinyin = getPinyin(word, { toneType: 'none', type: 'string' }).replace(/\s+/g, '')
      const phraseCandidates = getPhraseCandidates(wordPinyin)

      if (phraseCandidates.length > 0 && phraseCandidates.some(c => c === word)) {
        // Phrase mode: single number select for entire word
        const numKey = getPhraseCandidateNum(word, wordPinyin)
        const keys = [...wordPinyin.split(''), numKey]
        result.push({
          char: word,
          pinyin: wordPinyin,
          keys,
          hasImeSelect: true,
          candidates: phraseCandidates.slice(0, 9)
        })
        wordProcessed = true
      }
    }

    // If phrase mode failed, fall back to character-by-character
    if (!wordProcessed) {
      for (let i = 0; i < wordLen; i++) {
        const char = wordText[i]
        if (isChinese(char)) {
          const charPinyin = getPinyin(char)
          if (charPinyin.length > 0) {
            const basePy = stripTones(charPinyin[0])
            const numKey = getCandidateNum(char, basePy)
            const keys = [...basePy.split(''), numKey]
            result.push({
              char,
              pinyin: charPinyin[0],
              keys,
              hasImeSelect: true,
              candidates: getCandidates(basePy)
            })
          }
        }
      }
    }

    index += wordLen
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
