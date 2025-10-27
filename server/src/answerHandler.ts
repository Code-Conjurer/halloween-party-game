import { EventConfig, ValidationConfig } from './types.js'

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
  // Check if event type supports validation
  if (event.type !== 'question' && event.type !== 'multiple_choice') {
    return true
  }

  if (!event.validation) {
    // No validation rules = accept any answer
    return true
  }

  const validation = event.validation
  // Normalize answer: trim whitespace and lowercase
  const answerStr = String(answer).trim().toLowerCase()

  // TypeScript now knows which fields are available based on validation.type
  switch (validation.type) {
    case 'exact':
      // TypeScript knows validation.correctAnswers exists and is required
      return validation.correctAnswers.some(
        correct => correct.trim().toLowerCase() === answerStr
      )

    case 'regex':
      // TypeScript knows validation.pattern exists and is required
      const regex = new RegExp(validation.pattern)
      return regex.test(answerStr)

    case 'custom':
      // TypeScript knows validation.customValidator exists and is required
      console.warn(`Custom validator "${validation.customValidator}" not yet implemented`)
      return true

    default:
      // Exhaustiveness check - TypeScript will error if we miss a case
      const _exhaustive: never = validation
      return true
  }
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
