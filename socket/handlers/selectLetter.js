const { games } = require('../store/game.store');
const submissionQueue = require('../../utils/submission-queue');

const selectLetter = (socket, io) => {
  return ({ gameId, letter }, callback) => {
    console.log("🎯 Letter selected:", { gameId, letter });
    const game = games[gameId];
    
    if (game) {
      if (game.usedLetters.includes(letter)) {
        console.warn("⚠️ Letter already used:", letter);
        if (callback) callback({ success: false, message: "Letter already used." });
        return;
      }
      game.players.forEach(player => {
      player.isReady = true; // Ensure all players are marked as ready
      player.hasSubmitted = false; // Reset submission status for the new game
    });
      game.usedLetters.push(letter);
      game.currentLetter = letter;
      game.phase = "playing";
      game.roundStartTime = Date.now(); // Add round start timestamp
      
      // Set the current letter in the submission queue
      submissionQueue.setCurrentLetter(gameId, letter);

      console.log("✅ Letter selected successfully:", game.id);

      io.to(gameId).emit("timerUpdate", 30);
      io.to(gameId).emit("gameStateUpdate", game);
      if (callback) callback({ success: true });
    } else {
      console.error("❌ Game not found for selectLetter:", gameId);
      if (callback) callback({ success: false, message: "Game not found." });
    }
  };
};

module.exports = selectLetter;
