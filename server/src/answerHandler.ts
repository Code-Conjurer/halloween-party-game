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
 * Validate an answer against event validation rules
 * All validation is case-insensitive and whitespace-trimmed
 * @returns true if answer is correct, false otherwise
 */
export function validateAnswer(answer: any, event: EventConfig): boolean {
  if (!event.validation) {
    // No validation rules = accept any answer
    return true
  }

  const validation = event.validation
  // Normalize answer: trim whitespace and lowercase
  const answerStr = String(answer).trim().toLowerCase()

  // Exact match validation
  if (validation.type === 'exact' && validation.correctAnswers) {
    return validation.correctAnswers.some(
      correct => correct.trim().toLowerCase() === answerStr
    )
  }

  // Regex validation (tested against normalized answer)
  if (validation.type === 'regex' && validation.pattern) {
    const regex = new RegExp(validation.pattern)
    return regex.test(answerStr)
  }

  // Custom validation (to be implemented later)
  if (validation.type === 'custom' && validation.customValidator) {
    console.warn(`Custom validator "${validation.customValidator}" not yet implemented`)
    return true
  }

  // Default: accept answer
  return true
}

/**
 * Evaluate an answer and determine which trigger key to use
 *
 * Returns semantic keys when validation is present:
 * - "correct" if answer passes validation
 * - "wrong" if answer fails validation
 *
 * Returns literal answer value when no validation (backward compatible):
 * - String answers: the answer itself
 * - Non-string answers: JSON stringified
 */
export function evaluateAnswer(context: AnswerContext): string | null {
  const { answer, event } = context

  // If event has validation, return semantic key
  if (event.validation) {
    const isCorrect = validateAnswer(answer, event)
    return isCorrect ? 'correct' : 'wrong'
  }

  // No validation: use literal answer (backward compatible)
  return typeof answer === 'string' ? answer : JSON.stringify(answer)
}
