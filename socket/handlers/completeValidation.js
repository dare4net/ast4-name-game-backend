const { games } = require('../store/game.store');
const DictionaryService = require('../../utils/dictionary-service');
const { saveGameStateToRedis } = require('../../services/gameStateService');
const { saveGameStateToMemory } = require('../../services/gameStateMemoryService');

const completeValidation = (game, io) => {
  console.log("📤 Validation complete for game:", game.id);
  
  // Check if round results are ready
  if (!game.roundResultReady) {
    console.log("⏳ Waiting for round results to be ready...");
    // Try again in 1 second
    setTimeout(() => completeValidation(game, io), 1000);
    return;
  }
  game.roundResultReady = false;
  const roundResultIndex = game.roundResults.length - 1;
  const roundResult = game.roundResults[roundResultIndex];
  
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
        
  
  // Process perfect rounds and letter mastery
  console.log("\n📊 Processing perfect rounds and letter mastery");
  const maxPossibleScore = (game.selectedCategories.length * 10); // 10 points per category + 10 for name

  Object.entries(roundResult.scores).forEach(([id, score]) => {
    const player = game.players.find(p => p.id === id);
    if (!player) {
      console.warn(`⚠️ Player ${id} not found for stats calculation`);
      return;
    }

    // Initialize stats if needed
    if (!player.stats) {
      player.stats = {
        perfectRounds: 0,
        letterMastered: [],
        kingBonus: 0
      };
    }

    // Check for perfect round and letter mastery
    if (score === maxPossibleScore) {
      player.stats.perfectRounds = (player.stats.perfectRounds || 0) + 1;
      
      // If this was their turn and they got a perfect round, they mastered the letter
      if (master && id === master.id) {
        player.stats.letterMastered.push(roundResult.letter);
        roundResult.extraBonuses.master = {
          playerId: master.id,
          point: 10,
          letter: roundResult.letter
        };
        master.score += 10;
        master.stats.kingBonus += 1;
        console.log(`   👑 Master bonus: ${master.name} (perfect round with letter ${roundResult.letter}, +10 points)`);
      }
      
      console.log(`   🌟 PERFECT ROUND! ${player.name} now has ${player.stats.perfectRounds} perfect rounds`);
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
