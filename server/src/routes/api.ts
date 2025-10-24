
import { Router, Request, Response } from 'express'
import { GameDatabase } from '../database/db.js'
import { EventScheduler } from '../eventScheduler.js'
import { sessionMiddleware } from '../middleware/session.js'
import { AnswerSubmission, GameStatusResponse } from '../types.js'

export function createApiRoutes(db: GameDatabase, eventScheduler: EventScheduler) {
  const router = Router()

  // ==================== Event Polling ====================

  /**
   * GET /api/current-event
   * Returns the current event for this user
   * Handles mandatory events and cursor position
   * Requires session tracking
   */
  router.get('/current-event', sessionMiddleware(db), (req: Request, res: Response, next) => {
    try {
      const sessionId = req.sessionId!

      // Get user's cursor and event
      const cursorIndex = db.getSessionCursor(sessionId)
      const eventForUser = eventScheduler.getEventForSession(
        sessionId,
        cursorIndex,
        (eventId) => db.hasSessionAnswered(sessionId, eventId)
      )

      if (!eventForUser || eventForUser.type === 'none') {
        return res.json({ type: 'none' })
      }

      // Add answer metadata
      const hasAnswered = db.hasSessionAnswered(sessionId, eventForUser.eventId)
      const answerCount = db.getAnswerCount(eventForUser.eventId)

      res.json({
        ...eventForUser,
        hasAnswered,
        answerCount
      })
    } catch (error) {
      next(error)
    }
  })

  // ==================== Answer Submission ====================

  /**
   * POST /api/answer
   * Submit an answer and advance cursor if not mandatory
   * Requires session tracking
   */
  router.post('/answer', sessionMiddleware(db), (req: Request, res: Response, next) => {
    try {
      const sessionId = req.sessionId!
      const { eventId, answer }: AnswerSubmission = req.body

      if (!eventId || answer === undefined) {
        return res.status(400).json({ error: 'eventId and answer are required' })
      }

      // Check for duplicate
      const duplicate = db.hasSessionAnswered(sessionId, eventId)

      if (!duplicate) {
        // Record answer
        const answerType = typeof answer === 'string' ? 'text' : 'multiple_choice'
        db.recordAnswer(sessionId, eventId, answerType, answer)

        // Process answer for conditional events
        eventScheduler.processAnswer(eventId, answer, sessionId)

        // Check if this is the event at user's cursor (not a mandatory catch-up)
        const cursorIndex = db.getSessionCursor(sessionId)
        const events = eventScheduler.getAllEvents()
        if (cursorIndex < events.length && events[cursorIndex].id === eventId) {
          // Advance cursor
          db.incrementSessionCursor(sessionId)
        }
      }

      res.json({
        success: true,
        duplicate
      })
    } catch (error) {
      next(error)
    }
  })

  // ==================== Game Status ====================

  /**
   * GET /api/game/status
   * Get current game status
   */
  router.get('/game/status', (req: Request, res: Response, next) => {
    try {
      const response: GameStatusResponse = {
        gameActive: eventScheduler.isGameActive(),
        gameStartTime: eventScheduler.getGameStartTime(),
        serverTime: Date.now(),
        participantCount: db.getActiveSessionCount()
      }

      res.json(response)
    } catch (error) {
      next(error)
    }
  })

  // ==================== Admin Endpoints ====================

  /**
   * POST /api/admin/start
   * Start the game
   */
  router.post('/admin/start', (req: Request, res: Response, next) => {
    try {
      eventScheduler.startGame()

      res.json({
        success: true,
        startTime: eventScheduler.getGameStartTime()
      })
    } catch (error) {
      next(error)
    }
  })

  /**
   * POST /api/admin/reset
   * Reset game state
   */
  router.post('/admin/reset', (req: Request, res: Response, next) => {
    try {
      eventScheduler.reset()
      db.clearAllData()

      res.json({ success: true })
    } catch (error) {
      next(error)
    }
  })

  /**
   * GET /api/admin/sessions
   * Get all sessions
   */
  router.get('/admin/sessions', (req: Request, res: Response, next) => {
    try {
      const sessions = db.getAllSessions()
      const activeCount = db.getActiveSessionCount()

      // Include cursor info for each session
      const sessionsWithCursors = sessions.map(session => ({
        ...session,
        cursorIndex: db.getSessionCursor(session.id)
      }))

      res.json({
        total: sessions.length,
        active: activeCount,
        sessions: sessionsWithCursors
      })
    } catch (error) {
      next(error)
    }
  })

  /**
   * POST /api/admin/session/:sessionId/cursor
   * Set a user's event cursor position
   */
  router.post('/admin/session/:sessionId/cursor', (req: Request, res: Response, next) => {
    try {
      const { sessionId } = req.params
      const { eventIndex } = req.body

      if (typeof eventIndex !== 'number') {
        return res.status(400).json({ error: 'eventIndex must be a number' })
      }

      const events = eventScheduler.getAllEvents()
      if (eventIndex < 0 || eventIndex > events.length) {
        return res.status(400).json({ error: `eventIndex must be between 0 and ${events.length}` })
      }

      db.setSessionCursor(sessionId, eventIndex)

      res.json({
        success: true,
        sessionId,
        newCursor: eventIndex
      })
    } catch (error) {
      next(error)
    }
  })

  /**
   * GET /api/admin/answers/:eventId
   * Get all answers for an event
   */
  router.get('/admin/answers/:eventId', (req: Request, res: Response, next) => {
    try {
      const { eventId } = req.params
      const answers = db.getAnswersByEvent(eventId)

      res.json({
        eventId,
        totalAnswers: answers.length,
        uniqueSessions: new Set(answers.map(a => a.session_id)).size,
        answers
      })
    } catch (error) {
      next(error)
    }
  })

  /**
   * GET /api/admin/export
   * Export all data
   */
  router.get('/admin/export', (req: Request, res: Response, next) => {
    try {
      const data = {
        sessions: db.getAllSessions(),
        answers: db.getAllAnswers(),
        gameState: eventScheduler.isGameActive() ? {
          gameStartTime: eventScheduler.getGameStartTime(),
          currentEvent: eventScheduler.getCurrentEvent()
        } : null,
        exportedAt: Date.now()
      }

      res.json(data)
    } catch (error) {
      next(error)
    }
  })

  return router
}
