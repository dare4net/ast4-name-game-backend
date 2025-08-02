const { games } = require('../../socket/store/game.store');

class CommentHistoryManager {
  static initializeCommentHistory(gameId) {
    const game = games[gameId];
    if (!game) {
      console.error(`Game ${gameId} not found`);
      return {};
    }

    // Initialize global comment history for the game if it doesn't exist
    if (!game.globalCommentHistory) {
      game.globalCommentHistory = {
        comments: {},
        bonusComments: {}
      };
    }

    return {
      'GLOBAL': {
        commentHistory: game.globalCommentHistory
      }
    };
  }

  static initializeProfile() {
    return {
      scoreHistory: [],
      letterPerformance: {},
      weakestCategories: [],  // Changed from Set to array
      strongestCategories: [], // Changed from Set to array
      lastThreeRoundsDelta: 0,
      perfectRounds: 0,
      situation: 'NEUTRAL',
      commentHistory: {        // Add this as part of initial profile
        comments: {},
        bonusComments: {}
      }
    };
  }

  static getOrInitializeHistory(gameId, playerId, historyKey) {
    const profiles = this.initializeCommentHistory(gameId);
    const game = games[gameId];
    
    if (!game.globalCommentHistory.comments[historyKey]) {
      game.globalCommentHistory.comments[historyKey] = [];
    }
    
    return game.globalCommentHistory.comments[historyKey];
  }

  static initializeBonusHistory(gameId, playerId, bonusType) {
    const profiles = this.initializeCommentHistory(gameId);
    if (!profiles[playerId]) {
      console.error(`Profile not found for player ${playerId} in game ${gameId}`);
      return [];
    }

    const profile = profiles[playerId];
    if (!profile.commentHistory || !profile.commentHistory.bonusComments) {
      profile.commentHistory = {
        comments: {},
        bonusComments: {}
      };
    }
    
    if (!profile.commentHistory.bonusComments[bonusType]) {
      profile.commentHistory.bonusComments[bonusType] = [];
    }
    return profile.commentHistory.bonusComments[bonusType];
  }
}

module.exports = CommentHistoryManager;

//module.exports = CommentHistoryManager;
