# Test Event Configuration System

## Overview

A system for creating and running test event configurations that allows developers to quickly test different event sequences without modifying the main event configuration. Each test configuration runs with relative timing from when the test starts, making it easy to develop and validate event sequences.

## Goals

1. **Isolation**: Test configurations should not interfere with production event files
2. **Reusability**: Multiple test configurations can be created and swapped easily
3. **Relative Timing**: All event timings are relative to server start time, not absolute timestamps
4. **Simple Setup**: Use environment variable to specify test config file
5. **Development Only**: Test configurations should only be available in development mode

## Architecture

### Directory Structure

```
server/
├── events/
│   └── halloween-party.json          # Production event file
├── test-events/                       # Test event configurations (gitignored)
│   ├── quick-test.json               # Fast sequence for rapid testing
│   ├── question-flow.json            # Test question events
│   ├── multiple-choice-flow.json     # Test multiple choice events
│   └── full-scenario.json            # Complete event sequence
├── src/
│   └── services/
│       ├── eventEngine.ts            # Existing event engine
│       └── testEventLoader.ts        # NEW: Test event configuration loader
└── docs/
    └── test-event-configurations.md   # This document
```

### Test Event File Format

Test event files use the same structure as production events, but with **relative timing** instead of absolute timestamps.

#### Time Format Options

1. **Relative seconds** (for events happening soon): `"+5s"`, `"+30s"`, `"+60s"`
2. **Relative minutes** (for longer sequences): `"+1m"`, `"+5m"`, `"+10m"`
3. **Immediate**: `"now"` or `"+0s"`
4. **No auto-hide**: Omit `endTime` entirely to keep event visible indefinitely

#### Example: `test-events/quick-test.json`

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

#### Example: `test-events/question-flow.json`

```json
{
  "events": [
    {
      "id": "intro",
      "type": "text",
      "startTime": "now",
      "endTime": "+5s",
      "content": "Testing question event flow..."
    },
    {
      "id": "q1",
      "type": "question",
      "startTime": "+5s",
      "endTime": "+20s",
      "content": "What is your name?",
      "placeholder": "Enter your name"
    },
    {
      "id": "q2",
      "type": "question",
      "startTime": "+20s",
      "endTime": "+35s",
      "content": "What is your quest?",
      "placeholder": "Enter your quest"
    },
    {
      "id": "q3",
      "type": "question",
      "startTime": "+35s",
      "endTime": "+50s",
      "content": "What is your favorite color?",
      "placeholder": "Enter a color"
    }
  ]
}
```

## Implementation Components

### 1. Test Event Loader Service (`src/services/testEventLoader.ts`)

**Responsibilities:**
- Parse relative time formats (`+5s`, `+2m`, `now`)
- Convert relative times to absolute timestamps based on server start time
- Validate test event configuration format
- Load test event file specified by environment variable

**Key Functions:**
```typescript
export interface TestEventConfig {
  events: Array<{
    id: string
    type: string
    startTime: string  // Relative format: "now", "+5s", "+2m"
    endTime: string
    content: string
    placeholder?: string
    options?: Array<{ id: string; text: string; value: string }>
  }>
}

export interface ProcessedEventConfig {
  events: Array<{
    id: string
    type: string
    startTime: number  // Absolute timestamp
    endTime: number
    content: string
    placeholder?: string
    options?: Array<{ id: string; text: string; value: string }>
  }>
}

// Parse relative time string to milliseconds offset
function parseRelativeTime(timeStr: string): number

// Convert test config with relative times to absolute timestamps
function processTestConfig(config: TestEventConfig, serverStartTime: number): ProcessedEventConfig

// Load and process test event file from path
function loadTestEventFile(filePath: string): ProcessedEventConfig
```

### 2. Event Engine Integration

**Modifications to `src/services/eventEngine.ts`:**

Update initialization to check for test event file:
```typescript
class EventEngine {
  constructor() {
    // Check if TEST_EVENT_FILE is set
    const testEventFile = process.env.TEST_EVENT_FILE

    if (testEventFile) {
      console.log(`Loading test event configuration: ${testEventFile}`)
      const config = loadTestEventFile(testEventFile)
      this.loadEvents(config.events)
    } else {
      // Load production events
      this.loadProductionEvents()
    }
  }
}
```

### 3. Configuration & Environment

**Environment Variables:**
- `TEST_EVENT_FILE=test-events/quick-test.json` - Path to test event file (relative to server root)
- If not set, loads production events from `events/halloween-party.json`

**Example `.env` file:**
```bash
# Use test events
TEST_EVENT_FILE=test-events/quick-test.json

# Or use production events (default if not set)
# TEST_EVENT_FILE=
```

## Usage Workflow

### 1. Create Test Configuration

Create a new file in `test-events/`:

```bash
# Create test-events directory if it doesn't exist
mkdir -p server/test-events

# Create a new test configuration
cat > server/test-events/my-test.json << 'EOF'
{
  "events": [
    {
      "id": "test1",
      "type": "text",
      "startTime": "now",
      "endTime": "+10s",
      "content": "My test event"
    }
  ]
}
EOF
```

### 2. Configure Environment Variable

Add to your `server/.env` file:

```bash
TEST_EVENT_FILE=test-events/my-test.json
```

### 3. Start Server

```bash
cd server
npm run dev
```

The server will load your test configuration and convert all relative times to absolute timestamps based on server start time.

### 4. Observe Events

- Open the client app in browser
- Events will trigger according to the relative timing from server start
- Submit answers and observe behavior

### 5. Switch to Different Test or Production

Edit `server/.env`:
```bash
# Switch to different test
TEST_EVENT_FILE=test-events/another-test.json

# Or remove/comment out to use production events
# TEST_EVENT_FILE=
```

Restart the server to load the new configuration.

## Example Test Configurations

### Fast Iteration Test (5-second intervals)
```json
{
  "events": [
    { "id": "e1", "type": "text", "startTime": "now", "endTime": "+5s", "content": "Event 1" },
    { "id": "e2", "type": "text", "startTime": "+5s", "endTime": "+10s", "content": "Event 2" },
    { "id": "e3", "type": "text", "startTime": "+10s", "endTime": "+15s", "content": "Event 3" }
  ]
}
```

### Real-Time Testing (immediate events)
```json
{
  "events": [
    {
      "id": "instant-question",
      "type": "question",
      "startTime": "now",
      "endTime": "+5m",
      "content": "Question that starts immediately",
      "placeholder": "Your answer"
    }
  ]
}
```

### Persistent Event (no auto-hide)
```json
{
  "events": [
    {
      "id": "persistent-question",
      "type": "question",
      "startTime": "now",
      "content": "This question stays visible until answered",
      "placeholder": "Your answer"
    }
  ]
}
```
Note: When `endTime` is omitted, the event has no duration and stays visible indefinitely.

## Implementation Tasks

- [x] Implement `testEventLoader.ts` with relative time parsing
- [x] Integrate with event engine initialization to check `TEST_EVENT_FILE` env var
- [x] Create example test configurations
- [x] Add `.gitignore` entry for `test-events/` directory
- [x] Make `endTime` optional to support persistent events

## Manual Testing Checklist

1. [ ] Create a test config with "now" start time - event should start immediately
2. [ ] Create a test config with "+5s" timing - event should start 5 seconds after server start
3. [ ] Create a test config with "+2m" timing - event should start 2 minutes after server start
4. [ ] Switch between different test configs - verify timing resets on server restart
5. [ ] Remove TEST_EVENT_FILE and verify production events load correctly

## Edge Cases

- Empty test configuration
- Invalid time formats
- Events with overlapping times
- Events with endTime before startTime
- Missing required fields
- Invalid file paths
