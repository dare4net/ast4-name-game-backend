const { games } = require('../store/game.store');
const submissionQueue = require('../../utils/submission-queue');
const { isWordDuplicate } = require('../../utils/gameLogic');
const calculateUniqueWords = require('./calculateUniqueWords');

const handleTimerEnd = (socket, io) => {
  return async ({ gameId }) => {
    console.log("⏰ Timer ended for game:", gameId);
    const game = games[gameId];
    
    if (!game || game.phase !== "playing") {
      console.warn("⚠️ Timer end already processed for this round or game not found.");
      return;
    }

    const hostPlayer = game.players.find(player => player.isHost);
    if (!hostPlayer || hostPlayer.id !== socket.id) {
      console.error("❌ Unauthorized timerEnd event. Only the host can trigger this action:", socket.id);
      return;
    }

    try {
      // Get all validated submissions
      const validatedResults = await submissionQueue.getGameResults(gameId);
      if (!validatedResults) {
        console.error("❌ No validated results found for game:", gameId);
        game.phase = "letter-selection";
        game.currentRound += 1;
        const nextTurnId = game.players[game.currentRound % game.players.length].id;
        game.nextTurn = game.players.find(player => player.id === nextTurnId);

        console.log("No Valid Result:", game.players);
        io.to(game.id).emit("gameStateUpdate", game);

        return;
      }

      // Process results and calculate scores
      const allSubmissions = [];
      const scores = {};
      game.nameValidations = [];

      // Group words by category for duplicate checking
      const wordsByCategory = {};
      for (const [playerId, validatedSubmissions] of validatedResults.entries()) {
        for (const [category, submission] of Object.entries(validatedSubmissions)) {
          if (!wordsByCategory[category]) {
            wordsByCategory[category] = [];
          }
          if (submission.word) {
            wordsByCategory[category].push(submission.word);
          }
        }
      }

      // Calculate scores and prepare results
      for (const [playerId, validatedSubmissions] of validatedResults.entries()) {
        let totalPlayerScore = 0;
        const player = game.players.find(p => p.id === playerId);

        for (const [category, submission] of Object.entries(validatedSubmissions)) {
          const { word, validation, isStartValid } = submission;
          const isValid = isStartValid && validation.isValid;
          player.stats.allSubmittedWords.add(word.toLowerCase());

          if (category === "names") {
            game.nameValidations.push({
              word,
              playerId,
              votes: {},
              aiOpinion: validation.isValid ? "valid" : "invalid",
              finalResult: "",
              extract: validation.extract || (isStartValid ? "" : "Word does not start with the correct letter")
            });
          } else {
            const isDuplicate = isWordDuplicate(word, wordsByCategory[category]);
            const points = isValid ? (isDuplicate ? 5 : 10) : 0;
            (isValid && !isDuplicate) && player.stats.uniqueWords++;
            totalPlayerScore += points;

            allSubmissions.push({
              playerId,
              category,
              word,
              isValid,
              points,
              extract: validation.extract || (isStartValid ? "" : "Word does not start with the correct letter")
            });
          }
        }
        scores[playerId] = totalPlayerScore;
        
        
        if (player) {
          player.score += scores[playerId];
        }
      }

      const roundResults = {
        letter: game.currentLetter,
        submissions: allSubmissions,
        scores,
      };

      game.roundResults.push(roundResults);
      game.voteLength = (game.players.length - 1) * game.nameValidations.length;
      game.phase = "validation";
      game.submissions = {};

      // Clear the submission queue for this game
      submissionQueue.clearGame(gameId);

      // If this was the last round, calculate final unique words
      const maxRounds = game.players.length * 2; // or whatever your game's max rounds is
      if (game.currentRound >= maxRounds) {
        calculateUniqueWords(game);
        game.phase = "finished";
      }

      console.log("✅ Round processed successfully for all players:", roundResults.letter);
      io.to(gameId).emit("gameStateUpdate", game);
    } catch (error) {
      console.error("❌ Error processing round results:", error);
    }
  };
};

module.exports = handleTimerEnd;
