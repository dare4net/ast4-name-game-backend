const { SITUATIONS, BONUS_COMMENTS } = require('./commentsLoader');
const CommentHistoryManager = require('./historyManager');

class CommentaryGenerator {
  static getRandomComment(gameId, playerId, situation, subCategory, type, params = {}) {
    // Initialize global comment history for this type
    const historyKey = `${situation}.${subCategory}.${type}`;
    const usedComments = CommentHistoryManager.getOrInitializeHistory(gameId, historyKey);
    
    // Try to get comments for the specific situation and subcategory
    let options = SITUATIONS[situation]?.[subCategory]?.[type];
    
    // If not found, try the CONSISTENT subcategory of the same situation
    if (!options && situation !== 'NEUTRAL') {
      options = SITUATIONS[situation]?.['CONSISTENT']?.[type];
    }
    
    // If still not found, fall back to NEUTRAL.CONSISTENT
    if (!options) {
      options = SITUATIONS['NEUTRAL']['CONSISTENT'][type];
    }
    
    if (!options || options.length === 0) {
      console.warn(`No comments found for ${situation}.${subCategory}.${type}, using default`);
      return "vibing fr fr 😎";
    }

    return this.selectAndFormatComment(options, usedComments, params);
  }

  static getRandomBonusComment(gameId, bonusType, params = {}) {
    const usedComments = CommentHistoryManager.initializeBonusHistory(gameId, bonusType);
    const comments = BONUS_COMMENTS[bonusType];
    
    return this.selectAndFormatComment(comments, usedComments, params);
  }

  static validateAndProcessParams(params) {
    if (!params || typeof params !== 'object') {
      console.warn('Invalid params object provided to commentary generator');
      return null;
    }

    // Check for required base parameters
    if (params.position === undefined || params.totalPlayers === undefined) {
      console.warn('Missing required position/totalPlayers parameters');
      return null;
    }

    // Process and validate parameters
    return {
      position: params.position,
      totalPlayers: params.totalPlayers,
      nextPlayer: params.position === 1 ? null : params.nextPlayer,
      prevPlayer: params.position === params.totalPlayers ? null : params.prevPlayer,
      pointsToNext: params.position === 1 ? null : params.pointsToNext,
      pointsToPrev: params.position === params.totalPlayers ? null : params.pointsToPrev,
      hasRival: Boolean(params.rivalName && params.rivalGap > 0),
      rivalName: params.hasRival ? params.rivalName : null,
      rivalGap: params.hasRival ? params.rivalGap : 0,
      // Preserve other parameters that might be needed (word, letter, etc.)
      ...params
    };
  }

  static selectAndFormatComment(options, usedComments, params) {
    const processedParams = this.validateAndProcessParams(params);
    if (!processedParams) {
      return options[Math.floor(Math.random() * options.length)];
    }

    // Log player profile with processed parameters
    console.log('\n[Commentary Debug] Player Profile:', {
      ...processedParams,
      originalParams: params
    });

    // Helper function to check if a comment is valid for current player's position
    const isCommentValid = (comment) => {
      // First place player checks
      if (params.position === 1) {
        if (comment.includes('{nextPlayer}') || 
            comment.includes('{pointsToNext}')) {
          console.log(`[Commentary Debug] Rejected: "${comment}" - First place player can't have nextPlayer/pointsToNext`);
          return false;
        }
      }
      
      // Last place player checks
      if (params.position === params.totalPlayers) {
        if (comment.includes('{prevPlayer}') || 
            comment.includes('{pointsToPrev}')) {
          console.log(`[Commentary Debug] Rejected: "${comment}" - Last place player can't have prevPlayer/pointsToPrev`);
          return false;
        }
      }

      // Check for rival-related comments when there's no close rival
      if (!params.hasRival && (
          comment.includes('{rivalName}') || 
          comment.includes('{rivalGap}'))) {
        console.log(`[Commentary Debug] Rejected: "${comment}" - No close rival available`);
        return false;
      }

      // Check for undefined/null parameter values in the comment
      const paramPattern = /\{([^}]+)\}/g;
      let match;
      while ((match = paramPattern.exec(comment)) !== null) {
        const paramName = match[1];
        if (params[paramName] === undefined || params[paramName] === null) {
          console.log(`[Commentary Debug] Rejected: "${comment}" - Missing parameter: ${paramName}`);
          return false;
        }
      }

      return true;
    };

    // Filter out comments that don't make sense for player's position
    let validComments = options.filter(isCommentValid);
    console.log(`[Commentary Debug] Found ${validComments.length} valid comments out of ${options.length} total`);
    
    // If no valid comments found, fall back to simple comments without player references
    if (validComments.length === 0) {
      console.log('[Commentary Debug] No valid comments found, falling back to simple comments');
      validComments = options.filter(comment => {
        const isSimple = !comment.includes('{nextPlayer}') && 
                        !comment.includes('{prevPlayer}') && 
                        !comment.includes('{rivalName}') && 
                        !comment.includes('{pointsToNext}') && 
                        !comment.includes('{pointsToPrev}') && 
                        !comment.includes('{rivalGap}');
        if (!isSimple) {
          console.log(`[Commentary Debug] Rejected simple fallback: "${comment}" - Contains player references`);
        }
        return isSimple;
      });
      console.log(`[Commentary Debug] Found ${validComments.length} simple comments as fallback`);
    }

    // If still no valid comments, return a generic comment
    if (validComments.length === 0) {
      return "vibing fr fr 😎";
    }

    // Try to find unused valid comments
    let availableComments = validComments.filter(comment => !usedComments.has(comment));
    
    // If all valid comments have been used, reset history for valid comments
    if (availableComments.length === 0) {
      validComments.forEach(comment => usedComments.delete(comment));
      availableComments = validComments;
    }

    // Select a random valid comment
    let comment = availableComments[Math.floor(Math.random() * availableComments.length)];
    usedComments.add(comment);
    
    // Replace parameters in the comment
    return Object.entries(params).reduce((text, [key, value]) => {
      // Skip null/undefined values as they should have been filtered out by isCommentValid
      if (value === null || value === undefined) return text;
      // Use global replacement to catch all instances of the parameter
      return text.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    }, comment);
  }

  static formatBonusComments(bonuses = [], params = {}) {
    if (bonuses.length === 0) return '';

    // Ensure bonus comments have proper parameters
    const bonusParams = {
      position: params.position,
      totalPlayers: params.totalPlayers,
      nextPlayer: params.position === 1 ? null : params.nextPlayer,
      prevPlayer: params.position === params.totalPlayers ? null : params.prevPlayer,
      pointsToNext: params.position === 1 ? null : params.pointsToNext,
      pointsToPrev: params.position === params.totalPlayers ? null : params.pointsToPrev,
      hasRival: Boolean(params.rivalName && params.rivalGap > 0),
      rivalName: params.rivalName,
      rivalGap: params.rivalGap,
      ...params  // Keep other parameters like word, letter, etc.
    };

    return '\n' + bonuses
      .map(bonus => this.getRandomBonusComment(bonus, bonusParams))
      .join(' + ');
  }
}

module.exports = CommentaryGenerator;
