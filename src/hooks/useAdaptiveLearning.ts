import { useState, useCallback } from 'react'
import type { SessionResult, KeyStat, UserProfile } from '../types'
import { generatePracticeText } from '../utils/claudeApi'
import { defaultKeyStat, keyResultToQ, updateKeyStat, selectWeakKeys } from '../utils/sm2'

const STORAGE_KEY_APIKEY = 'typing-trainer-api-key'

// All pinyin initials + finals that appear as keys
const ALL_KEYS = [
  'b','p','m','f','d','t','n','l','g','k','h',
  'j','q','x','z','c','s','r','y','w',
  'zh','ch','sh',
  'a','o','e','i','u','v',
  'ai','ei','ui','ao','ou','iu','ie','ue','er',
  'an','en','in','un','vn',
  'ang','eng','ing','ong',
]

export function useAdaptiveLearning(currentUser: UserProfile | null) {
  const [apiKey, setApiKeyState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_APIKEY) ?? ''
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)

  const saveApiKey = useCallback((key: string) => {
    setApiKeyState(key)
    localStorage.setItem(STORAGE_KEY_APIKEY, key)
  }, [])

  // Compute updated keyStats from a session result using SM-2
  const computeUpdatedKeyStats = useCallback((
    result: SessionResult,
    existingKeyStats: Record<string, KeyStat>,
  ): Record<string, KeyStat> => {
    const updated: Record<string, KeyStat> = {}

    // Group keyResults by expected key with timing info
    const keyGroups: Record<string, Array<{ correct: boolean; reactionMs: number }>> = {}
    let prevTimestamp = result.keyResults[0]?.timestamp ?? 0

    for (const kr of result.keyResults) {
      const reactionMs = kr.timestamp - prevTimestamp
      prevTimestamp = kr.timestamp
      if (!keyGroups[kr.expected]) keyGroups[kr.expected] = []
      keyGroups[kr.expected].push({ correct: kr.correct, reactionMs })
    }

    for (const [key, attempts] of Object.entries(keyGroups)) {
      const stat = existingKeyStats[key] ?? defaultKeyStat()
      // Use the worst quality in the session for conservative updating
      const minQ = Math.min(...attempts.map(a => keyResultToQ(a.correct, a.reactionMs)))
      updated[key] = updateKeyStat(stat, minQ)
    }

    return updated
  }, [])

  const getWeakKeys = useCallback((): string[] => {
    if (!currentUser) return []
    return selectWeakKeys(currentUser.keyStats, ALL_KEYS, 8)
  }, [currentUser])

  const generateAiText = useCallback(async (): Promise<string | null> => {
    if (!apiKey) {
      setGenerationError('请先设置 Claude API Key')
      return null
    }

    const weakKeys = getWeakKeys()
    if (weakKeys.length === 0) {
      setGenerationError('暂无足够的弱键数据')
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

  const sessionCount = currentUser?.sessions.length ?? 0

  return {
    sessionCount,
    apiKey,
    saveApiKey,
    computeUpdatedKeyStats,
    generateAiText,
    isGenerating,
    generationError,
    aiUnlocked: sessionCount >= 5,
  }
}
