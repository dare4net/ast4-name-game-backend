const { games } = require('../store/game.store');
const DictionaryService = require('../../utils/dictionary-service');
const {
  getGameStateFromMemory,
  saveFinalGameStateToMemory,
  deleteGameStateFromMemory
} = require('../../services/gameStateMemoryService');

const completeValidation = async (game, io) => {
  console.log("📤 Validation complete for game:", game.id);
  const roundResult = game.roundResults[game.roundResults.length - 1];
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
  const maxRounds = game.maxRound || game.players.length * 2 || 26;// or whatever your game's max rounds is
  if (game.currentRound >= maxRounds) {
    //calculateUniqueWords(game);
    game.phase = "finished";
    // Save final state to Memory and clean up
    try {
      const finalState = await getGameStateFromMemory(game.id);
      await saveFinalGameStateToMemory(game.id, finalState || game);
      await deleteGameStateFromMemory(game.id);
      console.log("✅ Final game state saved to Memory and deleted from Memory store");
    } catch (err) {
      console.error("❌ Failed to save final game state:", err);
    }
  }

  const nextTurnId = game.players[game.currentRound % game.players.length].id;
  game.nextTurn = game.players.find(player => player.id === nextTurnId);
  console.log("✅ Validation complete. Updated scores:", game.players);
  
  // First, emit game state with round results
  io.to(game.id).emit("gameStateUpdate", game);
        
  
  // Then update player stats after the initial emit - check roundResult scores
  const maxPossibleScore = (game.selectedCategories.length * 10); // 10 points per category + 10 for name
  Object.entries(roundResult.scores).forEach(([id, score]) => {
    const player = game.players.find(p => p.id === id);
    console.log(`maxPossibleScore: ${maxPossibleScore}, Player ${player.name} score: ${score}`);

    if (player && score === maxPossibleScore) {
      if (!player.stats) player.stats = { perfectRounds: 0 };
      player.stats.perfectRounds = (player.stats.perfectRounds || 0) + 1;
      console.log(`✅ Player ${player.name} achieved a perfect round!`);
    }else{
      console.log(`❌ Player ${player.name} did not achieve a perfect round.`);
    }

  });

  // Re-emit game state with updated stats
  console.log("✅ Player stats updated");
  io.to(game.id).emit("gameStateUpdate", game);
};

module.exports = completeValidation;
