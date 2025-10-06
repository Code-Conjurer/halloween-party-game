import styles from './App.module.scss'
import { StaticCanvas } from './components/StaticCanvas'
import { QuestionDisplay } from './components/QuestionDisplay'
const normalSpeed = 10;
const questionSpeed = 3

function App() {
  return (
    <div className={styles.container}>
      <StaticCanvas pixelSize={3} frameRate={normalSpeed}/>
      <div className={styles.questionWrapper}>
        <QuestionDisplay
          text="What is your name?"
          placeholder="Enter your answer"
          onInput={(value) => console.log(value)}
        />
      </div>
    </div>
  )
}

export default App
