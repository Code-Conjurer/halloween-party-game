// Event configuration types (server-side only)

// Validation configuration (shared across question and multiple_choice events)

// Exact match validation - case-insensitive, whitespace-trimmed
export interface ExactValidation {
  type: 'exact'
  correctAnswers: string[]  // Array of acceptable answers
}

// Regex pattern validation - tested against normalized (lowercased, trimmed) answer
export interface RegexValidation {
  type: 'regex'
  pattern: string  // Regex pattern to test against
}

// Custom validation function (to be implemented)
export interface CustomValidation {
  type: 'custom'
  customValidator: string  // Name of custom validation function
}

// Discriminated union of validation types
export type ValidationConfig =
  | ExactValidation
  | RegexValidation
  | CustomValidation

// Base fields common to all event types
interface BaseEventConfig {
  id: string
  triggerAt: string // ISO 8601 timestamp (e.g., "2025-10-31T19:00:00Z")
  duration?: number // Auto-hide after N milliseconds
  mandatory?: boolean // If true, user cannot skip this event (default: false)
  triggers?: {
    onAnswer?: Record<string, EventConfig[]> | EventConfig[]
    onComplete?: EventConfig[]
    onFail?: EventConfig[]
    onEvent?: Record<string, EventConfig[]>
  }
}

// Text event - just displays text
export interface TextEventConfig extends BaseEventConfig {
  type: 'text'
  content: string
}

// Question event - text input with validation
export interface QuestionEventConfig extends BaseEventConfig {
  type: 'question'
  content: string
  placeholder?: string
  validation?: ValidationConfig
}

// Multiple choice event - select from options
export interface MultipleChoiceEventConfig extends BaseEventConfig {
  type: 'multiple_choice'
  content: string
  options: Array<{
    id: string
    text: string
    value: string
  }>
  validation?: ValidationConfig
}

// Custom component event - renders a React component
export interface CustomComponentEventConfig extends BaseEventConfig {
  type: 'custom_component'
  componentName: string // Matches client registry
  props?: Record<string, any>
}

// None event - no active event
export interface NoneEventConfig extends BaseEventConfig {
  type: 'none'
  content: string
}

// Discriminated union of all event types
export type EventConfig =
  | TextEventConfig
  | QuestionEventConfig
  | MultipleChoiceEventConfig
  | CustomComponentEventConfig
  | NoneEventConfig

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
