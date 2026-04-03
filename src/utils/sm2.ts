// src/utils/sm2.ts

export interface KeyStat {
  interval: number       // 下次复习间隔（天），初始 1
  repetitions: number    // 连续答对次数，初始 0
  ef: number             // 难度因子，初始 2.5，最低 1.3
  nextReview: string     // ISO 日期字符串
  totalCorrect: number
  totalWrong: number
}

export function defaultKeyStat(): KeyStat {
  return {
    interval: 1,
    repetitions: 0,
    ef: 2.5,
    nextReview: new Date().toISOString().slice(0, 10),
    totalCorrect: 0,
    totalWrong: 0,
  }
}

/**
 * SM-2 质量评分映射：
 *   correct=true,  reactionMs < 1000  → q=5
 *   correct=true,  reactionMs 1000-2000 → q=4
 *   correct=true,  reactionMs > 2000  → q=3
 *   correct=false                     → q=1
 */
export function keyResultToQ(correct: boolean, reactionMs: number): number {
  if (!correct) return 1
  if (reactionMs < 1000) return 5
  if (reactionMs <= 2000) return 4
  return 3
}

/**
 * 标准 SM-2 算法更新
 */
export function updateKeyStat(stat: KeyStat, q: number): KeyStat {
  const today = new Date().toISOString().slice(0, 10)

  let { interval, repetitions, ef } = stat

  if (q >= 3) {
    if (repetitions === 0) interval = 1
    else if (repetitions === 1) interval = 6
    else interval = Math.round(interval * ef)
    repetitions += 1
  } else {
    interval = 1
    repetitions = 0
  }

  ef = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  ef = Math.max(1.3, ef)

  const nextDate = new Date(today)
  nextDate.setDate(nextDate.getDate() + interval)

  return {
    ...stat,
    interval,
    repetitions,
    ef,
    nextReview: nextDate.toISOString().slice(0, 10),
    totalCorrect: stat.totalCorrect + (q >= 3 ? 1 : 0),
    totalWrong: stat.totalWrong + (q < 3 ? 1 : 0),
  }
}

/**
 * 从 keyStats 中按优先级选出需要练习的键列表：
 * 1. 今天到期 (nextReview <= today)
 * 2. 从未练习 (不在 keyStats 里)
 * 3. ef 最低的键
 */
export function selectWeakKeys(
  keyStats: Record<string, KeyStat>,
  allKeys: string[],
  maxCount = 8,
): string[] {
  const today = new Date().toISOString().slice(0, 10)

  const due = allKeys.filter(k => keyStats[k] && keyStats[k].nextReview <= today)
  const never = allKeys.filter(k => !keyStats[k])
  const byEf = allKeys
    .filter(k => keyStats[k] && keyStats[k].nextReview > today)
    .sort((a, b) => keyStats[a].ef - keyStats[b].ef)

  return [...due, ...never, ...byEf].slice(0, maxCount)
}
