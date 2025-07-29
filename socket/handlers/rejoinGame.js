const { games } = require('../store/game.store');
const { trackPlayerSession } = require('../store/player.store');
const { restoreGameState } = require('../../services/gameStateService');

/**
 * Handler for rejoining a game after socket reconnect.
 * @param {Socket} socket
 * @param {Server} io
 */
function rejoinGame(socket, io) {
  return async ({ gameId, playerId }, callback) => {
    try {
      let game = games[gameId];
      
      // If game not in memory, try to restore it
      if (!game) {
        const restoredState = await restoreGameState(gameId);
        if (restoredState) {
          // Restore the game to memory
          games[gameId] = restoredState;
          game = restoredState;
          console.log(`🔄 Restored game ${gameId} from persistent storage`);
        } else {
          if (callback) callback({ success: false, message: 'Game not found in storage' });
          return;
        }
      }
      // Find the player by persistent playerId
      const player = game.players.find(p => p.id === playerId);
      if (!player) {
        if (callback) callback({ success: false, message: 'Player not found in game' });
        return;
      }
      // Update the player's socket id to the new socket
      player.socketId = socket.id;
      // Optionally, update session tracking
      trackPlayerSession(playerId, {
        gameId,
        playerName: player.name,
        isHost: player.isHost
      });
      // Join the socket room
      socket.join(gameId);
      // Respond to the client
      if (callback) callback({ success: true, player, gameState: game });
      // Optionally, emit updated game state to all
      io.to(gameId).emit('gameStateUpdate', game);
    } catch (error) {
      if (callback) callback({ success: false, message: 'Error rejoining game' });
    }
  };
}

module.exports = rejoinGame;
