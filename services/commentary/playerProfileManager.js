class PlayerProfileManager {
  static initializeProfile() {
    return {
      scoreHistory: [],
      bonusHistory: [],
      letterPerformance: {},
      weakestCategories: new Set(),
      strongestCategories: new Set(),
      lastThreeRoundsDelta: 0,
      perfectRounds: 0,
      situation: 'NEUTRAL'
    };
  }

  static calculateMetrics(profile, player, round, allScores, allDeltas, game) {
    const roundScore = round.scores[player.id] || 0;
    
    // Sort players by score for accurate positioning
    const sortedPlayers = [...game.players].sort((a, b) => b.score - a.score);
    const position = sortedPlayers.findIndex(p => p.id === player.id);
    const totalPlayers = sortedPlayers.length;
    
    // Get adjacent players for commentary
    const playerAbove = position > 0 ? sortedPlayers[position - 1] : null;
    const playerBelow = position < totalPlayers - 1 ? sortedPlayers[position + 1] : null;
    
    // Update score history and calculate delta
    profile.scoreHistory.push(roundScore);
    const lastThree = profile.scoreHistory.slice(-3);
    profile.lastThreeRoundsDelta = lastThree.length > 1 ? 
      lastThree[lastThree.length - 1] - lastThree[0] : 0;

    // Calculate score gaps to adjacent players
    const scoreGapToNext = playerAbove ? playerAbove.score - player.score : 0;
    const scoreGapToPrev = playerBelow ? player.score - playerBelow.score : 0;
    
    // Calculate relative position metrics
    const isCloseToNext = scoreGapToNext <= 5;
    const closeToPrevious = scoreGapToPrev <= 5;
    const inCompetitiveRange = isCloseToNext || closeToPrevious;
    
    // Calculate pack density (how many players within 10 points)
    const playersNearby = sortedPlayers.filter(p => 
      Math.abs(p.score - player.score) <= 10
    ).length;

    return {
      percentile: (position / totalPlayers) * 100,
      scoreGapToFirst: position === 0 ? 0 : sortedPlayers[0].score - player.score,
      scoreGapToLast: position === totalPlayers - 1 ? 0 : player.score - sortedPlayers[totalPlayers - 1].score,
      relativeDelta: profile.lastThreeRoundsDelta - (allDeltas.reduce((a, b) => a + b, 0) / allDeltas.length),
      scoreVariance: this.calculateVariance(lastThree),
      position,
      totalPlayers,
      scoreGapToNext,
      scoreGapToPrev,
      inCompetitiveRange,
      playersNearby,
      isCloseToNext,
      closeToPrevious,
      // Player reference metrics - null for first/last place
      nextPlayer: position === 0 ? null : playerAbove?.name,
      prevPlayer: position === totalPlayers - 1 ? null : playerBelow?.name,
      pointsToNext: position === 0 ? null : Math.max(0, scoreGapToNext || 0),
      pointsToPrev: position === totalPlayers - 1 ? null : Math.max(0, scoreGapToPrev || 0),
      // Special rivalry indicators with safe fallbacks
      hasRival: isCloseToNext || closeToPrevious,
      rivalName: (isCloseToNext ? playerAbove?.name : 
                closeToPrevious ? playerBelow?.name : null) || 'someone',
      rivalGap: Math.max(0, (isCloseToNext ? scoreGapToNext : 
                closeToPrevious ? scoreGapToPrev : 0) || 0)
    };
  }

  static calculateVariance(scores) {
    if (scores.length <= 1) return 0;
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    return Math.sqrt(
      scores.reduce((sum, score) => 
        sum + Math.pow(score - mean, 2), 0) / scores.length
    );
  }

  static updateBonusHistory(profile, round, playerId, currentRoundIdx) {
    if (!round.extraBonuses) return;

    const { fastestSubmission, longestWord, master } = round.extraBonuses;
    
    if (fastestSubmission?.playerId === playerId) {
      profile.bonusHistory.push({ type: 'FASTEST', round: currentRoundIdx });
    }
    if (longestWord?.playerId === playerId) {
      profile.bonusHistory.push({ type: 'LONGEST', round: currentRoundIdx });
    }
    if (master?.playerId === playerId) {
      profile.bonusHistory.push({ type: 'MASTER', round: currentRoundIdx });
    }
  }

  static analyzeSituation(metrics, game, currentRoundIdx) {
    const { 
      percentile, scoreGapToFirst, relativeDelta, scoreVariance,
      position, totalPlayers, scoreGapToNext, scoreGapToPrev,
      inCompetitiveRange, playersNearby, isCloseToNext, closeToPrevious
    } = metrics;

    const isEndgame = currentRoundIdx >= game.maxround - 3;
    const playerThresholds = {
      small: 4,    // 2-4 players
      large: 8     // 5-8 players (maximum players)
    };

    // Adjust thresholds based on player count
    const drawThreshold = totalPlayers <= playerThresholds.small ? 5 : 8;

    // Enhanced DRAW detection for max 8 players
    if (currentRoundIdx > 2) {
      // For small games (2-4 players)
      if (totalPlayers <= playerThresholds.small) {
        // In small games, more sensitive to close scores
        const isScoreWithinThreshold = (isCloseToNext || closeToPrevious) && 
          Math.min(scoreGapToNext, scoreGapToPrev) <= drawThreshold;
          
        if (playersNearby >= 2 && isScoreWithinThreshold) {
          // For 2 players, always DUEL
          if (totalPlayers === 2) {
            return {
              situation: 'DRAW',
              subCategory: isEndgame ? 'CRITICAL' : 'DUEL'
            };
          }
          // For 3-4 players
          return {
            situation: 'DRAW',
            subCategory: isEndgame ? 'CRITICAL' : 
                        playersNearby === 2 ? 'DUEL' : 'GROUP'
          };
        }
      }
      // For large games (5-8 players)
      else if (totalPlayers <= playerThresholds.large) {
        // More players need to be close for a DRAW situation
        const isScoreWithinThreshold = (isCloseToNext || closeToPrevious) && 
          Math.min(scoreGapToNext, scoreGapToPrev) <= drawThreshold;
          
        if (playersNearby >= 3 && position <= Math.ceil(totalPlayers / 2) && isScoreWithinThreshold) {
          return {
            situation: 'DRAW',
            subCategory: isEndgame ? 'CRITICAL' :
                        // DUEL if only top 2 are close, GROUP if more
                        (position <= 1 && playersNearby === 2) ? 'DUEL' : 'GROUP'
          };
        }
      }
    }

    // Standard situation analysis
    if (percentile <= 25) {
      return {
        situation: 'WINNING',
        subCategory: ((relativeDelta > 5 && scoreGapToFirst < 10) || scoreGapToFirst > 30) ? 
          'DOMINANT' : 'CONSISTENT'
      };
    } 
    
    if (percentile >= 75) {
      return {
        situation: 'LOSING',
        subCategory: (relativeDelta < -10 || (metrics.lastThreeRoundsDelta < -15 && scoreVariance > 10)) ?
          'PLUMMETING' : 'STRUGGLING'
      };
    }

    // Middle pack analysis with momentum
    const momentumFactor = relativeDelta * 1.5;
    const gapClosingRate = metrics.lastThreeRoundsDelta / (scoreGapToFirst || 1);
    
    if (momentumFactor > 15 || (gapClosingRate > 0.3 && scoreGapToFirst < 20)) {
      return { situation: 'COMEBACK', subCategory: 'STRONG' };
    } 
    
    if (momentumFactor > 5 || gapClosingRate > 0.15) {
      return { situation: 'COMEBACK', subCategory: 'POTENTIAL' };
    }
    
    if (scoreVariance < 5 && Math.abs(relativeDelta) < 5) {
      return { situation: 'NEUTRAL', subCategory: 'CONSISTENT' };
    }
    
    return { situation: 'LOSING', subCategory: 'STRUGGLING' };
  }
}

module.exports = PlayerProfileManager;
