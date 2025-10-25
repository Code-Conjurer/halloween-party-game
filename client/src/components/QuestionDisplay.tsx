import { useState } from 'react'
import styles from './QuestionDisplay.module.scss'

interface QuestionDisplayProps {
  text: string
  onInput?: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export function QuestionDisplay({ text, onInput, placeholder = '', disabled = false }: QuestionDisplayProps) {
  const [inputValue, setInputValue] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (onInput && !disabled) {
      onInput(inputValue)
      setInputValue('')
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.textDisplay}>
        {text}
      </div>
      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          className={styles.input}
          disabled={disabled}
        />
        <button type="submit" className={styles.button} disabled={disabled}>Submit</button>
      </form>
    </div>
  )
}
