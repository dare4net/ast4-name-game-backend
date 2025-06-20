const { games } = require('../store/game.store');
const submissionQueue = require('../../utils/submission-queue');
const { isWordDuplicate } = require('../../utils/gameLogic');

// Helper function to update player stats
const updatePlayerStats = (game, playerId, submissions, validatedSubmissions, submissionTime) => {
  const player = game.players.find(p => p.id === playerId);
  if (!player) return;

  // Initialize stats if not exists
  if (!player.stats) {
    player.stats = {
      uniqueWords: 0,
      fastestSubmissions: 0,
      fastestSubmission: null,
      rareWords: [],
      longestWord: { word: '', length: 0 },
      perfectRounds: 0,
      submissionTimes: [],
      allSubmittedWords: new Set()
    };
  }

  // Track submission time
  const submissionTimeInSeconds = (submissionTime - game.roundStartTime) / 1000;
  player.stats.submissionTimes.push(submissionTimeInSeconds);
  
  // Update fastest submission if this submission was faster
  if (!player.stats.fastestSubmission || submissionTimeInSeconds < player.stats.fastestSubmission) {
    player.stats.fastestSubmission = submissionTimeInSeconds;
    player.stats.fastestSubmissions++;
  }
  
  // Track all words submitted by the player
  for (const [category, submission] of Object.entries(validatedSubmissions)) {
    if (category === 'names') continue;
    const { word, validation, isStartValid } = submission;
    if (isStartValid && validation.isValid) {
      player.stats.allSubmittedWords.add(word.toLowerCase());
    }
  }

  // Track longest word
  let longestThisRound = { word: '', length: 0 };

  for (const [category, submission] of Object.entries(validatedSubmissions)) {
    if (category === 'names') continue;

    const { word, validation, isStartValid } = submission;
    const isValid = isStartValid && validation.isValid;

    if (isValid) {
      // Update longest word
      if (word.length > longestThisRound.length) {
        longestThisRound = { word, length: word.length };
      }
      if (word.length > player.stats.longestWord.length) {
        player.stats.longestWord = { word, length: word.length };
      }

      // Track rare words
      if (!validation.fromCache && !isWordDuplicate(word, Object.values(game.submissions).flatMap(s => Object.values(s)))) {
        player.stats.rareWords.push({ word, category, round: game.currentRound });
      }
    }
  }
};

const submitWords = (socket, io) => {
  return async ({ gameId, playerId, submissions }) => {
    console.log("📤 Handling word submissions:", { gameId, playerId, submissions });
    const game = games[gameId];
    
    if (game) {
      const submissionTime = Date.now();
      game.submissions[playerId] = submissions;
      
      // Queue the submissions for validation
      const validatedSubmissions = await submissionQueue.queueSubmission(gameId, playerId, submissions);
      
      // Update player stats
      updatePlayerStats(game, playerId, submissions, validatedSubmissions, submissionTime);
      
      console.log(`Player ${playerId} submitted words:`, game.submissions[playerId]);
    }
  };
};

module.exports = submitWords;