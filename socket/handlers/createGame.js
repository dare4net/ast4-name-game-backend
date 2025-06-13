const { games } = require('../store/game.store');
const { trackPlayerSession } = require('../store/player.store');

const createGame = (socket, io) => {
  return async ({ gameId, playerName, categories }, callback) => {
    console.log("🎮 Creating new game:", { gameId, playerName, categories });

    // Ensure we have a valid gameId
    if (!gameId) {
      console.error("❌ No gameId provided for game creation");
      if (callback) callback({ success: false, message: "No gameId provided" });
      return;
    }

    const hostPlayer = {
      id: socket.id,
      name: playerName,
      score: 0,
      isHost: true,
      isReady: true,
    };
    
    // Create game state with the provided gameId
    games[gameId] = {
      id: gameId,
      players: [hostPlayer],
      phase: "lobby", 
      categories: categories || [],
      selectedCategories: categories.filter(cat => cat.enabled),
      usedLetters: [],
      currentRound: 0,
      roundResults: [],
      submissions: {},
      voteLength: 0,
      nextTurn: hostPlayer,
    };

    trackPlayerSession(socket.id, {
        gameId,
        playerName,
        isHost: true
      });
    
    socket.join(gameId);
    console.log("✅ Game created successfully:", games[gameId]);
    if (typeof callback === "function") {
      callback({ success: true, gameId: gameId });
    }
    io.to(gameId).emit("gameStateUpdate", games[gameId]);
  };
};

module.exports = createGame;