import { Request, Response, NextFunction } from 'express'
import { GameDatabase } from '../database/db.js'

/**
 * Session identification middleware
 * Attaches sessionId to request object
 */
export function sessionMiddleware(db: GameDatabase) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract session identifiers
      const clientId = req.headers['x-client-id'] as string
      const deviceFingerprint = req.headers['x-device-fingerprint'] as string
      const ip = req.ip || req.socket.remoteAddress || 'unknown'
      const userAgent = req.headers['user-agent'] || 'unknown'

      const now = Date.now()

      let session = null

      // Try to find existing session by client ID (from localStorage)
      if (clientId) {
        session = db.findSessionById(clientId)
      }

      // If not found, try by IP + User-Agent (within last 24 hours)
      if (!session) {
        const oneDayAgo = now - (24 * 60 * 60 * 1000)
        session = db.findSessionByIPAndUA(ip, userAgent, oneDayAgo)
      }

      // Create new session if still not found
      if (!session) {
        session = db.createSession({
          ip_address: ip,
          user_agent: userAgent,
          device_fingerprint: deviceFingerprint || '',
          first_seen: now,
          last_seen: now
        })
        console.log(`👤 New session created: ${session.id}`)
      } else {
        // Update last seen
        db.updateLastSeen(session.id, now)
      }

      // Attach session ID to request
      req.sessionId = session.id

      next()
    } catch (error) {
      console.error('Session middleware error:', error)
      next(error)
    }
  }
}
