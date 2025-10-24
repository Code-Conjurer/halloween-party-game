# Agent Implementation Instructions

You are tasked with implementing a server-client architecture for a Halloween Party Game. Follow these instructions in order, implementing each phase completely before moving to the next.

## Project Context

**Current State:**
- React + TypeScript + Vite client application
- Local event engine running in browser
- Events configured in `src/events.json`

**Target State:**
- Express server controlling game flow
- React client polling server for events
- SQLite database tracking sessions and answers
- Server-side event scheduling using absolute timestamps

**Architecture Principles:**
1. Server has complete control over timing and event flow
2. Clients are stateless - they only display what server tells them
3. All timing logic uses absolute timestamps (never sent to clients)
4. Clients poll server; they never know when future events will occur
5. Database tracks all user participation

---

## Phase 1: Server Foundation

### 1.1 Project Structure
Create the following directory structure:

```
halloween-party-game/
├── server/
│   ├── src/
│   ├── config/
│   └── data/
└── client/           (move existing React app here)
    └── src/
        ├── services/
        ├── hooks/
        └── components/custom/
```

**Tasks:**
1. Create `server/`, `server/src/`, `server/config/`, `server/data/` directories
2. Move all existing React application code into `client/` directory
3. Create `client/src/services/` for API client code
4. Create `client/src/components/custom/` for custom event components
5. Update any absolute imports in client code if needed

### 1.2 Server Package Setup
In `server/` directory, initialize a new Node.js project:

```bash
cd server
npm init -y
```

Install dependencies:
```
express
cors
dotenv
better-sqlite3
```

Install dev dependencies:
```
typescript
@types/node
@types/express
@types/cors
@types/better-sqlite3
tsx
nodemon
```

Create `server/package.json` scripts:
- `"dev"`: Run server with hot reload (nodemon + tsx)
- `"build"`: Compile TypeScript
- `"start"`: Run compiled server

### 1.3 TypeScript Configuration
Create `server/tsconfig.json`:
- Target: ES2020 or later
- Module: CommonJS or ESNext
- Output directory: `dist/`
- Include: `src/**/*`
- Enable strict mode

### 1.4 Basic Express Server
Create `server/src/index.ts`:
1. Initialize Express app
2. Add middleware: JSON parsing, CORS (allow client origin)
3. Add `GET /health` endpoint returning `{ status: 'ok' }`
4. Configure port from environment variable (default 3001)
5. Add basic error handling middleware
6. Start server and log listening port

Test: Run server and verify health endpoint works.

### 1.5 Type Definitions
Create `server/src/types.ts` with the following interfaces:

**EventConfig** (server-side only):
- `id: string` - Unique event identifier
- `triggerAt: string | number` - ISO 8601 timestamp or Unix milliseconds
- `type: 'showText' | 'showQuestion' | 'showMultipleChoice' | 'showCustomComponent' | 'hide'`
- `content?: string` - Display text
- `placeholder?: string` - Input placeholder
- `options?: Array<{id: string, text: string, value: string}>` - For multiple choice
- `componentName?: string` - For custom components
- `props?: Record<string, any>` - Props for custom components
- `duration?: number` - Auto-hide after N milliseconds
- `triggers?: object` - Conditional event triggers

**DisplayEvent** (sent to clients):
- `type: 'text' | 'question' | 'multiple_choice' | 'custom_component' | 'none'`
- `content: string`
- `placeholder?: string`
- `options?: Array<{id: string, text: string, value: string}>`
- `componentName?: string`
- `props?: Record<string, any>`
- `eventId: string`
- `hasAnswered?: boolean`

**Session**:
- `id: string`
- `ip_address: string`
- `user_agent: string`
- `device_fingerprint: string`
- `first_seen: number`
- `last_seen: number`

**Answer**:
- `id: number`
- `session_id: string`
- `event_id: string`
- `answer_type: string`
- `answer_value: string`
- `answered_at: number`

**GameState**:
- `gameStarted: boolean`
- `gameStartTime: number | null`
- `currentEventId: string | null`

---

## Phase 2: Event Scheduling System

### 2.1 Event Scheduler Class
Create `server/src/eventScheduler.ts`:

Implement class `EventScheduler` with:

**Properties:**
- `events: EventConfig[]` - All loaded events
- `gameStartTime: number | null` - Unix timestamp of game start
- `currentEvent: DisplayEvent | null` - Current active event
- `scheduledTimeouts: Map<string, NodeJS.Timeout>` - Active timeouts
- `eventTriggers: Map<string, Function[]>` - Event-based triggers

**Methods:**
- `loadEvents(config: {events: EventConfig[]})`: Parse and store events
- `startGame()`: Convert timestamps to timeouts and schedule all events
- `getCurrentEvent(): DisplayEvent | null`: Return current active event
- `processAnswer(eventId: string, answer: any, sessionId: string)`: Handle answer and trigger conditional events
- `reset()`: Clear all timeouts and reset state
- `isGameActive(): boolean`: Check if game is running

**Implementation Notes:**
- When `startGame()` is called, calculate delay for each event based on `triggerAt` timestamp
- Use `setTimeout()` to schedule each event
- When event triggers, update `currentEvent` and handle `duration` if specified
- Store timeouts in map so they can be cleared on reset
- Support nested trigger events (events triggered by answers)

### 2.2 Game State Management
Create `server/src/gameState.ts`:

Implement class `GameState` with:

**Properties:**
- `currentDisplay: DisplayEvent | null`
- `gameStarted: boolean`
- `gameStartTime: number | null`

**Methods:**
- `setDisplay(event: DisplayEvent | null): void`
- `getDisplay(): DisplayEvent | null`
- `setGameStarted(started: boolean, time?: number): void`
- `getGameState(): {gameStarted: boolean, gameStartTime: number | null}`
- `reset(): void`

### 2.3 Events Configuration
1. Move `client/src/events.json` to `server/config/events.json`
2. Update format to use absolute timestamps:
   ```json
   {
     "events": [
       {
         "id": "welcome",
         "triggerAt": "2025-10-31T19:00:00Z",
         "type": "showText",
         "content": "Incoming Transmission...",
         "duration": 3000
       }
     ]
   }
   ```
3. Add validation: check all required fields exist
4. Create at least 3 test events for development

---

## Phase 3: Database Layer

### 3.1 Database Schema
Create `server/src/database/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  device_fingerprint TEXT,
  first_seen INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE IF NOT EXISTS answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  answer_type TEXT NOT NULL,
  answer_value TEXT NOT NULL,
  answered_at INTEGER NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE TABLE IF NOT EXISTS game_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  game_started INTEGER DEFAULT 0,
  game_start_time INTEGER,
  current_event_id TEXT,
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_answers_session ON answers(session_id);
CREATE INDEX IF NOT EXISTS idx_answers_event ON answers(event_id);
CREATE INDEX IF NOT EXISTS idx_sessions_ip ON sessions(ip_address);
```

### 3.2 Database Service
Create `server/src/database/db.ts`:

Implement class `GameDatabase`:

**Constructor:**
- Accept database file path (default: `./data/game.db`)
- Initialize better-sqlite3 connection
- Create tables from schema if they don't exist
- Enable WAL mode for better concurrency

**Session Methods:**
- `createSession(data: Omit<Session, 'id'>): Session` - Generate ID and insert
- `findSessionById(id: string): Session | null`
- `findSessionByIP(ip: string, userAgent: string, since: number): Session | null`
- `updateLastSeen(sessionId: string, timestamp: number): void`
- `getAllSessions(): Session[]`
- `getActiveSessionCount(withinMs: number): number` - Count recently active

**Answer Methods:**
- `recordAnswer(sessionId: string, eventId: string, answerType: string, value: any): void`
- `hasSessionAnswered(sessionId: string, eventId: string): boolean`
- `getAnswersByEvent(eventId: string): Answer[]`
- `getAnswersBySession(sessionId: string): Answer[]`
- `getAnswerCount(eventId: string): number`

**Game State Methods:**
- `saveGameState(state: Partial<GameState>): void`
- `loadGameState(): GameState | null`
- `resetGameState(): void`

**Cleanup:**
- `close(): void` - Close database connection

### 3.3 Session Identification Middleware
Create `server/src/middleware/session.ts`:

Implement middleware function that:
1. Extracts IP address from `req.ip` or `req.connection.remoteAddress`
2. Extracts User-Agent from `req.headers['user-agent']`
3. Gets client UUID from request header `X-Client-ID` (if provided)
4. Gets device fingerprint from header `X-Device-Fingerprint` (if provided)
5. Attempts to find existing session by client UUID or IP+UA
6. Creates new session if not found
7. Updates `last_seen` timestamp
8. Attaches `sessionId` to `req` object
9. Calls `next()`

Add TypeScript declaration to extend Express Request type with `sessionId`.

---

## Phase 4: API Endpoints

### 4.1 Event Polling Endpoint
Create route `GET /api/current-event`:

1. Extract session ID from middleware
2. Get current event from EventScheduler
3. If no event, return `{type: 'none'}`
4. If event exists:
   - Check if this session has answered (query database)
   - Return event with `hasAnswered` flag
   - Include `answerCount` (total answers for this event)
5. Handle errors gracefully

Response format:
```json
{
  "type": "question",
  "eventId": "name_question",
  "content": "What is your name?",
  "placeholder": "Enter name",
  "hasAnswered": false,
  "answerCount": 5
}
```

### 4.2 Answer Submission Endpoint
Create route `POST /api/answer`:

Request body:
```json
{
  "eventId": "name_question",
  "answer": "Alice"
}
```

Implementation:
1. Extract session ID from middleware
2. Validate request body (eventId and answer required)
3. Check if session has already answered this event
4. Record answer in database
5. Call `eventScheduler.processAnswer()` to trigger conditional events
6. Return success/duplicate status

Response:
```json
{
  "success": true,
  "duplicate": false
}
```

### 4.3 Session Registration Endpoint
Create route `POST /api/session/register`:

Request body:
```json
{
  "clientId": "uuid",
  "fingerprint": {
    "screenWidth": 1920,
    "screenHeight": 1080,
    "timezone": "America/New_York",
    "language": "en-US"
  }
}
```

Implementation:
1. Use session middleware to identify/create session
2. Return session ID to client

Response:
```json
{
  "sessionId": "sess_abc123",
  "isNewSession": true
}
```

### 4.4 Game Status Endpoint
Create route `GET /api/game/status`:

Return:
```json
{
  "gameActive": true,
  "gameStartTime": 1234567890,
  "serverTime": 1234567890000,
  "participantCount": 15
}
```

### 4.5 Admin Endpoints
Create the following admin routes (add simple auth - check for secret token in header):

**POST /api/admin/start**
- Call `eventScheduler.startGame()`
- Save state to database
- Return start time

**POST /api/admin/reset**
- Call `eventScheduler.reset()`
- Clear database answers and sessions (optional)
- Reset game state

**GET /api/admin/sessions**
- Return all sessions with metadata
- Include active count

**GET /api/admin/answers/:eventId**
- Return all answers for specific event
- Include session info

**GET /api/admin/export**
- Export all data as JSON
- Include sessions, answers, game state

---

## Phase 5: Client Refactoring

### 5.1 API Client Service
Create `client/src/services/api.ts`:

Implement functions:
- `getCurrentEvent(): Promise<DisplayEvent>`
- `submitAnswer(eventId: string, answer: any): Promise<{success: boolean, duplicate: boolean}>`
- `registerSession(clientId: string, fingerprint: object): Promise<{sessionId: string}>`
- `getGameStatus(): Promise<GameStatus>`

Configuration:
- Use `fetch` or `axios`
- Base URL from environment variable or default to `/api`
- Include session headers in all requests
- Add retry logic with exponential backoff
- Handle network errors gracefully

### 5.2 Session Management
Create utility `client/src/utils/session.ts`:

Functions:
- `getOrCreateClientId(): string` - Get from localStorage or generate UUID
- `generateFingerprint(): object` - Collect screen size, timezone, language
- `getSessionId(): string | null` - Get from localStorage
- `setSessionId(id: string): void` - Save to localStorage

On app initialization:
1. Get or create client UUID
2. Generate device fingerprint
3. Register with server if no session ID
4. Store returned session ID

### 5.3 Server Polling Hook
Create `client/src/hooks/useServerPolling.ts`:

Implement hook `useServerPolling()`:

**State:**
- `displayState: DisplayEvent | null`
- `isPolling: boolean`
- `error: Error | null`
- `isLoading: boolean`

**Logic:**
1. Set up interval-based polling using `setInterval`
2. Poll every 2000ms when idle (no event)
3. Poll every 1000ms when event is active
4. On error, implement exponential backoff (2s → 4s → 8s, max 30s)
5. On successful poll, reset backoff
6. Update display state when server response changes

**Methods:**
- `submitAnswer(answer: any): Promise<void>` - Submit answer and refresh immediately

**Cleanup:**
- Clear interval on unmount

Return: `{displayState, submitAnswer, error, isLoading, isPolling}`

### 5.4 Update App Component
In `client/src/App.tsx`:

1. Replace `useEventEngine` with `useServerPolling`
2. Update rendering logic to handle `displayState` from server
3. Map event types to components:
   - `text` → TextDisplay
   - `question` → QuestionDisplay
   - `multiple_choice` → MultipleChoiceDisplay (Phase 6)
   - `custom_component` → CustomComponentRenderer (Phase 6)
   - `none` → Show nothing (just static)
4. Pass `submitAnswer` to input components
5. Show loading/error states appropriately
6. Remove all imports of local EventEngine

### 5.5 Vite Proxy Configuration
Update `client/vite.config.ts`:

Add server proxy:
```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
```

Create `.env` file:
```
VITE_API_URL=http://localhost:3001/api
```

---

## Phase 6: Enhanced Event Types

### 6.1 Multiple Choice Support
1. Update `DisplayEvent` type to include multiple choice format
2. Create `client/src/components/MultipleChoiceDisplay.tsx`:
   - Accept: `content`, `options`, `allowMultiple`, `onSubmit`
   - Render radio buttons (single) or checkboxes (multiple)
   - Submit selected value(s) on button click
   - Match styling of existing components
3. Update server event scheduler to handle multiple choice events
4. Update API to accept multiple choice answers
5. Test with example event

### 6.2 Custom Component System
1. Add `showCustomComponent` to event types
2. Create `client/src/components/CustomComponentRenderer.tsx`:
   ```typescript
   interface CustomComponentProps {
     componentName: string
     props: Record<string, any>
     onComplete: (data?: any) => void
     onFail: (reason?: string) => void
   }
   ```
3. Create component registry:
   ```typescript
   const COMPONENTS = {
     ExampleComponent: lazy(() => import('./custom/ExampleComponent'))
   }
   ```
4. Use `React.lazy` and `Suspense` for code splitting
5. Render component by name from registry
6. Handle missing components gracefully
7. Pass callbacks that call `submitAnswer` with completion data

### 6.3 Example Custom Components
Create 2-3 simple custom components in `client/src/components/custom/`:

Example 1: `CountdownTimer.tsx`
- Shows countdown from N seconds
- Calls `onComplete()` when timer reaches 0
- Allows early completion by clicking button

Example 2: `DrawingPad.tsx`
- Simple canvas for drawing
- Submit button calls `onComplete()` with drawing data

Each component must:
- Accept `props` object from event config
- Accept `onComplete` and `onFail` callbacks
- Match existing component styling

### 6.4 Update Event Scheduler
Update `server/src/eventScheduler.ts`:
1. Handle `showMultipleChoice` events
2. Handle `showCustomComponent` events
3. Support `onComplete` and `onFail` triggers for custom components
4. Validate event types on load

---

## Phase 7: Testing & Polish

### 7.1 Server Testing
Test the following scenarios:
1. Start server and verify health endpoint
2. Load events from config file
3. Start game and verify events trigger at correct times
4. Submit multiple answers from different "sessions"
5. Verify duplicate detection works
6. Reset game and verify clean state
7. Test with 10+ concurrent polling requests

### 7.2 Client Testing
Test the following:
1. Client polls server and displays events
2. Submit answer through UI
3. Verify polling continues after answer submission
4. Refresh page - session persists
5. Test on mobile device
6. Test with network throttling (slow 3G)
7. Test offline behavior (server stopped)

### 7.3 Integration Testing
Test complete flows:
1. Start server, start game, verify events appear on client at correct times
2. Multiple clients answer question, verify all answers recorded
3. Conditional trigger: answer triggers new event
4. Test multiple choice selection and submission
5. Test custom component lifecycle

### 7.4 Error Handling
Add/verify:
1. Server logs errors to console
2. Client shows user-friendly error messages
3. Invalid event config is caught on load
4. Missing database file is created automatically
5. API validation rejects invalid requests

---

## Phase 8: Deployment Preparation

### 8.1 Environment Configuration
Create `server/.env.example`:
```
PORT=3001
DATABASE_PATH=./data/game.db
NODE_ENV=development
ADMIN_TOKEN=your-secret-token
```

Document all variables in README.

### 8.2 Build Scripts
Create root `package.json` with workspaces:
```json
{
  "workspaces": ["client", "server"],
  "scripts": {
    "dev": "concurrently \"npm run dev:client\" \"npm run dev:server\"",
    "dev:client": "cd client && npm run dev",
    "dev:server": "cd server && npm run dev",
    "build": "npm run build:client && npm run build:server",
    "build:client": "cd client && npm run build",
    "build:server": "cd server && npm run build"
  }
}
```

Install `concurrently` as dev dependency.

### 8.3 Documentation
Update README.md with:
1. Project overview
2. Setup instructions (install, configure, run)
3. Development workflow
4. Event configuration guide
5. API documentation
6. Custom component development guide

### 8.4 Data Management
Create `server/src/scripts/`:
- `export-data.ts` - Export all data to JSON file
- `reset-game.ts` - Clear game state and optionally answers
- `backup-db.ts` - Copy database file with timestamp

Add npm scripts for each.

---

## Phase 9: Advanced Features (Optional)

### 9.1 Admin Dashboard
Create simple admin UI:
- Real-time session count
- List of recent answers
- Manual game controls (start, reset, skip event)
- Use existing React setup or create separate admin page

### 9.2 Conditional Branching
Implement majority-based triggers:
- Track answer distribution for multiple choice
- After timeout, evaluate majority answer
- Trigger different events based on majority

Example event config:
```json
{
  "type": "showMultipleChoice",
  "triggers": {
    "onMajorityAnswer": {
      "optionA": [/* events */],
      "optionB": [/* events */]
    },
    "evaluateAfter": 30000
  }
}
```

### 9.3 Audio/Visual Effects
Add sound effects:
- Create audio manager service
- Load audio files based on event
- Sync playback across clients using server timestamps
- Add background music support

---

## Implementation Order

**Critical Path (Must implement in order):**
1. Phase 1 (Server Foundation)
2. Phase 2 (Event Scheduling)
3. Phase 3 (Database Layer)
4. Phase 4 (API Endpoints)
5. Phase 5 (Client Refactoring)
6. Phase 7.1-7.3 (Core Testing)

**Can implement after critical path:**
- Phase 6 (Enhanced Event Types) - can be done in parallel with testing
- Phase 7.4 (Error Handling) - iterative improvement
- Phase 8 (Deployment) - final polish
- Phase 9 (Advanced Features) - optional

---

## Success Criteria

After implementation, the system should:
1. ✅ Server starts and loads events successfully
2. ✅ Events trigger at specified timestamps
3. ✅ Multiple clients can poll server simultaneously
4. ✅ Answers are recorded with session tracking
5. ✅ Duplicate answers are detected
6. ✅ Client recovers from temporary network issues
7. ✅ Events appear synchronized across all clients (within 1-2 seconds)
8. ✅ Session persists across page refresh
9. ✅ Game can be reset and restarted
10. ✅ All event types work (text, question, multiple choice, custom)

---

## Tips for Implementation

1. **Test frequently**: After each major component, test it independently
2. **Start simple**: Get basic polling working before adding complexity
3. **Use timestamps carefully**: Always use Unix milliseconds for consistency
4. **Handle timezones**: Use UTC timestamps in events.json
5. **Log everything**: Add console.log statements during development
6. **Check database**: Use SQLite browser to inspect database during testing
7. **Mobile first**: Test on actual mobile device early
8. **Error boundaries**: Wrap components in error boundaries to prevent crashes
9. **TypeScript strict**: Enable strict mode to catch errors early
10. **Commit often**: Make small, focused commits after each working feature

---

## Common Pitfalls to Avoid

❌ Don't send timing information to clients
❌ Don't rely on client-side timing for events
❌ Don't skip session identification - it's critical for tracking
❌ Don't forget to clear timeouts on reset
❌ Don't poll too frequently (respect rate limits)
❌ Don't ignore error cases
❌ Don't hard-code URLs or ports
❌ Don't forget to test with multiple simultaneous clients
❌ Don't skip database indexes (they matter for performance)
❌ Don't use `setInterval` without cleanup

---

**Good luck with implementation! Follow the phases in order and test thoroughly at each step.**
