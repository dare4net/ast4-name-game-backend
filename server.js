const express = require('express');
const http = require('http');
const cors = require('cors');
const initializeSocket = require('./socket');
const { games } = require('./socket/store/game.store');
const logger = require('./config/logger');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  logger.info('Health check endpoint accessed');
  res.send('AST4 Name Game Backend is running!');
});

// Game state API endpoint
app.get('/api/games/:id', (req, res) => {
  const { id } = req.params;
  logger.debug('Fetching game state', { 
    requestedId: id,
    availableGames: Object.keys(games),
    gameExists: !!games[id]
  });
  
  const game = games[id];
  
  if (!game) {
    logger.warn('Game not found', { id });
    return res.status(404).json({ error: 'Game not found' });
  }

  // Return a sanitized version of the game state
  const sanitizedGame = {
    ...game,
    players: game.players.map(player => ({
      ...player,
      stats: player.stats || {
        uniqueWords: 0,
        perfectRounds: 0,
        fastestSubmission: null,
        longestWord: { word: '', length: 0 }
      }
    }))
  };

  res.json(sanitizedGame);
});

// Initialize Socket.io
const io = initializeSocket(server);

// Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});
