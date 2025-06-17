const { Server } = require('socket.io');
const gameEvents = require('./events/game.events');
const chatEvents = require('./events/chat.events');
const roomEvents = require('./events/room.events');
const logger = require('../config/logger');

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on("connection", (socket) => {
    logger.info(`User connected`, { socketId: socket.id });
    console.log(`🔌 User connected: ${socket.id}`);

    // Register game events
    socket.on("createGame", gameEvents.createGame(socket, io));
    socket.on("joinGame", gameEvents.joinGame(socket, io));
    socket.on("startGame", gameEvents.startGame(socket, io));
    socket.on("submitWords", gameEvents.submitWords(socket, io));
    socket.on("timerEnd", gameEvents.handleTimerEnd(socket, io));
    socket.on("voteOnName", gameEvents.handleVoteOnName(socket, io));
    socket.on("selectLetter", gameEvents.selectLetter(socket, io));
    socket.on("transferHostTitle", gameEvents.transferHostTitle(socket, io));
    socket.on("removePlayer", gameEvents.removePlayer(socket, io));
    socket.on("interruptVoting", gameEvents.interruptVoting(socket, io));

    // Register chat and room events
    socket.on("chatMessage", chatEvents.handleChatMessage(socket, io));
    socket.on("joinRoom", roomEvents.handleJoinRoom(socket, io));
    socket.on("leaveRoom", roomEvents.handleLeaveRoom(socket, io));

    // Handle disconnection
    socket.on('disconnect', () => {
      logger.info(`User disconnected`, { socketId: socket.id });
      console.log(`🔌 User disconnected: ${socket.id}`);
      // TODO: Handle player disconnection
    });
  });

  return io;
};

module.exports = initializeSocket;