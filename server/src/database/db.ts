import Database from 'better-sqlite3'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { Session, Answer, GameState } from '../types.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export class GameDatabase {
  private db: Database.Database

  constructor(dbPath: string = './server/data/game.db') {
    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL') // Better concurrency
    this.initialize()
  }

  /**
   * Initialize database with schema
   */
  private initialize(): void {
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8')
    this.db.exec(schema)
    console.log('✅ Database initialized')
  }

  // ==================== Session Methods ====================

  /**
   * Create a new session
   */
  createSession(data: Omit<Session, 'id'>): Session {
    const id = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const stmt = this.db.prepare(`
      INSERT INTO sessions (id, ip_address, user_agent, device_fingerprint, first_seen, last_seen)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    stmt.run(id, data.ip_address, data.user_agent, data.device_fingerprint, data.first_seen, data.last_seen)

    return { id, ...data }
  }

  /**
   * Find session by ID
   */
  findSessionById(id: string): Session | null {
    const stmt = this.db.prepare('SELECT * FROM sessions WHERE id = ?')
    return stmt.get(id) as Session | null
  }

  /**
   * Find session by IP and User-Agent (recent sessions only)
   */
  findSessionByIPAndUA(ip: string, userAgent: string, since: number): Session | null {
    const stmt = this.db.prepare(`
      SELECT * FROM sessions
      WHERE ip_address = ? AND user_agent = ? AND last_seen >= ?
      ORDER BY last_seen DESC
      LIMIT 1
    `)
    return stmt.get(ip, userAgent, since) as Session | null
  }

  /**
   * Update session last seen timestamp
   */
  updateLastSeen(sessionId: string, timestamp: number): void {
    const stmt = this.db.prepare('UPDATE sessions SET last_seen = ? WHERE id = ?')
    stmt.run(timestamp, sessionId)
  }

  /**
   * Get all sessions
   */
  getAllSessions(): Session[] {
    const stmt = this.db.prepare('SELECT * FROM sessions ORDER BY last_seen DESC')
    return stmt.all() as Session[]
  }

  /**
   * Get count of active sessions (within time window)
   */
  getActiveSessionCount(withinMs: number = 300000): number {
    const cutoff = Date.now() - withinMs
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM sessions WHERE last_seen >= ?')
    const result = stmt.get(cutoff) as { count: number }
    return result.count
  }

  // ==================== Answer Methods ====================

  /**
   * Record an answer
   */
  recordAnswer(sessionId: string, eventId: string, answerType: string, value: any): void {
    const stmt = this.db.prepare(`
      INSERT INTO answers (session_id, event_id, answer_type, answer_value, answered_at)
      VALUES (?, ?, ?, ?, ?)
    `)

    const answerValue = typeof value === 'string' ? value : JSON.stringify(value)
    stmt.run(sessionId, eventId, answerType, answerValue, Date.now())
  }

  /**
   * Check if session has answered an event
   */
  hasSessionAnswered(sessionId: string, eventId: string): boolean {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM answers
      WHERE session_id = ? AND event_id = ?
    `)
    const result = stmt.get(sessionId, eventId) as { count: number }
    return result.count > 0
  }

  /**
   * Get all answers for an event
   */
  getAnswersByEvent(eventId: string): Answer[] {
    const stmt = this.db.prepare('SELECT * FROM answers WHERE event_id = ? ORDER BY answered_at ASC')
    return stmt.all(eventId) as Answer[]
  }

  /**
   * Get all answers by session
   */
  getAnswersBySession(sessionId: string): Answer[] {
    const stmt = this.db.prepare('SELECT * FROM answers WHERE session_id = ? ORDER BY answered_at ASC')
    return stmt.all(sessionId) as Answer[]
  }

  /**
   * Get answer count for an event
   */
  getAnswerCount(eventId: string): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM answers WHERE event_id = ?')
    const result = stmt.get(eventId) as { count: number }
    return result.count
  }

  /**
   * Get all answers (for admin/export)
   */
  getAllAnswers(): Answer[] {
    const stmt = this.db.prepare('SELECT * FROM answers ORDER BY answered_at ASC')
    return stmt.all() as Answer[]
  }

  // ==================== Game State Methods ====================

  /**
   * Save game state
   */
  saveGameState(state: Partial<GameState>): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO game_state (id, game_started, game_start_time, current_event_id, updated_at)
      VALUES (1, ?, ?, ?, ?)
    `)

    stmt.run(
      state.gameStarted ? 1 : 0,
      state.gameStartTime || null,
      state.currentEventId || null,
      Date.now()
    )
  }

  /**
   * Load game state
   */
  loadGameState(): GameState | null {
    const stmt = this.db.prepare('SELECT * FROM game_state WHERE id = 1')
    const row = stmt.get() as any

    if (!row) return null

    return {
      gameStarted: row.game_started === 1,
      gameStartTime: row.game_start_time,
      currentEventId: row.current_event_id
    }
  }

  /**
   * Reset game state
   */
  resetGameState(): void {
    const stmt = this.db.prepare('DELETE FROM game_state WHERE id = 1')
    stmt.run()
  }

  // ==================== Event Cursor Methods ====================

  /**
   * Get session's current event cursor
   */
  getSessionCursor(sessionId: string): number {
    const stmt = this.db.prepare('SELECT current_event_index FROM session_event_cursors WHERE session_id = ?')
    const result = stmt.get(sessionId) as { current_event_index: number } | undefined
    return result?.current_event_index ?? 0
  }

  /**
   * Set session's event cursor
   */
  setSessionCursor(sessionId: string, eventIndex: number): void {
    const stmt = this.db.prepare(`
      INSERT INTO session_event_cursors (session_id, current_event_index, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(session_id) DO UPDATE SET
        current_event_index = excluded.current_event_index,
        updated_at = excluded.updated_at
    `)
    stmt.run(sessionId, eventIndex, Date.now())
  }

  /**
   * Increment session's event cursor
   */
  incrementSessionCursor(sessionId: string): void {
    const currentCursor = this.getSessionCursor(sessionId)
    this.setSessionCursor(sessionId, currentCursor + 1)
  }

  // ==================== Utility Methods ====================

  /**
   * Close database connection
   */
  close(): void {
    this.db.close()
    console.log('📪 Database closed')
  }

  /**
   * Clear all data (for testing/reset)
   */
  clearAllData(): void {
    // Temporarily disable foreign keys to allow deletion in any order
    this.db.exec('PRAGMA foreign_keys = OFF')
    this.db.exec('DELETE FROM answers')
    this.db.exec('DELETE FROM sessions')
    this.db.exec('DELETE FROM game_state')
    this.db.exec('DELETE FROM session_event_cursors')
    this.db.exec('PRAGMA foreign_keys = ON')
    console.log('🗑️  All data cleared')
  }
}
