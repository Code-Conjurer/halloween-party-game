# Implementation Plan: Server-Client Architecture Refactor

## Overview
Transform the Halloween Party Game from a client-side event system to a server-client architecture where:
- Server controls event scheduling and game flow
- Clients poll the server for current event state
- All game logic is centralized on the server

## Goals
1. Enable synchronized multi-player experience
2. Centralize game control and event timing
3. Allow for answer collection and validation server-side
4. Support future features (admin controls, analytics, scoring)

---

## Architecture Design

### High-Level Architecture

```
┌─────────────┐         HTTP Polling          ┌─────────────┐
│   Client    │ ◄─────────────────────────── │   Server    │
│  (React)    │                               │  (Express)  │
│             │ ─────────────────────────────►│             │
│  - Display  │    POST answers/events        │ - Scheduler │
│  - Input    │                               │ - State Mgr │
│  - Polling  │                               │ - Events    │
└─────────────┘                               └─────────────┘
```

### Server Responsibilities
- Load and parse events configuration
- Schedule events based on game timeline
- Maintain current game state (what should be displayed)
- Track received answers per client/session
- Trigger conditional events based on answers
- Serve API endpoints for client communication

### Client Responsibilities
- Poll server at regular intervals
- Display current event (text, question, none)
- Collect user input
- Submit answers to server
- Handle polling state (active/idle)

---

## Technical Specifications

### 1. Project Structure

```
halloween-party-game/
├── server/
│   ├── src/
│   │   ├── index.ts                 # Express app entry point
│   │   ├── server.ts                # Server setup and routes
│   │   ├── eventScheduler.ts        # Event scheduling logic
│   │   ├── gameState.ts             # Game state management
│   │   ├── types.ts                 # Shared type definitions
│   │   └── routes/
│   │       ├── events.ts            # Event-related endpoints
│   │       └── admin.ts             # Admin control endpoints (optional)
│   ├── config/
│   │   └── events.json              # Event configuration
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
├── client/                          # Existing React app
│   ├── src/
│   │   ├── hooks/
│   │   │   └── useServerPolling.ts  # New polling hook
│   │   ├── services/
│   │   │   └── api.ts               # API client
│   │   └── ...
│   ├── package.json
│   └── vite.config.ts               # Update proxy settings
├── shared/                          # Optional: shared types
│   └── types.ts
└── package.json                     # Root workspace config
```

### 2. API Endpoints

#### `GET /api/current-event`
Returns the current event that should be displayed.

**Response:**
```json
{
  "type": "text" | "question" | "none",
  "content": "string",
  "placeholder": "string" (optional),
  "timestamp": 1234567890
}
```

#### `POST /api/answer`
Submit an answer to the current question.

**Request:**
```json
{
  "answer": "string",
  "sessionId": "string" (optional)
}
```

**Response:**
```json
{
  "success": true,
  "message": "Answer received"
}
```

#### `GET /api/game/status`
Get current game status.

**Response:**
```json
{
  "gameActive": true,
  "gameStartTime": 1234567890,
  "serverTime": 1234567890
}
```

#### `POST /api/admin/start` (Optional - Phase 2)
Start the game timeline.

**Response:**
```json
{
  "success": true,
  "startTime": 1234567890
}
```

#### `POST /api/admin/reset` (Optional - Phase 2)
Reset game state.

### 3. Event Configuration Format

Server-side `events.json`:

```json
{
  "gameConfig": {
    "autoStart": true,
    "startDelay": 0
  },
  "events": [
    {
      "id": "welcome",
      "triggerAt": 2000,
      "type": "showText",
      "content": "Incoming Transmission...",
      "duration": 3000
    },
    {
      "id": "hide_welcome",
      "triggerAt": 5000,
      "type": "hide"
    },
    {
      "id": "name_question",
      "triggerAt": 10000,
      "type": "showQuestion",
      "content": "What is your human name?",
      "placeholder": "Enter your answer",
      "triggers": {
        "onAnswer": {
          "type": "showText",
          "content": "Hello, {answer}!",
          "delay": 0
        }
      }
    }
  ]
}
```

**Event Properties:**
- `id`: Unique identifier for the event
- `triggerAt`: Milliseconds from game start
- `type`: "showText" | "showQuestion" | "hide"
- `content`: Text to display
- `placeholder`: Input placeholder (for questions)
- `duration`: Auto-hide duration in ms (optional)
- `triggers`: Conditional events based on user actions

### 4. Server Implementation Details

#### EventScheduler Class
```typescript
class EventScheduler {
  private events: Event[]
  private gameStartTime: number | null
  private currentEvent: DisplayEvent | null
  private eventTimeouts: Map<string, NodeJS.Timeout>

  loadEvents(config: EventConfig): void
  startGame(): void
  getCurrentEvent(): DisplayEvent | null
  processAnswer(answer: string): void
  getGameStatus(): GameStatus
  reset(): void
}
```

**Key Methods:**
- `loadEvents()`: Parse and validate events from JSON
- `startGame()`: Initialize game timeline and schedule all events
- `getCurrentEvent()`: Return the event that should be displayed now
- `processAnswer()`: Handle answer submission and trigger conditional events
- `reset()`: Clear all timeouts and reset state

#### GameState Class
```typescript
class GameState {
  private currentDisplay: DisplayEvent | null
  private answers: Map<string, string[]>

  setDisplay(event: DisplayEvent): void
  getDisplay(): DisplayEvent | null
  recordAnswer(sessionId: string, answer: string): void
  getAnswers(sessionId?: string): string[]
}
```

### 5. Client Implementation Details

#### Polling Strategy

**Polling Intervals:**
- **Idle state** (no event): 2000ms
- **Active state** (event displayed): 1000ms
- **Error/offline**: Exponential backoff (2s → 4s → 8s → max 30s)

#### useServerPolling Hook
```typescript
function useServerPolling() {
  const [displayState, setDisplayState] = useState<DisplayEvent | null>(null)
  const [isPolling, setIsPolling] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Poll server at regular intervals
  useEffect(() => {
    // Polling logic
  }, [])

  const submitAnswer = async (answer: string) => {
    // Submit answer to server
  }

  return { displayState, submitAnswer, error, isPolling }
}
```

#### API Client Service
```typescript
// services/api.ts
const API_BASE = '/api'

export const api = {
  getCurrentEvent: async (): Promise<DisplayEvent> => { },
  submitAnswer: async (answer: string): Promise<void> => { },
  getGameStatus: async (): Promise<GameStatus> => { }
}
```

---

## Implementation Phases

### Phase 1: Server Setup
**Goal:** Create functional Express server with event scheduling

**Tasks:**
1. Create `server/` directory structure
2. Initialize Node.js project with TypeScript
3. Install dependencies (express, cors, dotenv, etc.)
4. Set up TypeScript configuration
5. Create basic Express server with health check endpoint
6. Implement EventScheduler class
7. Implement GameState class
8. Move events.json to server/config/
9. Create API endpoints (current-event, answer, status)
10. Test server independently

**Acceptance Criteria:**
- Server starts on specified port
- Events load from JSON successfully
- API endpoints return expected responses
- Event scheduling works with setTimeout

### Phase 2: Client Refactor
**Goal:** Update client to poll server instead of using local EventEngine

**Tasks:**
1. Create `services/api.ts` API client
2. Implement `useServerPolling` hook
3. Update `App.tsx` to use polling hook instead of useEventEngine
4. Configure Vite proxy for API requests
5. Update environment variables for API URL
6. Remove or deprecate local EventEngine (keep for reference)
7. Test client-server communication
8. Handle loading states and errors gracefully

**Acceptance Criteria:**
- Client successfully polls server
- Events display correctly from server
- Answer submission works
- Graceful error handling for offline/error states
- No console errors

### Phase 3: Testing & Refinement
**Goal:** Ensure system works end-to-end

**Tasks:**
1. Test complete event flow from start to finish
2. Test answer submission and conditional events
3. Test multiple client connections
4. Verify timing accuracy of events
5. Test error scenarios (server down, network issues)
6. Performance testing (polling load)
7. Cross-browser testing
8. Mobile testing

**Acceptance Criteria:**
- All events trigger at correct times
- Answers trigger follow-up events correctly
- Multiple clients stay synchronized
- System recovers from errors gracefully
- Performance is acceptable under load

### Phase 4: Documentation & Deployment (Optional)
**Goal:** Production-ready deployment

**Tasks:**
1. Add README with setup instructions
2. Add environment variable documentation
3. Create Docker setup (optional)
4. Add npm scripts for development and production
5. Set up production build process
6. Add logging and monitoring
7. Create admin interface (optional)

---

## Technical Decisions & Considerations

### Polling vs WebSockets
**Decision:** Use HTTP polling initially

**Rationale:**
- Simpler implementation
- Better for Halloween party (limited duration, ~20 clients max)
- Easier debugging
- Can upgrade to WebSockets later if needed

**Trade-offs:**
- Slight delay in event synchronization (acceptable for 1-2s polls)
- More HTTP requests (but manageable for small scale)

### Event Timing Approach
**Decision:** Relative timing from game start

**Rationale:**
- Easier to configure (ms offsets)
- Game can be restarted/replayed easily
- No timezone issues

**Alternative:** Absolute timestamps (for specific party start times)

### State Management
**Decision:** Server maintains single source of truth

**Rationale:**
- Clients are stateless (just display what server says)
- Easy to sync multiple clients
- Server can implement complex logic without client updates

### Answer Handling
**Decision:** Store answers by session ID (optional)

**Rationale:**
- Can track individual users if needed
- Can implement per-user branching later
- Privacy: session IDs can be client-generated UUIDs

---

## Dependencies

### Server Dependencies
```json
{
  "express": "^4.18.0",
  "cors": "^2.8.5",
  "dotenv": "^16.0.0",
  "typescript": "^5.0.0",
  "@types/express": "^4.17.0",
  "@types/cors": "^2.8.0",
  "@types/node": "^20.0.0",
  "tsx": "^4.0.0",
  "nodemon": "^3.0.0"
}
```

### Client Updates
```json
{
  "axios": "^1.6.0" // or use fetch API
}
```

---

## Migration Strategy

### Step 1: Parallel Development
- Build server alongside existing client
- Keep existing EventEngine functional
- Use feature flag to switch between modes

### Step 2: Gradual Migration
- Implement server
- Test server independently
- Update client to use polling
- Keep fallback to local mode

### Step 3: Complete Transition
- Remove local EventEngine
- Server becomes required dependency
- Update documentation

---

## Risk Mitigation

### Risk: Network Latency
**Mitigation:**
- Adjust polling intervals based on network conditions
- Display loading states clearly
- Cache last known state

### Risk: Server Downtime
**Mitigation:**
- Implement exponential backoff
- Show clear error messages
- Optional: fallback to local mode

### Risk: Event Timing Drift
**Mitigation:**
- Server sends timestamps with events
- Client can calculate expected display time
- Periodic sync checks

### Risk: Concurrent Answer Submission
**Mitigation:**
- Server handles race conditions
- First answer wins, or accept all
- Clear feedback to users

---

## Success Metrics

1. **Synchronization:** Events appear within 1-2 seconds across all clients
2. **Reliability:** 99%+ uptime during game sessions
3. **Responsiveness:** Answer submission completes within 500ms
4. **Scalability:** Support 20+ concurrent clients smoothly
5. **User Experience:** No noticeable lag or stuttering

---

## Future Enhancements

### Phase 5+ (Post-MVP)
- WebSocket support for real-time updates
- Admin dashboard for live game control
- Spectator mode
- Answer analytics and visualization
- Save/replay game sessions
- Multiple game configurations
- Scoring and leaderboards
- Audio/visual effect synchronization
- Progressive Web App features

---

## Timeline Estimate

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| Phase 1: Server Setup | 10 tasks | 4-6 hours |
| Phase 2: Client Refactor | 8 tasks | 3-4 hours |
| Phase 3: Testing | 8 tasks | 2-3 hours |
| **Total** | **26 tasks** | **9-13 hours** |

---

## Open Questions

1. Should we use sessions/auth for clients or anonymous?
   - **Recommendation:** Start with anonymous, add session IDs later if needed

2. How should we handle clients joining mid-game?
   - **Recommendation:** They see current event immediately (catch up mode)

3. Should events have auto-hide timers on server or client?
   - **Recommendation:** Server-side for consistency

4. What happens if a client submits an answer to the wrong question?
   - **Recommendation:** Server validates answer context, ignores if mismatch

5. Should we implement question timeout (auto-move if no answer)?
   - **Recommendation:** Yes, add to event config (Phase 2)

---

## Approval Checklist

Before proceeding with implementation:
- [ ] Architecture approved
- [ ] API design approved
- [ ] Event configuration format approved
- [ ] Polling strategy approved
- [ ] Project structure approved
- [ ] Dependencies approved
- [ ] Timeline acceptable

---

**Document Version:** 1.0
**Last Updated:** 2025-10-22
**Author:** Claude
**Status:** Draft - Awaiting Approval
