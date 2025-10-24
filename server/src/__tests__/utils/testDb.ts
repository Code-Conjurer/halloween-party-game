import { GameDatabase } from '../../database/db.js'

/**
 * Create an in-memory database for testing
 */
export function createTestDb(): GameDatabase {
  return new GameDatabase(':memory:')
}

/**
 * Clean up test database
 */
export function cleanupTestDb(db: GameDatabase): void {
  try {
    db.close()
  } catch (error) {
    // Ignore errors on cleanup
  }
}
