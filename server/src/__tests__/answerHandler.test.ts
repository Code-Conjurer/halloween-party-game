import { describe, test, expect } from '@jest/globals'
import { evaluateAnswer, AnswerContext } from '../answerHandler.js'
import { createEventFixture, createQuestionEvent } from './fixtures/factories.js'

describe('Answer Handler', () => {
  describe('evaluateAnswer', () => {
    test('should return string answer as-is', () => {
      const context: AnswerContext = {
        eventId: 'event_1',
        sessionId: 'session_1',
        answer: 'Hello',
        allAnswersForEvent: [],
        event: createEventFixture()
      }

      const result = evaluateAnswer(context)
      expect(result).toBe('Hello')
    })

    test('should handle empty string answer', () => {
      const context: AnswerContext = {
        eventId: 'event_1',
        sessionId: 'session_1',
        answer: '',
        allAnswersForEvent: [],
        event: createEventFixture()
      }

      const result = evaluateAnswer(context)
      expect(result).toBe('')
    })

    test('should stringify non-string answers', () => {
      const context: AnswerContext = {
        eventId: 'event_1',
        sessionId: 'session_1',
        answer: { selected: 'option_a' },
        allAnswersForEvent: [],
        event: createEventFixture()
      }

      const result = evaluateAnswer(context)
      expect(result).toBe('{"selected":"option_a"}')
    })

    test('should stringify number answers', () => {
      const context: AnswerContext = {
        eventId: 'event_1',
        sessionId: 'session_1',
        answer: 42,
        allAnswersForEvent: [],
        event: createEventFixture()
      }

      const result = evaluateAnswer(context)
      expect(result).toBe('42')
    })

    test('should stringify boolean answers', () => {
      const context: AnswerContext = {
        eventId: 'event_1',
        sessionId: 'session_1',
        answer: true,
        allAnswersForEvent: [],
        event: createEventFixture()
      }

      const result = evaluateAnswer(context)
      expect(result).toBe('true')
    })

    test('should stringify array answers', () => {
      const context: AnswerContext = {
        eventId: 'event_1',
        sessionId: 'session_1',
        answer: ['option1', 'option2'],
        allAnswersForEvent: [],
        event: createEventFixture()
      }

      const result = evaluateAnswer(context)
      expect(result).toBe('["option1","option2"]')
    })

    test('should preserve whitespace in string answers', () => {
      const context: AnswerContext = {
        eventId: 'event_1',
        sessionId: 'session_1',
        answer: '  spaced out  ',
        allAnswersForEvent: [],
        event: createEventFixture()
      }

      const result = evaluateAnswer(context)
      expect(result).toBe('  spaced out  ')
    })

    test('should handle special characters in answers', () => {
      const context: AnswerContext = {
        eventId: 'event_1',
        sessionId: 'session_1',
        answer: 'Hello! @#$%^&*()',
        allAnswersForEvent: [],
        event: createEventFixture()
      }

      const result = evaluateAnswer(context)
      expect(result).toBe('Hello! @#$%^&*()')
    })

    test('should handle unicode characters', () => {
      const context: AnswerContext = {
        eventId: 'event_1',
        sessionId: 'session_1',
        answer: 'Hello 🎃 World',
        allAnswersForEvent: [],
        event: createEventFixture()
      }

      const result = evaluateAnswer(context)
      expect(result).toBe('Hello 🎃 World')
    })

    test('should have access to all answers for event', () => {
      const context: AnswerContext = {
        eventId: 'event_1',
        sessionId: 'session_3',
        answer: 'answer3',
        allAnswersForEvent: [
          { sessionId: 'session_1', answer: 'answer1' },
          { sessionId: 'session_2', answer: 'answer2' }
        ],
        event: createEventFixture()
      }

      // Currently not used, but context includes it for future logic
      expect(context.allAnswersForEvent).toHaveLength(2)

      const result = evaluateAnswer(context)
      expect(result).toBe('answer3')
    })

    test('should have access to event configuration', () => {
      const event = createQuestionEvent({
        content: 'What is your favorite color?'
      })

      const context: AnswerContext = {
        eventId: event.id,
        sessionId: 'session_1',
        answer: 'blue',
        allAnswersForEvent: [],
        event
      }

      // Context includes event for future custom logic
      expect(context.event.type).toBe('question')
      if (context.event.type === 'question') {
        expect(context.event.content).toBe('What is your favorite color?')
      }

      const result = evaluateAnswer(context)
      expect(result).toBe('blue')
    })
  })

  describe('Future Extensibility', () => {
    test('context structure supports future enhancements', () => {
      // This test documents the AnswerContext interface
      // for future developers adding custom answer evaluation logic

      const context: AnswerContext = {
        eventId: 'event_1',          // Which event was answered
        sessionId: 'session_1',       // Who answered
        answer: 'blue',               // What they answered
        allAnswersForEvent: [         // What everyone else answered
          { sessionId: 'session_2', answer: 'red' },
          { sessionId: 'session_3', answer: 'blue' }
        ],
        event: createQuestionEvent({   // Event configuration
          content: 'What is your favorite color?',
          // Future: Could include custom validation rules here
        })
      }

      // Example future use cases:
      // - Case-insensitive matching: answer.toLowerCase() === 'blue'
      // - Fuzzy matching: levenshtein(answer, 'blue') < 2
      // - Majority voting: findMajorityAnswer(allAnswersForEvent)
      // - Threshold triggers: allAnswersForEvent.length >= 10

      expect(context).toHaveProperty('eventId')
      expect(context).toHaveProperty('sessionId')
      expect(context).toHaveProperty('answer')
      expect(context).toHaveProperty('allAnswersForEvent')
      expect(context).toHaveProperty('event')
    })
  })
})
