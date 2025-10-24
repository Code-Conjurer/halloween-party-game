import { describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import { GameDatabase } from '../../database/db.js'
import { createTestDb, cleanupTestDb } from '../utils/testDb.js'
import { resetCounters, createSessionFixture, createAnswerFixture } from '../fixtures/factories.js'

describe('GameDatabase', () => {
  let db: GameDatabase

  beforeEach(() => {
    resetCounters()
    db = createTestDb()
  })

  afterEach(() => {
    cleanupTestDb(db)
  })

  describe('Session Management', () => {
    test('should create a new session', () => {
      const sessionData = createSessionFixture()
      const session = db.createSession(sessionData)

      expect(session.id).toBeDefined()
      expect(session.ip_address).toBe('127.0.0.1')
      expect(session.user_agent).toBe('Test-Agent-0')
      expect(session.device_fingerprint).toBe('fingerprint-0')
    })

    test('should find existing session by ID', () => {
      const sessionData = createSessionFixture()
      const session1 = db.createSession(sessionData)

      const session2 = db.findSessionById(session1.id)

      expect(session2).toBeDefined()
      expect(session2?.id).toBe(session1.id)
    })

    test('should find session by IP and User Agent', () => {
      const sessionData = createSessionFixture()
      const created = db.createSession(sessionData)

      const retrieved = db.findSessionByIPAndUA(
        sessionData.ip_address,
        sessionData.user_agent,
        Date.now() - 60000
      )

      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe(created.id)
      expect(retrieved?.ip_address).toBe('127.0.0.1')
    })

    test('should return null for non-existent session', () => {
      const session = db.findSessionById('non-existent-id')
      expect(session).toBeUndefined()
    })

    test('should get all sessions', () => {
      db.createSession(createSessionFixture())
      db.createSession(createSessionFixture())
      db.createSession(createSessionFixture())

      const sessions = db.getAllSessions()

      expect(sessions).toHaveLength(3)
      expect(sessions[0].ip_address).toBe('127.0.0.1')
      expect(sessions[1].ip_address).toBe('127.0.0.2')
      expect(sessions[2].ip_address).toBe('127.0.0.3')
    })

    test('should count active sessions', () => {
      const now = Date.now()

      // Create active session
      db.createSession(createSessionFixture({ last_seen: now }))

      // Create inactive session (older than 30 minutes)
      db.createSession(createSessionFixture({ last_seen: now - (31 * 60 * 1000) }))

      const activeCount = db.getActiveSessionCount()

      expect(activeCount).toBe(1)
    })

    test('should update session timestamp', () => {
      const sessionData = createSessionFixture()
      const session = db.createSession(sessionData)
      const originalTimestamp = session.last_seen

      // Wait a bit to ensure timestamp changes
      const newTimestamp = Date.now() + 1000
      db.updateLastSeen(session.id, newTimestamp)

      const updated = db.findSessionById(session.id)
      expect(updated?.last_seen).toBeGreaterThan(originalTimestamp)
    })
  })

  describe('Answer Management', () => {
    test('should record an answer', () => {
      const sessionData = createSessionFixture()
      const session = db.createSession(sessionData)

      db.recordAnswer(session.id, 'event_1', 'text', 'My answer')

      const answers = db.getAnswersByEvent('event_1')
      expect(answers).toHaveLength(1)
      expect(answers[0].session_id).toBe(session.id)
      expect(answers[0].answer_value).toBe('My answer')
    })

    test('should check if session has answered event', () => {
      const sessionData = createSessionFixture()
      const session = db.createSession(sessionData)

      expect(db.hasSessionAnswered(session.id, 'event_1')).toBe(false)

      db.recordAnswer(session.id, 'event_1', 'text', 'My answer')

      expect(db.hasSessionAnswered(session.id, 'event_1')).toBe(true)
    })

    test('should get answer count for event', () => {
      const session1 = db.createSession(createSessionFixture())
      const session2 = db.createSession(createSessionFixture())

      db.recordAnswer(session1.id, 'event_1', 'text', 'Answer 1')
      db.recordAnswer(session2.id, 'event_1', 'text', 'Answer 2')

      const count = db.getAnswerCount('event_1')
      expect(count).toBe(2)
    })

    test('should get all answers', () => {
      const session = db.createSession(createSessionFixture())

      db.recordAnswer(session.id, 'event_1', 'text', 'Answer 1')
      db.recordAnswer(session.id, 'event_2', 'text', 'Answer 2')

      const answers = db.getAllAnswers()
      expect(answers).toHaveLength(2)
    })

    test('should use factory to create answers', () => {
      const session = db.createSession(createSessionFixture())

      const answer1 = createAnswerFixture(db, session.id)
      const answer2 = createAnswerFixture(db, session.id)

      expect(answer1.eventId).toBe('event_0')
      expect(answer1.answerValue).toBe('Answer 0')
      expect(answer2.eventId).toBe('event_1')
      expect(answer2.answerValue).toBe('Answer 1')

      const answers = db.getAllAnswers()
      expect(answers).toHaveLength(2)
    })
  })

  describe('Cursor Management', () => {
    test('should get default cursor value of 0', () => {
      const session = db.createSession(createSessionFixture())
      const cursor = db.getSessionCursor(session.id)
      expect(cursor).toBe(0)
    })

    test('should set session cursor', () => {
      const session = db.createSession(createSessionFixture())

      db.setSessionCursor(session.id, 5)

      const cursor = db.getSessionCursor(session.id)
      expect(cursor).toBe(5)
    })

    test('should increment session cursor', () => {
      const session = db.createSession(createSessionFixture())

      db.incrementSessionCursor(session.id)
      expect(db.getSessionCursor(session.id)).toBe(1)

      db.incrementSessionCursor(session.id)
      expect(db.getSessionCursor(session.id)).toBe(2)
    })

    test('should update existing cursor', () => {
      const session = db.createSession(createSessionFixture())

      db.setSessionCursor(session.id, 3)
      db.setSessionCursor(session.id, 7)

      const cursor = db.getSessionCursor(session.id)
      expect(cursor).toBe(7)
    })
  })

  describe('Data Clearing', () => {
    test('should clear all data', () => {
      const session = db.createSession(createSessionFixture())
      db.recordAnswer(session.id, 'event_1', 'text', 'Answer')
      db.setSessionCursor(session.id, 5)

      db.clearAllData()

      expect(db.getAllSessions()).toHaveLength(0)
      expect(db.getAllAnswers()).toHaveLength(0)
    })
  })
})
