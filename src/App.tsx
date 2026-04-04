import { useState, useCallback, useEffect, useRef } from 'react'
import { PracticeSelector } from './components/PracticeSelector'
import { ProfileSelector } from './components/ProfileSelector'
import { TextDisplay } from './components/TextDisplay'
import { KeyboardVisual } from './components/KeyboardVisual'
import { FingerHint } from './components/FingerHint'
import { StatsBar } from './components/StatsBar'
import { ResultsScreen } from './components/ResultsScreen'
import { useTypingSession } from './hooks/useTypingSession'
import { useKeyboard } from './hooks/useKeyboard'
import { useAdaptiveLearning } from './hooks/useAdaptiveLearning'
import { useProfile } from './hooks/useProfile'
import { MusicControl } from './components/MusicControl'
import type { KeyboardLayoutType } from './components/KeyboardVisual'
import { textToKeySequence } from './utils/pinyin'
import { unlockAudio, playCorrect, playWrong, playStreak, playStreakBreak, playComplete, playStart } from './utils/sounds'
import { bgMusic } from './utils/bgMusic'
import type { TextEntry } from './data/textLibrary'
import type { KeySequenceItem } from './types'

type AppScreen = 'profile' | 'select' | 'practice' | 'results'

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('profile')
  const [sequence, setSequence] = useState<KeySequenceItem[]>([])
  const [currentEntry, setCurrentEntry] = useState<TextEntry | null>(null)
  const [lastKey, setLastKey] = useState<string | null>(null)
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null)
  const streakRef = useRef(0)
  const [keyboardLayout, setKeyboardLayout] = useState<KeyboardLayoutType>(() => {
    return (localStorage.getItem('keyboard-layout') as KeyboardLayoutType) ?? 'standard'
  })

  const switchLayout = (l: KeyboardLayoutType) => {
    setKeyboardLayout(l)
    localStorage.setItem('keyboard-layout', l)
  }

  const profile = useProfile()
  const adaptive = useAdaptiveLearning(profile.currentUser)
  const session = useTypingSession(sequence)

  const expectedKeyRef = useRef<string | null>(null)
  expectedKeyRef.current = session.expectedKey

  const handleKeyPress = useCallback((key: string) => {
    unlockAudio()
    bgMusic.setState('typing')
    const expected = expectedKeyRef.current
    const correct = expected === key
    session.handleKeyPress(key)
    setLastKey(key)
    setLastCorrect(correct)

    if (correct) {
      streakRef.current += 1
      const streak = streakRef.current
      if (streak > 0 && streak % 5 === 0) {
        playStreak(Math.floor(streak / 5))
      } else {
        playCorrect()
      }
    } else {
      const prevStreak = streakRef.current
      streakRef.current = 0
      if (prevStreak >= 10) {
        playStreakBreak()
      } else {
        playWrong()
      }
    }
  }, [session])

  useKeyboard(
    handleKeyPress,
    screen === 'practice' && session.state !== 'complete',
  )

  // Transition to results when complete
  useEffect(() => {
    if (session.state === 'complete' && screen === 'practice') {
      bgMusic.stop()
      playComplete()
      if (session.result && profile.currentUser) {
        const updatedKeyStats = adaptive.computeUpdatedKeyStats(
          session.result,
          profile.currentUser.keyStats,
        )
        const weakKeys = session.result.keyResults
          .filter(kr => !kr.correct)
          .reduce((acc: Record<string, number>, kr) => {
            acc[kr.expected] = (acc[kr.expected] ?? 0) + 1
            return acc
          }, {})
        const sessionSummary = {
          date: new Date().toISOString(),
          wpm: session.result.wpm,
          accuracy: session.result.accuracy,
          duration: session.result.duration,
          weakKeys: Object.entries(weakKeys).filter(([, c]) => c >= 2).map(([k]) => k),
        }
        profile.saveSession(sessionSummary, updatedKeyStats)
      }
      const t = setTimeout(() => setScreen('results'), 800)
      return () => clearTimeout(t)
    }
  }, [session.state, screen])

  const startPractice = useCallback((entry: TextEntry, seq?: KeySequenceItem[]) => {
    unlockAudio()
    const finalSeq = seq ?? textToKeySequence(entry.content, entry.mode)
    setSequence(finalSeq)
    setCurrentEntry(entry)
    session.reset(finalSeq)
    setLastKey(null)
    setLastCorrect(null)
    streakRef.current = 0
    playStart()
    bgMusic.start('ready')
    setScreen('practice')
  }, [session])

  const startAiPractice = useCallback(async () => {
    const text = await adaptive.generateAiText()
    if (!text) return
    const aiEntry: TextEntry = {
      id: 'ai-generated',
      title: 'AI 强化练习',
      mode: 'chinese',
      content: text,
    }
    startPractice(aiEntry)
  }, [adaptive, startPractice])

  const handleRetry = useCallback(() => {
    if (!currentEntry) return
    startPractice(currentEntry)
  }, [currentEntry, startPractice])

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-5">

        {screen === 'profile' && (
          <ProfileSelector
            users={profile.users}
            loading={profile.loading}
            error={profile.error}
            onLoad={profile.loadUsers}
            onSelect={async (id) => {
              await profile.selectUser(id)
              setScreen('select')
            }}
            onCreate={async (name, color) => {
              await profile.createUser(name, color)
              setScreen('select')
            }}
            onUpdate={profile.updateUser}
          />
        )}

        {screen === 'select' && (
          <>
            {profile.currentUser && (
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                  style={{ backgroundColor: profile.currentUser.color }}
                >
                  {profile.currentUser.name.slice(0, 1).toUpperCase()}
                </div>
                <span className="text-gray-300 text-sm">{profile.currentUser.name}</span>
                <button
                  onClick={() => { profile.logout(); setScreen('profile') }}
                  className="ml-auto text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  切换账号
                </button>
              </div>
            )}
            <PracticeSelector
              onStart={startPractice}
              onAiStart={startAiPractice}
              apiKey={adaptive.apiKey}
              onSaveApiKey={adaptive.saveApiKey}
              aiUnlocked={adaptive.aiUnlocked}
              sessionCount={adaptive.sessionCount}
              isGenerating={adaptive.isGenerating}
              generationError={adaptive.generationError}
            />
          </>
        )}

        {screen === 'practice' && (
          <>
            <div className="flex items-center justify-between">
              <button
                onClick={() => { bgMusic.stop(); setScreen('select') }}
                className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                ← 返回选择
              </button>
              <MusicControl />
            </div>

            <TextDisplay
              sequence={sequence}
              currentFlatIndex={session.currentFlatIndex}
              keyResults={session.keyResults}
            />

            <StatsBar
              wpm={session.wpm}
              accuracy={session.accuracy}
              currentFlatIndex={session.currentFlatIndex}
              totalKeys={session.totalKeys}
              elapsed={session.elapsed}
              state={session.state}
            />

            <FingerHint expectedKey={session.expectedKey} />

            {/* Keyboard layout switcher */}
            <div className="flex items-center gap-2 justify-end">
              <span className="text-xs text-gray-500">键盘：</span>
              {(['standard', 'macbook-air'] as KeyboardLayoutType[]).map(l => (
                <button
                  key={l}
                  onClick={() => switchLayout(l)}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    keyboardLayout === l
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {l === 'standard' ? '标准' : 'MacBook Air'}
                </button>
              ))}
            </div>

            <KeyboardVisual
              expectedKey={session.expectedKey}
              lastKey={lastKey}
              lastCorrect={lastCorrect}
              layoutType={keyboardLayout}
            />

            {session.state === 'ready' && (
              <p className="text-center text-gray-500 text-sm animate-pulse">
                按任意字母键开始练习
              </p>
            )}
          </>
        )}

        {screen === 'results' && session.result && (
          <>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white">练习完成！</h2>
              {currentEntry && (
                <p className="text-gray-400 text-sm mt-1">{currentEntry.title}</p>
              )}
            </div>
            <ResultsScreen
              result={session.result}
              sessionCount={adaptive.sessionCount}
              onRetry={handleRetry}
              onNewText={() => setScreen('select')}
              onAiPractice={startAiPractice}
              apiKeySet={!!adaptive.apiKey}
            />
          </>
        )}

      </div>
    </div>
  )
}
