
/**
 * Session Management Utilities
 * Handles client identification and session persistence
 */

/**
 * Generate a UUID v4 using the Web Crypto API
 */
function generateUUID(): string {
  return crypto.randomUUID()
}

/**
 * Get or create client ID
 * Stores in localStorage for persistence across sessions
 */
export function getOrCreateClientId(): string {
  const existingId = localStorage.getItem('clientId')

  if (existingId) {
    return existingId
  }

  const newId = generateUUID()
  localStorage.setItem('clientId', newId)
  return newId
}

/**
 * Generate device fingerprint
 * Collects non-invasive device information for session tracking
 */
export function generateFingerprint(): object {
  return {
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    screenAvailWidth: window.screen.availWidth,
    screenAvailHeight: window.screen.availHeight,
    colorDepth: window.screen.colorDepth,
    pixelDepth: window.screen.pixelDepth,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: new Date().getTimezoneOffset(),
    language: navigator.language,
    languages: navigator.languages,
    platform: navigator.platform,
    userAgent: navigator.userAgent,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: (navigator as any).deviceMemory, // Optional property
    maxTouchPoints: navigator.maxTouchPoints,
  }
}

/**
 * Get session ID from localStorage
 */
export function getSessionId(): string | null {
  return localStorage.getItem('sessionId')
}

/**
 * Set session ID in localStorage
 */
export function setSessionId(id: string): void {
  localStorage.setItem('sessionId', id)
}

/**
 * Store device fingerprint in localStorage
 */
export function storeFingerprint(fingerprint: object): void {
  localStorage.setItem('deviceFingerprint', JSON.stringify(fingerprint))
}

/**
 * Get stored fingerprint from localStorage
 */
export function getStoredFingerprint(): object | null {
  const stored = localStorage.getItem('deviceFingerprint')
  return stored ? JSON.parse(stored) : null
}

/**
 * Initialize session
 * Call this on app startup
 */
export function initializeSession(): {
  clientId: string
  fingerprint: object
} {
  const clientId = getOrCreateClientId()

  // Generate or retrieve fingerprint
  let fingerprint = getStoredFingerprint()
  if (!fingerprint) {
    fingerprint = generateFingerprint()
    storeFingerprint(fingerprint)
  }

  return { clientId, fingerprint }
}

/**
 * Clear session data (for testing/debugging)
 */
export function clearSession(): void {
  localStorage.removeItem('clientId')
  localStorage.removeItem('sessionId')
  localStorage.removeItem('deviceFingerprint')
}
