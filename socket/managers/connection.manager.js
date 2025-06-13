const { 
    trackPlayerSession, 
    removePlayerSession, 
    getPlayerSession,
    isPlayerNameAvailable 
} = require('../store/player.store');
const { games } = require('../store/game.store');

/**
 * Handles player connections and reconnections
 */
const ConnectionManager = {
    /**
     * Handle a new connection or reconnection
     * @param {Object} socket - The socket instance
     * @param {Object} io - The Socket.IO server instance
     * @param {string} gameId - The game ID
     * @param {string} playerName - The player's name
     * @returns {Object} The result of the connection attempt
     */
    handleConnection: async (socket, io, gameId, playerName) => {
        const game = games[gameId];
        if (!game) {
            return { success: false, message: "Game not found" };
        }

        // Check if this is a reconnection
        const existingPlayer = game.players.find(p => p.name === playerName);
        if (existingPlayer) {
            // Update the player's socket ID
            existingPlayer.id = socket.id;
            existingPlayer.disconnected = false; // Clear disconnected flag

            // Update session tracking
            trackPlayerSession(socket.id, {
                gameId,
                playerName,
                isHost: existingPlayer.isHost
            });

            // Join the game room
            socket.join(gameId);

            console.log(`🔄 Player ${playerName} reconnected (${socket.id})`);
            io.to(gameId).emit("gameStateUpdate", game);

            return {
                success: true,
                message: "Reconnected to game",
                isReconnection: true,
                player: existingPlayer,
                gameState: game
            };
        }

        // Check if name is available
        if (!isPlayerNameAvailable(playerName, gameId)) {
            return {
                success: false,
                message: "Name already taken"
            };
        }

        // Check max players
        if (game.players.length >= (game.settings?.maxPlayers || 8)) {
            return {
                success: false,
                message: "Game is full"
            };
        }

        return { success: true };
    },

    /**
     * Handle a disconnection
     * @param {Object} socket - The socket instance
     * @param {Object} io - The Socket.IO server instance
     */
    handleDisconnect: (socket, io) => {
        const session = getPlayerSession(socket.id);
        if (!session) return;

        const { gameId, playerName } = session;
        const game = games[gameId];
        if (!game) return;

        const player = game.players.find(p => p.id === socket.id);
        if (!player) return;

        // Mark player as disconnected but don't remove yet
        player.disconnected = true;
        io.to(gameId).emit("gameStateUpdate", game);

        // Set a timeout to remove the player if they don't reconnect
        setTimeout(() => {
            // Only remove if still disconnected
            if (player.disconnected) {
                game.players = game.players.filter(p => p.id !== socket.id);
                removePlayerSession(socket.id);

                if (game.players.length === 0) {
                    delete games[gameId];
                } else {
                    io.to(gameId).emit("gameStateUpdate", game);
                }
            }
        }, 120000); // 30 seconds to reconnect
    }
};

module.exports = ConnectionManager;
