import { describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import express, { Request, Response } from 'express'
import request from 'supertest'
import { GameDatabase } from '../../database/db.js'
import { sessionMiddleware } from '../../middleware/session.js'
import { createTestDb, cleanupTestDb } from '../utils/testDb.js'
import { resetCounters } from '../fixtures/factories.js'

describe('Session Middleware', () => {
  let app: express.Application
  let db: GameDatabase

  beforeEach(() => {
    resetCounters()
    db = createTestDb()

    // Create test app
    app = express()
    app.use(sessionMiddleware(db))

    // Test endpoint that returns session ID
    app.get('/test', (req: Request, res: Response) => {
      res.json({ sessionId: req.sessionId })
    })
  })

  afterEach(() => {
    cleanupTestDb(db)
  })

  describe('New Session Creation', () => {
    test('should create new session for first-time user', async () => {
      const response = await request(app)
        .get('/test')
        .set('User-Agent', 'Test-Browser/1.0')
        .expect(200)

      expect(response.body.sessionId).toBeDefined()
      expect(response.body.sessionId).toMatch(/^sess_/)

      // Verify session exists in database
      const session = db.findSessionById(response.body.sessionId)
      expect(session).toBeDefined()
      expect(session?.user_agent).toBe('Test-Browser/1.0')
    })

    test('should create session with device fingerprint', async () => {
      const response = await request(app)
        .get('/test')
        .set('X-Device-Fingerprint', 'fingerprint-123')
        .expect(200)

      const session = db.findSessionById(response.body.sessionId)
      expect(session?.device_fingerprint).toBe('fingerprint-123')
    })

    test('should handle missing user agent gracefully', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200)

      expect(response.body.sessionId).toBeDefined()

      const session = db.findSessionById(response.body.sessionId)
      expect(session?.user_agent).toBe('unknown')
    })
  })

  describe('Session Reuse by Client ID', () => {
    test('should reuse existing session when client ID provided', async () => {
      // First request creates session
      const response1 = await request(app)
        .get('/test')
        .set('User-Agent', 'Test-Browser/1.0')
        .expect(200)

      const sessionId1 = response1.body.sessionId

      // Second request with same client ID
      const response2 = await request(app)
        .get('/test')
        .set('X-Client-ID', sessionId1)
        .set('User-Agent', 'Different-Browser/2.0')
        .expect(200)

      expect(response2.body.sessionId).toBe(sessionId1)

      // Should only have one session in database
      const allSessions = db.getAllSessions()
      expect(allSessions).toHaveLength(1)
    })

    test('should update last_seen when reusing session', async () => {
      // Create initial session
      const response1 = await request(app)
        .get('/test')
        .expect(200)

      const sessionId = response1.body.sessionId
      const session1 = db.findSessionById(sessionId)
      const firstLastSeen = session1?.last_seen || 0

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10))

      // Reuse session
      await request(app)
        .get('/test')
        .set('X-Client-ID', sessionId)
        .expect(200)

      const session2 = db.findSessionById(sessionId)
      const secondLastSeen = session2?.last_seen || 0

      expect(secondLastSeen).toBeGreaterThan(firstLastSeen)
    })
  })

  describe('Session Reuse by IP and User Agent', () => {
    test('should reuse session based on IP and User Agent', async () => {
      // First request
      const response1 = await request(app)
        .get('/test')
        .set('User-Agent', 'Test-Browser/1.0')
        .expect(200)

      const sessionId1 = response1.body.sessionId

      // Second request with same User Agent (no client ID)
      // Note: In tests, IP will be the same (::ffff:127.0.0.1)
      const response2 = await request(app)
        .get('/test')
        .set('User-Agent', 'Test-Browser/1.0')
        .expect(200)

      expect(response2.body.sessionId).toBe(sessionId1)
    })

    test('should create new session for different User Agent', async () => {
      // First request
      const response1 = await request(app)
        .get('/test')
        .set('User-Agent', 'Browser-A/1.0')
        .expect(200)

      const sessionId1 = response1.body.sessionId

      // Second request with different User Agent
      const response2 = await request(app)
        .get('/test')
        .set('User-Agent', 'Browser-B/1.0')
        .expect(200)

      const sessionId2 = response2.body.sessionId

      expect(sessionId2).not.toBe(sessionId1)

      // Should have two sessions
      const allSessions = db.getAllSessions()
      expect(allSessions).toHaveLength(2)
    })

    test('should not reuse session older than 24 hours', async () => {
      // Create session with old timestamp
      const oneDayAndOneHourAgo = Date.now() - (25 * 60 * 60 * 1000)
      const oldSession = db.createSession({
        ip_address: '::ffff:127.0.0.1',
        user_agent: 'Test-Browser/1.0',
        device_fingerprint: '',
        first_seen: oneDayAndOneHourAgo,
        last_seen: oneDayAndOneHourAgo
      })

      // New request with same IP/UA
      const response = await request(app)
        .get('/test')
        .set('User-Agent', 'Test-Browser/1.0')
        .expect(200)

      // Should create new session
      expect(response.body.sessionId).not.toBe(oldSession.id)

      // Should have two sessions
      const allSessions = db.getAllSessions()
      expect(allSessions).toHaveLength(2)
    })
  })

  describe('Session ID Priority', () => {
    test('should prioritize X-Client-ID over IP/UA matching', async () => {
      // Create two sessions
      const session1 = db.createSession({
        ip_address: '::ffff:127.0.0.1',
        user_agent: 'Test-Browser/1.0',
        device_fingerprint: '',
        first_seen: Date.now(),
        last_seen: Date.now()
      })

      const session2 = db.createSession({
        ip_address: '192.168.1.1',
        user_agent: 'Different-Browser/2.0',
        device_fingerprint: '',
        first_seen: Date.now(),
        last_seen: Date.now()
      })

      // Request with client ID for session2, but IP/UA that matches session1
      const response = await request(app)
        .get('/test')
        .set('X-Client-ID', session2.id)
        .set('User-Agent', 'Test-Browser/1.0')
        .expect(200)

      // Should use session2 (from client ID), not session1 (from IP/UA)
      expect(response.body.sessionId).toBe(session2.id)
    })
  })

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      // Close the database to force an error
      db.close()

      const response = await request(app)
        .get('/test')
        .expect(500)
    })
  })

  describe('Session Attachment', () => {
    test('should attach sessionId to request object', async () => {
      let capturedSessionId: string | undefined

      // Create endpoint that captures sessionId from request
      const testApp = express()
      testApp.use(sessionMiddleware(db))
      testApp.get('/capture', (req: Request, res: Response) => {
        capturedSessionId = req.sessionId
        res.json({ ok: true })
      })

      await request(testApp)
        .get('/capture')
        .expect(200)

      expect(capturedSessionId).toBeDefined()
      expect(capturedSessionId).toMatch(/^sess_/)
    })
  })
})
