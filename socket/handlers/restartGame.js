const { games } = require('../store/game.store');
const { saveGameStateToRedis } = require('../../services/gameStateService');

const restartGame = (socket, io) => {
  return async ({ gameId }, callback) => {
    try {
      console.log("🔄 Restarting game:", gameId);
      const game = await games[gameId];
      
      if (!game) {
        console.error("❌ Game not found for restart:", gameId);
        if (callback) callback({ success: false, message: "Game not found" });
        return;
      }

      // Check if the requesting player is the host
      const requestingPlayer = game.players.find(player => player.socketId === socket.id);
      if (!requestingPlayer || !requestingPlayer.isHost) {
        console.error("❌ Unauthorized restart attempt. Only the host can restart the game:", socket.id);
        if (callback) callback({ success: false, message: "Only the host can restart the game" });
        return;
      }

      // Store current players
      const currentPlayers = game.players.map(player => ({
        ...player,
        isReady: true,
        hasSubmitted: false,
        score: 0,
        stats: {
          fastestSubmissions: 0,
          fastestSubmission: null,
          rareWords: [],
          longestWord: { word: '', length: 0 },
          perfectRounds: 0,
          submissionTimes: [],
          allSubmittedWords: new Set(),
          letterMastered: [],
          categoriesMastered: [...game.selectedCategories].map( cat => cat.id ),
          kingBonus: 0 // Track king bonus separately
        }
      }));

      // Reset game state to initial state while keeping players
      const resetState = {
        id: gameId,
        categories: game.categories,
        selectedCategories: game.selectedCategories,
        players: currentPlayers,
        phase: "lobby",
        usedLetters: [],
        currentRound: 0,
        roundResults: [],
        submissions: {},
        voteLength: 0,
        nextTurn: currentPlayers[0], // Set first player as next turn
        lastUpdate: Date.now(),
        
      };

      // Save reset state to Redis
      try {
        await saveGameStateToRedis(gameId, resetState);
        games[gameId] = resetState;
        console.log("✅ Game state reset in Redis");
      } catch (err) {
        console.error("❌ Failed to reset game state in Redis:", err);
        if (callback) callback({ success: false, message: "Failed to save reset state" });
        return;
      }

      // Emit the reset state to all players in the room
      io.to(gameId).emit("gameStateUpdate", resetState);
      if (callback) callback({ success: true });

      console.log("✅ Game restarted successfully:", gameId);
    } catch (error) {
      console.error("❌ Error in restartGame:", error);
      if (callback) callback({ success: false, message: "Internal server error" });
    }
  };
};

module.exports = restartGame;
