export type EventType = 'timeout' | 'answer' | 'custom'

export interface GameEvent {
  type: EventType
  payload?: any
}

export interface DisplayState {
  type: 'text' | 'question' | 'none'
  content: string
  placeholder?: string
}

export type EventHandler = (event: GameEvent) => void

export class EventEngine {
  private currentState: DisplayState | null = null
  private eventHandlers: Map<string, EventHandler[]> = new Map()
  private timeouts: Map<string, number> = new Map()
  private stateChangeCallback?: (state: DisplayState | null) => void

  constructor() {}

  // Register a callback for when the display state changes
  onStateChange(callback: (state: DisplayState | null) => void) {
    this.stateChangeCallback = callback
  }

  // Get current display state
  getState(): DisplayState | null {
    return this.currentState
  }

  // Set the display state (text or question)
  setState(state: DisplayState | null) {
    this.currentState = state
    if (this.stateChangeCallback) {
      this.stateChangeCallback(state)
    }
  }

  // Show text display
  showText(content: string) {
    this.setState({
      type: 'text',
      content
    })
  }

  // Show question display
  showQuestion(content: string, placeholder: string = '') {
    this.setState({
      type: 'question',
      content,
      placeholder
    })
  }

  // Hide display
  hide() {
    this.setState({
      type: 'none',
      content: ''
    })
  }

  // Show none (alias for hide)
  showNone() {
    this.hide()
  }

  // Register an event handler
  on(eventName: string, handler: EventHandler) {
    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, [])
    }
    this.eventHandlers.get(eventName)!.push(handler)
  }

  // Unregister an event handler
  off(eventName: string, handler: EventHandler) {
    const handlers = this.eventHandlers.get(eventName)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  // Emit an event
  emit(eventName: string, event: GameEvent) {
    const handlers = this.eventHandlers.get(eventName)
    if (handlers) {
      handlers.forEach(handler => handler(event))
    }
  }

  // Schedule a timeout event
  scheduleTimeout(name: string, delay: number, callback: () => void) {
    // Clear existing timeout with same name
    this.clearTimeout(name)

    const timeout = setTimeout(() => {
      callback()
      this.timeouts.delete(name)
    }, delay)

    this.timeouts.set(name, timeout)
  }

  // Clear a scheduled timeout
  clearTimeout(name: string) {
    const timeout = this.timeouts.get(name)
    if (timeout) {
      clearTimeout(timeout)
      this.timeouts.delete(name)
    }
  }

  // Clear all timeouts
  clearAllTimeouts() {
    this.timeouts.forEach(timeout => clearTimeout(timeout))
    this.timeouts.clear()
  }

  // Clean up
  destroy() {
    this.clearAllTimeouts()
    this.eventHandlers.clear()
    this.stateChangeCallback = undefined
    this.currentState = null
  }
}
