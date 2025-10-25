import { useEffect } from 'react'
import styles from './App.module.scss'
import { StaticCanvas } from './components/StaticCanvas'
import { QuestionDisplay } from './components/QuestionDisplay'
import { TextDisplay } from './components/TextDisplay'
import { MultipleChoiceDisplay } from './components/MultipleChoiceDisplay'
import { CustomComponentRenderer } from './components/CustomComponentRenderer'
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

  const handleAnswer = async (value: any) => {
    try {
      await submitAnswer(value)
      console.log('Answer submitted:', value)
    } catch (err) {
      console.error('Failed to submit answer:', err)
    }
  }

  const handleCustomComplete = async (data?: any) => {
    await handleAnswer(data)
  }

  const handleCustomFail = (reason?: string) => {
    console.error('Custom component failed:', reason)
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
          {displayState.type === 'multiple_choice' && displayState.options && (
            <MultipleChoiceDisplay
              content={displayState.content}
              options={displayState.options}
              allowMultiple={false}
              onSubmit={handleAnswer}
              disabled={isLoading}
            />
          )}
          {displayState.type === 'custom_component' && displayState.componentName && (
            <CustomComponentRenderer
              componentName={displayState.componentName}
              props={displayState.props || {}}
              onComplete={handleCustomComplete}
              onFail={handleCustomFail}
            />
          )}
        </div>
      )}
    </div>
  )
}

export default App
