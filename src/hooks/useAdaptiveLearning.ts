import { useState, useCallback } from 'react'
import type { SessionResult, HistoryEntry } from '../types'
import { generatePracticeText } from '../utils/claudeApi'

const STORAGE_KEY = 'typing-trainer-history'
const STORAGE_KEY_COUNT = 'typing-trainer-session-count'
const STORAGE_KEY_APIKEY = 'typing-trainer-api-key'

export function useAdaptiveLearning() {
  const [sessionCount, setSessionCount] = useState<number>(() => {
    return Number(localStorage.getItem(STORAGE_KEY_COUNT) ?? '0')
  })

  const [apiKey, setApiKeyState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_APIKEY) ?? ''
  })

  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)

  const saveApiKey = useCallback((key: string) => {
    setApiKeyState(key)
    localStorage.setItem(STORAGE_KEY_APIKEY, key)
  }, [])

  const saveResult = useCallback((result: SessionResult) => {
    const history: HistoryEntry[] = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')

    const keyStats: Record<string, { correct: number; wrong: number }> = {}
    for (const r of result.keyResults) {
      if (!keyStats[r.expected]) keyStats[r.expected] = { correct: 0, wrong: 0 }
      if (r.correct) keyStats[r.expected].correct++
      else keyStats[r.expected].wrong++
    }

    history.push({
      date: new Date().toISOString(),
      wpm: result.wpm,
      accuracy: result.accuracy,
      keyStats,
    })

    localStorage.setItem(STORAGE_KEY, JSON.stringify(history))

    const newCount = sessionCount + 1
    setSessionCount(newCount)
    localStorage.setItem(STORAGE_KEY_COUNT, String(newCount))
  }, [sessionCount])

  // Analyze weak keys from history
  const getWeakKeys = useCallback((): string[] => {
    const history: HistoryEntry[] = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    if (history.length === 0) return []

    // Aggregate all key stats
    const aggregate: Record<string, { correct: number; wrong: number }> = {}
    for (const entry of history) {
      for (const [key, stats] of Object.entries(entry.keyStats)) {
        if (!aggregate[key]) aggregate[key] = { correct: 0, wrong: 0 }
        aggregate[key].correct += stats.correct
        aggregate[key].wrong += stats.wrong
      }
    }

    // Find keys with accuracy < 85%
    return Object.entries(aggregate)
      .filter(([, stats]) => {
        const total = stats.correct + stats.wrong
        return total >= 3 && (stats.correct / total) < 0.85
      })
      .sort((a, b) => {
        const ra = a[1].correct / (a[1].correct + a[1].wrong)
        const rb = b[1].correct / (b[1].correct + b[1].wrong)
        return ra - rb
      })
      .slice(0, 8)
      .map(([key]) => key)
  }, [])

  const generateAiText = useCallback(async (): Promise<string | null> => {
    if (!apiKey) {
      setGenerationError('请先设置 Claude API Key')
      return null
    }

    const weakKeys = getWeakKeys()
    if (weakKeys.length === 0) {
      setGenerationError('暂无足够的薄弱键位数据')
      return null
    }

    setIsGenerating(true)
    setGenerationError(null)

    try {
      const text = await generatePracticeText(weakKeys, apiKey)
      return text
    } catch (e) {
      const msg = e instanceof Error ? e.message : '生成失败'
      setGenerationError(msg)
      return null
    } finally {
      setIsGenerating(false)
    }
  }, [apiKey, getWeakKeys])

  return {
    sessionCount,
    apiKey,
    saveApiKey,
    saveResult,
    generateAiText,
    isGenerating,
    generationError,
    aiUnlocked: sessionCount >= 5,
  }
}
