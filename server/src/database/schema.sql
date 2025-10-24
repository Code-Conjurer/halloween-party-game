-- Sessions table: tracks unique users/devices
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  device_fingerprint TEXT,
  first_seen INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Answers table: stores user responses to events
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

-- Game state table: singleton for current game status
CREATE TABLE IF NOT EXISTS game_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  game_started INTEGER DEFAULT 0,
  game_start_time INTEGER,
  current_event_id TEXT,
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Session event cursors: tracks which event each user is currently on
CREATE TABLE IF NOT EXISTS session_event_cursors (
  session_id TEXT PRIMARY KEY,
  current_event_index INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_answers_session ON answers(session_id);
CREATE INDEX IF NOT EXISTS idx_answers_event ON answers(event_id);
CREATE INDEX IF NOT EXISTS idx_sessions_ip ON sessions(ip_address);
CREATE INDEX IF NOT EXISTS idx_sessions_first_seen ON sessions(first_seen);
