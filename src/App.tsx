import { useEffect } from 'react'
import styles from './App.module.scss'
import { StaticCanvas } from './components/StaticCanvas'
import { QuestionDisplay } from './components/QuestionDisplay'
import { TextDisplay } from './components/TextDisplay'
import { useEventEngine } from './hooks/useEventEngine'

const normalSpeed = 10;
const textSpeed = 3

function App() {
  const { engine, displayState } = useEventEngine()

  useEffect(() => {
    // Example: Show a text display after 2 seconds, then a question after 5 seconds

    engine.scheduleTimeout('initial', 2000, () => {
      engine.showText('Incoming Transmission...')
    })

    engine.scheduleTimeout('hide', 5000, () => {
      engine.hide()
    })

    engine.scheduleTimeout('question', 10000, () => {
      engine.showQuestion('What is your human name?', 'Enter your answer')
    })
  }, [engine])

  const handleAnswer = (value: string) => {
    console.log('Answer:', value)
    engine.emit('answer', { type: 'answer', payload: value })

    // Example: Show a response based on the answer
    engine.showText(`Hello, ${value}!`)
  }

  const frameRate = displayState?.type === 'none' || !displayState ? normalSpeed : textSpeed

  return (
    <div className={styles.container}>
      <StaticCanvas pixelSize={3} frameRate={frameRate}/>
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
            />
          )}
        </div>
      )}
    </div>
  )
}

export default App
