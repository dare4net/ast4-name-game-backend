const { games } = require('../store/game.store');

const startGame = (socket, io) => {
  return async ({ gameId, playerId }, callback) => {
    console.log("🎮 Starting game:", gameId);
    const game = games[gameId];
    
    if (!game) {
      console.error("❌ Game not found for start game:", gameId);
      if (callback) callback({ success: false, message: "Game not found" });
      return;
    }

    const hostPlayer = game.players.find(player => player.isHost);
    if (!hostPlayer || hostPlayer.id !== playerId) {
      console.error("❌ Unauthorized startGame event. Only the host can start the game:", socket.id);
      if (callback) callback({ success: false, message: "Only the host can start the game." });
      return;
    }
    
    game.players.forEach(player => {
      player.isReady = true; // Ensure all players are marked as ready
      player.hasSubmitted = false; // Reset submission status for the new game
    });
    game.phase = "letter-selection";
    console.log("✅ Game started successfully:", game.id);
    io.to(gameId).emit("gameStateUpdate", game);
    if (callback) callback({ success: true });
  };
};

module.exports = startGame;
