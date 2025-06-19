const { games } = require('../store/game.store');
const { getPlayerSession } = require('../store/player.store');
const completeValidation = require('./completeValidation');

function interruptVoting(socket, io) {
  return ({ gameId, playerId }) => {
    try {
      const game = games[gameId];
      if (!game) {
        console.log(`❌ Game not found: ${gameId}`);
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      const currentPlayer = getPlayerSession(playerId || socket.id);
      if (!currentPlayer?.isHost) {
        console.log(`❌ Non-host player trying to interrupt voting: ${socket.id}`);
        socket.emit('error', { message: 'Only the host can interrupt voting' });
        return;
      }

      if (game.phase !== 'validation') {
        console.log(`❌ Cannot interrupt voting outside validation phase: ${game.phase}`);
        socket.emit('error', { message: 'Can only interrupt during validation phase' });
        return;
      }

      console.log(`🚫 Host interrupted voting in game: ${gameId}`);
      
      // Process any unvoted names as "invalid"
      game.nameValidations.forEach(validation => {
        const totalVotes = Object.keys(validation.votes).length;
        const expectedVotes = game.players.length - 1; // Exclude the player being voted on
        
        // Add "no" votes for any missing votes
        if (totalVotes < expectedVotes) {
          game.players.forEach(player => {
            if (player.id !== validation.playerId && !validation.votes[player.id]) {
              validation.votes[player.id] = "no";
            }
          });
        }
      });

      // Force validation completion
      completeValidation(game, io);
      
      // Notify players that voting was interrupted
      io.to(gameId).emit('votingInterrupted', { message: 'Voting was interrupted by the host' });

    } catch (error) {
      console.error('❌ Error in interruptVoting:', error);
      socket.emit('error', { message: 'Failed to interrupt voting' });
    }
  };
}

module.exports = interruptVoting;
