# Implementation Steps

## Phase 1: Server Foundation

### Step 1.1: Project Structure Setup
- [ ] Create `server/` directory at project root
- [ ] Create `server/src/` for TypeScript source files
- [ ] Create `server/config/` for configuration files
- [ ] Create `server/data/` for database storage
- [ ] Initialize separate `package.json` in server directory
- [ ] Move existing React app into `client/` directory
- [ ] Create `client/src/services/` for API communication
- [ ] Create `client/src/hooks/` for custom hooks (if not exists)
- [ ] Create `client/src/components/custom/` for custom event components
- [ ] Update any absolute path references in client code

### Step 1.2: Server Dependencies
- [ ] Install Express for HTTP server
- [ ] Install TypeScript and type definitions
- [ ] Install better-sqlite3 for database
- [ ] Install dotenv for environment variables
- [ ] Install tsx/nodemon for development

### Step 1.3: TypeScript Configuration
- [ ] Create `server/tsconfig.json`
- [ ] Configure output directory and module resolution
- [ ] Set up path aliases if needed

### Step 1.4: Basic Express Server
- [ ] Create `server/src/index.ts` entry point
- [ ] Set up Express app with middleware (JSON parsing)
- [ ] Add health check endpoint (`GET /health`)
- [ ] Configure port from environment variables
- [ ] Add basic error handling middleware

### Step 1.5: Type Definitions
- [ ] Create `server/src/types.ts`
- [ ] Define `EventConfig` interface with timestamp-based `triggerAt`
- [ ] Define `DisplayEvent` interface (what clients receive)
- [ ] Define `GameState` interface
- [ ] Define `Session` and `Answer` interfaces

---

## Phase 2: Event Scheduling System

### Step 2.1: Event Scheduler Class
- [ ] Create `server/src/eventScheduler.ts`
- [ ] Implement `loadEvents()` to parse events.json
- [ ] Implement `startGame()` to schedule events based on timestamps
- [ ] Implement `getCurrentEvent()` to return active event
- [ ] Implement `processAnswer()` to handle triggers
- [ ] Implement `reset()` to clear all scheduled events

### Step 2.2: Game State Management
- [ ] Create `server/src/gameState.ts`
- [ ] Implement state for current display event
- [ ] Implement methods to update/retrieve display state
- [ ] Add thread-safe state access

### Step 2.3: Events Configuration
- [ ] Move `src/events.json` to `server/config/events.json`
- [ ] Update event format to use absolute timestamps
- [ ] Add validation for event structure
- [ ] Create example events for testing

---

## Phase 3: Database Layer

### Step 3.1: Database Schema
- [ ] Create `server/src/database/schema.sql`
- [ ] Define `sessions` table (id, ip, user_agent, fingerprint, timestamps)
- [ ] Define `answers` table (id, session_id, event_id, answer_type, answer_value, timestamp)
- [ ] Define `game_state` table (singleton for game status)
- [ ] Create indexes for performance

### Step 3.2: Database Service
- [ ] Create `server/src/database/db.ts`
- [ ] Initialize SQLite connection
- [ ] Implement schema creation/migration on startup
- [ ] Implement session CRUD operations
- [ ] Implement answer recording and retrieval
- [ ] Implement game state persistence
- [ ] Add connection pooling/cleanup

### Step 3.3: Session Identification
- [ ] Create `server/src/middleware/session.ts`
- [ ] Extract IP address from request
- [ ] Extract User-Agent from headers
- [ ] Implement session lookup or creation logic
- [ ] Attach session ID to request context
- [ ] Update last_seen timestamp on each request

---

## Phase 4: API Endpoints

### Step 4.1: Event Polling Endpoint
- [ ] Create `GET /api/current-event`
- [ ] Return current event from EventScheduler
- [ ] Include session-specific data (hasAnswered)
- [ ] Return `type: 'none'` when no active event
- [ ] Handle session identification

### Step 4.2: Answer Submission Endpoint
- [ ] Create `POST /api/answer`
- [ ] Validate request body (eventId, answer)
- [ ] Record answer in database
- [ ] Check for duplicate submissions
- [ ] Trigger conditional events via EventScheduler
- [ ] Return success/duplicate status

### Step 4.3: Session Registration Endpoint
- [ ] Create `POST /api/session/register`
- [ ] Accept client UUID and device fingerprint
- [ ] Create or retrieve session
- [ ] Return session ID to client

### Step 4.4: Game Status Endpoint
- [ ] Create `GET /api/game/status`
- [ ] Return game started state
- [ ] Return server time for synchronization
- [ ] Return participant count

### Step 4.5: Admin Endpoints
- [ ] Create `POST /api/admin/start` to start game
- [ ] Create `POST /api/admin/reset` to reset game state
- [ ] Create `GET /api/admin/sessions` to list all sessions
- [ ] Create `GET /api/admin/answers/:eventId` to get event answers
- [ ] Create `GET /api/admin/export` for data export
- [ ] Add simple authentication/authorization

---

## Phase 5: Client Refactoring

### Step 5.1: API Client Service
- [ ] Create `client/src/services/api.ts`
- [ ] Implement `getCurrentEvent()` function
- [ ] Implement `submitAnswer()` function
- [ ] Implement `registerSession()` function
- [ ] Implement `getGameStatus()` function
- [ ] Add error handling and retries

### Step 5.2: Session Management
- [ ] Generate and store client UUID in localStorage
- [ ] Create device fingerprint (screen size, timezone, language)
- [ ] Register session on app mount
- [ ] Store session ID from server
- [ ] Include session ID in all API requests

### Step 5.3: Server Polling Hook
- [ ] Create `client/src/hooks/useServerPolling.ts`
- [ ] Implement polling with configurable intervals
- [ ] Handle polling state (idle vs active)
- [ ] Implement exponential backoff on errors
- [ ] Manage display state from server responses
- [ ] Implement answer submission function

### Step 5.4: Update App Component
- [ ] Replace `useEventEngine` with `useServerPolling`
- [ ] Update event rendering to handle server responses
- [ ] Remove local EventEngine imports
- [ ] Test end-to-end flow

### Step 5.5: Vite Proxy Configuration
- [ ] Update `vite.config.ts` to proxy `/api` to server
- [ ] Configure for development environment
- [ ] Add environment variable for API URL

---

## Phase 6: Enhanced Event Types

### Step 6.1: Multiple Choice Support
- [ ] Update event types to include `showMultipleChoice`
- [ ] Add `options` field to event configuration
- [ ] Create `client/src/components/MultipleChoiceDisplay.tsx`
- [ ] Update server to handle multiple choice answers
- [ ] Update API response format for multiple choice
- [ ] Add conditional triggers based on selected option

### Step 6.2: Custom Component System
- [ ] Add `showCustomComponent` event type
- [ ] Create `client/src/components/CustomComponentRenderer.tsx`
- [ ] Implement lazy loading for custom components
- [ ] Create component registry/map
- [ ] Define custom component contract interface
- [ ] Add completion/failure callbacks

### Step 6.3: Build Example Custom Components
- [ ] Create 2-3 simple custom components as examples
- [ ] Ensure each implements the component contract
- [ ] Test component loading and lifecycle
- [ ] Add error boundaries for component failures

### Step 6.4: Update Event Scheduler
- [ ] Handle multiple choice event scheduling
- [ ] Handle custom component event scheduling
- [ ] Support component-specific triggers (onComplete, onFail)
- [ ] Update validation for new event types

---

## Phase 7: Testing & Polish

### Step 7.1: Server Testing
- [ ] Test event scheduling with real timestamps
- [ ] Test concurrent client polling
- [ ] Test answer recording with multiple sessions
- [ ] Test duplicate answer detection
- [ ] Test game reset functionality
- [ ] Load test with 20+ simulated clients

### Step 7.2: Client Testing
- [ ] Test polling with network delays
- [ ] Test offline/error recovery
- [ ] Test session persistence across page refreshes
- [ ] Test on multiple devices simultaneously
- [ ] Test all event types (text, question, multiple choice, custom)

### Step 7.3: Integration Testing
- [ ] Test full game flow from start to finish
- [ ] Test conditional event triggers
- [ ] Test answer-based branching
- [ ] Verify timing accuracy across clients
- [ ] Test mobile responsiveness

### Step 7.4: Error Handling
- [ ] Add comprehensive error logging
- [ ] Display user-friendly error messages
- [ ] Handle server downtime gracefully
- [ ] Handle invalid event configurations
- [ ] Add validation for all API inputs

---

## Phase 8: Deployment Preparation

### Step 8.1: Environment Configuration
- [ ] Create `.env.example` for server
- [ ] Document all environment variables
- [ ] Set up production vs development configs
- [ ] Configure database path for production

### Step 8.2: Build Scripts
- [ ] Add `npm run dev` for concurrent client/server dev
- [ ] Add `npm run build` for production builds
- [ ] Add `npm run start` for production server
- [ ] Add database migration/initialization script

### Step 8.3: Documentation
- [ ] Create setup instructions in README
- [ ] Document API endpoints
- [ ] Document event configuration format
- [ ] Document custom component development
- [ ] Add troubleshooting guide

### Step 8.4: Data Management
- [ ] Implement data export functionality
- [ ] Add data cleanup/reset tools
- [ ] Document privacy considerations
- [ ] Add data retention policy

---

## Phase 9: Advanced Features (Optional)

### Step 9.1: Admin Dashboard
- [ ] Create admin UI for monitoring
- [ ] Show connected sessions in real-time
- [ ] Display answer statistics
- [ ] Add manual game controls

### Step 9.2: Conditional Branching
- [ ] Implement majority-based event triggers
- [ ] Add time-based answer evaluation
- [ ] Support complex conditional logic

### Step 9.3: Audio/Visual Effects
- [ ] Add sound effect system
- [ ] Sync background music across clients
- [ ] Add visual effect components

---

## Notes

### Key Principles
- Server maintains complete control over timing and flow
- Clients are stateless, only display what server sends
- All timing logic is server-side using absolute timestamps
- Polling interval adjusts based on activity level
- Database tracks all participation for analytics

### Timestamp Approach
Events use absolute timestamps (ISO 8601 or Unix time):
```json
{
  "triggerAt": "2025-10-31T19:00:00Z"  // or Unix: 1730394000000
}
```

Server converts these to scheduled timeouts on game start. Clients never receive timing information - they only poll for current state.

### Session Tracking
Sessions identified by combination of:
- Client-generated UUID (localStorage)
- IP address
- User-Agent string
- Optional device fingerprint

This allows tracking without requiring login/auth while handling most common scenarios (page refresh, network change, etc.).

---

**Total Estimated Steps:** ~100
**Estimated Timeline:** 12-18 hours
**Priority Phases:** 1-7 (core functionality)
**Optional Phases:** 8-9 (polish and advanced features)
