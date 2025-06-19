const { games } = require('../store/game.store');
const ConnectionManager = require('../managers/connection.manager');
const { trackPlayerSession } = require('../store/player.store');

// Define critical phases where joining is not allowed
const RESTRICTED_PHASES = ['playing', 'validation', 'letter-selection'];

const joinGame = (socket, io) => {
  return async ({ gameId, playerName, player }, callback) => {
    console.log("👤 Joining game:", { gameId, playerName });
    
    try {
      // First check if game exists
      const game = games[gameId];
      if (!game) {
        callback({ success: false, message: "Game not found" });
        return;
      }

      // Check if game is in a restricted phase
      if (RESTRICTED_PHASES.includes(game.phase)) {
        callback({ 
          success: false, 
          message: `Cannot join game during ${game.phase} phase. Please wait for the current round to end.`
        });
        return;
      }

      // Check connection status and handle reconnection
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

      // Check if game is full
      if (game.players.length >= (game.settings?.maxPlayers || 8)) {
        callback({ success: false, message: "Game is full" });
        return;
      }

      // Check if player with this id already exists (persistent id)
      const existingPlayer = game.players.find(p => p.id === player.id);
      if (existingPlayer) {
        // Treat as reconnection: update socket, rename if needed
        existingPlayer.socketId = socket.id;
        if (playerName && playerName !== existingPlayer.name) {
          existingPlayer.name = playerName;
        }
        trackPlayerSession(existingPlayer.id, {
          gameId,
          playerName: existingPlayer.name,

          isHost: existingPlayer.isHost,
          socketId: socket.id,
        });
        socket.join(gameId);
        io.to(gameId).emit("gameStateUpdate", game);
        callback({
          success: true,
          message: "Reconnected to game (id exists)",
          isReconnection: true,
          player: existingPlayer,
          gameState: game
        });
        return;
      }

      // If we get here, it's a new player joining
      const newPlayer = {
        ...player,
        isHost: false,
        isReady: true,
        status: "active",
        hasSubmitted: false,
        socketId: socket.id,
      };
      const playerId = newPlayer.id;
      // Add player to game
      game.players.push(newPlayer);
      socket.join(gameId);

      // Track the session
      trackPlayerSession(playerId, {
        gameId,
        playerName,
        playerId: newPlayer.id, // Use the player's persistent id
        isHost: false,
        socketId: socket.id
      });

      console.log("✅ Player joined successfully:", newPlayer);
      io.to(gameId).emit("gameStateUpdate", game);
      callback({ 
        success: true,
        player: newPlayer,
        gameState: game
      });
    } catch (error) {
      console.error("❌ Error joining game:", error, error.stack);
      callback({ success: false, message: "Error joining game" });
    }
  };
};

module.exports = joinGame;