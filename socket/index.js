const { Server } = require('socket.io');
const gameEvents = require('./events/game.events');
const chatEvents = require('./events/chat.events');
const roomEvents = require('./events/room.events');
const logger = require('../config/logger');
const { getGame, updateGameState } = require('./store/game.store');

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Start the activity checking system and import player store functionality
  const { startActivityChecking, playerSessions, updatePlayerActivity } = require('./store/player.store');
  startActivityChecking(io);

  io.on("connection", (socket) => {
    logger.info(`User connected`, { socketId: socket.id });
    console.log(`🔌 User connected: ${socket.id}`);

    // Register game events
    const registerHandler = (eventName, handler) => {
      socket.on(eventName, (data, callback) => handler(socket, io)(data, callback));
    };

    registerHandler("createGame", gameEvents.createGame);
    registerHandler("joinGame", gameEvents.joinGame);
    registerHandler("startGame", gameEvents.startGame);
    registerHandler("submitWords", gameEvents.submitWords);
    registerHandler("timerEnd", gameEvents.handleTimerEnd);
    registerHandler("voteOnName", gameEvents.handleVoteOnName);
    registerHandler("selectLetter", gameEvents.selectLetter);
    registerHandler("transferHostTitle", gameEvents.transferHostTitle);
    registerHandler("removePlayer", gameEvents.removePlayer);
    registerHandler("interruptVoting", gameEvents.interruptVoting);
    registerHandler("rejoinGame", gameEvents.rejoinGame);
    registerHandler("getGameState", gameEvents.getGameState);
    registerHandler("restartGame", gameEvents.restartGame);

    // Register chat and room events
    socket.on("chatMessage", chatEvents.handleChatMessage(socket, io));
    socket.on("joinRoom", roomEvents.handleJoinRoom(socket, io));
    socket.on("leaveRoom", roomEvents.handleLeaveRoom(socket, io));

    // Update activity on any game event
    const updateActivity = () => {
      for (const [playerId, session] of playerSessions.entries()) {
        if (session.socketId === socket.id) {
          updatePlayerActivity(playerId);
          break;
        }
      }
    };

    // Register activity tracking for all game events
    socket.use((packet, next) => {
      updateActivity();
      next();
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      logger.info(`User disconnected`, { socketId: socket.id });
      console.log(`🔌 User disconnected: ${socket.id}`);
      
      // Find and update the disconnected player's session
      for (const [playerId, session] of playerSessions.entries()) {
        if (session.socketId === socket.id) {
          session.isActive = false;
          session.lastSeen = Date.now();

          // Update player status in game state
          const gameState = getGame(session.gameId);
          if (gameState && gameState.players) {
            const player = gameState.players.find(p => p.id === session.playerId);
            if (player) {
              player.status = 'disconnected';
              await updateGameState(session.gameId, gameState);
              socket.to(session.gameId).emit('gameStateUpdate', gameState);
              logger.info(`Updated player ${player.name} status to disconnected in game ${session.gameId}`);
            }
          }

          // Notify others in the game about the player's status
          io.to(session.gameId).emit('playerStatusUpdate', {
            playerId: session.playerId,
            isActive: false,
            status: 'disconnected'
          });
          break;
        }
      }
    });
  });

  return io;
};

module.exports = initializeSocket;