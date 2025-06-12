const { games } = require('../store/game.store');

const joinGame = (socket, io) => {
  return async ({ gameId, playerName }, callback) => {
    console.log("👤 Joining game:", { gameId, playerName });
    const game = games[gameId];
    
    if (game) {
      const newPlayer = {
        id: socket.id,
        name: playerName,
        score: 0,
        isHost: false,
        isReady: true,
      };
      game.players.push(newPlayer);
      socket.join(gameId);
      console.log("✅ Player joined successfully:", newPlayer);
      io.to(gameId).emit("gameStateUpdate", game);
      callback({ success: true });
    } else {
      console.error("❌ Game not found:", gameId);
      callback({ success: false, message: "Game not found" });
    }
  };
};

module.exports = joinGame;