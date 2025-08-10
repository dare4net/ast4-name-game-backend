const { games } = require('../store/game.store');
const { incrementRoute } = require('../../utils/analytic');

const getGameState = (socket, io) => {
  return async ({ gameId }, callback) => {
    try {
      console.log("🎮 Fetching game state for:", gameId);
      await incrementRoute('getGameState');
      
      const game = await games[gameId];
      
      if (!game) {
        console.warn("❌ Game not found:", gameId);
        if (callback) callback({ 
          success: false, 
          message: "Game not found" 
        });
        return;
      }

      // Sanitize game state before sending
      const sanitizedGame = {
        ...game,
        players: game.players.map(player => ({
          ...player,
          stats: player.stats || {
            uniqueWords: 0,
            perfectRounds: 0,
            allSubmittedWords: new Set(),
            fastestSubmission: null,
            longestWord: { word: '', length: 0 }
          }
        }))
      };

      console.log("✅ Game state fetched successfully for:", gameId);
      if (callback) callback({
        success: true,
        gameState: sanitizedGame
      });
      
    } catch (error) {
      console.error("❌ Error fetching game state:", error);
      if (callback) callback({ 
        success: false, 
        message: "Error fetching game state" 
      });
    }
  };
};

module.exports = getGameState;
