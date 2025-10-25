import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals'
import {
  getCurrentEvent,
  submitAnswer,
  registerSession,
  getGameStatus,
} from '../../services/api'

// Mock fetch globally
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>

describe('API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Note: localStorage is automatically cleared before each test via setup.ts
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('getCurrentEvent', () => {
    test('should fetch current event successfully', async () => {
      const mockEvent = {
        type: 'question',
        eventId: 'test-event',
        content: 'Test question?',
        placeholder: 'Enter answer',
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockEvent,
      })

      const event = await getCurrentEvent()

      expect(event).toEqual(mockEvent)
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/current-event',
        expect.objectContaining({
          method: 'GET',
        })
      )
    })

    test('should include session headers when available', async () => {
      localStorage.setItem('clientId', 'test-client-id')
      localStorage.setItem('deviceFingerprint', '{"screen":1920}')

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ type: 'none', eventId: '', content: '' }),
      })

      await getCurrentEvent()

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/current-event',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Client-ID': 'test-client-id',
            'X-Device-Fingerprint': '{"screen":1920}',
          }),
        })
      )
    })

    test('should retry on failure', async () => {
      jest.useFakeTimers()
      const mockEvent = { type: 'none', eventId: '', content: '' }

      // Fail first two times, succeed on third
      ;(global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockEvent,
        })

      const eventPromise = getCurrentEvent()

      // Fast-forward through all timers
      await jest.runAllTimersAsync()

      const event = await eventPromise

      expect(event).toEqual(mockEvent)
      expect(global.fetch).toHaveBeenCalledTimes(3)
    })

    test('should throw after max retries', async () => {
      jest.useFakeTimers()
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      const eventPromise = getCurrentEvent()

      // Fast-forward through all timers
      await jest.runAllTimersAsync()

      await expect(eventPromise).rejects.toThrow('Network error')
      expect(global.fetch).toHaveBeenCalledTimes(4) // Initial + 3 retries
    })

    test('should handle HTTP errors', async () => {
      jest.useFakeTimers()
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      const eventPromise = getCurrentEvent()

      // Fast-forward through all timers
      await jest.runAllTimersAsync()

      await expect(eventPromise).rejects.toThrow('HTTP 404: Not Found')
    })
  })

  describe('submitAnswer', () => {
    test('should submit answer successfully', async () => {
      const mockResponse = {
        success: true,
        duplicate: false,
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const response = await submitAnswer('event-1', 'My answer')

      expect(response).toEqual(mockResponse)
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/answer',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ eventId: 'event-1', answer: 'My answer' }),
        })
      )
    })

    test('should handle duplicate answers', async () => {
      const mockResponse = {
        success: true,
        duplicate: true,
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const response = await submitAnswer('event-1', 'Duplicate')

      expect(response.duplicate).toBe(true)
    })

    test('should submit non-string answers', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, duplicate: false }),
      })

      await submitAnswer('event-1', { selected: 'option-a' })

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/answer',
        expect.objectContaining({
          body: JSON.stringify({ eventId: 'event-1', answer: { selected: 'option-a' } }),
        })
      )
    })
  })

  describe('registerSession', () => {
    test('should register session successfully', async () => {
      const mockResponse = {
        sessionId: 'new-session-id',
        isNewSession: true,
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const fingerprint = { screenWidth: 1920 }
      const response = await registerSession('client-id-123', fingerprint)

      expect(response).toEqual(mockResponse)
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/session/register',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-Client-ID': 'client-id-123',
            'X-Device-Fingerprint': JSON.stringify(fingerprint),
          }),
        })
      )
    })
  })

  describe('getGameStatus', () => {
    test('should fetch game status successfully', async () => {
      const mockStatus = {
        gameActive: true,
        gameStartTime: 1234567890,
        serverTime: 1234567900000,
        participantCount: 5,
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatus,
      })

      const status = await getGameStatus()

      expect(status).toEqual(mockStatus)
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/game/status',
        expect.objectContaining({
          method: 'GET',
        })
      )
    })
  })
})
