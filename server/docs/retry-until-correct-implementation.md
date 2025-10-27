# Retry Until Correct - Implementation Plan

## Overview

This document outlines how to implement a "retry until correct" feature for quiz-style events, where users must answer correctly before progressing to the next event.

## Current Limitations

The current event system has the following constraints that prevent this feature from working:

1. **Cursor Always Advances**: When a user submits an answer, the cursor always increments (see `server/src/routes/api.ts:77-82`), moving them to the next event
2. **No Answer Validation**: There's no mechanism to reject an answer and keep the user on the same event
3. **No Default Triggers**: Conditional triggers only support exact answer matching, not "catch-all" or "default" cases
4. **Triggered Events Are New Events**: Events triggered via `triggers.onAnswer` are scheduled as new events, not replacements for the current event

## Use Case Example

**Desired Behavior:**
```
1. Show question: "What is 2 + 3?"
2. User answers "4" → Show "Wrong! Try again" and repeat question
3. User answers "6" → Show "Wrong! Try again" and repeat question
4. User answers "5" → Show "Good job!" and advance to next event
```

## Proposed Solution

### Architecture Changes

#### 1. Add Answer Validation to Events

**File**: `server/src/types.ts`

Add a new optional field to `EventConfig`:

```typescript
export interface EventConfig {
  // ... existing fields
  validation?: {
    type: 'exact' | 'regex' | 'custom'
    correctAnswers?: string[]  // For exact matching
    pattern?: string           // For regex matching
    customValidator?: string   // Name of custom validation function
    retryOnWrong?: boolean     // If true, don't advance cursor on wrong answer
    wrongMessage?: string      // Message to show when answer is wrong
  }
}
```

#### 2. Modify Answer Handler

**File**: `server/src/answerHandler.ts`

Add a validation function:

```typescript
export interface ValidationResult {
  isValid: boolean
  isCorrect: boolean
  shouldAdvanceCursor: boolean
  message?: string
  triggerKey?: string
}

/**
 * Validate an answer against event validation rules
 */
export function validateAnswer(
  answer: any,
  event: EventConfig
): ValidationResult {
  // No validation rules = accept anything and advance
  if (!event.validation) {
    return {
      isValid: true,
      isCorrect: true,
      shouldAdvanceCursor: true,
      triggerKey: String(answer)
    }
  }

  const validation = event.validation

  // Exact match validation
  if (validation.type === 'exact' && validation.correctAnswers) {
    const answerStr = String(answer).trim()
    const isCorrect = validation.correctAnswers.some(
      correct => correct.toLowerCase() === answerStr.toLowerCase()
    )

    return {
      isValid: true,
      isCorrect,
      shouldAdvanceCursor: isCorrect || !validation.retryOnWrong,
      message: isCorrect ? undefined : validation.wrongMessage,
      triggerKey: isCorrect ? 'correct' : 'wrong'
    }
  }

  // Regex validation
  if (validation.type === 'regex' && validation.pattern) {
    const regex = new RegExp(validation.pattern)
    const isCorrect = regex.test(String(answer))

    return {
      isValid: true,
      isCorrect,
      shouldAdvanceCursor: isCorrect || !validation.retryOnWrong,
      message: isCorrect ? undefined : validation.wrongMessage,
      triggerKey: isCorrect ? 'correct' : 'wrong'
    }
  }

  // Default: accept and advance
  return {
    isValid: true,
    isCorrect: true,
    shouldAdvanceCursor: true,
    triggerKey: String(answer)
  }
}
```

#### 3. Update API Route

**File**: `server/src/routes/api.ts`

Modify the `/api/answer` endpoint to use validation:

```typescript
router.post('/answer', sessionMiddleware(db), (req: Request, res: Response, next) => {
  try {
    const sessionId = req.sessionId!
    const { eventId, answer }: AnswerSubmission = req.body

    if (!eventId || answer === undefined) {
      return res.status(400).json({ error: 'eventId and answer are required' })
    }

    // Get the event configuration
    const cursorIndex = db.getSessionCursor(sessionId)
    const events = eventScheduler.getAllEvents()
    const eventIndex = events.findIndex(e => e.id === eventId)
    const event = events[eventIndex]

    if (!event) {
      return res.status(404).json({ error: 'Event not found' })
    }

    // Validate the answer
    const validationResult = validateAnswer(answer, event)

    // Check for duplicate
    const duplicate = db.hasSessionAnswered(sessionId, eventId)

    if (!duplicate) {
      // Record answer
      const answerType = typeof answer === 'string' ? 'text' : 'multiple_choice'
      db.recordAnswer(sessionId, eventId, answerType, answer)

      // Process answer for conditional events
      eventScheduler.processAnswer(eventId, answer, sessionId)

      // Only advance cursor if validation allows it
      if (validationResult.shouldAdvanceCursor) {
        // Check if this is the event at user's cursor
        if (cursorIndex < events.length && events[cursorIndex].id === eventId) {
          db.incrementSessionCursor(sessionId)
        }
      }
    }

    res.json({
      success: true,
      duplicate,
      correct: validationResult.isCorrect,
      message: validationResult.message,
      shouldRetry: !validationResult.shouldAdvanceCursor
    })
  } catch (error) {
    next(error)
  }
})
```

#### 4. Update Client Polling Hook

**File**: `client/src/hooks/useServerPolling.ts`

Handle retry responses:

```typescript
export interface AnswerResponse {
  success: boolean
  duplicate: boolean
  correct?: boolean
  message?: string
  shouldRetry?: boolean
}

// In submitAnswer callback
const submitAnswer = useCallback(async (answer: any) => {
  if (!displayState || !displayState.eventId) {
    throw new Error('No active event to answer')
  }

  try {
    setIsLoading(true)
    const response = await apiSubmitAnswer(displayState.eventId, answer)

    // If answer was wrong and should retry, show error message
    if (response.shouldRetry && response.message) {
      setError(new Error(response.message))
      // Don't poll - keep showing the same event
    } else {
      // Correct answer or no retry, poll for next event
      await pollRef.current?.()
    }
  } catch (err) {
    console.error('Error submitting answer:', err)
    throw err
  } finally {
    setIsLoading(false)
  }
}, [displayState])
```

#### 5. Update Client Types

**File**: `client/src/services/api.ts`

Update the `AnswerResponse` interface:

```typescript
export interface AnswerResponse {
  success: boolean
  duplicate: boolean
  correct?: boolean         // NEW: Was the answer correct?
  message?: string          // NEW: Feedback message
  shouldRetry?: boolean     // NEW: Should user try again?
}
```

### Test Event Configuration

With these changes, you can create a test event like this:

**File**: `server/test-events/math-quiz-with-retry.json`

```json
{
  "events": [
    {
      "id": "math-question",
      "type": "question",
      "startTime": "now",
      "endTime": "+5m",
      "content": "What is 2 + 3?",
      "placeholder": "Enter your answer",
      "validation": {
        "type": "exact",
        "correctAnswers": ["5"],
        "retryOnWrong": true,
        "wrongMessage": "That's not correct. Try again!"
      },
      "triggers": {
        "onAnswer": {
          "correct": [
            {
              "id": "success-message",
              "type": "text",
              "startTime": "now",
              "endTime": "+5s",
              "content": "Good job! You got it right!"
            }
          ]
        }
      }
    },
    {
      "id": "next-event",
      "type": "text",
      "startTime": "now",
      "endTime": "+5s",
      "content": "Moving on to the next question..."
    }
  ]
}
```

## Implementation Tasks

- [ ] Add `validation` field to `EventConfig` type in `server/src/types.ts`
- [ ] Implement `validateAnswer()` function in `server/src/answerHandler.ts`
- [ ] Update `/api/answer` route to use validation and conditionally advance cursor
- [ ] Update `AnswerResponse` type in both client and server
- [ ] Update client `submitAnswer` to handle retry responses
- [ ] Add UI feedback for wrong answers (show error message)
- [ ] Create test event configuration with validation
- [ ] Write tests for validation logic
- [ ] Document validation feature in main docs

## Alternative: Default Triggers

A simpler alternative would be to add "default" trigger support without cursor control:

**File**: `server/src/eventScheduler.ts`

```typescript
// In processAnswer method, line 192
else {
  // Lookup by trigger key
  triggeredEvents = event.triggers.onAnswer[triggerKey] ||
                    event.triggers.onAnswer['*'] ||  // NEW: Wildcard default
                    []
}
```

Then you could use:

```json
{
  "triggers": {
    "onAnswer": {
      "5": [{ "id": "correct", "type": "text", "content": "Good job!" }],
      "*": [{ "id": "wrong", "type": "text", "content": "Try again!" }]
    }
  }
}
```

But this still wouldn't prevent cursor advancement.

## Testing Plan

1. Create math quiz event with `retryOnWrong: true`
2. Submit wrong answer → verify cursor doesn't advance
3. Submit wrong answer again → verify still on same event
4. Submit correct answer → verify cursor advances to next event
5. Verify triggered events fire correctly
6. Test with multiple validation types (exact, regex)
7. Test case-insensitive matching

## Migration Strategy

This is a **non-breaking change** because:
- The `validation` field is optional
- Events without `validation` behave exactly as before
- Existing events continue to work without modification

## Success Criteria

- [ ] User can answer a question multiple times until correct
- [ ] Cursor only advances when answer is correct (if `retryOnWrong: true`)
- [ ] Wrong answers show feedback message
- [ ] Correct answers trigger success events
- [ ] Existing events without validation continue to work
- [ ] API response includes validation status
- [ ] Client UI shows retry feedback
