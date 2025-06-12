const createGame = require('../handlers/createGame');
const joinGame = require('../handlers/joinGame');
const submitWords = require('../handlers/submitWords');
const selectLetter = require('../handlers/selectLetter');
const handleVoteOnName = require('../handlers/handleVoteOnName');
const handleTimerEnd = require('../handlers/handleTimerEnd');
const completeValidation = require('../handlers/completeValidation');
const startGame = require('../handlers/startGame');

module.exports = {
  createGame,
  joinGame,
  startGame,
  submitWords,
  handleTimerEnd,
  handleVoteOnName,
  selectLetter,
};
