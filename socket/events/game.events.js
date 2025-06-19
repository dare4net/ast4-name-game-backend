const createGame = require('../handlers/createGame');
const joinGame = require('../handlers/joinGame');
const submitWords = require('../handlers/submitWords');
const selectLetter = require('../handlers/selectLetter');
const handleVoteOnName = require('../handlers/handleVoteOnName');
const handleTimerEnd = require('../handlers/handleTimerEnd');
const completeValidation = require('../handlers/completeValidation');
const startGame = require('../handlers/startGame');
const transferHostTitle = require('../handlers/transferHostTitle');
const removePlayer = require('../handlers/removePlayer');
const interruptVoting = require('../handlers/interruptVoting');
const rejoinGame = require('../handlers/rejoinGame');

module.exports = {
  createGame,
  joinGame,
  startGame,
  submitWords,
  handleTimerEnd,
  handleVoteOnName,
  selectLetter,
  transferHostTitle,
  removePlayer,
  interruptVoting,
  rejoinGame,
};
