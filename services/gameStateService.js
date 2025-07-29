require('dotenv').config();

// Game State Service: Handles storing and retrieving game state in MongoDB and Redis
const { MongoClient } = require('mongodb');
const { Redis } = require('@upstash/redis');

// You may want to load these from your config/env
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'ast_words_library';
const MONGODB_GAME_COLLECTION = process.env.MONGODB_GAME_COLLECTION || 'games';
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const mongoClient = new MongoClient(MONGODB_URI);
const redis = new Redis({
  url: REDIS_URL,
  token: REDIS_TOKEN
});

async function saveInitialGameStateToMongo(gameId, gameState) {
  console.log(`[MongoDB] saveInitialGameStateToMongo: gameId=${gameId}`);
  try {
    await mongoClient.connect();
    const db = mongoClient.db(MONGODB_DB);
    const games = db.collection(MONGODB_GAME_COLLECTION);
    await games.insertOne({
      _id: gameId,
      createdAt: new Date(),
      initialState: gameState,
      status: 'in_progress'
    });
  } catch (err) {
    console.error(`[MongoDB][ERROR] saveInitialGameStateToMongo: gameId=${gameId}`, err);
    //throw err;
  }
}

async function saveGameStateToRedis(gameId, gameState) {
  console.log(`[Redis] saveGameStateToRedis: gameId=${gameId}`);
  try {
    // Create a deep copy of the game state
    const stateCopy = JSON.parse(JSON.stringify(gameState, (key, value) => {
      // Convert Sets to arrays before stringifying
      if (value instanceof Set) {
        return Array.from(value);
      }
      return value;
    }));

    await redis.set(`game:${gameId}:state`, JSON.stringify(stateCopy));
  } catch (err) {
    console.error(`[Redis][ERROR] saveGameStateToRedis: gameId=${gameId}`, err);
    //throw err;
  }
}

async function getGameStateFromRedis(gameId) {
  console.log(`[Redis] getGameStateFromRedis: gameId=${gameId}`);
  try {
    const state = await redis.get(`game:${gameId}:state`);
    console.log(`[Redis] Retrieved game state for ${gameId}:`, state);
    
    // If state is already an object, return it directly
    if (state && typeof state === 'object') {
      return state;
    }
    // If state is a JSON string, parse it
    return state ? JSON.parse(state) : null;
  } catch (err) {
    console.error(`[Redis][ERROR] getGameStateFromRedis: gameId=${gameId}`, err);
    return null;
  }
}

async function saveFinalGameStateToMongo(gameId, finalState) {
  console.log(`[MongoDB] saveFinalGameStateToMongo: gameId=${gameId}`);
  try {
    await mongoClient.connect();
    const db = mongoClient.db(MONGODB_DB);
    const games = db.collection(MONGODB_GAME_COLLECTION);
    await games.updateOne(
      { _id: gameId },
      { $set: { finalState, status: 'completed', endedAt: new Date() } }
    );
  } catch (err) {
    console.error(`[MongoDB][ERROR] saveFinalGameStateToMongo: gameId=${gameId}`, err);
    //throw err;
  }
}

async function deleteGameStateFromRedis(gameId) {
  console.log(`[Redis] deleteGameStateFromRedis: gameId=${gameId}`);
  try {
    await redis.del(`game:${gameId}:state`);
  } catch (err) {
    console.error(`[Redis][ERROR] deleteGameStateFromRedis: gameId=${gameId}`, err);
    //throw err;
  }
}

async function restoreGameState(gameId) {
  // First try to get from Redis
  let gameState = await getGameStateFromRedis(gameId);
  
  // If not in Redis, try to get from MongoDB
  if (!gameState) {
    try {
      await mongoClient.connect();
      const db = mongoClient.db(MONGODB_DB);
      const games = db.collection(MONGODB_GAME_COLLECTION);
      const game = await games.findOne({ _id: gameId, status: 'in_progress' });
      
      if (game) {
        gameState = game.initialState;
        // Cache it back in Redis
        await saveGameStateToRedis(gameId, gameState);
      }
    } catch (err) {
      console.error(`[MongoDB][ERROR] restoreGameState: gameId=${gameId}`, err);
    }
  }

  // Restore Set objects after retrieving from storage
  if (gameState && gameState.players) {
    gameState.players.forEach(player => {
      if (player.stats) {
        // Convert allSubmittedWords back to a Set
        if (player.stats.allSubmittedWords) {
          // If it's an array or object, convert to Set
          if (Array.isArray(player.stats.allSubmittedWords)) {
            player.stats.allSubmittedWords = new Set(player.stats.allSubmittedWords);
          } else if (typeof player.stats.allSubmittedWords === 'object') {
            // If it's an object (from JSON), convert its keys to a Set
            player.stats.allSubmittedWords = new Set(Object.keys(player.stats.allSubmittedWords));
          } else {
            // Initialize new Set if invalid data
            player.stats.allSubmittedWords = new Set();
          }
        } else {
          // Initialize if doesn't exist
          player.stats.allSubmittedWords = new Set();
        }
      } else {
        // Initialize stats if doesn't exist
        player.stats = {
          uniqueWords: 0,
          perfectRounds: 0,
          allSubmittedWords: new Set()
        };
      }
    });
  }
  
  return gameState;
}

module.exports = {
  saveInitialGameStateToMongo,
  saveGameStateToRedis,
  getGameStateFromRedis,
  saveFinalGameStateToMongo,
  deleteGameStateFromRedis,
  restoreGameState
};
