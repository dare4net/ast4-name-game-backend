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
     * @param {string} playerId - The player's persistent id
     * @param {string} playerName - The player's name (for renaming only)
     * @returns {Object} The result of the connection attempt
     */
    handleConnection: async (socket, io, gameId, playerId, playerName) => {
        const game = games[gameId];
        if (!game) {
            return { success: false, message: "Game not found" };
        }

        // Check if this is a reconnection by playerId
        const existingPlayer = game.players.find(p => p.id === playerId);
        if (existingPlayer) {
            // Update the player's socket ID
            existingPlayer.socketId = socket.id;
            existingPlayer.disconnected = false; // Clear disconnected flag
            // Optionally update name if changed
            if (playerName && playerName !== existingPlayer.name) {
                existingPlayer.name = playerName;
            }
            // Update session tracking
            trackPlayerSession(socket.id, {
                gameId,
                playerId,
                playerName: existingPlayer.name,
                isHost: existingPlayer.isHost
            });
            // Join the game room
            socket.join(gameId);
            console.log(`🔄 Player ${existingPlayer.name} (id: ${playerId}) reconnected (${socket.id})`);
            io.to(gameId).emit("gameStateUpdate", game);
            return {
                success: true,
                message: "Reconnected to game",
                isReconnection: true,
                player: existingPlayer,
                gameState: game
            };
        }

        // Check if id is already in use (should not happen, but for safety)
        if (game.players.some(p => p.id === playerId)) {
            return {
                success: false,
                message: "Player ID already in use"
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

        const { gameId, playerId } = session;
        const game = games[gameId];
        if (!game) return;

        const player = game.players.find(p => p.id === playerId);
        if (!player) return;

        // Mark player as disconnected but don't remove yet
        player.disconnected = true;
        io.to(gameId).emit("gameStateUpdate", game);

        // Set a timeout to remove the player if they don't reconnect
        setTimeout(() => {
            // Only remove if still disconnected
            if (player.disconnected) {
                game.players = game.players.filter(p => p.id !== playerId);
                removePlayerSession(socket.id);

                if (game.players.length === 0) {
                    delete games[gameId];
                } else {
                    io.to(gameId).emit("gameStateUpdate", game);
                }
            }
        }, 120000); // 2 minutes to reconnect
    }
};

module.exports = ConnectionManager;
