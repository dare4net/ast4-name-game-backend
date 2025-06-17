const logger = require('../../config/logger');

// WebRTC Signaling Events
module.exports = function setupWebRTCEvents(io, socket, gameStore) {
  // Handle WebRTC signaling
  socket.on('webrtc:offer', ({ to, offer }) => {
    logger.debug('WebRTC offer received', { from: socket.id, to });
    socket.to(to).emit('webrtc:offer', {
      from: socket.id,
      offer
    });
  });

  socket.on('webrtc:answer', ({ to, answer }) => {
    logger.debug('WebRTC answer received', { from: socket.id, to });
    socket.to(to).emit('webrtc:answer', {
      from: socket.id,
      answer
    });
  });

  socket.on('webrtc:ice-candidate', ({ to, candidate }) => {
    logger.debug('ICE candidate received', { from: socket.id, to });
    socket.to(to).emit('webrtc:ice-candidate', {
      from: socket.id,
      candidate
    });
  });

  // Handle WebRTC data messages as fallback
  socket.on('webrtc:data', ({ to, data }) => {
    // Forward the data to the target peer if specified
    if (to) {
      logger.debug('WebRTC data message forwarded', { 
        from: socket.id, 
        to,
        type: data.type 
      });
      socket.to(to).emit('webrtc:data', {
        from: socket.id,
        data
      });
    }

    // Handle game state updates if needed
    if (data.type === 'letter-selection' || data.type === 'name-vote') {
      const gameId = gameStore.getGameIdByPlayer(socket.id);
      if (gameId) {
        logger.info('Game state update via WebRTC', { 
          gameId,
          type: data.type,
          playerId: socket.id
        });
        const game = gameStore.getGame(gameId);
        if (game) {
          // Update game state based on message type
          switch (data.type) {
            case 'letter-selection':
              game.handleLetterSelection(socket.id, data.data);
              // Broadcast to all players in the game
              socket.to(gameId).emit('game:letter_selected', {
                playerId: socket.id,
                letter: data.data
              });
              break;

            case 'name-vote':
              game.handleNameVote(socket.id, data.data.word, data.data.vote);
              // Broadcast to all players in the game
              socket.to(gameId).emit('game:vote_submitted', {
                playerId: socket.id,
                word: data.data.word,
                vote: data.data.vote
              });
              break;
          }
        }
      }
    }
  });

  // Handle WebRTC connection state changes
  socket.on('webrtc:connection_state', ({ state, peerId }) => {
    // If WebRTC connection fails, we can notify the game to fall back to Socket.IO
    if (state === 'failed' || state === 'disconnected') {
      const gameId = gameStore.getGameIdByPlayer(socket.id);
      if (gameId) {
        const game = gameStore.getGame(gameId);
        if (game) {
          game.handlePeerDisconnection(socket.id, peerId);
        }
      }
    }
  });
};
