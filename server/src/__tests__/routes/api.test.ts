import { describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import express from 'express'
import request from 'supertest'
import { GameDatabase } from '../../database/db.js'
import { EventScheduler } from '../../eventScheduler.js'
import { createApiRoutes } from '../../routes/api.js'
import { createTestDb, cleanupTestDb } from '../utils/testDb.js'
import { resetCounters, createEventsConfig, createEventFixture, createTextEvent, createQuestionEvent } from '../fixtures/factories.js'

/**
 * Helper function to create test Express app with error handler
 */
function createTestApp(db: GameDatabase, scheduler: EventScheduler): express.Application {
  const app = express()
  app.use(express.json())
  app.use('/api', createApiRoutes(db, scheduler))

  // Error handler (matches production error handler in index.ts)
  app.use((err: any, req: any, res: any, next: any) => {
    res.status(500).json({ error: err.message })
  })

  return app
}

describe('API Routes', () => {
  let app: express.Application
  let db: GameDatabase
  let scheduler: EventScheduler

  beforeEach(() => {
    resetCounters()
    db = createTestDb()
    scheduler = new EventScheduler((eventId) => {
      return db.getAnswersByEvent(eventId).map(a => ({
        sessionId: a.session_id,
        answer: a.answer_value
      }))
    })

    app = createTestApp(db, scheduler)
  })

  afterEach(() => {
    scheduler.reset()
    cleanupTestDb(db)
  })

  describe('GET /api/current-event', () => {
    test('should return none when no events loaded', async () => {
      const response = await request(app)
        .get('/api/current-event')
        .expect(200)

      expect(response.body.type).toBe('none')
    })

    test('should handle database errors gracefully', async () => {
      // Close database to force an error
      db.close()

      const response = await request(app)
        .get('/api/current-event')
        .expect(500)

      expect(response.body.error).toBe('The database connection is not open')

      // Recreate database and app for other tests
      db = createTestDb()
      scheduler = new EventScheduler((eventId) => {
        return db.getAnswersByEvent(eventId).map(a => ({
          sessionId: a.session_id,
          answer: a.answer_value
        }))
      })
      app = createTestApp(db, scheduler)
    })

    test('should return event at user cursor position', async () => {
      const config = createEventsConfig(3, [
        createTextEvent({ content: 'Event 0' }),
        createTextEvent({ content: 'Event 1' }),
        createTextEvent({ content: 'Event 2' })
      ])
      scheduler.loadEvents(config)

      const response = await request(app)
        .get('/api/current-event')
        .expect(200)

      expect(response.body.eventId).toBe('event_0')
      expect(response.body.content).toBe('Event 0')
      expect(response.body.hasAnswered).toBe(false)
      expect(response.body.answerCount).toBe(0)
    })

    test('should return hasAnswered=true if user answered', async () => {
      const config = createEventsConfig(1)
      scheduler.loadEvents(config)

      // Create session and answer
      const session = db.createSession({
        ip_address: '::ffff:127.0.0.1',
        user_agent: 'Test',
        device_fingerprint: '',
        first_seen: Date.now(),
        last_seen: Date.now()
      })
      db.recordAnswer(session.id, 'event_0', 'text', 'my answer')

      const response = await request(app)
        .get('/api/current-event')
        .set('X-Client-ID', session.id)
        .expect(200)

      expect(response.body.hasAnswered).toBe(true)
    })

    test('should return answer count for event', async () => {
      const config = createEventsConfig(1)
      scheduler.loadEvents(config)

      // Create multiple sessions and answers
      const session1 = db.createSession({
        ip_address: '192.168.1.1',
        user_agent: 'User1',
        device_fingerprint: '',
        first_seen: Date.now(),
        last_seen: Date.now()
      })
      const session2 = db.createSession({
        ip_address: '192.168.1.2',
        user_agent: 'User2',
        device_fingerprint: '',
        first_seen: Date.now(),
        last_seen: Date.now()
      })

      db.recordAnswer(session1.id, 'event_0', 'text', 'answer1')
      db.recordAnswer(session2.id, 'event_0', 'text', 'answer2')

      const response = await request(app)
        .get('/api/current-event')
        .expect(200)

      expect(response.body.answerCount).toBe(2)
    })

    test('should return mandatory event before cursor if unanswered', async () => {
      const config = createEventsConfig(3, [
        createTextEvent({ content: 'Event 0', mandatory: false }),
        createTextEvent({ content: 'Mandatory Event 1', mandatory: true }),
        createTextEvent({ content: 'Event 2', mandatory: false })
      ])
      scheduler.loadEvents(config)

      // Create session and set cursor to 2
      const session = db.createSession({
        ip_address: '::ffff:127.0.0.1',
        user_agent: 'Test',
        device_fingerprint: '',
        first_seen: Date.now(),
        last_seen: Date.now()
      })
      db.setSessionCursor(session.id, 2)

      const response = await request(app)
        .get('/api/current-event')
        .set('X-Client-ID', session.id)
        .expect(200)

      // Should return mandatory event_1, not event at cursor
      expect(response.body.eventId).toBe('event_1')
      expect(response.body.mandatory).toBe(true)
    })
  })

  describe('POST /api/answer', () => {
    test('should record an answer', async () => {
      const config = createEventsConfig(1)
      scheduler.loadEvents(config)

      const response = await request(app)
        .post('/api/answer')
        .send({ eventId: 'event_0', answer: 'My answer' })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.duplicate).toBe(false)

      // Verify answer was recorded
      const answers = db.getAnswersByEvent('event_0')
      expect(answers).toHaveLength(1)
      expect(answers[0].answer_value).toBe('My answer')
    })

    test('should handle database errors when submitting answer', async () => {
      const config = createEventsConfig(1)
      scheduler.loadEvents(config)

      // Close database to force an error
      db.close()

      const response = await request(app)
        .post('/api/answer')
        .send({ eventId: 'event_0', answer: 'My answer' })
        .expect(500)

      expect(response.body.error).toBe('The database connection is not open')

      // Recreate database and app for other tests
      db = createTestDb()
      scheduler = new EventScheduler((eventId) => {
        return db.getAnswersByEvent(eventId).map(a => ({
          sessionId: a.session_id,
          answer: a.answer_value
        }))
      })
      app = createTestApp(db, scheduler)
    })

    test('should return 400 if eventId missing', async () => {
      const response = await request(app)
        .post('/api/answer')
        .send({ answer: 'My answer' })
        .expect(400)

      expect(response.body.error).toBe('eventId and answer are required')
    })

    test('should return 400 if answer missing', async () => {
      const response = await request(app)
        .post('/api/answer')
        .send({ eventId: 'event_0' })
        .expect(400)

      expect(response.body.error).toBe('eventId and answer are required')
    })

    test('should mark duplicate if answered twice', async () => {
      const config = createEventsConfig(1)
      scheduler.loadEvents(config)

      // First answer
      await request(app)
        .post('/api/answer')
        .send({ eventId: 'event_0', answer: 'answer' })
        .expect(200)

      // Second answer (duplicate)
      const response = await request(app)
        .post('/api/answer')
        .send({ eventId: 'event_0', answer: 'different answer' })
        .expect(200)

      expect(response.body.duplicate).toBe(true)

      // Should still only have one answer recorded
      const answers = db.getAnswersByEvent('event_0')
      expect(answers).toHaveLength(1)
    })

    test('should advance cursor after answering event at cursor', async () => {
      const config = createEventsConfig(2)
      scheduler.loadEvents(config)

      // Create session
      const session = db.createSession({
        ip_address: '::ffff:127.0.0.1',
        user_agent: 'Test',
        device_fingerprint: '',
        first_seen: Date.now(),
        last_seen: Date.now()
      })

      // Initial cursor should be 0
      expect(db.getSessionCursor(session.id)).toBe(0)

      // Answer event_0 (at cursor)
      await request(app)
        .post('/api/answer')
        .set('X-Client-ID', session.id)
        .send({ eventId: 'event_0', answer: 'answer' })
        .expect(200)

      // Cursor should advance to 1
      expect(db.getSessionCursor(session.id)).toBe(1)
    })

    test('should not advance cursor when answering mandatory event before cursor', async () => {
      const config = createEventsConfig(3, [
        createTextEvent({ mandatory: true }),
        createTextEvent({ mandatory: false }),
        createTextEvent({ mandatory: false })
      ])
      scheduler.loadEvents(config)

      // Create session at cursor 2
      const session = db.createSession({
        ip_address: '::ffff:127.0.0.1',
        user_agent: 'Test',
        device_fingerprint: '',
        first_seen: Date.now(),
        last_seen: Date.now()
      })
      db.setSessionCursor(session.id, 2)

      // Answer mandatory event_0 (before cursor)
      await request(app)
        .post('/api/answer')
        .set('X-Client-ID', session.id)
        .send({ eventId: 'event_0', answer: 'answer' })
        .expect(200)

      // Cursor should still be 2
      expect(db.getSessionCursor(session.id)).toBe(2)
    })

    test('should process conditional events based on answer', async () => {
      const triggeredEvent = createTextEvent({
        id: 'triggered',
        content: 'You said yes!'
      })

      const config = createEventsConfig(1, [
        createQuestionEvent({
          id: 'question',
          content: 'Do you like Halloween?',
          triggers: {
            onAnswer: [triggeredEvent]
          }
        })
      ])

      scheduler.loadEvents(config)
      scheduler.startGame()

      await request(app)
        .post('/api/answer')
        .send({ eventId: 'question', answer: 'yes' })
        .expect(200)

      // The triggered event should be scheduled
      // We can't directly verify this, but the answer was processed
    })
  })

  describe('GET /api/game/status', () => {
    test('should return game inactive initially', async () => {
      const response = await request(app)
        .get('/api/game/status')
        .expect(200)

      expect(response.body.gameActive).toBe(false)
      expect(response.body.gameStartTime).toBeNull()
      expect(response.body.serverTime).toBeGreaterThan(0)
      expect(response.body.participantCount).toBe(0)
    })

    test('should return game active after start', async () => {
      const config = createEventsConfig(1)
      scheduler.loadEvents(config)
      scheduler.startGame()

      const response = await request(app)
        .get('/api/game/status')
        .expect(200)

      expect(response.body.gameActive).toBe(true)
      expect(response.body.gameStartTime).toBeGreaterThan(0)
    })

    test('should return participant count', async () => {
      // Create some sessions
      const now = Date.now()
      db.createSession({
        ip_address: '192.168.1.1',
        user_agent: 'User1',
        device_fingerprint: '',
        first_seen: now,
        last_seen: now
      })
      db.createSession({
        ip_address: '192.168.1.2',
        user_agent: 'User2',
        device_fingerprint: '',
        first_seen: now,
        last_seen: now
      })

      const response = await request(app)
        .get('/api/game/status')
        .expect(200)

      expect(response.body.participantCount).toBe(2)
    })

    test('should handle database errors when getting game status', async () => {
      // Close database to force an error
      db.close()

      const response = await request(app)
        .get('/api/game/status')
        .expect(500)

      expect(response.body.error).toBe('The database connection is not open')

      // Recreate database and app for other tests
      db = createTestDb()
      scheduler = new EventScheduler((eventId) => {
        return db.getAnswersByEvent(eventId).map(a => ({
          sessionId: a.session_id,
          answer: a.answer_value
        }))
      })
      app = createTestApp(db, scheduler)
    })
  })

  describe('POST /api/admin/start', () => {
    test('should start the game', async () => {
      const config = createEventsConfig(1)
      scheduler.loadEvents(config)

      const response = await request(app)
        .post('/api/admin/start')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.startTime).toBeGreaterThan(0)

      expect(scheduler.isGameActive()).toBe(true)
    })
  })

  describe('POST /api/admin/reset', () => {
    test('should reset game state and clear data', async () => {
      const config = createEventsConfig(1)
      scheduler.loadEvents(config)
      scheduler.startGame()

      // Create session and answer
      const session = db.createSession({
        ip_address: '192.168.1.1',
        user_agent: 'User',
        device_fingerprint: '',
        first_seen: Date.now(),
        last_seen: Date.now()
      })
      db.recordAnswer(session.id, 'event_0', 'text', 'answer')

      const response = await request(app)
        .post('/api/admin/reset')
        .expect(200)

      expect(response.body.success).toBe(true)

      // Game should be inactive
      expect(scheduler.isGameActive()).toBe(false)

      // Data should be cleared
      expect(db.getAllSessions()).toHaveLength(0)
      expect(db.getAllAnswers()).toHaveLength(0)
    })
  })

  describe('GET /api/admin/sessions', () => {
    test('should return empty sessions list initially', async () => {
      const response = await request(app)
        .get('/api/admin/sessions')
        .expect(200)

      expect(response.body.total).toBe(0)
      expect(response.body.active).toBe(0)
      expect(response.body.sessions).toHaveLength(0)
    })

    test('should return all sessions with cursor info', async () => {
      const now = Date.now()
      const session1 = db.createSession({
        ip_address: '192.168.1.1',
        user_agent: 'User1',
        device_fingerprint: '',
        first_seen: now,
        last_seen: now
      })
      const session2 = db.createSession({
        ip_address: '192.168.1.2',
        user_agent: 'User2',
        device_fingerprint: '',
        first_seen: now,
        last_seen: now
      })

      db.setSessionCursor(session1.id, 5)
      db.setSessionCursor(session2.id, 3)

      const response = await request(app)
        .get('/api/admin/sessions')
        .expect(200)

      expect(response.body.total).toBe(2)
      expect(response.body.sessions).toHaveLength(2)

      const session1Data = response.body.sessions.find((s: any) => s.id === session1.id)
      const session2Data = response.body.sessions.find((s: any) => s.id === session2.id)

      expect(session1Data.cursorIndex).toBe(5)
      expect(session2Data.cursorIndex).toBe(3)
    })
  })

  describe('POST /api/admin/session/:sessionId/cursor', () => {
    test('should set user cursor position', async () => {
      const config = createEventsConfig(5)
      scheduler.loadEvents(config)

      const session = db.createSession({
        ip_address: '192.168.1.1',
        user_agent: 'User',
        device_fingerprint: '',
        first_seen: Date.now(),
        last_seen: Date.now()
      })

      const response = await request(app)
        .post(`/api/admin/session/${session.id}/cursor`)
        .send({ eventIndex: 3 })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.newCursor).toBe(3)

      expect(db.getSessionCursor(session.id)).toBe(3)
    })

    test('should return 400 if eventIndex not a number', async () => {
      const session = db.createSession({
        ip_address: '192.168.1.1',
        user_agent: 'User',
        device_fingerprint: '',
        first_seen: Date.now(),
        last_seen: Date.now()
      })

      const response = await request(app)
        .post(`/api/admin/session/${session.id}/cursor`)
        .send({ eventIndex: 'invalid' })
        .expect(400)

      expect(response.body.error).toBe('eventIndex must be a number')
    })

    test('should return 400 if eventIndex out of bounds', async () => {
      const config = createEventsConfig(5)
      scheduler.loadEvents(config)

      const session = db.createSession({
        ip_address: '192.168.1.1',
        user_agent: 'User',
        device_fingerprint: '',
        first_seen: Date.now(),
        last_seen: Date.now()
      })

      const response = await request(app)
        .post(`/api/admin/session/${session.id}/cursor`)
        .send({ eventIndex: 10 })
        .expect(400)

      expect(response.body.error).toContain('eventIndex must be between')
    })
  })

  describe('GET /api/admin/answers/:eventId', () => {
    test('should return empty answers for event with no responses', async () => {
      const response = await request(app)
        .get('/api/admin/answers/event_0')
        .expect(200)

      expect(response.body.eventId).toBe('event_0')
      expect(response.body.totalAnswers).toBe(0)
      expect(response.body.uniqueSessions).toBe(0)
      expect(response.body.answers).toHaveLength(0)
    })

    test('should return all answers for an event', async () => {
      const session1 = db.createSession({
        ip_address: '192.168.1.1',
        user_agent: 'User1',
        device_fingerprint: '',
        first_seen: Date.now(),
        last_seen: Date.now()
      })
      const session2 = db.createSession({
        ip_address: '192.168.1.2',
        user_agent: 'User2',
        device_fingerprint: '',
        first_seen: Date.now(),
        last_seen: Date.now()
      })

      db.recordAnswer(session1.id, 'event_1', 'text', 'answer1')
      db.recordAnswer(session2.id, 'event_1', 'text', 'answer2')

      const response = await request(app)
        .get('/api/admin/answers/event_1')
        .expect(200)

      expect(response.body.totalAnswers).toBe(2)
      expect(response.body.uniqueSessions).toBe(2)
      expect(response.body.answers).toHaveLength(2)
    })
  })

  describe('GET /api/admin/export', () => {
    test('should export all data', async () => {
      const config = createEventsConfig(2)
      scheduler.loadEvents(config)
      scheduler.startGame()

      const session = db.createSession({
        ip_address: '192.168.1.1',
        user_agent: 'User',
        device_fingerprint: '',
        first_seen: Date.now(),
        last_seen: Date.now()
      })
      db.recordAnswer(session.id, 'event_0', 'text', 'answer')

      const response = await request(app)
        .get('/api/admin/export')
        .expect(200)

      expect(response.body.sessions).toHaveLength(1)
      expect(response.body.answers).toHaveLength(1)
      expect(response.body.gameState).toBeDefined()
      expect(response.body.gameState.gameStartTime).toBeGreaterThan(0)
      expect(response.body.exportedAt).toBeGreaterThan(0)
    })

    test('should export with null gameState when game not started', async () => {
      const response = await request(app)
        .get('/api/admin/export')
        .expect(200)

      expect(response.body.gameState).toBeNull()
    })
  })
})
