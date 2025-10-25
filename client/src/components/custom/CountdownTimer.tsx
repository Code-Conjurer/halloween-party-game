import { useState, useEffect } from 'react'
import styles from './CountdownTimer.module.scss'

interface CountdownTimerProps {
  seconds?: number
  message?: string
  onComplete: () => void
  onFail?: (reason?: string) => void
}

export default function CountdownTimer({
  seconds = 10,
  message = 'Time remaining',
  onComplete,
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(seconds)

  useEffect(() => {
    if (timeLeft <= 0) {
      onComplete()
      return
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft, onComplete])

  const handleSkip = () => {
    onComplete()
  }

  return (
    <div className={styles.container}>
      <div className={styles.message}>{message}</div>
      <div className={styles.timer}>{timeLeft}</div>
      <button onClick={handleSkip} className={styles.button}>
        Skip
      </button>
    </div>
  )
}
