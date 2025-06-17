const fetch = require('node-fetch');
const logger = require('../config/logger');

class DictionaryService {
  static API_BASE = "https://en.wiktionary.org/w/api.php?action=query&format=json&prop=extracts&titles";
  static cache = new Map(); // Format: Map<`${word}-${category}`, {isValid: boolean, extract: string}>

  static CATEGORY_KEYWORDS = {
    animals: ['animal', 'species', 'mammal', 'bird', 'reptile', 'amphibian', 'fish', 'insect', 'creature', 'wildlife', 'fauna', 'zoo'],
    places: ['city', 'town', 'country', 'village', 'region', 'state', 'province', 'area', 'location', 'place', 'territory', 'district', 'municipality', 'capital'],
    things: ['object', 'item', 'tool', 'device', 'instrument', 'equipment', 'material', 'substance', 'artifact', 'product'],
    food: ['food', 'dish', 'cuisine', 'meal', 'ingredient', 'edible', 'fruit', 'vegetable', 'meat', 'beverage', 'drink'],
    colors: ['color', 'colour', 'shade', 'hue', 'tint', 'pigment'],
    movies: ['film', 'movie', 'cinema', 'picture', 'production', 'theatrical', 'drama', 'show']
  };

  static async validateWord(word, category) {
    const normalizedWord = word.toLowerCase().trim();
    const cacheKey = `${category}:${normalizedWord}`;

    if (this.cache.has(cacheKey)) {
      logger.debug('Dictionary cache hit', {
        word: normalizedWord,
        category,
        result: this.cache.get(cacheKey)
      });
      return this.cache.get(cacheKey);
    }

    logger.debug('Validating word', {
      word: normalizedWord,
      category
    });

    try {
      const response = await fetch(`${this.apiUrl}/word/${normalizedWord}`);
      
      logger.debug('Dictionary API response', {
        word: normalizedWord,
        status: response.status,
        ok: response.ok
      });

      if (response.ok) {
        const data = await response.json();
        logger.debug('Dictionary API data received', {
          word: normalizedWord,
          data
        });

        // Process validation logic
        const result = this.processValidation(data, category);
        
        // Cache the result
        this.cache.set(cacheKey, result);
        
        logger.info('Word validation complete', {
          word: normalizedWord,
          category,
          isValid: result
        });
        
        return result;
      }
      return false;
    } catch (error) {
      logger.error('Dictionary API error', {
        word: normalizedWord,
        error: error.message
      });
      return false;
    }
  }

  static isReasonableWord(word) {
    // Basic checks for reasonable words
    return word.length >= 2 && word.length <= 30 && /^[a-zA-Z\s'-]+$/.test(word) && !word.includes("  "); // No double spaces
  }

  static async validateWords(words, category) {
    const results = {};

    logger.info(`Validating words for category "${category}":`, words);

    // Filter out empty words
    const validWords = words.filter((word) => word && word.trim().length > 0);

    if (validWords.length === 0) {
      return results;
    }

    // Validate words with a small delay between requests to avoid rate limiting
    for (const word of validWords) {
      try {
        const result = await this.validateWord(word, category);
        results[word] = result;

        // Small delay to be nice to the API
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        logger.error(`Error validating word "${word}":`, error);
        results[word] = {
          isValid: this.isReasonableWord(word.toLowerCase().trim()),
          extract: ''
        };
      }
    }

    logger.info(`Final validation results for category "${category}":`, results);
    return results;
  }

  static clearCache() {
    this.cache.clear();
  }

  // Helper method to get category keywords
  static getCategoryKeywords(category) {
    return this.CATEGORY_KEYWORDS[category] || [];
  }

  // Helper method to add new keywords for a category
  static addCategoryKeywords(category, keywords) {
    if (!this.CATEGORY_KEYWORDS[category]) {
      this.CATEGORY_KEYWORDS[category] = [];
    }
    this.CATEGORY_KEYWORDS[category].push(...keywords);
  }
}

module.exports = DictionaryService;
