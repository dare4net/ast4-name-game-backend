const path = require('path');
const fs = require('fs');

// Load comments from JSON file
const loadComments = () => {
  const commentsPath = path.join(__dirname, '..', '..', 'config', 'gameComments.json');
  try {
    const rawData = fs.readFileSync(commentsPath, 'utf8');
    const comments = JSON.parse(rawData);
    return {
      BONUS_COMMENTS: comments.BONUS_COMMENTS,
      SITUATIONS: comments.SITUATIONS
    };
  } catch (error) {
    console.error('Error loading game comments:', error);
    throw new Error('Failed to load game comments');
  }
};

// Load comments once when the service starts
const { BONUS_COMMENTS, SITUATIONS } = loadComments();
console.log("✅ Game comments loaded successfully from config/gameComments.json");

module.exports = {
  BONUS_COMMENTS,
  SITUATIONS
};
