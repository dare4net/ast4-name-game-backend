const { MongoClient } = require('mongodb');
const { restoreGameState, saveGameStateToRedis, deleteGameStateFromRedis } = require('../../services/gameStateService');

// Game expiry constants
const GAME_EXPIRY = 4 * 60 * 60; // 4 hours in seconds
const CLEANUP_INTERVAL = 30 * 60 * 1000; // 30 minutes in milliseconds

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

const createGameState = async (gameId, hostPlayer) => {
  const timestamp = Date.now();
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
    lastUpdate: timestamp
  };
  
  // Save to Redis with expiry
  try {
    await saveGameStateToRedis(gameId, games[gameId]);
  } catch (err) {
    console.error('Failed to save initial game state to Redis:', err);
  }
  
  return games[gameId];
};

const updateGameState = async (gameId, updates) => {
  if (games[gameId]) {
    console.log(`Updating game state for ${gameId} with updates:`);
    const timestamp = Date.now();
    games[gameId] = { 
      ...games[gameId], 
      ...updates,
      lastUpdate: timestamp 
    };

    // Save updated state to Redis
    try {
      await saveGameStateToRedis(gameId, games[gameId]);
    } catch (err) {
      console.error('Failed to update game state in Redis:', err);
    }

    return games[gameId];
  }
  return null;
};

const deleteGame = async (gameId) => {
  if (games[gameId]) {
    delete games[gameId];
    // Remove from Redis
    try {
      await deleteGameStateFromRedis(gameId);
    } catch (err) {
      console.error('Failed to delete game state from Redis:', err);
    }
    return true;
  }
  return false;
};

// Function to clean up inactive games
const cleanupInactiveGames = async () => {
  console.log('🧹 Running game cleanup...');
  const now = Date.now();
  const fourHours = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
  
  for (const [gameId, game] of Object.entries(games)) {
    if (now - game.lastUpdate > fourHours) {
      console.log(`🗑️ Removing inactive game ${gameId} (last update: ${new Date(game.lastUpdate).toISOString()})`);
      await deleteGame(gameId);
    }
  }
};

// Set up periodic cleanup
setInterval(cleanupInactiveGames, CLEANUP_INTERVAL);
console.log(`✅ Game cleanup scheduled every ${CLEANUP_INTERVAL/60000} minutes`);

module.exports = {
  games,
  getGame,
  createGameState,
  updateGameState,
  deleteGame,
}; 