// Event configuration types (server-side only)
export interface EventConfig {
  id: string
  triggerAt: string // ISO 8601 timestamp (e.g., "2025-10-31T19:00:00Z")
  type: 'text' | 'question' | 'multiple_choice' | 'custom_component' | 'none'
  content?: string
  placeholder?: string
  options?: Array<{
    id: string
    text: string
    value: string
  }>
  componentName?: string // For custom components - matches client registry
  props?: Record<string, any>
  duration?: number // Auto-hide after N milliseconds
  mandatory?: boolean // If true, user cannot skip this event (default: false)
  validation?: {
    type: 'exact' | 'regex' | 'custom'
    correctAnswers?: string[]        // For exact matching (case-insensitive, trimmed)
    pattern?: string                 // For regex matching
    customValidator?: string         // Name of custom validation function
  }
  triggers?: {
    onAnswer?: Record<string, EventConfig[]> | EventConfig[]
    onComplete?: EventConfig[]
    onFail?: EventConfig[]
    onEvent?: Record<string, EventConfig[]>
  }
}

// Display event type (sent to clients)
export interface DisplayEvent {
  type: 'text' | 'question' | 'multiple_choice' | 'custom_component' | 'none'
  eventId: string
  content: string
  placeholder?: string
  options?: Array<{
    id: string
    text: string
    value: string
  }>
  componentName?: string
  props?: Record<string, any>
  duration?: number
  mandatory?: boolean
  hasAnswered?: boolean
  answerCount?: number
}

// Session tracking
export interface Session {
  id: string
  ip_address: string
  user_agent: string
  device_fingerprint: string
  first_seen: number
  last_seen: number
}

// Answer tracking
export interface Answer {
  id: number
  session_id: string
  event_id: string
  answer_type: string
  answer_value: string
  answered_at: number
}

// Game state
export interface GameState {
  gameStarted: boolean
  gameStartTime: number | null
  currentEventId: string | null
}

// API request/response types
export interface AnswerSubmission {
  eventId: string
  answer: any
}

export interface AnswerResponse {
  success: boolean
  duplicate: boolean
  correct: boolean  // Whether the answer passed validation (always true if no validation)
}

export interface SessionRegistration {
  clientId: string
  fingerprint: {
    screenWidth?: number
    screenHeight?: number
    timezone?: string
    language?: string
  }
}

export interface SessionResponse {
  sessionId: string
  isNewSession: boolean
}

export interface GameStatusResponse {
  gameActive: boolean
  gameStartTime: number | null
  serverTime: number
  participantCount: number
}

// Express Request extension for session
declare global {
  namespace Express {
    interface Request {
      sessionId?: string
    }
  }
}
