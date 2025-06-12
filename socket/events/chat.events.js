const { v4: uuidv4 } = require('uuid');
const { getGame } = require('../store/game.store');

const handleChatMessage = (socket, io) => {
  return ({ gameId, playerId, playerName, text }) => {
    console.log('💬 Received chat message:', { gameId, playerId, playerName, text });
    
    const game = getGame(gameId);
    if (!game) {
      console.log('❌ Game not found for chat message:', gameId);
      return;
    }

    // Make sure sender is in the room
    if (!socket.rooms.has(gameId)) {
      console.log('🔄 Auto-joining sender to room:', gameId);
      socket.join(gameId);
    }

    const messageData = {
      id: uuidv4(),
      playerId,
      playerName,
      text,
      timestamp: Date.now(),
    };    // Store message in game state if needed
    if (!game.messages) {
      game.messages = [];
    }
    game.messages.push(messageData);

    // Broadcast message to all players in the game (including sender)
    console.log('📢 Broadcasting message to room:', gameId);
    io.to(gameId).emit('chatMessage', messageData);
    console.log('✅ Chat message processed:', messageData);
  };
};

module.exports = {
  handleChatMessage,
};
