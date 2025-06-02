# AST4 Name Game Backend

This is the backend for the AST4 Name Game, built with Express and Socket.IO.

## Features
- Real-time multiplayer functionality using Socket.IO.
- REST API endpoints for game management.

## Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   ```

2. Navigate to the project directory:
   ```bash
   cd ast4-name-game-backend
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Access the server at `http://localhost:3000`.

## Scripts
- `npm start`: Start the server in production mode.
- `npm run dev`: Start the server in development mode with hot-reloading.

## Folder Structure
- `server.js`: Main entry point for the backend.
- `routes/`: Folder for organizing API routes.
- `sockets/`: Folder for managing WebSocket events.

## Dependencies
- `express`: Web framework for Node.js.
- `socket.io`: Real-time bidirectional event-based communication.
- `nodemon`: Development tool for auto-restarting the server.

## License
This project is licensed under the MIT License.
