const { getGame, updateGameState } = require('./game.store');

/**
 * Tracks active player sessions and their game assignments.
 * This helps with reconnection and prevents duplicate players.
 */
const playerSessions = new Map();

// Store Socket.IO server instance
let ioInstance = null;

// Constants for activity tracking
const ACTIVITY_CHECK_INTERVAL = 30 * 1000; // Check every 30 seconds
const INACTIVE_THRESHOLD = 60 * 1000; // 1 minute without activity marks as inactive

/**
 * Initialize the player store with Socket.IO instance
 * @param {Object} io - The Socket.IO server instance
 */
const initializeStore = (io) => {
    ioInstance = io;
};

/**
 * Store a player's session information
 * @param {string} socketId - The socket ID of the player
 * @param {Object} sessionInfo - Session information
 * @param {string} sessionInfo.gameId - The game ID the player is in
 * @param {string} sessionInfo.playerId - The player's persistent id
 * @param {string} sessionInfo.playerName - The player's name
 * @param {boolean} sessionInfo.isHost - Whether the player is the host
 */
const trackPlayerSession = async (playerId, { gameId, playerName, isHost, socketId }) => {
    if (!ioInstance) {
        console.error('Socket.IO instance not initialized in player store');
        return;
    }

    console.log(`📝 Tracking session for player ${playerName} (id: ${playerId}, socket: ${socketId}) in game ${gameId} is he the host? ${isHost}`);
    
    // Update session tracking
    playerSessions.set(playerId, {
        gameId,
        playerId,
        playerName,
        isHost,
        socketId,
        lastActivity: Date.now(),
        isActive: true
    });

    // Update player status in game state
    const gameState = getGame(gameId);
    if (gameState && gameState.players) {
        const player = gameState.players.find(p => p.id === playerId);
        if (player) {
            player.status = 'active';
            await updateGameState(gameId, gameState);
        }
    }

    // Notify others in the game about the new active player
    ioInstance.to(gameId).emit('playerStatusUpdate', {
        playerId,
        isActive: true,
        status: 'active'
    });
    console.log(`get new player session: ${JSON.stringify(playerSessions.get(playerId))} using playerId: ${playerId}`);
};

/**
 * Remove a player's session by playerId
 * @param {string} playerId - The playerId to remove
 */
const removePlayerSession = (playerId) => {
    for (const [socketId, session] of playerSessions.entries()) {
        if (session.playerId === playerId) {
            console.log(`🗑️ Removing session for player ${session.playerName} (id: ${playerId})`);
            playerSessions.delete(socketId);
            break;
        }
    }
};

/**
 * Get a player's session information
 * @param {string} socketId - The socket ID to look up
 * @returns {Object|undefined} The session info or undefined if not found
 */
/*const getPlayerSession = (socketId) => {
    const session = playerSessions.get(socketId);
    if (session) {
        session.lastSeen = Date.now(); // Update last seen timestamp
    }
    return session;
};*/

/**
 * Get a player's session information by playerId
 * @param {string} playerId - The player's persistent id
 * @returns {Object|undefined} The session info or undefined if not found
 */
const getPlayerSession = (playerId) => {
    const session = playerSessions.get(playerId);
        if (session) {
            session.lastSeen = Date.now();
            
        }
        return session;
    
};

/**
 * Find a player's session by their id and game ID
 * @param {string} playerId - The player's persistent id
 * @param {string} gameId - The game ID
 * @returns {Object|undefined} The session info or undefined if not found
 */
const findPlayerSession = (playerId, gameId) => {
    for (const [socketId, session] of playerSessions.entries()) {
        if (session.gameId === gameId && session.playerId === playerId) {
            return { socketId, ...session };
        }
    }
    return undefined;
};

/**
 * Check if a player id is available in a game
 * @param {string} playerId - The player id to check
 * @param {string} gameId - The game ID
 * @returns {boolean} True if the id is available
 */
const isPlayerIdAvailable = (playerId, gameId) => {
    return !Array.from(playerSessions.values()).some(
        session => session.gameId === gameId && 
                  session.playerId === playerId && 
                  Date.now() - session.lastSeen < 30000 // Consider sessions inactive after 30 seconds
    );
};

/**
 * Update a player's activity timestamp
 * @param {string} playerId - The player's id
 * @param {Object} io - The Socket.IO server instance
 * @returns {boolean} - Whether the player session was found and updated
 */
const updatePlayerActivity = (playerId) => {
    if (!ioInstance) {
        console.error('Socket.IO instance not initialized in player store');
        return false;
    }

    const session = playerSessions.get(playerId);
    if (session) {
        const wasInactive = !session.isActive;
        session.lastActivity = Date.now();
        session.isActive = true;
        
        // If player was inactive before, notify others they're now active
        if (wasInactive) {
            ioInstance.to(session.gameId).emit('playerStatusUpdate', {
                playerId: session.playerId,
                isActive: true
            });
            console.log(`✅ Player ${session.playerName} is now active`);
        }
        return true;
    }
    return false;
};

/**
 * Check all players' activity status and update accordingly
 * @param {Object} io - The Socket.IO server instance
 */
const checkPlayersActivity = () => {
    if (!ioInstance) {
        console.error('Socket.IO instance not initialized in player store');
        return;
    }

    const now = Date.now();
    for (const [playerId, session] of playerSessions.entries()) {
        // If no activity within threshold
        if (now - session.lastActivity > INACTIVE_THRESHOLD) {
            // Mark as inactive if was previously active
            if (session.isActive) {
                session.isActive = false;
                console.log(`⚠️ Player ${session.playerName} marked as inactive`);
                // Notify other players in the game
                ioInstance.to(session.gameId).emit('playerStatusUpdate', {
                    playerId: session.playerId,
                    isActive: false
                });
            }
        }
    }
};

/**
 * Start the activity checking system
 * @param {Object} io - The Socket.IO server instance
 */
const startActivityChecking = (io) => {
    // Initialize the store with the io instance
    initializeStore(io);
    
    // Check for inactive players periodically
    setInterval(() => {
        checkPlayersActivity();
    }, ACTIVITY_CHECK_INTERVAL);
};

module.exports = {
    playerSessions,
    trackPlayerSession,
    removePlayerSession,
    getPlayerSession,
    findPlayerSession,
    isPlayerIdAvailable,
    updatePlayerActivity,
    startActivityChecking,
    initializeStore
};
