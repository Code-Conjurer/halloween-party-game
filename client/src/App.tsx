import { useEffect } from 'react'
import styles from './App.module.scss'
import { StaticCanvas } from './components/StaticCanvas'
import { QuestionDisplay } from './components/QuestionDisplay'
import { TextDisplay } from './components/TextDisplay'
import { useServerPolling } from './hooks/useServerPolling'
import { initializeSession } from './utils/session'

const normalSpeed = 10;
const textSpeed = 3

function App() {
  const { displayState, submitAnswer, error, isLoading } = useServerPolling()

  useEffect(() => {
    // Initialize session on app startup
    initializeSession()
  }, [])

  const handleAnswer = async (value: string) => {
    try {
      await submitAnswer(value)
      console.log('Answer submitted:', value)
    } catch (err) {
      console.error('Failed to submit answer:', err)
    }
  }

  const frameRate = displayState?.type === 'none' || !displayState ? normalSpeed : textSpeed

  return (
    <div className={styles.container}>
      <StaticCanvas pixelSize={3} frameRate={frameRate}/>
      {error && (
        <div className={styles.errorWrapper}>
          <p>Connection error. Retrying...</p>
        </div>
      )}
      {displayState && displayState.type !== 'none' && (
        <div className={styles.questionWrapper}>
          {displayState.type === 'text' && (
            <TextDisplay text={displayState.content} />
          )}
          {displayState.type === 'question' && (
            <QuestionDisplay
              text={displayState.content}
              placeholder={displayState.placeholder || ''}
              onInput={handleAnswer}
              disabled={isLoading}
            />
          )}
        </div>
      )}
    </div>
  )
}

export default App
