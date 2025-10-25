/**
 * Server Polling Hook
 * Manages polling the server for events and submitting answers
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { getCurrentEvent, submitAnswer as apiSubmitAnswer, DisplayEvent } from '../services/api'

// Polling intervals
const IDLE_POLL_INTERVAL = 2000 // 2 seconds when no event
const ACTIVE_POLL_INTERVAL = 1000 // 1 second when event is active

// Error backoff configuration
const MIN_BACKOFF = 2000 // 2 seconds
const MAX_BACKOFF = 30000 // 30 seconds

interface UseServerPollingReturn {
  displayState: DisplayEvent | null
  submitAnswer: (answer: any) => Promise<void>
  error: Error | null
  isLoading: boolean
  isPolling: boolean
}

export function useServerPolling(): UseServerPollingReturn {
  const [displayState, setDisplayState] = useState<DisplayEvent | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPolling, setIsPolling] = useState(false)
  const [backoffDelay, setBackoffDelay] = useState(MIN_BACKOFF)

  const isMountedRef = useRef(true)
  const pollRef = useRef<(() => Promise<void>) | null>(null)

  /**
   * Submit an answer and trigger immediate refresh
   */
  const submitAnswer = useCallback(async (answer: any) => {
    if (!displayState || !displayState.eventId) {
      throw new Error('No active event to answer')
    }

    try {
      setIsLoading(true)
      await apiSubmitAnswer(displayState.eventId, answer)

      // Immediately poll for updated state
      await pollRef.current?.()
    } catch (err) {
      console.error('Error submitting answer:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [displayState])

  /**
   * Set up polling effect
   */
  useEffect(() => {
    let intervalId: number | null = null

    const poll = async () => {
      if (!isMountedRef.current) return

      try {
        setIsPolling(true)
        const event = await getCurrentEvent()

        if (!isMountedRef.current) return

        setDisplayState(event)
        setError(null)
        setIsLoading(false)

        // Reset backoff on successful poll
        setBackoffDelay(MIN_BACKOFF)
      } catch (err) {
        if (!isMountedRef.current) return

        console.error('Polling error:', err)
        setError(err instanceof Error ? err : new Error('Unknown polling error'))
        setIsLoading(false)

        // Increase backoff delay exponentially
        setBackoffDelay(prev => Math.min(prev * 2, MAX_BACKOFF))
      } finally {
        if (isMountedRef.current) {
          setIsPolling(false)
        }
      }
    }

    // Expose poll function to submitAnswer via ref
    pollRef.current = poll

    // Determine polling interval based on current state
    const hasActiveEvent = displayState && displayState.type !== 'none'
    const pollInterval = hasActiveEvent ? ACTIVE_POLL_INTERVAL : IDLE_POLL_INTERVAL

    // Use backoff delay if there's an error
    const actualInterval = error ? backoffDelay : pollInterval

    // Initial poll
    poll()

    // Set up interval
    intervalId = window.setInterval(poll, actualInterval)

    // Cleanup function
    return () => {
      if (intervalId !== null) {
        clearInterval(intervalId)
      }
    }
  }, [displayState, error, backoffDelay])

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  return {
    displayState,
    submitAnswer,
    error,
    isLoading,
    isPolling,
  }
}
