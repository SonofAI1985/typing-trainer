import { useState, useCallback, useEffect, useRef } from 'react'
import { PracticeSelector } from './components/PracticeSelector'
import { TextDisplay } from './components/TextDisplay'
import { KeyboardVisual } from './components/KeyboardVisual'
import { FingerHint } from './components/FingerHint'
import { StatsBar } from './components/StatsBar'
import { ResultsScreen } from './components/ResultsScreen'
import { useTypingSession } from './hooks/useTypingSession'
import { useKeyboard } from './hooks/useKeyboard'
import { useAdaptiveLearning } from './hooks/useAdaptiveLearning'
import { textToKeySequence } from './utils/pinyin'
import { unlockAudio, playCorrect, playWrong, playStreak, playComplete, playStart } from './utils/sounds'
import type { TextEntry } from './data/textLibrary'
import type { KeySequenceItem } from './types'

type AppScreen = 'select' | 'practice' | 'results'

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('select')
  const [sequence, setSequence] = useState<KeySequenceItem[]>([])
  const [currentEntry, setCurrentEntry] = useState<TextEntry | null>(null)
  const [lastKey, setLastKey] = useState<string | null>(null)
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null)
  const streakRef = useRef(0)

  const adaptive = useAdaptiveLearning()
  const session = useTypingSession(sequence)

  // Use a ref to get the current expected key at the moment of keypress
  const expectedKeyRef = useRef<string | null>(null)
  expectedKeyRef.current = session.expectedKey

  const handleKeyPress = useCallback((key: string) => {
    unlockAudio()  // synchronously unlock AudioContext on every keydown
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
      streakRef.current = 0
      playWrong()
    }
  }, [session])

  useKeyboard(
    handleKeyPress,
    screen === 'practice' && session.state !== 'complete',
  )

  // Transition to results when complete
  useEffect(() => {
    if (session.state === 'complete' && screen === 'practice') {
      playComplete()
      if (session.result) {
        adaptive.saveResult(session.result)
      }
      const t = setTimeout(() => setScreen('results'), 800)
      return () => clearTimeout(t)
    }
  }, [session.state, screen])

  const startPractice = useCallback((entry: TextEntry, seq?: KeySequenceItem[]) => {
    unlockAudio()  // unlock on the click gesture that starts practice
    const finalSeq = seq ?? textToKeySequence(entry.content, entry.mode)
    setSequence(finalSeq)
    setCurrentEntry(entry)
    session.reset(finalSeq)
    setLastKey(null)
    setLastCorrect(null)
    streakRef.current = 0
    playStart()
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

        {screen === 'select' && (
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
        )}

        {screen === 'practice' && (
          <>
            <button
              onClick={() => setScreen('select')}
              className="self-start text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              ← 返回选择
            </button>

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

            <KeyboardVisual
              expectedKey={session.expectedKey}
              lastKey={lastKey}
              lastCorrect={lastCorrect}
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
