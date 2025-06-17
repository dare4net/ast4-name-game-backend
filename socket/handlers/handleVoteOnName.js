const { games } = require('../store/game.store');
let totalVotes = 0;
const completeValidation = require('./completeValidation');

const handleVoteOnName = (socket, io) => {
  return ({ gameId, word, playerId, vote, votedPlayer }) => {
    console.log("📤 Vote received:", { gameId, word, playerId, vote, votedPlayer });
    const game = games[gameId];
    
    if (!game) {
      console.error("❌ Game not found for voteOnName:", gameId);
      return;
    }

    const nameValidation = game.nameValidations.find(p => p.playerId === votedPlayer);
    if (nameValidation) {
      nameValidation.votes[playerId] = vote;
      console.log("✅ Vote recorded:", nameValidation.word, "by player:", playerId, "vote:", vote);
      io.to(gameId).emit("gameStateUpdate", game);
    } else {
      console.warn("⚠️ Name not found for validation:", word);
    }

    totalVotes++;
    if (totalVotes === game.voteLength) {
      completeValidation(game, io);
      totalVotes = 0;
    }
  };
};

module.exports = handleVoteOnName;
