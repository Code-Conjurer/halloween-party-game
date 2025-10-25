# Test Event Configuration - Implementation Plan

## Context

You are implementing a test event configuration system for the Halloween Party Game server. This system allows developers to create test event files with relative timing (e.g., "+5s", "+2m", "now") that get converted to absolute timestamps based on server start time.

## Background Reading

Before starting, read these files to understand the existing system:
- `server/src/services/eventEngine.ts` - Current event engine implementation
- `server/events/halloween-party.json` - Production event file format
- `server/docs/test-event-configurations.md` - Full design specification

## Implementation Tasks

### Task 1: Create Test Event Loader Service

**File**: `server/src/services/testEventLoader.ts`

**Requirements:**
1. Parse relative time strings into millisecond offsets:
   - `"now"` or `"+0s"` → 0 milliseconds
   - `"+5s"` → 5000 milliseconds
   - `"+30s"` → 30000 milliseconds
   - `"+1m"` → 60000 milliseconds
   - `"+5m"` → 300000 milliseconds
   - Throw error for invalid formats

2. Convert test event config with relative times to absolute timestamps:
   - Take a `TestEventConfig` (with string times like "+5s")
   - Take a `serverStartTime` (number, milliseconds since epoch)
   - Return `ProcessedEventConfig` (with absolute timestamp numbers)
   - Process both `startTime` and `endTime` for each event

3. Load and process test event file:
   - Read JSON file from filesystem
   - Parse relative times
   - Return processed config ready for event engine
   - Handle file read errors gracefully

**Type Definitions:**
```typescript
export interface TestEventConfig {
  events: Array<{
    id: string
    type: string
    startTime: string  // Relative: "now", "+5s", "+2m"
    endTime: string    // Relative: "now", "+5s", "+2m"
    content: string
    placeholder?: string
    options?: Array<{ id: string; text: string; value: string }>
    componentName?: string
    props?: Record<string, any>
  }>
}

export interface ProcessedEventConfig {
  events: Array<{
    id: string
    type: string
    startTime: number  // Absolute timestamp
    endTime: number    // Absolute timestamp
    content: string
    placeholder?: string
    options?: Array<{ id: string; text: string; value: string }>
    componentName?: string
    props?: Record<string, any>
  }>
}
```

**Functions to implement:**
```typescript
/**
 * Parse relative time string to milliseconds offset
 * @param timeStr - Relative time string ("now", "+5s", "+2m")
 * @returns Milliseconds offset from start time
 * @throws Error if format is invalid
 */
export function parseRelativeTime(timeStr: string): number

/**
 * Convert test config with relative times to absolute timestamps
 * @param config - Test event config with relative times
 * @param serverStartTime - Server start timestamp (ms since epoch)
 * @returns Processed config with absolute timestamps
 */
export function processTestConfig(
  config: TestEventConfig,
  serverStartTime: number
): ProcessedEventConfig

/**
 * Load and process test event file
 * @param filePath - Path to test event JSON file (relative to server root)
 * @returns Processed config ready for event engine
 * @throws Error if file doesn't exist or is invalid
 */
export function loadTestEventFile(filePath: string): ProcessedEventConfig
```

**Implementation Notes:**
- Use `fs.readFileSync()` to read the JSON file
- Use `path.join(process.cwd(), filePath)` to resolve relative paths
- Add proper error handling with descriptive error messages
- Log which test config file is being loaded
- Validate that parsed times are non-negative
- Validate that endTime > startTime for each event

**Example Usage:**
```typescript
// Parse time strings
parseRelativeTime("now")     // → 0
parseRelativeTime("+5s")     // → 5000
parseRelativeTime("+2m")     // → 120000

// Process config
const testConfig = { events: [{ ..., startTime: "+5s", endTime: "+10s" }] }
const serverStart = Date.now()
const processed = processTestConfig(testConfig, serverStart)
// processed.events[0].startTime = serverStart + 5000
// processed.events[0].endTime = serverStart + 10000

// Load file
const config = loadTestEventFile('test-events/quick-test.json')
// Returns processed config ready to use
```

### Task 2: Integrate with Event Engine

**File**: `server/src/services/eventEngine.ts`

**Requirements:**
1. Import the test event loader at the top of the file
2. Modify the event engine initialization/constructor:
   - Check if `process.env.TEST_EVENT_FILE` is set
   - If set, call `loadTestEventFile()` with the env var value
   - Use the processed events from the test file
   - If not set, load production events as normal
   - Log which configuration is being loaded (test vs production)

**Pseudocode:**
```typescript
import { loadTestEventFile } from './testEventLoader'

class EventEngine {
  constructor() {
    const testEventFile = process.env.TEST_EVENT_FILE

    if (testEventFile) {
      console.log(`🧪 Loading test event configuration: ${testEventFile}`)
      try {
        const config = loadTestEventFile(testEventFile)
        this.loadEvents(config.events)
        console.log(`✅ Loaded ${config.events.length} test events`)
      } catch (error) {
        console.error(`❌ Failed to load test events:`, error)
        throw error
      }
    } else {
      console.log(`📋 Loading production event configuration`)
      this.loadProductionEvents()
    }
  }
}
```

**Important:**
- Find the existing initialization code in eventEngine.ts
- Determine where events are currently loaded
- Integrate the test event loading logic there
- Preserve all existing functionality for production events
- Ensure test event loading happens at server start time

### Task 3: Create Example Test Configurations

Create the following test event files in `server/test-events/` directory:

#### File: `server/test-events/quick-test.json`

A fast-paced test sequence (70 seconds total):
```json
{
  "events": [
    {
      "id": "welcome",
      "type": "text",
      "startTime": "now",
      "endTime": "+10s",
      "content": "Welcome to the quick test! First question coming up..."
    },
    {
      "id": "q1",
      "type": "question",
      "startTime": "+10s",
      "endTime": "+30s",
      "content": "What is your favorite color?",
      "placeholder": "Enter a color"
    },
    {
      "id": "results1",
      "type": "text",
      "startTime": "+30s",
      "endTime": "+40s",
      "content": "Thanks for answering! Next question..."
    },
    {
      "id": "q2",
      "type": "multiple_choice",
      "startTime": "+40s",
      "endTime": "+60s",
      "content": "Pick your favorite fruit:",
      "options": [
        { "id": "apple", "text": "Apple", "value": "apple" },
        { "id": "banana", "text": "Banana", "value": "banana" },
        { "id": "orange", "text": "Orange", "value": "orange" }
      ]
    },
    {
      "id": "finale",
      "type": "text",
      "startTime": "+60s",
      "endTime": "+70s",
      "content": "Test complete! Thanks for participating."
    }
  ]
}
```

#### File: `server/test-events/instant-question.json`

Single question that starts immediately:
```json
{
  "events": [
    {
      "id": "instant-q",
      "type": "question",
      "startTime": "now",
      "endTime": "+5m",
      "content": "What's the first thing that comes to mind?",
      "placeholder": "Type your answer..."
    }
  ]
}
```

#### File: `server/test-events/rapid-fire.json`

Very fast sequence (5-second intervals):
```json
{
  "events": [
    {
      "id": "e1",
      "type": "text",
      "startTime": "now",
      "endTime": "+5s",
      "content": "Event 1: Starting now!"
    },
    {
      "id": "e2",
      "type": "text",
      "startTime": "+5s",
      "endTime": "+10s",
      "content": "Event 2: Five seconds in"
    },
    {
      "id": "e3",
      "type": "text",
      "startTime": "+10s",
      "endTime": "+15s",
      "content": "Event 3: Ten seconds in"
    },
    {
      "id": "e4",
      "type": "question",
      "startTime": "+15s",
      "endTime": "+25s",
      "content": "Quick question: yes or no?",
      "placeholder": "yes/no"
    },
    {
      "id": "e5",
      "type": "text",
      "startTime": "+25s",
      "endTime": "+30s",
      "content": "Done!"
    }
  ]
}
```

### Task 4: Update .gitignore

**File**: `server/.gitignore`

Add the following line to ignore test event files (so developers can create local test configs without committing them):

```
# Test event configurations (local development only)
test-events/
```

**Note:** The example test files created in Task 3 should be committed, but the `.gitignore` entry allows developers to create additional test files locally without accidentally committing them.

### Task 5: Create README for test-events directory

**File**: `server/test-events/README.md`

```markdown
# Test Event Configurations

This directory contains test event configurations for local development.

## Usage

1. Create or use an existing test event JSON file
2. Set the environment variable in `server/.env`:
   ```
   TEST_EVENT_FILE=test-events/quick-test.json
   ```
3. Restart the server
4. Events will trigger based on relative timing from server start

## Time Format

- `"now"` - Starts immediately when server starts
- `"+5s"` - 5 seconds after server start
- `"+30s"` - 30 seconds after server start
- `"+2m"` - 2 minutes after server start

## Example Test Configs

- `quick-test.json` - 70-second sequence with multiple event types
- `instant-question.json` - Single question starting immediately
- `rapid-fire.json` - Fast 30-second sequence

## Creating Your Own

Copy an existing file and modify:
```bash
cp quick-test.json my-test.json
# Edit my-test.json
# Update .env to use TEST_EVENT_FILE=test-events/my-test.json
```

See `docs/test-event-configurations.md` for full documentation.
```

## Testing Your Implementation

After implementing all tasks, verify your work:

### 1. Test the Time Parser
```typescript
// In a test file or console
import { parseRelativeTime } from './services/testEventLoader'

console.log(parseRelativeTime("now"))    // Should be 0
console.log(parseRelativeTime("+5s"))    // Should be 5000
console.log(parseRelativeTime("+2m"))    // Should be 120000
```

### 2. Test Config Processing
```typescript
import { processTestConfig } from './services/testEventLoader'

const testConfig = {
  events: [
    {
      id: "test",
      type: "text",
      startTime: "+5s",
      endTime: "+10s",
      content: "Test"
    }
  ]
}

const now = Date.now()
const processed = processTestConfig(testConfig, now)

console.log(processed.events[0].startTime === now + 5000)   // Should be true
console.log(processed.events[0].endTime === now + 10000)     // Should be true
```

### 3. Test with Server

1. Set `TEST_EVENT_FILE=test-events/quick-test.json` in `server/.env`
2. Start server: `npm run dev`
3. Check console for "Loading test event configuration" message
4. Open client at http://localhost:5174
5. Verify "Welcome to the quick test!" appears immediately
6. Wait 10 seconds, verify question appears
7. Verify timing matches the config

### 4. Test Production Mode

1. Remove or comment out `TEST_EVENT_FILE` from `.env`
2. Restart server
3. Check console for "Loading production event configuration"
4. Verify production events load correctly

## Error Cases to Handle

Your implementation should gracefully handle:

1. **Invalid time format**: `"+5x"`, `"5s"` (missing +), `"now5s"`
   - Should throw clear error message

2. **Missing file**: `TEST_EVENT_FILE=nonexistent.json`
   - Should throw clear error with file path

3. **Invalid JSON**: Malformed JSON in test file
   - Should throw clear parsing error

4. **Missing required fields**: Event without `id`, `type`, or `startTime`
   - Should throw validation error

5. **EndTime before StartTime**: Event with endTime < startTime
   - Should throw or warn about invalid timing

## Success Criteria

- ✅ Can parse all relative time formats ("now", "+Xs", "+Xm")
- ✅ Converts relative times to absolute timestamps correctly
- ✅ Loads test event files from filesystem
- ✅ Integrates with event engine initialization
- ✅ Server uses test events when TEST_EVENT_FILE is set
- ✅ Server uses production events when TEST_EVENT_FILE is not set
- ✅ Console logs clearly indicate which config is loaded
- ✅ Example test configurations work correctly
- ✅ Error messages are clear and helpful
- ✅ All existing functionality continues to work

## Implementation Tips

1. **Start with Task 1**: Get the time parser working first, it's the foundation
2. **Test each function**: Verify parseRelativeTime works before moving to processTestConfig
3. **Check existing code**: Look at how production events are currently loaded
4. **Preserve existing behavior**: Don't break production event loading
5. **Use TypeScript**: Add proper type annotations
6. **Error handling**: Add try/catch blocks with meaningful error messages
7. **Logging**: Add console.log statements to show what's happening
8. **Validation**: Check for common mistakes (negative times, missing fields, etc.)

## Questions to Answer Before Starting

1. Where in eventEngine.ts are production events currently loaded?
2. What is the structure of the production event file?
3. How does the event engine expect events to be formatted?
4. What is the current working directory when the server starts?
5. Are there existing utilities for file operations in the codebase?

## After Implementation

Once complete, update the main documentation:
- Mark implementation tasks as complete in `test-event-configurations.md`
- Add any learnings or gotchas discovered during implementation
- Document any deviations from the original plan
