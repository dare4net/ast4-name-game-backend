const isWordDuplicate = (word, allWords) => {
  const occurrences = allWords.filter(w => w === word).length;
  return occurrences > 1;
};

const calculateWordScore = (word, isValid, isDuplicate) => {
  if (!isValid) return 0;
  return isDuplicate ? 5 : 10;
};

const collectAllWords = (submissions) => {
  const allWords = [];
  for (const submissions of Object.values(submissions)) {
    for (const word of Object.values(submissions)) {
      if (word) {
        allWords.push(word);
      }
    }
  }
  return allWords;
};

const validateSubmission = async (word, currentLetter, wordsValidation) => {
  if (!word) return false;
  if (word[0].toLowerCase() !== currentLetter.toLowerCase()) return false;
  return wordsValidation[word] || false;
};

const processRoundResults = async (game, DictionaryService) => {
  const allWords = collectAllWords(game.submissions);
  const wordsValidation = await DictionaryService.validateWords(allWords);
  
  const validationResults = {};
  const allSubmissions = [];
  const scores = {};
  game.nameValidations = [];

  for (const [playerId, submissions] of Object.entries(game.submissions)) {
    let totalPlayerScore = 0;

    for (const [category, word] of Object.entries(submissions)) {
      const isValid = await validateSubmission(word, game.currentLetter, wordsValidation);
      validationResults[word] = isValid;

      if (category === "names") {
        game.nameValidations.push({
          word,
          playerId,
          votes: {},
          aiOpinion: wordsValidation[word] ? "valid" : "invalid",
          finalResult: "",
        });
      } else {
        const isDuplicate = isWordDuplicate(word, allWords);
        const points = calculateWordScore(word, isValid, isDuplicate);
        totalPlayerScore += points;

        allSubmissions.push({
          playerId,
          category,
          word,
          isValid,
          points,
        });
      }
    }

    scores[playerId] = totalPlayerScore;
    const player = game.players.find(p => p.id === playerId);
    if (player) {
      player.score += totalPlayerScore;
    }
  }

  game.voteLength = (game.players.length - 1) * game.nameValidations.length;

  return {
    letter: game.currentLetter,
    submissions: allSubmissions,
    scores,
  };
};

const handleNameValidation = (game, io) => {
  console.log("📤 Validation complete for game:", game.id);
  const roundResult = game.roundResults[game.roundResults.length - 1];

  if (!game || !roundResult) {
    console.error("❌ Invalid game state for validation completion");
    return;
  }

  // Process each name validation
  game.nameValidations.forEach(validation => {
    const yesVotes = Object.values(validation.votes).filter(v => v === "yes").length;
    const totalVotes = Object.values(validation.votes).length;
    const validationThreshold = Math.ceil(totalVotes / 2);

    // Determine if name is valid based on votes
    const isValid = yesVotes >= validationThreshold;
    validation.finalResult = isValid ? "valid" : "invalid";

    // Find the player and update their score
    const player = game.players.find(p => p.id === validation.playerId);
    if (player) {
      const points = isValid ? 10 : 0;
      player.score += points;

      // Add to round results
      roundResult.submissions.push({
        playerId: validation.playerId,
        category: "names",
        word: validation.word,
        isValid,
        points,
      });
    }
  });

  // Move to next phase
  if (game.currentRound >= 3) {
    game.phase = "finished";
  } else {
    game.phase = "results";
  }

  // Update game state for all players
  io.to(game.id).emit("gameStateUpdate", game);
};

module.exports = {
  isWordDuplicate,
  calculateWordScore,
  collectAllWords,
  validateSubmission,
  processRoundResults,
  handleNameValidation,
};
