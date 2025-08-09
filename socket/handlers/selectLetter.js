const { games } = require('../store/game.store');
const submissionQueue = require('../../utils/submission-queue');
const { saveGameStateToRedis } = require('../../services/gameStateService');

const selectLetter = (socket, io) => {
  return async ({ gameId, letter }, callback) => {
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
      
            // Clear per-round submission data for the new round
      //submissionQueue.clearRound(gameId);

      // Set the current letter in the submission queue
      submissionQueue.setCurrentLetter(gameId, letter);

      // Save updated state to Redis
      //await saveGameStateToRedis(gameId, game);
       //saveGameStateToRedis(gameId, game);
      console.log("✅ Game state updated in Redis (selectLetter)");

      console.log("✅ Letter selected successfully:", game.id);

      io.to(gameId).emit("timerUpdate", 45);
      io.to(gameId).emit("gameStateUpdate", game);
      if (callback) callback({ success: true });
    } else {
      console.error("❌ Game not found for selectLetter:", gameId);
      if (callback) callback({ success: false, message: "Game not found." });
    }
  };
};

module.exports = selectLetter;
