const { games, getGame, updateGameState } = require('../store/game.store');
const { getPlayerSession, removePlayerSession } = require('../store/player.store');

function removePlayer(socket, io) {
  return async ({ gameId, playerId }) => {
    try {
      const game = getGame(gameId);
      if (!game) {
        console.log(`❌ Game not found: ${gameId}`);
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      const currentPlayer = getPlayerSession(socket.id);
      if (!currentPlayer?.isHost) {
        console.log(`❌ Non-host player trying to remove player: ${socket.id}`);
        socket.emit('error', { message: 'Only the host can remove players' });
        return;
      }

      const targetPlayer = getPlayerSession(playerId);
      if (!targetPlayer) {
        console.log(`❌ Target player not found: ${playerId}`);
        socket.emit('error', { message: 'Target player not found' });
        return;
      }

      // Don't allow removing host
      if (targetPlayer.isHost) {
        console.log(`❌ Cannot remove host player: ${playerId}`);
        socket.emit('error', { message: 'Cannot remove the host player' });
        return;
      }

      // Remove player from game state
      const updatedPlayers = game.players.filter(player => player.id !== playerId);
      const updatedGame = updateGameState(gameId, { players: updatedPlayers });

      // Remove player from session tracking
      removePlayerSession(playerId);

      // Notify the removed player
      const targetSocket = io.sockets.sockets.get(playerId);
      if (targetSocket) {
        targetSocket.leave(gameId);
        targetSocket.emit('playerRemoved', { message: 'You have been removed from the game by the host' });
      }

      // Broadcast updated game state to remaining players
      io.to(gameId).emit('gameStateUpdate', updatedGame);

      console.log(`🚫 Player removed from game: ${playerId}`);
    } catch (error) {
      console.error('❌ Error in removePlayer:', error);
      socket.emit('error', { message: 'Failed to remove player' });
    }
  };
}

module.exports = removePlayer;
