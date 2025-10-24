import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { readFileSync } from 'fs'
import { GameDatabase } from './database/db.js'
import { EventScheduler } from './eventScheduler.js'
import { sessionMiddleware } from './middleware/session.js'
import { createApiRoutes } from './routes/api.js'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Initialize database
const db = new GameDatabase(process.env.DATABASE_PATH)

// Initialize event scheduler
const eventScheduler = new EventScheduler((eventId: string) => {
  return db.getAnswersByEvent(eventId).map(a => ({
    sessionId: a.session_id,
    answer: a.answer_value
  }))
})

// Load events from config
const eventsConfig = JSON.parse(readFileSync('./config/events.json', 'utf-8'))
eventScheduler.loadEvents(eventsConfig)

// Middleware
app.use(express.json())
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}))
app.use(sessionMiddleware(db))

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})

// API Routes
app.use('/api', createApiRoutes(db, eventScheduler))

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err.message)
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  })
})

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' })
})

// Start server
app.listen(PORT, () => {
  console.log(`🎃 Halloween Party Game server running on port ${PORT}`)
  console.log(`   Health check: http://localhost:${PORT}/health`)
  console.log(`   Database: ${process.env.DATABASE_PATH || './server/data/game.db'}`)
})

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...')
  db.close()
  process.exit(0)
})
