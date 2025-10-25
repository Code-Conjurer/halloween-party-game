import { useState } from 'react'
import styles from './MultipleChoiceDisplay.module.scss'

interface Option {
  id: string
  text: string
  value: string
}

interface MultipleChoiceDisplayProps {
  content: string
  options: Option[]
  allowMultiple?: boolean
  onSubmit?: (value: string | string[]) => void
  disabled?: boolean
}

export function MultipleChoiceDisplay({
  content,
  options,
  allowMultiple = false,
  onSubmit,
  disabled = false
}: MultipleChoiceDisplayProps) {
  const [selectedSingle, setSelectedSingle] = useState<string>('')
  const [selectedMultiple, setSelectedMultiple] = useState<Set<string>>(new Set())

  const handleSingleChange = (value: string) => {
    if (!disabled) {
      setSelectedSingle(value)
    }
  }

  const handleMultipleChange = (value: string) => {
    if (!disabled) {
      const newSelected = new Set(selectedMultiple)
      if (newSelected.has(value)) {
        newSelected.delete(value)
      } else {
        newSelected.add(value)
      }
      setSelectedMultiple(newSelected)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (disabled) return

    if (allowMultiple) {
      if (selectedMultiple.size > 0 && onSubmit) {
        onSubmit(Array.from(selectedMultiple))
      }
    } else {
      if (selectedSingle && onSubmit) {
        onSubmit(selectedSingle)
      }
    }
  }

  const canSubmit = allowMultiple ? selectedMultiple.size > 0 : selectedSingle !== ''

  return (
    <div className={styles.container}>
      <div className={styles.textDisplay}>
        {content}
      </div>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.optionsContainer}>
          {options.map((option) => (
            <label key={option.id} className={styles.optionLabel}>
              <input
                type={allowMultiple ? 'checkbox' : 'radio'}
                name="choice"
                value={option.value}
                checked={allowMultiple
                  ? selectedMultiple.has(option.value)
                  : selectedSingle === option.value
                }
                onChange={() => allowMultiple
                  ? handleMultipleChange(option.value)
                  : handleSingleChange(option.value)
                }
                disabled={disabled}
                className={styles.inputRadio}
              />
              <span className={styles.optionText}>{option.text}</span>
            </label>
          ))}
        </div>
        <button
          type="submit"
          className={styles.button}
          disabled={disabled || !canSubmit}
        >
          Submit
        </button>
      </form>
    </div>
  )
}
