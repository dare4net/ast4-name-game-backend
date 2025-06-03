//const fetch = require('node-fetch');

class DictionaryService {
  //static API_BASE = "https://api.dictionaryapi.dev/api/v2/entries/en";
  static API_BASE = "https://en.wiktionary.org/w/api.php?action=query&format=json&prop=extracts&titles";
  static cache = new Map();

  static async validateWord(word) {
    if (!word || word.trim().length === 0) return false;

    const normalizedWord = word.toLowerCase().trim();

    // Check cache first
    if (this.cache.has(normalizedWord)) {
      console.log(`Cache hit for "${normalizedWord}":`, this.cache.get(normalizedWord));
      return this.cache.get(normalizedWord);
    }

    try {
      console.log(`Validating word: "${normalizedWord}"`);
      const response = await fetch(`${this.API_BASE}=${encodeURIComponent(normalizedWord)}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      console.log(`API Response for "${normalizedWord}":`, response.status, response.ok);

      let isValid = false;

      if (response.ok) {
        try {
          const data = await response.json();
          console.log(`API Data for "${normalizedWord}":`, data);
          // If we get a valid JSON response with meanings, the word exists
          //isValid = Array.isArray(data) && data.length > 0 && data[0].meanings && data[0].meanings.length > 0;
          isValid = data.warnings.extracts;
        } catch (jsonError) {
          console.error(`JSON parse error for "${normalizedWord}":`, jsonError);
          isValid = false;
        }
      } else if (response.status === 404) {
        // 404 means word not found - this is expected for invalid words
        isValid = false;
      } else {
        // Other errors - be lenient and check if word looks reasonable
        console.warn(`API error for "${normalizedWord}":`, response.status);
        isValid = this.isReasonableWord(normalizedWord);
      }

      // Cache the result
      this.cache.set(normalizedWord, isValid);
      console.log(`Validation result for "${normalizedWord}":`, isValid);

      return isValid;
    } catch (error) {
      console.error(`Network error validating "${normalizedWord}":`, error);
      // If API fails completely, be lenient and assume word is valid if it's reasonable
      const isReasonable = this.isReasonableWord(normalizedWord);
      this.cache.set(normalizedWord, isReasonable);
      return isReasonable;
    }
  }

  static isReasonableWord(word) {
    // Basic checks for reasonable words
    return word.length >= 2 && word.length <= 30 && /^[a-zA-Z\s'-]+$/.test(word) && !word.includes("  "); // No double spaces
  }

  static async validateWords(words) {
    const results = {};

    console.log("Validating words:", words);

    // Filter out empty words
    const validWords = words.filter((word) => word && word.trim().length > 0);

    if (validWords.length === 0) {
      return results;
    }

    // Validate words with a small delay between requests to avoid rate limiting
    for (const word of validWords) {
      try {
        const isValid = await this.validateWord(word);
        results[word] = isValid;

        // Small delay to be nice to the API
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error validating word "${word}":`, error);
        results[word] = this.isReasonableWord(word.toLowerCase().trim());
      }
    }

    console.log("Final validation results:", results);
    return results;
  }

  static clearCache() {
    this.cache.clear();
  }
}

module.exports = DictionaryService;
