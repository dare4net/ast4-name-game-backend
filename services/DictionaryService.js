const fetch = require('node-fetch');

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
    if (!word || word.trim().length === 0) return { isValid: false, extract: '' };

    const normalizedWord = word.toLowerCase().trim();
    const cacheKey = `${normalizedWord}-${category}`;

    // Check cache first
    if (this.cache.has(cacheKey)) {
      console.log(`Cache hit for "${normalizedWord}" in category "${category}":`, this.cache.get(cacheKey));
      return this.cache.get(cacheKey);
    }

    try {
      console.log(`Validating word: "${normalizedWord}" for category "${category}"`);
      const response = await fetch(`${this.API_BASE}=${encodeURIComponent(normalizedWord)}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      console.log(`API Response for "${normalizedWord}":`, response.status, response.ok);

      let result = { isValid: false, extract: '' };

      if (response.ok) {
        try {
          const data = await response.json();
          console.log(`API Data for "${normalizedWord}":`, data);

          if (data.query?.pages) {
            const pageId = Object.keys(data.query.pages)[0];
            const page = data.query.pages[pageId];
            
            if (pageId !== "-1" && page.extract) {
              const extract = page.extract.toLowerCase();
              result.extract = extract;

              // Special handling for names category
              if (category === 'names') {
                // For names, check if it's mentioned as a given name, personal name, etc.
                result.isValid = extract.includes('given name') || 
                                extract.includes('personal name') || 
                                extract.includes('proper name') ||
                                extract.includes('first name') ||
                                extract.includes('surname');
              } 
              // For other categories, check for category-specific keywords
              else if (this.CATEGORY_KEYWORDS[category]) {
                result.isValid = this.CATEGORY_KEYWORDS[category].some(keyword => 
                  extract.includes(keyword)
                );
              }
              // If no category keywords found but the word exists, be lenient
              else {
                result.isValid = true;
              }
            }
          }
        } catch (jsonError) {
          console.error(`JSON parse error for "${normalizedWord}":`, jsonError);
        }
      } else {
        // API error - be lenient and check if word looks reasonable
        console.warn(`API error for "${normalizedWord}":`, response.status);
        result.isValid = this.isReasonableWord(normalizedWord);
      }

      // Cache the result with category
      this.cache.set(cacheKey, result);
      console.log(`Validation result for "${normalizedWord}" in category "${category}":`, result);

      return result;
    } catch (error) {
      console.error(`Network error validating "${normalizedWord}":`, error);
      // If API fails completely, be lenient and assume word is valid if it's reasonable
      const result = {
        isValid: this.isReasonableWord(normalizedWord),
        extract: ''
      };
      this.cache.set(cacheKey, result);
      return result;
    }
  }

  static isReasonableWord(word) {
    // Basic checks for reasonable words
    return word.length >= 2 && word.length <= 30 && /^[a-zA-Z\s'-]+$/.test(word) && !word.includes("  "); // No double spaces
  }

  static async validateWords(words, category) {
    const results = {};

    console.log(`Validating words for category "${category}":`, words);

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
        console.error(`Error validating word "${word}":`, error);
        results[word] = {
          isValid: this.isReasonableWord(word.toLowerCase().trim()),
          extract: ''
        };
      }
    }

    console.log(`Final validation results for category "${category}":`, results);
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
