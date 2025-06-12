const calculateUniqueWords = (game) => {
  // Create a map to count word occurrences across all players
  const wordOccurrences = new Map();
  
  // Count occurrences of each word across all players
  game.players.forEach(player => {
    if (player.stats && player.stats.allSubmittedWords) {
      Array.from(player.stats.allSubmittedWords).forEach(word => {
        wordOccurrences.set(word, (wordOccurrences.get(word) || 0) + 1);
      });
    }
  });

  // Update unique word count for each player
  game.players.forEach(player => {
    if (player.stats && player.stats.allSubmittedWords) {
      // Count words that appear only once in the game (unique to this player)
      player.stats.uniqueWords = Array.from(player.stats.allSubmittedWords)
        .filter(word => wordOccurrences.get(word) === 1).length;
    }
  });
};

module.exports = calculateUniqueWords;
