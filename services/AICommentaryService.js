const { games } = require('../socket/store/game.store');
const PlayerProfileManager = require('./commentary/playerProfileManager');
const CommentaryGenerator = require('./commentary/commentaryGenerator');

// Main AICommentaryService class that orchestrates the commentary system
class AICommentaryService {
  static updatePlayerProfile(game, currentRoundIdx) {
    const round = game.roundResults[currentRoundIdx];
    const allScores = game.players.map(p => p.score).sort((a, b) => b - a);

    // Initialize player profiles in game state if needed
    if (!game.playerProfiles) {
      game.playerProfiles = new Map();
    }

    game.players.forEach(player => {
      // Initialize profile if needed
      if (!game.playerProfiles.has(player.id)) {
        game.playerProfiles.set(player.id, PlayerProfileManager.initializeProfile());
      }

      const profile = game.playerProfiles.get(player.id);
      
      // Update bonus history
      PlayerProfileManager.updateBonusHistory(profile, round, player.id, currentRoundIdx);

      // Calculate metrics
      const allDeltas = game.players.map(p => {
        const profile = game.playerProfiles.get(p.id);
        return profile?.lastThreeRoundsDelta || 0;
      });

      const metrics = PlayerProfileManager.calculateMetrics(profile, player, round, allScores, allDeltas, game);
      
      // Analyze situation
      const { situation, subCategory } = PlayerProfileManager.analyzeSituation(metrics, game, currentRoundIdx);
      profile.situation = situation;
      profile.subCategory = subCategory;
      
      // Track consistency
      profile.lastSituation = profile.currentSituation;
      profile.currentSituation = { main: situation, sub: subCategory };
    });
  }

  static generateCommentary(game, currentRoundIdx) {
    this.updatePlayerProfile(game, currentRoundIdx);
    const comments = new Map();
    const round = game.roundResults[currentRoundIdx];

    // Find strongest and weakest players for context
    const sortedPlayers = [...game.players].sort((a, b) => b.score - a.score);
    const strongestPlayer = sortedPlayers[0];
    const weakestPlayer = sortedPlayers[sortedPlayers.length - 1];

    // Get unused letters
    const usedLetters = new Set(game.roundResults.map(r => r.letter));
    const unusedLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      .split('')
      .filter(l => !usedLetters.has(l));

    // Calculate scores and deltas for metrics
    const allScores = game.players.map(p => p.score).sort((a, b) => b - a);
    const allDeltas = game.players.map(p => {
      const profile = game.playerProfiles.get(p.id);
      return profile?.lastThreeRoundsDelta || 0;
    });

    game.players.forEach(player => {
      const profile = game.playerProfiles.get(player.id);
      const metrics = PlayerProfileManager.calculateMetrics(profile, player, round, allScores, allDeltas, game);
      // Ensure we have valid values for all parameters
      const goodLetter = unusedLetters.length > 0 
        ? unusedLetters[Math.floor(Math.random() * unusedLetters.length)]
        : 'A';

      const params = {
        // Existing params with guaranteed values
        lowestPlayer: weakestPlayer?.name || 'someone',
        strongPlayer: strongestPlayer?.name || 'someone',
        goodLetter,
        
        // New player reference params with position awareness
        nextPlayer: metrics.nextPlayer,      // Player above in ranking (might be null for first place)
        prevPlayer: metrics.prevPlayer,      // Player below in ranking (might be null for last place)
        pointsToNext: metrics.pointsToNext,  // Points needed to catch up (0 for first place)
        pointsToPrev: metrics.pointsToPrev,  // Points ahead of player below (0 for last place)
        
        // Rivalry params
        rivalName: metrics.rivalName || 'someone',        // Closest competitor
        rivalGap: metrics.rivalGap || 0,          // Point gap to rival
        
        // Additional context
        position: metrics.position + 1,      // 1-based position for readability
        totalPlayers: metrics.totalPlayers,

        // Legacy parameter mapping
        playerName: player.name              // For older comment templates
      };

      // Prepare the complete parameters object
      const completeParams = {
        ...params,
        position: metrics.position + 1,
        totalPlayers: metrics.totalPlayers,
        nextPlayer: metrics.position === 0 ? null : metrics.nextPlayer,
        prevPlayer: metrics.position === metrics.totalPlayers - 1 ? null : metrics.prevPlayer,
        pointsToNext: metrics.position === 0 ? null : metrics.pointsToNext,
        pointsToPrev: metrics.position === metrics.totalPlayers - 1 ? null : metrics.pointsToPrev,
        hasRival: Boolean(metrics.rivalName && metrics.rivalGap > 0),
        rivalName: metrics.rivalName || null,
        rivalGap: metrics.rivalGap || 0,
        playerName: player.name
      };

      let commentary = '';

      // Get base commentary
      commentary += CommentaryGenerator.getRandomComment(
        game.id, 
        player.id, 
        profile.situation, 
        profile.subCategory, 
        'COMMENTS',
        completeParams
      ) + '\n\n';

      // Add strategic advice
      const numAdvice = Math.random() > 0.5 ? 2 : 1;
      for (let i = 0; i < numAdvice; i++) {
        commentary += CommentaryGenerator.getRandomComment(
          game.id, 
          player.id, 
          profile.situation, 
          profile.subCategory, 
          'ADVICE', 
          completeParams
        ) + ' ';
      }
      commentary += '\n\n';

      // Add insight
      commentary += CommentaryGenerator.getRandomComment(
        game.id, 
        player.id, 
        profile.situation, 
        profile.subCategory, 
        'INSIGHTS', 
        completeParams
      ) + '\n';

      // Add bonus achievements
      if (round.extraBonuses) {
        const { fastestSubmission, longestWord, rareWords, master } = round.extraBonuses;
        
        if (fastestSubmission?.playerId === player.id) {
          commentary += CommentaryGenerator.getRandomBonusComment(
            game.id, 
            'FASTEST', 
            completeParams
          ) + ' ';
        }
        
        if (longestWord?.playerId === player.id) {
          commentary += CommentaryGenerator.getRandomBonusComment(
            game.id, 
            'LONGEST_WORD', 
            { ...completeParams, word: longestWord.word }
          ) + ' ';
        }
        
        if (rareWords?.some(rw => rw.playerId === player.id)) {
          commentary += CommentaryGenerator.getRandomBonusComment(
            game.id, 
            'RARE_WORDS', 
            completeParams
          ) + ' ';
        }
        
        if (master?.playerId === player.id) {
          commentary += CommentaryGenerator.getRandomBonusComment(
            game.id, 
            'MASTER', 
            { ...completeParams, letter: round.letter }
          );
        }
      }

      comments.set(player.id, commentary.trim());
    });

    return comments;
  }
}

module.exports = AICommentaryService;
