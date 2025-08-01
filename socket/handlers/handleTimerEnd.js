const { games } = require('../store/game.store');
const submissionQueue = require('../../utils/submission-queue');
const { isWordDuplicate } = require('../../utils/gameLogic');
const calculateUniqueWords = require('./calculateUniqueWords');
const { saveGameStateToMemory } = require('../../services/gameStateMemoryService');
const { saveGameStateToRedis } = require('../../services/gameStateService');

const handleTimerEnd = (socket, io) => {
  return async ({ gameId }) => {
    console.log("⏰ Timer ended for game:", gameId);
    const game = games[gameId];
    
    // Notify all clients to stop their timers
    io.to(gameId).emit("stopTimer");

    if (!game || game.phase !== "playing") {
      console.warn("⚠️ Timer end already processed for this round or game not found.");
      return;
    }

    try {
    
    // Create immediate dummy name validations for faster UI transition
        game.nameValidations = [];
        const submissions = game.submissions || {};
        Object.entries(submissions).forEach(([playerId, playerSubmissions]) => {
          if (playerSubmissions.names && playerSubmissions.names.trim().length > 0) {
            game.nameValidations.push({
              word: playerSubmissions.names,
              playerId,
              votes: {},
              aiOpinion: "pending",
              finalResult: "",
              extract: "Validation in progress..."
            });
          }
        });

        // Switch to validation phase immediately
        game.phase = "validation";
        game.voteLength = (game.players.length - 1) * game.nameValidations.length;
        io.to(game.id).emit("gameStateUpdate", game);

    
      // Get all validated submissions (now returns a Map<playerId, {names, ...otherCategories}>)
      const submittedCount = Object.keys(game.submissions).length;
      const validatedResults = await submissionQueue.getGameResults(gameId, submittedCount);
      if (!validatedResults) {
        console.error("❌ No validated results found for game:", gameId);
        game.phase = "letter-selection";
        game.currentRound += 1;
        // If this was the last round.
        const maxRounds = game.maxRound;
        if (game.currentRound >= maxRounds) {
          //calculateUniqueWords(game);
          game.phase = "finished";
          try {
                    saveGameStateToMemory(gameId, game);
                    saveGameStateToRedis(gameId, game);
                    console.log("✅ Game state updated in Memory (handleTimerEnd)");
          } catch (err) {
           console.error("❌ Failed to update game state in Memory (handleTimerEnd):", err);
           }
        }
        const nextTurnId = game.players[game.currentRound % game.players.length].id;
        game.nextTurn = game.players.find(player => player.id === nextTurnId);
        console.log("No Valid Result:", game.players);
        io.to(game.id).emit("gameStateUpdate", game);
        return;
      }

      // Process results and calculate scores
      const allSubmissions = [];
      const scores = {};
      // Don't reset nameValidations here as we already have the dummy ones
      const playerCategoryValidations = new Map(); // Track validations per player

      // Group words by category for duplicate checking
      const wordsByCategory = {};
      for (const [playerId, validatedSubmissions] of validatedResults.entries()) {
        for (const [category, submission] of Object.entries(validatedSubmissions)) {
          if (!wordsByCategory[category]) {
            wordsByCategory[category] = [];
          }
          if (submission && submission.word) {
            wordsByCategory[category].push(submission.word);
          }
        }
      }

      // Calculate scores and prepare results
      for (const [playerId, validatedSubmissions] of validatedResults.entries()) {
        let totalPlayerScore = 0;
        const player = game.players.find(p => p.id === playerId);
        

        // Track valid submissions for each category for this round
        const categories = [...game.categories].map(cat => cat.id); // all categories except 'names'
        const categoryValidations = new Map();
        categories.forEach(cat => categoryValidations.set(cat, false));
        playerCategoryValidations.set(playerId, categoryValidations);


        // Initialize letterMastered stat if it doesn't exist
        if (!player.stats.letterMastered) {
          player.stats.letterMastered = [];
        }
        if(!player.stats.categoriesMastered) {
          player.stats.categoriesMastered = [...(categories.filter(cat => cat.enabled === true))];
        }
        
        // First, collect all words from all categories for this player
        const playerWordsInOtherCategories = new Set();
        Object.entries(validatedSubmissions).forEach(([cat, sub]) => {
          if (cat !== 'things' && sub && sub.word) {
            playerWordsInOtherCategories.add(sub.word.toLowerCase());
          }
        });

        for (const [category, submission] of Object.entries(validatedSubmissions)) {
          if (!submission) continue;
          const { word, validation, isStartValid } = submission;
          const isValid = isStartValid && validation.isValid;
          if (player && word) player.stats.allSubmittedWords.add(word.toLowerCase());

          if (category === "names") {
            // Update existing name validation with AI opinion
            if (word && word.trim().length > 0) {
              const existingValidation = game.nameValidations.find(v => 
                v.playerId === playerId && v.word === word
              );
              if (existingValidation) {
                existingValidation.aiOpinion = validation.isValid ? "valid" : "invalid";
                existingValidation.extract = validation.extract || (isStartValid ? "" : "Word does not start with the correct letter");
              }
            }
          } else {
            const isDuplicate = isWordDuplicate(word, wordsByCategory[category]);
            let points = 0;

            if (isValid) {
              if (category === 'things' && playerWordsInOtherCategories.has(word.toLowerCase())) {
                // If the word is used in 'things' and was already used in another category, award 0 points
                points = 0;
                allSubmissions.push({
                  playerId,
                  category,
                  word,
                  isValid: false, // Mark as invalid for UI feedback
                  points,
                  extract: "Word already used in another category"
                });
              } else {
                // Normal scoring for other categories or unique words in 'things'
                points = isDuplicate ? 5 : 10;
                (isValid && !isDuplicate && player) && (player.stats.uniqueWords++);
                allSubmissions.push({
                  playerId,
                  category,
                  word,
                  isValid,
                  points,
                  extract: validation.extract || (isStartValid ? "" : "Word does not start with the correct letter")
                });
              }
            } else {
              // Invalid word
              allSubmissions.push({
                playerId,
                category,
                word,
                isValid,
                points,
                extract: validation.extract || (isStartValid ? "" : "Word does not start with the correct letter")
              });
              //player.stats.categoriesMastered = player.stats.categoriesMastered.filter(cat => cat === category);
            }
            totalPlayerScore += points;
            
            // Track if this category had a valid submission
            /*if (category !== 'names' && isValid) {
              const playerValidations = playerCategoryValidations.get(playerId);
              if (playerValidations) {
                playerValidations.set(category, true);
              }
            }*/
          }
        }
        scores[playerId] = totalPlayerScore;
        if (player) {
          player.score += scores[playerId];

          // Check if all categories had valid submissions
          const playerValidations = playerCategoryValidations.get(playerId);
          /*if (playerValidations) {
            const allCategoriesValid = Array.from(playerValidations.values()).every(valid => valid);
            if (allCategoriesValid && !player.stats.letterMastered.includes(game.currentLetter)) {
              player.stats.letterMastered.push(game.currentLetter);
              console.log(`      🎯 Letter mastered: ${game.currentLetter} by ${player.name}`);
            }
          }*/
        }
      }

      // Update player stats based on validated submissions
      console.log("\n📊 Starting stats calculation in handleTimerEnd");
      for (const [playerId, validatedSubmissions] of validatedResults.entries()) {
        const player = game.players.find(p => p.id === playerId);
        if (!player) {
          console.warn(`⚠️ Player ${playerId} not found for stats calculation`);
          continue;
        }

        console.log(`\n👤 Processing stats for player: ${player.name} (${playerId})`);
        console.log(`   Current stats:`, JSON.stringify(player.stats, null, 2));

        // Track longest word and rare words
        let longestThisRound = { word: '', length: 0 };
        let rareWordsThisRound = 0;
        
        for (const [category, submission] of Object.entries(validatedSubmissions)) {
          if (!submission || category === 'names') continue;

          const { word, validation, isStartValid } = submission;
          const isValid = isStartValid && validation.isValid;
          const isDuplicate = isWordDuplicate(word, wordsByCategory[category]);

          console.log(`\n   📝 Processing ${category}: "${word}"`);
          console.log(`      Valid: ${isValid}, Duplicate: ${isDuplicate}`);

          if (isValid) {
            // Update longest word
            if (word.length > longestThisRound.length) {
              longestThisRound = { word, length: word.length };
              console.log(`      ✨ New longest word this round: ${word} (${word.length} chars)`);
            }
            if (word.length > (player.stats.longestWord?.length || 0)) {
              player.stats.longestWord = { word, length: word.length };
              console.log(`      🏆 New all-time longest word: ${word} (${word.length} chars)`);
            }

            // Track rare words based on validation.rare property
            if (validation.rare && !isDuplicate) {
              if (!player.stats.rareWords) player.stats.rareWords = [];
              player.stats.rareWords.push({ word, category, round: game.currentRound });
              rareWordsThisRound++;
              console.log(`      🌟 Rare word found: ${word} (${category})`);
            }
          }else{
              console.log(`      We are removing  (${category}) from mastred because of : ${word} `);
              console.log(`categories masterd before: ${player.stats.categoriesMastered}`)
              player.stats.categoriesMastered = player.stats.categoriesMastered.filter( cat => cat !== category);
              console.log(`categories masterd after: ${player.stats.categoriesMastered}`)
          }
        }

        /*const playerValidations = playerCategoryValidations.get(playerId);
        console.log(`\n   📈 Round Summary for ${player.name}:`);
        console.log(`      Longest word this round: ${longestThisRound.word} (${longestThisRound.length} chars)`);
        console.log(`      Rare words found: ${rareWordsThisRound}`);
        console.log(`      Current total score: ${player.score}`);
        console.log(`      Letters mastered: ${player.stats.letterMastered.join(', ')}`);
        console.log(`      Categories completed this round: ${Array.from(playerValidations.entries())
          .filter(([_, valid]) => valid)
          .map(([category]) => category)
          .join(', ')}`);*/
      }
      console.log("\n✅ Stats calculation complete in handleTimerEnd\n");

      const roundResults = {
        letter: game.currentLetter,
        submissions: allSubmissions,
        scores,
      };

      game.roundResults.push(roundResults);
      
      // Ensure voteLength is maintained
      game.voteLength = (game.players.length - 1) * game.nameValidations.length;
      console.log("Current voteLength:", game.voteLength);
      console.log("Current round:", game.currentRound);
      console.log("Current nameValidations count:", game.nameValidations.length);
      
      game.submissions = {};

      // Clear the submission queue for this game
      submissionQueue.clearGame(gameId);

      // Save updated state to Memory
      try {
        saveGameStateToMemory(gameId, game);
        saveGameStateToRedis(gameId, game);
        console.log("✅ Game state updated in Memory (handleTimerEnd)");
      } catch (err) {
        console.error("❌ Failed to update game state in Memory (handleTimerEnd):", err);
      }

      console.log("✅ Round processed successfully for all players:", roundResults.letter);
      // Ensure we maintain validation phase and other critical state
      const gameStateForUpdate = {
        ...game,
        phase: "validation",  // Ensure we stay in validation phase
        nameValidations: game.nameValidations, // Keep name validations
        roundResults: game.roundResults,
        voteLength: game.voteLength
      };

      console.log("Phase before update:", game.phase);
      console.log("VoteLength before update:", game.voteLength);
      console.log("This is the updated nameValidations: ", game.nameValidations);
      io.to(gameId).emit("gameStateUpdate", gameStateForUpdate);
    } catch (error) {
      console.error("❌ Error processing round results:", error);
    }
  };
};

module.exports = handleTimerEnd;
