// In-memory storage for game states
const games = {};

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