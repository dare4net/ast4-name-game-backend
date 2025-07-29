const { MongoClient } = require('mongodb');
const { restoreGameState } = require('../../services/gameStateService');

// In-memory storage for game states
const games = {};

// Initialize in-memory games from persistent storage
async function initializeGamesFromStorage() {
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db(process.env.MONGODB_DB || 'ast_words_library');
    const gamesCollection = db.collection(process.env.MONGODB_GAME_COLLECTION || 'games');
    
    // Find all in-progress games
    const inProgressGames = await gamesCollection.find({ status: 'in_progress' }).toArray();
    
    for (const gameDoc of inProgressGames) {
      const gameState = await restoreGameState(gameDoc._id);
      if (gameState) {
        games[gameDoc._id] = gameState;
        console.log(`🔄 Restored game ${gameDoc._id} during initialization`);
      }
    }
    
    await client.close();
  } catch (err) {
    console.error('Failed to initialize games from storage:', err);
  }
}

// Call this when server starts
initializeGamesFromStorage();

const getGame = (gameId) => games[gameId];

const createGameState = (gameId, hostPlayer) => {
  games[gameId] = {
    id: gameId,
    players: [hostPlayer],
    phase: "lobby",
    categories: [],
    usedLetters: [],
    currentRound: 0,
    roundResults: [],
    submissions: {},
    voteLength: 0,
    nextTurn: hostPlayer,
  };
  return games[gameId];
};

const updateGameState = (gameId, updates) => {
  if (games[gameId]) {
    console.log(`Updating game state for ${gameId} with updates:`);
    games[gameId] = { ...games[gameId], ...updates };
    return games[gameId];
  }
  return null;
};

const deleteGame = (gameId) => {
  if (games[gameId]) {
    delete games[gameId];
    return true;
  }
  return false;
};

module.exports = {
  games,
  getGame,
  createGameState,
  updateGameState,
  deleteGame,
}; 