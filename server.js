const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// In-memory storage for game states
const games = {};
let runnings = 0;
let totalVotes=0;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.send('AST4 Name Game Backend is running!');
});

function isWordDuplicate(word, allWords) {
  const occurrences = allWords.filter(w => w === word).length;
  return occurrences > 1; // Returns true if the word appears more than once
}

// Socket.io connection
io.on("connection", (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);

  // Create a new game
  socket.on("createGame", ({ playerName, categories }, callback) => {
    console.log("🎮 Creating new game:", { playerName, categories });
    const gameId = Math.random().toString(36).substr(2, 9);
    const hostPlayer = {
      id: socket.id,
      name: playerName,
      score: 0,
      isHost: true,
      isReady: true,
    };
    games[gameId] = {
      id: gameId,
      players: [hostPlayer,],
      phase: "lobby",
      categories: categories || [],
      usedLetters: [],
      currentRound: 0,
      roundResults: [],
      submissions: {},
      voteLength: 0,
      nextTurn: hostPlayer,
    };
    
    socket.join(gameId);
    console.log("✅ Game created successfully:", games[gameId]);
    if (typeof callback === "function") {
      callback({ gameId });
    }
    io.to(gameId).emit("gameStateUpdate", games[gameId]);
  });

  // Join an existing game
  socket.on("joinGame", ({ gameId, playerName }, callback) => {
    console.log("👤 Joining game:", { gameId, playerName });
    const game = games[gameId];
    if (game) {
      const newPlayer = {
        id: socket.id,
        name: playerName,
        score: 0,
        isHost: false,
        isReady: true,
      };
      game.players.push(newPlayer);
      socket.join(gameId);
      console.log("✅ Player joined successfully:", newPlayer);
      io.to(gameId).emit("gameStateUpdate", game);
      callback({ success: true });
    } else {
      console.error("❌ Game not found:", gameId);
      callback({ success: false, message: "Game not found" });
    }
  });

  // Handle word submissions
  socket.on("submitWords", ({ gameId, playerId, submissions }) => {
    console.log("📤 Handling word submissions:", { gameId, playerId, submissions });
    const game = games[gameId];
    if (game) {
      game.submissions[playerId] = submissions;
    
      // Process submissions (e.g., validate words, calculate scores)
      console.log(`Player ${playerId} submitted words:`, game.submissions[playerId]);
      //io.to(gameId).emit("gameStateUpdate", game);
    }
  });

  // Listen for timerEnd event from the host
  socket.on("timerEnd", ({ gameId }) => {
    console.log("⏰ Timer ended for game:", gameId);
    const game = games[gameId];
    if (game.phase !== "playing") {
      console.warn("⚠️ Timer end already processed for this round.");
      return;
    }
    if (game) {
      const hostPlayer = game.players.find(player => player.isHost);
      runnings++;
      if (!hostPlayer || hostPlayer.id !== socket.id) {
        console.error("❌ Unauthorized timerEnd event. Only the host can trigger this action:", socket.id);
        return;
      }

      if (!game.submissions || Object.keys(game.submissions).length === 0) {
        console.warn("⚠️ No submissions found for this round:", gameId);
        console.log(`this is the submissions:`, game.submissions);
      }


      const validationResults = {};
      const allSubmissions = [];
      const scores = {};
      game.nameValidations = []; // Initialize name validations
      const allWords = [];
            // Loop through all submissions and push words into allWords array
      for (const submissions of Object.values(game.submissions)) {
        for (const word of Object.values(submissions)) {
          if (word) { // Ensure the word is not empty or undefined
            allWords.push(word);
          }
        }
      }

      console.log("📋 All submitted words:", allWords);

      for (const [playerId, submissions] of Object.entries(game.submissions)) {
        let totalPlayerScore = 0;

        for (const [category, word] of Object.entries(submissions)) {
          
          
          const isValid = word ? true : false; // Replace with actual validation
          validationResults[word] = isValid;

          if (category === "names") {
            // Add to nameValidations
            game.nameValidations.push({
              word,
              playerId,
              votes: {},
              aiOpinion: "",
              finalResult: "",
            });
          } else {
            // Process other categories
            const isDuplicate = isWordDuplicate(word, allWords);

            // Process other categories
            const points = isValid ? (isDuplicate ? 5 : 10) : 0; // Assign 5 points for duplicates, 10 otherwise
            //const points = isValid ? 10 : 0; // Replace with real scoring logic

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
        player.score += scores[playerId];
      }

      const roundResults = {
        letter: game.currentLetter,
        submissions: allSubmissions,
        scores,
      };

      // Update game state
      game.roundResults.push(roundResults);
      game.voteLength = (game.players.length-1)*game.nameValidations.length;
      game.phase = "validation"; // Emit validation phase
      game.submissions = {}; // Clear submissions for the next round

      console.log("✅ Round processed successfully for all players:", roundResults);

      // Broadcast updated game state
      io.to(gameId).emit("gameStateUpdate", game);
    } else {
      console.error("❌ Game not found for timer end:", gameId);
    }
  });

  // Add voteOnName event
  socket.on("voteOnName", ({ gameId, word, playerId, vote }) => {
    console.log("📤 Vote received:", { gameId, word, playerId, vote });
    const game = games[gameId];
    if (game) {
      const nameValidation = game.nameValidations.find(validation => validation.word === word);
      if (nameValidation) {
        nameValidation.votes[playerId] = vote;
        console.log("✅ Vote recorded:", nameValidation);

        // Broadcast updated game state
        io.to(gameId).emit("gameStateUpdate", game);
      } else {
        console.warn("⚠️ Name not found for validation:", word);
      }
    } else {
      console.error("❌ Game not found for voteOnName:", gameId);
    }
    totalVotes++;
    if(totalVotes == game.voteLength){ 
      completeValidation(gameId);
      totalVotes = 0;
    }
  });

  // Add completeValidation event
  const completeValidation = ( gameId ) => {
    console.log("📤 Validation complete for game:", gameId);
    const game = games[gameId];
    const roundResult = game.roundResults[game.roundResults.length-1];
    if (game) {
      // Update scores based on final results
      game.nameValidations.forEach(validation => {
        const yesVotes = Object.values(validation.votes).filter(v => v === "yes").length;
        const noVotes = Object.values(validation.votes).filter(v => v === "no").length;
        const idkVotes = Object.values(validation.votes).filter(v => v === "idk").length;

        validation.finalResult = "invalid";
        validation.finalResult = yesVotes > noVotes ? "valid" : "invalid";

        const player = game.players.find(p => p.id === validation.playerId);
        if (validation.finalResult === "valid") {
          player.score += 10; // Add points for valid names
          roundResult.submissions.push({
            category: "names",
            isValid: true,
            playerId: validation.playerId,
            points: 10,
            word: validation.word,
          });
        }
        else{
          roundResult.submissions.push({
            category: "names",
            isValid: false,
            playerId: validation.playerId,
            points: 0,
            word: validation.word,
          });
        }
      });

      game.phase = "results"; // Emit results phase
      //game.nextTurn = game.players[(game.currentRound) % game.players.length].id;

      console.log("✅ Validation complete. Updated scores:", game.players);

      // Broadcast updated game state
      io.to(gameId).emit("gameStateUpdate", game);
    } else {
      console.error("❌ Game not found for completeValidation:", gameId);
    }
  }

  // Start the game
  socket.on("startGame", ({ gameId }, callback) => {
    console.log("🎮 Starting game:", gameId);

    const game = games[gameId];
    //game.voteLength = (game.players.length-1)*game.players.length;
    if (game) {
      const hostPlayer = game.players.find(player => player.isHost);
      if (!hostPlayer || hostPlayer.id !== socket.id) {
        console.error("❌ Unauthorized startGame event. Only the host can trigger this action:", socket.id);
        if (typeof callback === "function") {
          callback({ success: false, message: "Only the host can start the game." });
        }
        return;
      }

      game.phase = "letter-selection";
      //game.currentRound += 1;
      //game.currentTurn = game.players[(game.currentRound-1) % game.players.length].id; // Set the current turn based on the round number
      /*game.nameValidations = [

        {
    word: "John",
    playerId: "player1",
    votes: {
      player2: "yes",
      player3: "no",
    },
    aiOpinion: "valid",
    finalResult: "valid",
  },
  {
    word: "Doe",
    playerId: "player2",
    votes: {
      player1: "idk",
      player3: "yes",
    },
    aiOpinion: "invalid",
    finalResult: "invalid",
  },

      ];
      game.phase = "validation";*/
      console.log("✅ Game started successfully:", game);

      io.to(gameId).emit("gameStateUpdate", game);
      if (typeof callback === "function") {
        callback({ success: true });
      }
    } else {
      console.error("❌ Game not found for startGame:", gameId);
      if (typeof callback === "function") {
        callback({ success: false, message: "Game not found." });
      }
    }
  });

  // Select a letter
  socket.on("selectLetter", ({ gameId, letter }, callback) => {
    
    
    console.log("🎯 Letter selected:", { gameId, letter });
    
    const game = games[gameId];
    game.currentRound += 1;
    const nextTurnId = game.players[(game.currentRound) % game.players.length].id;
    game.nextTurn = game.players.find(player => player.id === nextTurnId);
    if (game) {
      const hostPlayer = game.players.find(player => player.isHost);
      /*if (!hostPlayer || hostPlayer.id !== socket.id) {
        console.error("❌ Unauthorized selectLetter event. Only the host can trigger this action:", socket.id);
        if (typeof callback === "function") {
          callback({ success: false, message: "Only the host can select a letter." });
        }
        return;
      }*/

      if (game.usedLetters.includes(letter)) {
        console.warn("⚠️ Letter already used:", letter);
        if (typeof callback === "function") {
          callback({ success: false, message: "Letter already used." });
        }
        return;
      }

      game.usedLetters.push(letter);
      game.currentLetter = letter;
      game.phase = "playing";
      console.log("✅ Letter selected successfully:", game);

      io.to(gameId).emit("timerUpdate", 30);
      io.to(gameId).emit("gameStateUpdate", game);
      if (typeof callback === "function") {
        callback({ success: true });
      }
    } else {
      console.error("❌ Game not found for selectLetter:", gameId);
      if (typeof callback === "function") {
        callback({ success: false, message: "Game not found." });
      }
    }
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log(`🔌 User disconnected: ${socket.id}`);
  });
});

// Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
