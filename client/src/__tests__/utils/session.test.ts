import { describe, test, expect } from '@jest/globals'
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
  // Note: localStorage is automatically cleared before each test via setup.ts

  describe('getOrCreateClientId', () => {
    test('should return existing client ID from localStorage', () => {
      const existingId = 'existing-uuid-123'
      localStorage.setItem('clientId', existingId)

      const clientId = getOrCreateClientId()

      expect(clientId).toBe(existingId)
    })

    test('should generate and store new client ID if none exists', () => {
      const clientId = getOrCreateClientId()

      expect(clientId).toBeTruthy()
      expect(typeof clientId).toBe('string')
      expect(localStorage.getItem('clientId')).toBe(clientId)
    })

    test('should generate unique IDs on multiple calls', () => {
      const id1 = getOrCreateClientId()
      localStorage.clear()
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
      const sessionId = getSessionId()

      expect(sessionId).toBeNull()
    })

    test('should return existing session ID', () => {
      const existingSessionId = 'session-123'
      localStorage.setItem('sessionId', existingSessionId)

      const sessionId = getSessionId()

      expect(sessionId).toBe(existingSessionId)
    })

    test('should store session ID', () => {
      const newSessionId = 'new-session-456'

      setSessionId(newSessionId)

      expect(localStorage.getItem('sessionId')).toBe(newSessionId)
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

      expect(localStorage.getItem('deviceFingerprint')).toBe(JSON.stringify(fingerprint))
    })

    test('should return null when no fingerprint exists', () => {
      const fingerprint = getStoredFingerprint()

      expect(fingerprint).toBeNull()
    })

    test('should retrieve and parse stored fingerprint', () => {
      const storedFingerprint = {
        screenWidth: 1920,
        screenHeight: 1080,
      }
      localStorage.setItem('deviceFingerprint', JSON.stringify(storedFingerprint))

      const fingerprint = getStoredFingerprint()

      expect(fingerprint).toEqual(storedFingerprint)
    })
  })

  describe('initializeSession', () => {
    test('should return client ID and fingerprint', () => {
      const result = initializeSession()

      expect(result).toHaveProperty('clientId')
      expect(result).toHaveProperty('fingerprint')
      expect(typeof result.clientId).toBe('string')
      expect(typeof result.fingerprint).toBe('object')
    })

    test('should use existing fingerprint if available', () => {
      const existingFingerprint = { screenWidth: 1920 }
      localStorage.setItem('deviceFingerprint', JSON.stringify(existingFingerprint))

      const result = initializeSession()

      expect(result.fingerprint).toEqual(existingFingerprint)
    })

    test('should generate new fingerprint if none exists', () => {
      const result = initializeSession()

      expect(result.fingerprint).toBeTruthy()
      expect(localStorage.getItem('deviceFingerprint')).toBeTruthy()
    })
  })

  describe('clearSession', () => {
    test('should remove all session-related items from localStorage', () => {
      localStorage.setItem('clientId', 'test')
      localStorage.setItem('sessionId', 'test')
      localStorage.setItem('deviceFingerprint', 'test')

      clearSession()

      expect(localStorage.getItem('clientId')).toBeNull()
      expect(localStorage.getItem('sessionId')).toBeNull()
      expect(localStorage.getItem('deviceFingerprint')).toBeNull()
    })
  })
})
