import { readFileSync } from 'fs'
import { join } from 'path'
import { EventConfig, ValidationConfig } from './types.js'

/**
 * Test Event Configuration (with relative timing)
 */
export interface TestEventConfig {
  events: Array<{
    id: string
    type: string
    startTime: string  // Relative: "now", "+5s", "+2m"
    endTime?: string   // Optional - Relative: "now", "+5s", "+2m". If omitted, event has no auto-hide duration
    content: string
    placeholder?: string
    options?: Array<{ id: string; text: string; value: string }>
    componentName?: string
    props?: Record<string, any>
    duration?: number
    mandatory?: boolean
    validation?: ValidationConfig
    triggers?: {
      onAnswer?: Record<string, EventConfig[]> | EventConfig[]
      onComplete?: EventConfig[]
      onFail?: EventConfig[]
      onEvent?: Record<string, EventConfig[]>
    }
  }>
}

/**
 * Processed Event Configuration (with absolute timestamps)
 */
export interface ProcessedEventConfig {
  events: EventConfig[]
}

/**
 * Parse relative time string to milliseconds offset
 * @param timeStr - Relative time string ("now", "+5s", "+2m")
 * @returns Milliseconds offset from start time
 * @throws Error if format is invalid
 */
export function parseRelativeTime(timeStr: string): number {
  // Handle "now" or "+0s"
  if (timeStr === 'now') {
    return 0
  }

  // Match pattern: +<number><unit>
  const match = timeStr.match(/^\+(\d+)([sm])$/)

  if (!match) {
    throw new Error(
      `Invalid time format: "${timeStr}". Expected "now", "+Xs" (seconds), or "+Xm" (minutes). ` +
      `Examples: "now", "+5s", "+2m"`
    )
  }

  const value = parseInt(match[1], 10)
  const unit = match[2]

  if (value < 0) {
    throw new Error(`Time value cannot be negative: ${timeStr}`)
  }

  // Convert to milliseconds
  if (unit === 's') {
    return value * 1000
  } else if (unit === 'm') {
    return value * 60 * 1000
  }

  // Should never reach here due to regex, but TypeScript doesn't know that
  throw new Error(`Unknown time unit: ${unit}`)
}

/**
 * Convert test config with relative times to absolute timestamps
 * @param config - Test event config with relative times
 * @param serverStartTime - Server start timestamp (ms since epoch)
 * @returns Processed config with absolute timestamps
 */
export function processTestConfig(
  config: TestEventConfig,
  serverStartTime: number
): ProcessedEventConfig {
  const processedEvents: EventConfig[] = config.events.map(event => {
    const startOffset = parseRelativeTime(event.startTime)
    const startTime = serverStartTime + startOffset

    // Calculate duration only if endTime is provided
    let duration: number | undefined

    if (event.endTime) {
      const endOffset = parseRelativeTime(event.endTime)
      const endTime = serverStartTime + endOffset

      // Validate timing
      if (endTime <= startTime) {
        throw new Error(
          `Event "${event.id}": endTime (${event.endTime}) must be after startTime (${event.startTime})`
        )
      }

      // Calculate duration from the difference
      duration = endTime - startTime
    }

    // Convert to EventConfig format with triggerAt
    return {
      id: event.id,
      triggerAt: new Date(startTime).toISOString(),
      type: event.type as EventConfig['type'],
      content: event.content,
      placeholder: event.placeholder,
      options: event.options,
      componentName: event.componentName,
      props: event.props,
      duration,
      mandatory: event.mandatory,
      validation: event.validation,
      triggers: event.triggers
    }
  })

  return {
    events: processedEvents
  }
}

/**
 * Load and process test event file
 * @param filePath - Path to test event JSON file (relative to server root)
 * @returns Processed config ready for event engine
 * @throws Error if file doesn't exist or is invalid
 */
export function loadTestEventFile(filePath: string): ProcessedEventConfig {
  try {
    // Resolve path relative to process.cwd() (server root)
    const fullPath = join(process.cwd(), filePath)

    console.log(`📂 Loading test events from: ${filePath}`)

    // Read and parse JSON file
    const fileContents = readFileSync(fullPath, 'utf-8')
    const testConfig: TestEventConfig = JSON.parse(fileContents)

    // Validate structure
    if (!testConfig.events || !Array.isArray(testConfig.events)) {
      throw new Error('Test config must have an "events" array')
    }

    if (testConfig.events.length === 0) {
      throw new Error('Test config must have at least one event')
    }

    // Validate each event has required fields
    testConfig.events.forEach((event, index) => {
      if (!event.id) {
        throw new Error(`Event at index ${index} is missing required field: id`)
      }
      if (!event.type) {
        throw new Error(`Event "${event.id}" is missing required field: type`)
      }
      if (!event.startTime) {
        throw new Error(`Event "${event.id}" is missing required field: startTime`)
      }
      // endTime is optional - if omitted, event will have no auto-hide duration
    })

    // Process the config with current time as server start
    const serverStartTime = Date.now()
    const processed = processTestConfig(testConfig, serverStartTime)

    console.log(`✅ Successfully loaded and processed ${processed.events.length} test events`)
    console.log(`   Server start time: ${new Date(serverStartTime).toISOString()}`)
    console.log(`   First event triggers at: ${processed.events[0]?.triggerAt}`)

    return processed

  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('ENOENT')) {
        throw new Error(`Test event file not found: ${filePath}`)
      }
      if (error.message.includes('JSON')) {
        throw new Error(`Invalid JSON in test event file: ${filePath}. ${error.message}`)
      }
      // Re-throw with context
      throw new Error(`Failed to load test events from ${filePath}: ${error.message}`)
    }
    throw error
  }
}
