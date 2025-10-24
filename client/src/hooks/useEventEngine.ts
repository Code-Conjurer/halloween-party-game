import { useEffect, useState, useRef } from 'react'
import { EventEngine, type DisplayState } from '../engine/EventEngine'

export function useEventEngine() {
  const engineRef = useRef<EventEngine>(new EventEngine())
  const [displayState, setDisplayState] = useState<DisplayState | null>(null)

  useEffect(() => {
    const engine = engineRef.current

    // Register state change callback
    engine.onStateChange(setDisplayState)

    // Cleanup on unmount
    return () => {
      engine.destroy()
    }
  }, [])

  return {
    engine: engineRef.current,
    displayState
  }
}
