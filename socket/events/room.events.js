const handleJoinRoom = (socket, io) => {
  return ({ gameId }) => {
    console.log('👋 Socket joining room:', { socketId: socket.id, gameId });
    socket.join(gameId);
  };
};

const handleLeaveRoom = (socket, io) => {
  return ({ gameId }) => {
    console.log('👋 Socket leaving room:', { socketId: socket.id, gameId });
    socket.leave(gameId);
  };
};

module.exports = {
  handleJoinRoom,
  handleLeaveRoom,
};
