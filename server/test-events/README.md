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
