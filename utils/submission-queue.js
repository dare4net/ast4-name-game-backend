const DictionaryService = require('./dictionary-service');

class SubmissionQueue {
  constructor() {
    // Prioritized name validation
    this.nameResults = new Map(); // Map<gameId, Map<playerId, { word, validation, isStartValid }>>
    this.namePromises = new Map(); // Map<gameId, Map<playerId, Promise>>
    // Parallel other category validation
    this.otherResults = new Map(); // Map<gameId, Map<playerId, { [category]: { word, validation, isStartValid } }>>
    this.otherPromises = new Map(); // Map<gameId, Map<playerId, Promise>>
    this.currentLetters = new Map(); // Map<gameId, string>
  }

  async queueSubmission(gameId, playerId, submissions) {
    // Initialize maps for this game if needed
    if (!this.nameResults.has(gameId)) {
      this.nameResults.set(gameId, new Map());
      this.namePromises.set(gameId, new Map());
      this.otherResults.set(gameId, new Map());
      this.otherPromises.set(gameId, new Map());
    }
    const currentLetter = this.currentLetters.get(gameId);
    // Prioritized name validation (skip empty names)
    const name = submissions.names || submissions.name;
    let namePromise = null;
    if (name && name.trim().length > 0) {
      namePromise = this.validateName(name, gameId, currentLetter)
        .then(result => {
          if (!this.nameResults.has(gameId)) this.nameResults.set(gameId, new Map());
          this.nameResults.get(gameId).set(playerId, result);
          return result;
        })
        .catch(error => {
          console.error(`Error validating name for player ${playerId} in game ${gameId}:`, error);
          return null;
        });
      if (!this.namePromises.has(gameId)) this.namePromises.set(gameId, new Map());
      this.namePromises.get(gameId).set(playerId, namePromise);
    }
    // Validate other categories in parallel (excluding 'names'/'name')
    const otherCategories = Object.entries(submissions).filter(([cat]) => cat !== 'names' && cat !== 'name');
    const otherPromise = this.validateOtherCategories(otherCategories, gameId, currentLetter)
      .then(result => {
        if (!this.otherResults.has(gameId)) this.otherResults.set(gameId, new Map());
        this.otherResults.get(gameId).set(playerId, result);
        return result;
      })
      .catch(error => {
        console.error(`Error validating other categories for player ${playerId} in game ${gameId}:`, error);
        return null;
      });
    if (!this.otherPromises.has(gameId)) this.otherPromises.set(gameId, new Map());
    this.otherPromises.get(gameId).set(playerId, otherPromise);
    return { namePromise: this.namePromises.get(gameId).get(playerId), otherPromise };
  }

  async validateName(name, gameId, currentLetter) {
    if (!name) return { word: '', validation: { isValid: false, extract: '' }, isStartValid: false };
    try {
      const validation = await DictionaryService.validateWord(name, 'names');
      return {
        word: name,
        validation,
        isStartValid: name[0].toLowerCase() === currentLetter?.toLowerCase()
      };
    } catch (error) {
      return {
        word: name,
        validation: { isValid: false, extract: 'Error during validation' },
        isStartValid: name[0].toLowerCase() === currentLetter?.toLowerCase()
      };
    }
  }

  async validateOtherCategories(otherCategories, gameId, currentLetter) {
    const validated = {};
    for (const [category, word] of otherCategories) {
      if (!word) continue;
      try {
        const validation = await DictionaryService.validateWord(word, category);
        validated[category] = {
          word,
          validation,
          isStartValid: word[0].toLowerCase() === currentLetter?.toLowerCase()
        };
      } catch (error) {
        validated[category] = {
          word,
          validation: { isValid: false, extract: 'Error during validation' },
          isStartValid: word[0].toLowerCase() === currentLetter?.toLowerCase()
        };
      }
    }
    return validated;
  }

  // Wait for all name validations for this round
  async waitForAllNames(gameId, playerCount) {
    const namePromises = this.namePromises.get(gameId);
    if (!namePromises) return;
    await Promise.all(Array.from(namePromises.values()).slice(0, playerCount));
  }

  // Wait for all other category validations for this round
  async waitForAllOtherCategories(gameId, playerCount) {
    const otherPromises = this.otherPromises.get(gameId);
    if (!otherPromises) return;
    await Promise.all(Array.from(otherPromises.values()).slice(0, playerCount));
  }

  // Get all validated name results for this round
  getAllNameResults(gameId) {
    const nameResults = this.nameResults.get(gameId);
    if (!nameResults) return [];
    return Array.from(nameResults.entries())
      .map(([playerId, result]) => ({ ...result, playerId }))
      .filter(result => result.word && result.word.trim().length > 0);
  }

  // Get all validated other category results for this round
  getAllOtherResults(gameId) {
    const otherResults = this.otherResults.get(gameId);
    if (!otherResults) return new Map();
    return otherResults;
  }

  // Clear only the per-round submission data for a game
  clearRound(gameId) {
    if (this.nameResults.has(gameId)) this.nameResults.set(gameId, new Map());
    if (this.namePromises.has(gameId)) this.namePromises.set(gameId, new Map());
    if (this.otherResults.has(gameId)) this.otherResults.set(gameId, new Map());
    if (this.otherPromises.has(gameId)) this.otherPromises.set(gameId, new Map());
  }

  // Clear all data for a game
  clearGame(gameId) {
    this.nameResults.delete(gameId);
    this.namePromises.delete(gameId);
    this.otherResults.delete(gameId);
    this.otherPromises.delete(gameId);
    this.currentLetters.delete(gameId);
  }

  setCurrentLetter(gameId, letter) {
    this.currentLetters.set(gameId, letter);
  }

  // Wait for all validations and return a combined map of all results
  async getGameResults(gameId, submittedCount) {
    await this.waitForAllNames(gameId, submittedCount);
    await this.waitForAllOtherCategories(gameId, submittedCount);
    // Combine name and other results into a single map
    const results = new Map();
    const nameResults = this.nameResults.get(gameId) || new Map();
    const otherResults = this.otherResults.get(gameId) || new Map();
    for (const [playerId, nameResult] of nameResults.entries()) {
      results.set(playerId, { names: nameResult });
    }
    for (const [playerId, categories] of otherResults.entries()) {
      if (!results.has(playerId)) results.set(playerId, {});
      Object.assign(results.get(playerId), categories);
    }
    return results;
  }
}

// Create a singleton instance
const submissionQueue = new SubmissionQueue();

module.exports = submissionQueue;