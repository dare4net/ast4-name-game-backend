//const fetch = require('node-fetch');
const redis = require('./redis-client');

class DictionaryService {
  static API_BASE = "https://en.wiktionary.org/w/api.php";
  static WORDS_LIBRARY_API = "https://words-library.vercel.app/api";
  static CATEGORY_KEYWORDS = {
    animals: ['animal', 'species', 'mammal', 'bird', 'reptile', 'amphibian', 'fish', 'insect', 'creature', 'wildlife', 'fauna', 'zoo'],
    places: ['city', 'town', 'country', 'village', 'region', 'state', 'province', 'area', 'location', 'place', 'territory', 'district', 'municipality', 'capital'],
    things: ['object', 'item', 'tool', 'device', 'instrument', 'equipment', 'material', 'substance', 'artifact', 'product'],
    food: ['food', 'dish', 'cuisine', 'meal', 'ingredient', 'edible', 'fruit', 'vegetable', 'meat', 'beverage', 'drink'],
    colors: ['color', 'colour', 'shade', 'hue', 'tint', 'pigment'],
    movies: ['film', 'movie', 'cinema', 'picture', 'production', 'theatrical', 'drama', 'show']
  };

  static isEnglishWord(wikitext) {
    // Check if the word has an English language section
    return wikitext.includes('==english==') || 
           wikitext.includes('===etymology===') ||
           wikitext.includes('===pronunciation===') ||
           wikitext.includes('===noun===') ||
           wikitext.includes('===proper noun===');
  }

  static async getCache(cacheKey) {
    try {
      const value = await redis.get(`dict:${cacheKey}`);
      if (value !== null && value !== undefined) {
        console.log(`[DictionaryService][Redis] Cache hit for ${cacheKey} and the value is:`, value);
        return { isValid: value, extract: '' };
      }
      return null;
    } catch (err) {
      console.error(`[DictionaryService][Redis] Error getting cache for ${cacheKey}:`, err);
      return null;
    }
  }

  static async setCache(cacheKey, isValid) {
    try {
      await redis.set(`dict:${cacheKey}`, isValid ? 'true' : 'false', { ex: 60 * 60 * 24 * 360}); // 1yr expiry
      console.log(`[DictionaryService][Redis] Cache set for ${cacheKey}:`, isValid);
    } catch (err) {
      console.error(`[DictionaryService][Redis] Error setting cache for ${cacheKey}:`, err);
    }
  }

  static async validateWord(word, category) {
    if (!word || word.trim().length === 0) return { isValid: false, extract: '', rare: false };

    const normalizedWord = word.toLowerCase().trim();
    const cacheKey = `${normalizedWord}-${category}`;

    // Check Redis cache first
    const cached = await this.getCache(cacheKey);
    if (cached) {

    return { isValid: cached.isValid, extract: '', rare: false };
    }

    // Only use Words Library API for places category
    if (category === 'places' || category === 'animals') {
      console.log(`[DictionaryService] Checking Words Library API for ${category}:`, normalizedWord);
      try {
        const wlUrl = `${this.WORDS_LIBRARY_API}/${category}/${normalizedWord}`;
        console.log('[DictionaryService] Fetching Words Library API:', wlUrl);
        const wlRes = await fetch(wlUrl);
        console.log('[DictionaryService] Words Library API status:', wlRes.status);
        
        if (wlRes.ok) {
          const wlData = await wlRes.json();
          console.log(`[DictionaryService] Words Library API response for ${category}:`, { word: normalizedWord, exists: wlData.exists });
          
          if (typeof wlData.exists === 'boolean') {
            await this.setCache(cacheKey, wlData.exists);
            if (wlData.exists) {
              console.log(`[DictionaryService] Valid ${category} found in Words Library:`, normalizedWord);
              return { isValid: true, extract: '', rare: true };
            } else {
              console.log(`[DictionaryService] ${category} not found in Words Library, trying Wiktionary:`, normalizedWord);
              if(category === 'animals' ){
                return { isValid: false, extract: '', rare: false };
              }
            }
            console.log(`[DictionaryService] ${category} not found in Words Library, trying Wiktionary:`, normalizedWord);
            // Don't set cache here, let Wiktionary validation handle it
          } else {
            console.log('[DictionaryService] Unexpected Words Library response format for place:', wlData);
          }
        }
      } catch (error) {
        console.log(`[DictionaryService] Words Library API error for ${category}:`, { word: normalizedWord, error: error.message });
      }
    } else {
      console.log(`[DictionaryService] Skipping Words Library for non-place and non-animal category: ${category}, word: ${normalizedWord}`);
    }

    // 2. Fallback to Wiktionary API (existing logic)
    try {
      console.log(`Validating word: "${normalizedWord}" for category "${category}"`);
      const params = new URLSearchParams({
        action: 'parse',
        page: normalizedWord,
        prop: 'wikitext',
        format: 'json',
        origin: '*'
      });
      const wiktionaryUrl = `${this.API_BASE}?${params}`;
      console.log('[DictionaryService] Fetching Wiktionary API:', wiktionaryUrl);
      const response = await fetch(wiktionaryUrl, {
        method: "GET",
        headers: {
          'Accept': "application/json",
          'Content-Type': 'application/json',
        },
      });
      let isValid = false;
      let extract = '';
      console.log('[DictionaryService] Dictionary API response', {
        word: normalizedWord,
        status: response.status,
        ok: response.ok
      });
      if (response.ok) {
        try {
          const data = await response.json();
          if (data.parse?.wikitext?.['*']) {
            const wikitext = data.parse.wikitext['*'].toLowerCase();
            extract = wikitext;

            // First check if it's an English word
            /*if (!this.isEnglishWord(wikitext)) {
              result.isValid = false;
              result.extract = 'Not an English word';
              this.cache.set(cacheKey, result);
              return result;
            }*/

            // Special handling for names category
            if (category === 'names') {
              isValid = true; // If we got here, the word exists in dictionary
            }
            // For 'things' category - validate if it has Noun section OR contains category keyword
            else if (category === 'things') {
              const hasKeyword = this.CATEGORY_KEYWORDS[category].some(keyword => wikitext.includes(keyword));
              const isNoun = wikitext.includes('==noun==') || wikitext.includes('==proper noun==');
              isValid = isNoun || hasKeyword;
            }
            // For 'animals' category - strict validation requiring BOTH category keyword AND Noun section
            else if (category === 'animals') {
              const hasKeyword = this.CATEGORY_KEYWORDS[category].some(keyword => wikitext.includes(keyword));
              const isNoun = wikitext.includes('==noun==') || wikitext.includes('==proper noun==');
              console.log(`[DictionaryService] Animal validation details:`, {
                word: normalizedWord,
                hasKeyword,
                isNoun,
                matchedKeywords: this.CATEGORY_KEYWORDS[category].filter(keyword => wikitext.includes(keyword))
              });
              isValid = hasKeyword && isNoun;
            }
            // For 'places' category - only check category keywords
            else if (category === 'places') {
              const hasKeyword = this.CATEGORY_KEYWORDS[category].some(keyword => wikitext.includes(keyword));
              console.log(`[DictionaryService] Place validation details:`, {
                word: normalizedWord,
                hasKeyword,
                matchedKeywords: this.CATEGORY_KEYWORDS[category].filter(keyword => wikitext.includes(keyword))
              });
              isValid = hasKeyword;
            }
            // For other categories, keep existing behavior
            else if (this.CATEGORY_KEYWORDS[category]) {
              const hasKeyword = this.CATEGORY_KEYWORDS[category].some(keyword => wikitext.includes(keyword));
              const isNoun = wikitext.includes('==noun==') || wikitext.includes('==proper noun==');
              console.log(`[DictionaryService] ${category} validation details:`, {
                word: normalizedWord,
                hasKeyword,
                isNoun,
                matchedKeywords: this.CATEGORY_KEYWORDS[category].filter(keyword => wikitext.includes(keyword))
              });
              isValid = hasKeyword && isNoun;
            }
            // If no category keywords found but the word exists and has a noun section, be lenient
            else {
              //result.isValid = wikitext.includes('==noun==') || wikitext.includes('==proper noun==');
              isValid = false; // Default to false if no category keywords are defined
            }
            

          }
        } catch (jsonError) {
          console.error(`JSON parse error for "${normalizedWord}":`, jsonError);
        }
        await this.setCache(cacheKey, isValid);
      } else {
        // API error - be lenient and check if word looks reasonable
        console.warn(`API error for "${normalizedWord}":`, response.status);
        isValid = this.isReasonableWord(normalizedWord);
      }
      console.log(`Validation result for "${normalizedWord}" in category "${category}":`, isValid);
      return { isValid, extract: '', rare: true };
    } catch (error) {
      console.error(`Network error validating "${normalizedWord}":`, error);
      const isValid = this.isReasonableWord(normalizedWord);
      // Do not cache network errors
      return { isValid, extract: '', rare: false };
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
    // Optionally clear Redis cache for all dict:* keys (not implemented here)
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
