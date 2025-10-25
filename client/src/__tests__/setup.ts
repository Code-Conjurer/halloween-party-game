import '@testing-library/jest-dom'
import { beforeEach, afterEach } from '@jest/globals'

// Create localStorage mock with functional storage
let localStorageStore: Record<string, string> = {}

const localStorageMock = {
  getItem: (key: string) => localStorageStore[key] || null,
  setItem: (key: string, value: string) => {
    localStorageStore[key] = value
  },
  removeItem: (key: string) => {
    delete localStorageStore[key]
  },
  clear: () => {
    localStorageStore = {}
  },
  get length() {
    return Object.keys(localStorageStore).length
  },
  key: (index: number) => {
    const keys = Object.keys(localStorageStore)
    return keys[index] || null
  },
}

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// Clear localStorage before each test (runs for ALL tests)
beforeEach(() => {
  localStorageStore = {}
})

// Clean up after each test (runs for ALL tests)
afterEach(() => {
  localStorageStore = {}
})

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substring(7),
  },
})
