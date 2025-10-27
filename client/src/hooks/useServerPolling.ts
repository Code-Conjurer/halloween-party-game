/**
 * Server Polling Hook
 * Manages polling the server for events and submitting answers
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { getCurrentEvent, submitAnswer as apiSubmitAnswer } from '../services/api'
import type { DisplayEvent, AnswerResponse } from '../services/api'

// Polling intervals
const IDLE_POLL_INTERVAL = 2000 // 2 seconds when no event
const ACTIVE_POLL_INTERVAL = 1000 // 1 second when event is active

// Error backoff configuration
const MIN_BACKOFF = 2000 // 2 seconds
const MAX_BACKOFF = 30000 // 30 seconds

interface UseServerPollingReturn {
  displayState: DisplayEvent | null
  submitAnswer: (answer: any) => Promise<AnswerResponse>
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
  const displayStateRef = useRef<DisplayEvent | null>(null)
  const errorRef = useRef<Error | null>(null)

  /**
   * Submit an answer and trigger immediate refresh
   */
  const submitAnswer = useCallback(async (answer: any): Promise<AnswerResponse> => {
    if (!displayState || !displayState.eventId) {
      throw new Error('No active event to answer')
    }

    try {
      setIsLoading(true)
      const response = await apiSubmitAnswer(displayState.eventId, answer)

      // Immediately poll for updated state
      await pollRef.current?.()

      return response
    } catch (err) {
      console.error('Error submitting answer:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [displayState])

  /**
   * Auto-acknowledge non-interactive events (text displays)
   * This allows the user to progress past text-only events
   */
  useEffect(() => {
    if (!displayState || displayState.type === 'none' || displayState.hasAnswered) {
      return
    }

    // Auto-acknowledge text events immediately (user just needs to see them)
    if (displayState.type === 'text') {
      const acknowledgeEvent = async () => {
        try {
          await apiSubmitAnswer(displayState.eventId, { acknowledged: true })
          console.log('Auto-acknowledged text event:', displayState.eventId)
        } catch (err) {
          console.error('Failed to auto-acknowledge text event:', err)
        }
      }
      acknowledgeEvent()
    }
  }, [displayState])

  /**
   * Keep refs in sync with state for interval calculation
   */
  useEffect(() => {
    displayStateRef.current = displayState
  }, [displayState])

  useEffect(() => {
    errorRef.current = error
  }, [error])

  /**
   * Set up polling effect
   */
  useEffect(() => {
    let timeoutId: number | null = null
    let currentBackoff = MIN_BACKOFF

    const poll = async () => {
      if (!isMountedRef.current) return

      try {
        setIsPolling(true)
        const event = await getCurrentEvent()
        console.log(event, isMountedRef.current);

        if (!isMountedRef.current) return

        // Only update displayState if the event has changed
        // This prevents resetting timers and other component state
        const currentEvent = displayStateRef.current
        const hasEventChanged = !currentEvent ||
          currentEvent.eventId !== event.eventId ||
          currentEvent.type !== event.type

        if (hasEventChanged) {
          setDisplayState(event)
          displayStateRef.current = event
        } else {
          // Update ref without triggering re-render
          // This keeps answer counts and other metadata fresh
          displayStateRef.current = event
        }

        setError(null)
        errorRef.current = null
        setIsLoading(false)

        // Reset backoff on successful poll
        currentBackoff = MIN_BACKOFF
        setBackoffDelay(MIN_BACKOFF)
      } catch (err) {
        if (!isMountedRef.current) return

        console.error('Polling error:', err)
        const errorObj = err instanceof Error ? err : new Error('Unknown polling error')
        setError(errorObj)
        errorRef.current = errorObj
        setIsLoading(false)

        // Increase backoff delay exponentially
        currentBackoff = Math.min(currentBackoff * 2, MAX_BACKOFF)
        setBackoffDelay(currentBackoff)
      } finally {
        if (isMountedRef.current) {
          setIsPolling(false)
        }
      }
    }

    // Expose poll function to submitAnswer via ref
    pollRef.current = poll

    const scheduleNext = () => {
      if (!isMountedRef.current) return

      // Calculate next interval based on current state
      const hasActiveEvent = displayStateRef.current && displayStateRef.current.type !== 'none'
      const pollInterval = hasActiveEvent ? ACTIVE_POLL_INTERVAL : IDLE_POLL_INTERVAL
      const actualInterval = errorRef.current ? currentBackoff : pollInterval

      timeoutId = window.setTimeout(async () => {
        await poll()
        scheduleNext()
      }, actualInterval)
    }

    // Initial poll and start polling loop
    poll().then(() => scheduleNext())

    // Cleanup function
    return () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
      }
    }
  }, [])

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, []);

  return {
    displayState,
    submitAnswer,
    error,
    isLoading,
    isPolling,
  }
}
