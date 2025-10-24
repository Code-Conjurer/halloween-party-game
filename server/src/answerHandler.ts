import { EventConfig } from './types.js'

/**
 * Context provided to answer evaluation
 */
export interface AnswerContext {
  eventId: string
  sessionId: string
  answer: any
  allAnswersForEvent: Array<{ sessionId: string; answer: any }>
  event: EventConfig
}

/**
 * Evaluate an answer and determine which trigger key to use
 *
 * This is a placeholder for future custom logic such as:
 * - Fuzzy matching
 * - Case-insensitive comparison
 * - Majority voting
 * - Threshold-based triggers
 * - Custom validation per event
 *
 * For now, returns exact match
 */
export function evaluateAnswer(context: AnswerContext): string | null {
  const { answer } = context

  // Simple exact match for now
  // TODO: Add custom logic based on event configuration
  return typeof answer === 'string' ? answer : JSON.stringify(answer)
}
