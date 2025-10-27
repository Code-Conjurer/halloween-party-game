import { useEffect, useState, useRef } from 'react'
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
  const [isWrongAnswer, setIsWrongAnswer] = useState(false)
  const questionWrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Initialize session on app startup
    initializeSession()
  }, [])

  const handleAnswer = async (value: any) => {
    try {
      const response = await submitAnswer(value)
      console.log('Answer submitted:', value, 'Correct:', response.correct)

      // Trigger wrong answer feedback
      if (!response.correct) {
        setIsWrongAnswer(true)
      }
    } catch (err) {
      console.error('Failed to submit answer:', err)
    }
  }

  const handleAnimationEnd = () => {
    setIsWrongAnswer(false)
  }

  const handleCustomComplete = async (data?: any) => {
    await handleAnswer(data)
  }

  const handleCustomFail = (reason?: string) => {
    console.error('Custom component failed:', reason)
  }

  const frameRate = isWrongAnswer ? normalSpeed : (displayState?.type === 'none' || !displayState ? normalSpeed : textSpeed)
  const colorTint = isWrongAnswer ? 'red' : 'normal'

  return (
    <div className={styles.container}>
      <StaticCanvas pixelSize={3} frameRate={frameRate} colorTint={colorTint} />
      {error && (
        <div className={styles.errorWrapper}>
          <p>Connection error. Retrying...</p>
        </div>
      )}
      {displayState && displayState.type !== 'none' && (
        <div
          ref={questionWrapperRef}
          className={`${styles.questionWrapper} ${isWrongAnswer ? styles.shake : ''}`}
          onAnimationEnd={handleAnimationEnd}
        >
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
