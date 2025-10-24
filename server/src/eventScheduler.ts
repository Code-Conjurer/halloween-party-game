import { EventConfig, DisplayEvent } from './types.js'
import { evaluateAnswer, AnswerContext } from './answerHandler.js'

export class EventScheduler {
  private events: EventConfig[] = []
  private gameStartTime: number | null = null
  private currentEvent: DisplayEvent | null = null
  private scheduledTimeouts: Map<string, NodeJS.Timeout> = new Map()

  // Callback to get all answers for an event (will be provided by database layer)
  private getAnswersForEvent?: (eventId: string) => Array<{ sessionId: string; answer: any }>

  constructor(getAnswersForEvent?: (eventId: string) => Array<{ sessionId: string; answer: any }>) {
    this.getAnswersForEvent = getAnswersForEvent
  }

  /**
   * Load events from configuration
   */
  loadEvents(config: { events: EventConfig[] }): void {
    this.events = config.events
    console.log(`📅 Loaded ${this.events.length} events`)
  }

  /**
   * Start the game and schedule all events
   */
  startGame(): void {
    if (this.gameStartTime) {
      console.warn('⚠️  Game already started')
      return
    }

    this.gameStartTime = Date.now()
    console.log(`🎮 Game started at ${new Date(this.gameStartTime).toISOString()}`)

    // Schedule all events
    this.events.forEach(event => {
      this.scheduleEvent(event)
    })
  }

  /**
   * Schedule a single event
   */
  private scheduleEvent(event: EventConfig): void {
    const triggerTime = new Date(event.triggerAt).getTime()
    const now = Date.now()
    const delay = triggerTime - now

    if (delay < 0) {
      console.warn(`⚠️  Event ${event.id} is in the past, skipping`)
      return
    }

    console.log(`⏰ Scheduling event ${event.id} in ${Math.round(delay / 1000)}s`)

    const timeout = setTimeout(() => {
      this.triggerEvent(event)
      this.scheduledTimeouts.delete(event.id)
    }, delay)

    this.scheduledTimeouts.set(event.id, timeout)
  }

  /**
   * Convert EventConfig to DisplayEvent
   */
  private eventToDisplayEvent(event: EventConfig): DisplayEvent {
    return {
      type: event.type,
      eventId: event.id,
      content: event.content || '',
      placeholder: event.placeholder,
      options: event.options,
      componentName: event.componentName,
      props: event.props,
      duration: event.duration,
      mandatory: event.mandatory
    }
  }

  /**
   * Trigger an event (display it)
   */
  private triggerEvent(event: EventConfig): void {
    console.log(`🎃 Triggering event: ${event.id}`)

    // Convert event config to display event
    this.currentEvent = this.eventToDisplayEvent(event)

    // Handle auto-hide duration
    if (event.duration) {
      setTimeout(() => {
        if (this.currentEvent?.eventId === event.id) {
          this.currentEvent = {
            type: 'none',
            eventId: event.id,
            content: ''
          }
        }
      }, event.duration)
    }
  }

  /**
   * Get the current active event
   */
  getCurrentEvent(): DisplayEvent | null {
    return this.currentEvent
  }

  /**
   * Get the appropriate event for a specific session
   * Handles mandatory events and user cursor position
   */
  getEventForSession(
    sessionId: string,
    cursorIndex: number,
    hasAnsweredEvent: (eventId: string) => boolean
  ): DisplayEvent | null {
    // Find all mandatory events before the cursor that haven't been answered
    const unansweredMandatory: EventConfig[] = []

    for (let i = 0; i < cursorIndex && i < this.events.length; i++) {
      const event = this.events[i]
      if (event.mandatory && !hasAnsweredEvent(event.id)) {
        unansweredMandatory.push(event)
      }
    }

    // If there are unanswered mandatory events, return the first one
    if (unansweredMandatory.length > 0) {
      const event = unansweredMandatory[0]
      return this.eventToDisplayEvent(event)
    }

    // Otherwise, return the event at the cursor position
    if (cursorIndex < this.events.length) {
      const event = this.events[cursorIndex]
      return this.eventToDisplayEvent(event)
    }

    // No more events
    return { type: 'none', eventId: '', content: '' }
  }

  /**
   * Get all events (for admin/cursor management)
   */
  getAllEvents(): EventConfig[] {
    return this.events
  }

  /**
   * Process an answer and trigger conditional events
   */
  processAnswer(eventId: string, answer: any, sessionId: string): void {
    const event = this.events.find(e => e.id === eventId)
    if (!event || !event.triggers?.onAnswer) {
      return
    }

    console.log(`📝 Processing answer for event ${eventId}:`, answer)

    // Get all answers for this event
    const allAnswersForEvent = this.getAnswersForEvent ? this.getAnswersForEvent(eventId) : []

    // Evaluate the answer using answer handler
    const context: AnswerContext = {
      eventId,
      sessionId,
      answer,
      allAnswersForEvent,
      event
    }

    const triggerKey = evaluateAnswer(context)
    if (!triggerKey) {
      console.log(`No trigger key for answer`)
      return
    }

    // Find matching triggered events
    let triggeredEvents: EventConfig[] = []

    if (Array.isArray(event.triggers.onAnswer)) {
      // Simple array - trigger all
      triggeredEvents = event.triggers.onAnswer
    } else {
      // Lookup by trigger key
      triggeredEvents = event.triggers.onAnswer[triggerKey] || []
    }

    if (triggeredEvents.length === 0) {
      console.log(`No events triggered for key: ${triggerKey}`)
      return
    }

    console.log(`🎯 Triggering ${triggeredEvents.length} events for key: ${triggerKey}`)

    // Schedule triggered events immediately with variable substitution
    triggeredEvents.forEach(triggeredEvent => {
      const immediateEvent = {
        ...triggeredEvent,
        triggerAt: new Date().toISOString(),
        // Substitute {answer} in content
        content: this.substituteVariables(triggeredEvent.content || '', { answer })
      }
      this.scheduleEvent(immediateEvent)
    })
  }

  /**
   * Substitute variables in content string
   */
  private substituteVariables(content: string, variables: Record<string, any>): string {
    let result = content
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{${key}}`
      result = result.replace(new RegExp(placeholder, 'g'), String(value))
    })
    return result
  }

  /**
   * Check if game is active
   */
  isGameActive(): boolean {
    return this.gameStartTime !== null
  }

  /**
   * Get game start time
   */
  getGameStartTime(): number | null {
    return this.gameStartTime
  }

  /**
   * Reset the scheduler
   */
  reset(): void {
    console.log('🔄 Resetting game state')

    // Clear all timeouts
    this.scheduledTimeouts.forEach(timeout => clearTimeout(timeout))
    this.scheduledTimeouts.clear()

    // Reset state
    this.gameStartTime = null
    this.currentEvent = null

    console.log('✅ Game state reset')
  }
}
