const { games } = require('../store/game.store');
const DictionaryService = require('../../utils/dictionary-service');
const { saveGameStateToRedis } = require('../../services/gameStateService');
const { saveGameStateToMemory } = require('../../services/gameStateMemoryService');

const completeValidation = (game, io) => {
  console.log("📤 Validation complete for game:", game.id);
  
  // Check if roundResult is available
  //i'm coming back here, this mehod isnt sustainable for checks
  const roundResultIndex = game.roundResults.length - 1;
  const roundResult = game.roundResults[roundResultIndex];
  
  if (!roundResult) {
    console.log("⏳ Waiting for round results to be available...");
    // Try again in 1 second
    setTimeout(() => completeValidation(game, io), 1000);
    return;
  }
  
  const master = game.nextTurn;
  game.nameValidations.forEach(validation => {
    const yesVotes = Object.values(validation.votes).filter(v => v === "yes").length;
    const noVotes = Object.values(validation.votes).filter(v => v === "no").length;

    validation.finalResult = yesVotes > noVotes ? "valid" : "invalid";

    const player = game.players.find(p => p.id === validation.playerId);
    const points = validation.finalResult === "valid" ? 10 : 0;
    
    // Update both player's total score and the round's score
    if (points > 0) {
      player.score += points;
      roundResult.scores[validation.playerId] = (roundResult.scores[validation.playerId] || 0) + points;
    }

    roundResult.submissions.push({
      category: "names",
      isValid: validation.finalResult === "valid",
      playerId: validation.playerId,
      points,
      word: validation.word,
    });
  });
  game.phase = "results";
  game.currentRound += 1;
  // If this was the last round.
      const maxRounds = game.maxRound || game.players.length * 4 || 26;// or whatever your game's max rounds is
      if (game.currentRound >= maxRounds) {
        //calculateUniqueWords(game);
        game.phase = "finished";
      }

  const nextTurnId = game.players[game.currentRound % game.players.length].id;
  game.nextTurn = game.players.find(player => player.id === nextTurnId);
  console.log("✅ Validation complete. Updated scores:", game.players);
  
  // First, emit game state with round results
  io.to(game.id).emit("gameStateUpdate", game);
        
  
  // Update final player stats after name validation
  console.log("\n📊 Starting final stats calculation in completeValidation");
  const maxPossibleScore = (game.selectedCategories.length * 10); // 10 points per category + 10 for name
  console.log(`🎯 Max possible score for this round: ${maxPossibleScore}`);
  

  Object.entries(roundResult.scores).forEach(([id, score]) => {
    const player = game.players.find(p => p.id === id);
    if (!player) {
      console.warn(`⚠️ Player ${id} not found for final stats calculation`);
      return;
    }

    console.log(`\n👤 Processing final stats for ${player.name}:`);
    console.log(`   Current round score: ${score}/${maxPossibleScore}`);
    console.log(`   Previous stats:`, JSON.stringify(player.stats, null, 2));

    // Initialize stats if needed
    if (!player.stats) {
      console.log(`   ⚙️ Initializing stats for player ${player.name}`);
      player.stats = {
        perfectRounds: 0,
        uniqueWords: player.stats?.uniqueWords || 0,
        allSubmittedWords: player.stats?.allSubmittedWords || new Set()
      };
    }

    // Update perfect rounds count
    if (score === maxPossibleScore) {
      player.stats.perfectRounds = (player.stats.perfectRounds || 0) + 1;
      player.stats.letterMastered.push(roundResult.letter);
      console.log(`   🌟 PERFECT ROUND! ${player.name} now has ${player.stats.perfectRounds} perfect rounds`);
    } else {
      console.log(`   📝 Regular round completion (${score}/${maxPossibleScore} points)`);
    }

    // Initialize extra bonuses object outside the player loop
    if (!roundResult.extraBonuses) {
      roundResult.extraBonuses = {};

      // Process fastest submission
      const fastestPlayer = game.players.reduce((fastest, player) => {
        const currentPlayerTime = player.stats.submissionTimes?.[player.stats.submissionTimes.length - 1];
        const fastestTime = fastest?.stats.submissionTimes?.[fastest.stats.submissionTimes.length - 1];
        
        if (!currentPlayerTime) return fastest;
        if (!fastest || !fastestTime || currentPlayerTime < fastestTime) {
          return player;
        }
        return fastest;
      }, null);

      if (fastestPlayer) {
        const submissionTime = fastestPlayer.stats.submissionTimes[fastestPlayer.stats.submissionTimes.length - 1];
        roundResult.extraBonuses.fastestSubmission = {
          playerId: fastestPlayer.id,
          point: 5,
          submissionTime: submissionTime // Include the actual submission time
        };
        fastestPlayer.score += 5;
        console.log(`   ⚡ Fastest submission bonus: ${fastestPlayer.name} (${submissionTime}ms, +5 points)`);
      }

      // Process rare words bonus
      const rareWordsBonus = game.players.map(player => {
        const rareWordsThisRound = player.stats.rareWords?.filter(rw => rw.round === game.currentRound - 1) || [];
        if (rareWordsThisRound.length > 0) {
          const points = rareWordsThisRound.length * 5;
          player.score += points;
          return {
            playerId: player.id,
            rareWords: rareWordsThisRound.map(rw => ({ word: rw.word, category: rw.category })), // Include the actual rare words
            point: points
          };
        }
        return null;
      }).filter(Boolean);

      if (rareWordsBonus.length > 0) {
        roundResult.extraBonuses.rareWords = rareWordsBonus;
        rareWordsBonus.forEach(bonus => {
          const player = game.players.find(p => p.id === bonus.playerId);
          console.log(`   💫 Rare words bonus: ${player.name} (${bonus.rareWords.map(rw => rw.word).join(', ')}, +${bonus.point} points)`);
        });
      }

      // Process longest word bonus
      const longestSubmission = roundResult.submissions.reduce((longest, submission) => {
        if (!submission.word || submission.category === 'names' || !submission.isValid) return longest;
        if (!longest || submission.word.length > longest.word.length) {
          return {
            playerId: submission.playerId,
            word: submission.word,
            category: submission.category
          };
        }
        return longest;
      }, null);

      if (longestSubmission) {
        roundResult.extraBonuses.longestWord = {
          playerId: longestSubmission.playerId,
          point: 5,
          word: longestSubmission.word,
          category: longestSubmission.category
        };
        const player = game.players.find(p => p.id === longestSubmission.playerId);
        player.score += 5;
        console.log(`   📏 Longest word bonus: ${player.name} ("${longestSubmission.word}" in ${longestSubmission.category}, +5 points)`);
      }
    }

    // Process master bonus - moved outside the initialization block since it depends on the current player's score
    if (master && id === master.id && score === maxPossibleScore) {
      roundResult.extraBonuses.master = {
        playerId: master.id,
        point: 10,
        letter: roundResult.letter
      };
      master.score += 10;
      master.stats.kingBonus +=1;
      console.log(`   👑 Master bonus: ${master.name} (perfect round with letter ${roundResult.letter}, +10 points)`);
    }


    // Process validated names
    const validNames = game.nameValidations.filter(v => v.playerId === id && v.finalResult === 'valid');
    console.log(`   ✍️ Valid names this round: ${validNames.length}`);
    validNames.forEach(v => {
      player.stats.allSubmittedWords.add(v.word.toLowerCase());
      console.log(`      Added validated name: ${v.word}`);
    });

    console.log(`   📈 Updated stats for ${player.name}:`, JSON.stringify(player.stats, null, 2));
  });


    // Re-emit game state with updated stats
    console.log("✅ Player stats updated");
    io.to(game.id).emit("gameStateUpdate", game);

  // Generate AI commentary for each player
  const AICommentaryService = require('../../services/AICommentaryService');
  const currentRoundIdx = game.roundResults.length - 1;
  const comments = AICommentaryService.generateCommentary(game, currentRoundIdx);
  
  // Add comments to round results
  roundResult.aiCommentary = Object.fromEntries(comments);
  
  console.log("\n🎭 AI Commentary for this round:");
  comments.forEach((comment, playerId) => {
    const player = game.players.find(p => p.id === playerId);
    console.log(`\n${player.name}:`);
    console.log(comment);
  });

  // Re-emit game state with commentary
  console.log("✅ Player stats updated");
  io.to(game.id).emit("gameStateUpdate", game);
  
  // Emit personalized comments to each player
  /*comments.forEach((comment, playerId) => {
    const playerSocket = game.players.find(p => p.id === playerId)?.socketId;
    if (playerSocket) {
      io.to(playerSocket).emit("aiCommentary", { comment });
    }
  });*/

  try {
    saveGameStateToMemory(game.id, game);
    saveGameStateToRedis(game.id, game);
    console.log("✅ Game state updated in Memory and redis (handleTimerEnd)");
  } catch (err) {
    console.error("❌ Failed to update game state in Memory or redis (handleTimerEnd):", err);
  }
};

module.exports = completeValidation;
