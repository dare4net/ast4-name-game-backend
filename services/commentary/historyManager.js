const { games } = require('../../socket/store/game.store');

class CommentHistoryManager {
  static initializeCommentHistory(gameId) {
    if (!games[gameId].commentHistory) {
      games[gameId].commentHistory = {
        globalComments: new Map(), // Track comments used by any player
        bonusComments: new Map()
      };
    }
    return games[gameId].commentHistory;
  }

  static getOrInitializeHistory(gameId, historyKey) {
    const commentHistory = this.initializeCommentHistory(gameId);
    if (!commentHistory.globalComments.has(historyKey)) {
      commentHistory.globalComments.set(historyKey, new Set());
    }
    return commentHistory.globalComments.get(historyKey);
  }

  static initializeBonusHistory(gameId, bonusType) {
    const commentHistory = this.initializeCommentHistory(gameId);
    if (!commentHistory.bonusComments.has(bonusType)) {
      commentHistory.bonusComments.set(bonusType, new Set());
    }
    return commentHistory.bonusComments.get(bonusType);
  }
}

module.exports = CommentHistoryManager;
