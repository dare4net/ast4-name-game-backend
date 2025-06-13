const { games } = require('../store/game.store');
const ConnectionManager = require('../managers/connection.manager');
const { trackPlayerSession } = require('../store/player.store');

const joinGame = (socket, io) => {
  return async ({ gameId, playerName }, callback) => {
    console.log("👤 Joining game:", { gameId, playerName });
    
    try {
      // First check connection status and handle reconnection
      const connectionResult = await ConnectionManager.handleConnection(socket, io, gameId, playerName);
      if (!connectionResult.success) {
        callback(connectionResult);
        return;
      }

      // If it's a reconnection, we're done
      if (connectionResult.isReconnection) {
        callback(connectionResult);
        return;
      }

      // If we get here, it's a new player joining
      const game = games[gameId];
      const newPlayer = {
        id: socket.id,
        name: playerName,
        score: 0,
        isHost: false,
        isReady: true,
      };

      // Add player to game
      game.players.push(newPlayer);
      socket.join(gameId);

      // Track the session
      trackPlayerSession(socket.id, {
        gameId,
        playerName,
        isHost: false
      });

      console.log("✅ Player joined successfully:", newPlayer);
      io.to(gameId).emit("gameStateUpdate", game);
      callback({ 
        success: true,
        player: newPlayer,
        gameState: game
      });
    } catch (error) {
      console.error("❌ Error joining game:", error);
      callback({ success: false, message: "Error joining game" });
    }
  };
};

module.exports = joinGame;