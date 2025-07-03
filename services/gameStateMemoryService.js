const { games, createGameState, updateGameState, getGame, deleteGame } = require('../socket/store/game.store');

async function saveInitialGameStateToMemory(gameId, gameState) {
  createGameState(gameId, gameState.players[0]); // assumes host is first
  updateGameState(gameId, { ...gameState, createdAt: new Date(), status: 'in_progress' });
}

async function saveGameStateToMemory(gameId, gameState) {
  updateGameState(gameId, gameState);
}

async function getGameStateFromMemory(gameId) {
  return getGame(gameId) || null;
}

async function saveFinalGameStateToMemory(gameId, finalState) {
  updateGameState(gameId, { ...finalState, status: 'completed', endedAt: new Date() });
}

async function deleteGameStateFromMemory(gameId) {
  deleteGame(gameId);
}

module.exports = {
  saveInitialGameStateToMemory,
  saveGameStateToMemory,
  getGameStateFromMemory,
  saveFinalGameStateToMemory,
  deleteGameStateFromMemory,
  games,
};
