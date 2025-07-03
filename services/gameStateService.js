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
    await redis.set(`game:${gameId}:state`, JSON.stringify(gameState));
  } catch (err) {
    console.error(`[Redis][ERROR] saveGameStateToRedis: gameId=${gameId}`, err);
    //throw err;
  }
}

async function getGameStateFromRedis(gameId) {
  console.log(`[Redis] getGameStateFromRedis: gameId=${gameId}`);
  try {
    const state = await redis.get(`game:${gameId}:state`);
    return state ? JSON.parse(state) : null;
  } catch (err) {
    console.error(`[Redis][ERROR] getGameStateFromRedis: gameId=${gameId}`, err);
    //throw err;
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

module.exports = {
  saveInitialGameStateToMongo,
  saveGameStateToRedis,
  getGameStateFromRedis,
  saveFinalGameStateToMongo,
  deleteGameStateFromRedis
};
