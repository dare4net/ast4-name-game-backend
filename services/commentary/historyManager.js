const { games } = require('../../socket/store/game.store');

class CommentHistoryManager {
  static initializeCommentHistory(gameId) {
    const game = games[gameId];
    if (!game) {
      console.error(`Game ${gameId} not found`);
      return {};
    }

    if (!game.playerProfiles) {
      game.playerProfiles = {};
    }

    if (!game.players) {
      console.error(`No players found in game ${gameId}`);
      return game.playerProfiles;
    }
    
    // Initialize comment history as part of player profiles
    game.players.forEach(player => {
      if (!player || !player.id) {
        console.error('Invalid player object:', player);
        return;
      }

      // Initialize profile if it doesn't exist
      if (!game.playerProfiles[player.id]) {
        game.playerProfiles[player.id] = this.initializeProfile();
      }
    });

    return game.playerProfiles;
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
    if (!profiles[playerId]) {
      console.error(`Profile not found for player ${playerId} in game ${gameId}`);
      return [];
    }

    const profile = profiles[playerId];
    if (!profile.commentHistory || !profile.commentHistory.comments) {
      profile.commentHistory = {
        comments: {},
        bonusComments: {}
      };
    }
    
    if (!profile.commentHistory.comments[historyKey]) {
      profile.commentHistory.comments[historyKey] = [];
    }
    return profile.commentHistory.comments[historyKey];
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
