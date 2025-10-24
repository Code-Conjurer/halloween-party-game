import { GameDatabase } from '../../database/db.js'
import { EventConfig } from '../../types.js'

let sessionCounter = 0
let eventCounter = 0
let answerCounter = 0

/**
 * Reset all counters (call in beforeEach)
 */
export function resetCounters() {
  sessionCounter = 0
  eventCounter = 0
  answerCounter = 0
}

/**
 * Factory for creating test sessions
 */
export function createSessionFixture(overrides: Partial<{
  ip_address: string
  user_agent: string
  device_fingerprint: string
  first_seen: number
  last_seen: number
}> = {}) {
  const now = Date.now()
  const index = sessionCounter++

  return {
    ip_address: `127.0.0.${index + 1}`,
    user_agent: `Test-Agent-${index}`,
    device_fingerprint: `fingerprint-${index}`,
    first_seen: now - 10000,
    last_seen: now,
    ...overrides
  }
}

/**
 * Factory for creating multiple test sessions
 */
export function createMultipleSessions(count: number, db: GameDatabase): string[] {
  const sessionIds: string[] = []
  for (let i = 0; i < count; i++) {
    const sessionData = createSessionFixture()
    const session = db.createSession(sessionData)
    sessionIds.push(session.id)
  }
  return sessionIds
}

/**
 * Factory for creating test answers
 */
export function createAnswerFixture(
  db: GameDatabase,
  sessionId: string,
  overrides: Partial<{
    eventId: string
    answerType: string
    answerValue: string
  }> = {}
) {
  const index = answerCounter++

  const defaults = {
    eventId: `event_${index}`,
    answerType: 'text',
    answerValue: `Answer ${index}`
  }

  const answer = { ...defaults, ...overrides }
  db.recordAnswer(sessionId, answer.eventId, answer.answerType, answer.answerValue)

  return answer
}

/**
 * Factory for creating test events
 */
export function createEventFixture(overrides: Partial<EventConfig> = {}): EventConfig {
  const index = eventCounter++
  const now = new Date()
  const triggerTime = new Date(now.getTime() + (index * 5000)).toISOString()

  return {
    id: `event_${index}`,
    triggerAt: triggerTime,
    type: 'text',
    content: `Event ${index}`,
    ...overrides
  }
}

/**
 * Factory for creating event configuration with multiple events
 */
export function createEventsConfig(count: number, overrides: Partial<EventConfig>[] = []): { events: EventConfig[] } {
  const events: EventConfig[] = []

  for (let i = 0; i < count; i++) {
    const override = overrides[i] || {}
    events.push(createEventFixture(override))
  }

  return { events }
}

/**
 * Create a complete test scenario with sessions, answers, and events
 */
export function createTestScenario(
  db: GameDatabase,
  options: {
    sessionCount?: number
    eventCount?: number
    answersPerSession?: number
  } = {}
) {
  const {
    sessionCount = 3,
    eventCount = 5,
    answersPerSession = 2
  } = options

  // Create sessions
  const sessionIds = createMultipleSessions(sessionCount, db)

  // Create events
  const eventsConfig = createEventsConfig(eventCount)

  // Create answers
  sessionIds.forEach((sessionId, sIndex) => {
    for (let i = 0; i < answersPerSession && i < eventCount; i++) {
      createAnswerFixture(db, sessionId, {
        eventId: `event_${i}`,
        answerValue: `Answer from session ${sIndex}`
      })
    }
  })

  return {
    sessionIds,
    eventsConfig,
    db
  }
}
