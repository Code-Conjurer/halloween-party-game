import styles from './QuestionDisplay.module.scss'

interface TextDisplayProps {
  text: string
}

export function TextDisplay({ text }: TextDisplayProps) {
  return (
    <div className={styles.container}>
      <div className={styles.textDisplay}>
        {text}
      </div>
    </div>
  )
}
