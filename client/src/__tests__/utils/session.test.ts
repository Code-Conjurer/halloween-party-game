import { describe, test, expect, beforeEach, jest } from '@jest/globals'
import {
  getOrCreateClientId,
  generateFingerprint,
  getSessionId,
  setSessionId,
  storeFingerprint,
  getStoredFingerprint,
  initializeSession,
  clearSession,
} from '../../utils/session'

describe('Session Utilities', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks()
    ;(localStorage.getItem as jest.Mock).mockReturnValue(null)
    ;(localStorage.setItem as jest.Mock).mockClear()
    ;(localStorage.removeItem as jest.Mock).mockClear()
  })

  describe('getOrCreateClientId', () => {
    test('should return existing client ID from localStorage', () => {
      const existingId = 'existing-uuid-123'
      ;(localStorage.getItem as jest.Mock).mockReturnValue(existingId)

      const clientId = getOrCreateClientId()

      expect(clientId).toBe(existingId)
      expect(localStorage.getItem).toHaveBeenCalledWith('clientId')
      expect(localStorage.setItem).not.toHaveBeenCalled()
    })

    test('should generate and store new client ID if none exists', () => {
      ;(localStorage.getItem as jest.Mock).mockReturnValue(null)

      const clientId = getOrCreateClientId()

      expect(clientId).toBeTruthy()
      expect(typeof clientId).toBe('string')
      expect(localStorage.setItem).toHaveBeenCalledWith('clientId', clientId)
    })

    test('should generate unique IDs on multiple calls', () => {
      ;(localStorage.getItem as jest.Mock).mockReturnValue(null)

      const id1 = getOrCreateClientId()
      const id2 = getOrCreateClientId()

      expect(id1).not.toBe(id2)
    })
  })

  describe('generateFingerprint', () => {
    test('should generate device fingerprint with screen properties', () => {
      const fingerprint = generateFingerprint()

      expect(fingerprint).toHaveProperty('screenWidth')
      expect(fingerprint).toHaveProperty('screenHeight')
      expect(fingerprint).toHaveProperty('colorDepth')
      expect(fingerprint).toHaveProperty('timezone')
      expect(fingerprint).toHaveProperty('language')
    })

    test('should include all expected properties', () => {
      const fingerprint = generateFingerprint()

      const expectedKeys = [
        'screenWidth',
        'screenHeight',
        'screenAvailWidth',
        'screenAvailHeight',
        'colorDepth',
        'pixelDepth',
        'timezone',
        'timezoneOffset',
        'language',
        'languages',
        'platform',
        'userAgent',
        'hardwareConcurrency',
        'deviceMemory',
        'maxTouchPoints',
      ]

      expectedKeys.forEach((key) => {
        expect(fingerprint).toHaveProperty(key)
      })
    })
  })

  describe('getSessionId and setSessionId', () => {
    test('should return null when no session ID exists', () => {
      ;(localStorage.getItem as jest.Mock).mockReturnValue(null)

      const sessionId = getSessionId()

      expect(sessionId).toBeNull()
      expect(localStorage.getItem).toHaveBeenCalledWith('sessionId')
    })

    test('should return existing session ID', () => {
      const existingSessionId = 'session-123'
      ;(localStorage.getItem as jest.Mock).mockReturnValue(existingSessionId)

      const sessionId = getSessionId()

      expect(sessionId).toBe(existingSessionId)
    })

    test('should store session ID', () => {
      const newSessionId = 'new-session-456'

      setSessionId(newSessionId)

      expect(localStorage.setItem).toHaveBeenCalledWith('sessionId', newSessionId)
    })
  })

  describe('storeFingerprint and getStoredFingerprint', () => {
    test('should store fingerprint as JSON string', () => {
      const fingerprint = {
        screenWidth: 1920,
        screenHeight: 1080,
        timezone: 'America/New_York',
      }

      storeFingerprint(fingerprint)

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'deviceFingerprint',
        JSON.stringify(fingerprint)
      )
    })

    test('should return null when no fingerprint exists', () => {
      ;(localStorage.getItem as jest.Mock).mockReturnValue(null)

      const fingerprint = getStoredFingerprint()

      expect(fingerprint).toBeNull()
    })

    test('should retrieve and parse stored fingerprint', () => {
      const storedFingerprint = {
        screenWidth: 1920,
        screenHeight: 1080,
      }
      ;(localStorage.getItem as jest.Mock).mockReturnValue(
        JSON.stringify(storedFingerprint)
      )

      const fingerprint = getStoredFingerprint()

      expect(fingerprint).toEqual(storedFingerprint)
    })
  })

  describe('initializeSession', () => {
    test('should return client ID and fingerprint', () => {
      ;(localStorage.getItem as jest.Mock).mockReturnValue(null)

      const result = initializeSession()

      expect(result).toHaveProperty('clientId')
      expect(result).toHaveProperty('fingerprint')
      expect(typeof result.clientId).toBe('string')
      expect(typeof result.fingerprint).toBe('object')
    })

    test('should use existing fingerprint if available', () => {
      const existingFingerprint = { screenWidth: 1920 }
      ;(localStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'deviceFingerprint') {
          return JSON.stringify(existingFingerprint)
        }
        return null
      })

      const result = initializeSession()

      expect(result.fingerprint).toEqual(existingFingerprint)
    })

    test('should generate new fingerprint if none exists', () => {
      ;(localStorage.getItem as jest.Mock).mockReturnValue(null)

      const result = initializeSession()

      expect(result.fingerprint).toBeTruthy()
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'deviceFingerprint',
        expect.any(String)
      )
    })
  })

  describe('clearSession', () => {
    test('should remove all session-related items from localStorage', () => {
      clearSession()

      expect(localStorage.removeItem).toHaveBeenCalledWith('clientId')
      expect(localStorage.removeItem).toHaveBeenCalledWith('sessionId')
      expect(localStorage.removeItem).toHaveBeenCalledWith('deviceFingerprint')
      expect(localStorage.removeItem).toHaveBeenCalledTimes(3)
    })
  })
})
