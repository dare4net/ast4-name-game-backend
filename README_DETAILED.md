# AST4 Name Game Backend Documentation

This document provides an overview of the backend codebase for the AST4 Name Game project. It is a Node.js application, likely using Express and Socket.IO for real-time multiplayer features.

## Project Structure

- `server.js`: Main server entry point. Sets up the HTTP server and WebSocket (Socket.IO) server.
- `routes/`: API route handlers for HTTP endpoints.
- `services/`: Backend services, e.g., `DictionaryService.js` for word validation.
- `socket/`: Real-time logic for multiplayer features.
  - `events.js`, `index.js`: Socket.IO setup and event handling.
  - `events/`, `handlers/`, `managers/`, `store/`: Organize socket event logic, handlers, managers, and state.
- `utils/`: Utility modules for dictionary, game logic, and submission queue.
- `config/`: Configuration files, e.g., logger.
- `__tests__/`: Jest test files for backend logic.
- `logs/`: Log files for server activity and errors.
- `coverage/`: Test coverage reports.

## Key Concepts

- **Game State Management**: The backend manages the state of games, players, and rounds, ensuring consistency and fairness.
- **Real-Time Communication**: Uses Socket.IO to handle real-time events (joining games, submitting answers, voting, etc.).
- **Dictionary Service**: Validates submitted names/words against a dictionary API or local data.
- **Logging**: Logs important events and errors for debugging and monitoring.
- **Testing**: Jest is used for unit and integration tests.

## Extending the Backend

- Add new API endpoints in `routes/`.
- Add or update services in `services/` for new features (e.g., new validation logic).
- Add new socket events or handlers in `socket/`.
- Add utility functions in `utils/` as needed.
- Update tests in `__tests__/` to cover new features.

## Running the Backend

1. Install dependencies: `pnpm install`
2. Start the server: `pnpm start` or `node server.js`
3. Run tests: `pnpm test`

---

For more details, see the inline comments in each file or ask for a specific file explanation.
