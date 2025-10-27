/**
 * API Client Service
 * Handles all communication with the server
 */

export interface DisplayEvent {
  type: 'text' | 'question' | 'multiple_choice' | 'custom_component' | 'none'
  eventId: string
  content: string
  placeholder?: string
  options?: Array<{ id: string; text: string; value: string }>
  componentName?: string
  props?: Record<string, any>
  hasAnswered?: boolean
  answerCount?: number
}

export interface GameStatus {
  gameActive: boolean
  gameStartTime: number | null
  serverTime: number
  participantCount: number
}

export interface AnswerResponse {
  success: boolean
  duplicate: boolean
  correct: boolean  // Whether the answer passed validation (always true if no validation)
}

export interface SessionResponse {
  sessionId: string
  isNewSession?: boolean
}

// Get base URL from environment or default to /api
const API_BASE_URL = 'http://localhost:3001/api'

// Retry configuration
const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY = 1000 // 1 second
const MAX_RETRY_DELAY = 30000 // 30 seconds

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Calculate exponential backoff delay
 */
function getRetryDelay(attempt: number): number {
  const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt)
  return Math.min(delay, MAX_RETRY_DELAY)
}

/**
 * Fetch with retry logic and exponential backoff
 */
async function fetchWithRetry<T>(
  url: string,
  options: RequestInit = {},
  retryCount = 0
): Promise<T> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    // If we've exhausted retries, throw the error
    if (retryCount >= MAX_RETRIES) {
      throw error
    }

    // Calculate delay and retry
    const delay = getRetryDelay(retryCount)
    console.warn(`Request failed, retrying in ${delay}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`)

    await sleep(delay)
    return fetchWithRetry<T>(url, options, retryCount + 1)
  }
}

/**
 * Get session headers to include in requests
 */
function getSessionHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}

  // Get client ID from localStorage
  const clientId = localStorage.getItem('clientId')
  if (clientId) {
    headers['X-Client-ID'] = clientId
  }

  // Get device fingerprint from localStorage
  const fingerprint = localStorage.getItem('deviceFingerprint')
  if (fingerprint) {
    headers['X-Device-Fingerprint'] = fingerprint
  }

  return headers
}

/**
 * Get the current event from the server
 */
export async function getCurrentEvent(): Promise<DisplayEvent> {
  return fetchWithRetry<DisplayEvent>(
    `${API_BASE_URL}/current-event`,
    {
      method: 'GET',
      headers: getSessionHeaders(),
    }
  )
}

/**
 * Submit an answer to the server
 */
export async function submitAnswer(
  eventId: string,
  answer: any
): Promise<AnswerResponse> {
  return fetchWithRetry<AnswerResponse>(
    `${API_BASE_URL}/answer`,
    {
      method: 'POST',
      headers: getSessionHeaders(),
      body: JSON.stringify({ eventId, answer }),
    }
  )
}

/**
 * Register session with the server
 */
export async function registerSession(
  clientId: string,
  fingerprint: object
): Promise<SessionResponse> {
  return fetchWithRetry<SessionResponse>(
    `${API_BASE_URL}/session/register`,
    {
      method: 'POST',
      headers: {
        'X-Client-ID': clientId,
        'X-Device-Fingerprint': JSON.stringify(fingerprint),
      },
      body: JSON.stringify({ clientId, fingerprint }),
    }
  )
}

/**
 * Get game status from the server
 */
export async function getGameStatus(): Promise<GameStatus> {
  return fetchWithRetry<GameStatus>(
    `${API_BASE_URL}/game/status`,
    {
      method: 'GET',
    }
  )
}
