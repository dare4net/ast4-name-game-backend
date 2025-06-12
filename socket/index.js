const { Server } = require('socket.io');
const gameEvents = require('./events/game.events');

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on("connection", (socket) => {
    console.log(`🔌 User connected: ${socket.id}`);

    // Register game events
    socket.on("createGame", gameEvents.createGame(socket, io));
    socket.on("joinGame", gameEvents.joinGame(socket, io));
    socket.on("startGame", gameEvents.startGame(socket, io));
    socket.on("submitWords", gameEvents.submitWords(socket, io));
    socket.on("timerEnd", gameEvents.handleTimerEnd(socket, io));
    socket.on("voteOnName", gameEvents.handleVoteOnName(socket, io));
    socket.on("selectLetter", gameEvents.selectLetter(socket, io));

    socket.on("disconnect", () => {
      console.log(`🔌 User disconnected: ${socket.id}`);
      // TODO: Handle player disconnection
    });
  });

  return io;
};

module.exports = initializeSocket; 