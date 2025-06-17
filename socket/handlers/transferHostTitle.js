const { games, getGame, updateGameState } = require('../store/game.store');
const { getPlayerSession, trackPlayerSession } = require('../store/player.store');

function transferHostTitle(socket, io) {
  return async ({ gameId, newHostId }) => {
    try {
      const game = getGame(gameId);
      if (!game) {
        console.log(`❌ Game not found: ${gameId}`);
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      const currentPlayer = getPlayerSession(socket.id);
      if (!currentPlayer?.isHost) {
        console.log(`❌ Non-host player trying to transfer host title: ${socket.id}`);
        socket.emit('error', { message: 'Only the host can transfer host title' });
        return;
      }

      const newHostPlayer = getPlayerSession(newHostId);
      if (!newHostPlayer) {
        console.log(`❌ Target player not found: ${newHostId}`);
        socket.emit('error', { message: 'Target player not found' });
        return;
      }

      // Update session tracking
      trackPlayerSession(socket.id, { ...currentPlayer, isHost: false });
      trackPlayerSession(newHostId, { ...newHostPlayer, isHost: true });

      // Update game state
      const updatedPlayers = game.players.map(player => {
        if (player.id === socket.id) {
          return { ...player, isHost: false };
        }
        if (player.id === newHostId) {
          return { ...player, isHost: true };
        }
        return player;
      });

      const updatedGame = updateGameState(gameId, { players: updatedPlayers });

      // Broadcast updated game state to all players
      io.to(gameId).emit('gameStateUpdate', updatedGame);
      io.to(gameId).emit('hostTransfer', { newHostId });

      console.log(`✨ Host title transferred from ${socket.id} to ${newHostId}`);
    } catch (error) {
      console.error('❌ Error in transferHostTitle:', error);
      socket.emit('error', { message: 'Failed to transfer host title' });
    }
  };
}

module.exports = transferHostTitle;
