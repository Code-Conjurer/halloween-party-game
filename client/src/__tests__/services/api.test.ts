import { describe, test, expect, beforeEach, jest } from '@jest/globals'
import {
  getCurrentEvent,
  submitAnswer,
  registerSession,
  getGameStatus,
} from '../../services/api'

// Mock fetch globally
global.fetch = jest.fn() as jest.Mock

describe('API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(localStorage.getItem as jest.Mock).mockReturnValue(null)
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
      ;(localStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'clientId') return 'test-client-id'
        if (key === 'deviceFingerprint') return '{"screen":1920}'
        return null
      })

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
      const mockEvent = { type: 'none', eventId: '', content: '' }

      // Fail first two times, succeed on third
      ;(global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockEvent,
        })

      const event = await getCurrentEvent()

      expect(event).toEqual(mockEvent)
      expect(global.fetch).toHaveBeenCalledTimes(3)
    }, 10000)

    test('should throw after max retries', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      await expect(getCurrentEvent()).rejects.toThrow('Network error')
      expect(global.fetch).toHaveBeenCalledTimes(4) // Initial + 3 retries
    }, 15000)

    test('should handle HTTP errors', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      await expect(getCurrentEvent()).rejects.toThrow('HTTP 404: Not Found')
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
