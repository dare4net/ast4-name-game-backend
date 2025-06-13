/**
 * Tracks active player sessions and their game assignments.
 * This helps with reconnection and prevents duplicate players.
 */
const playerSessions = new Map();

/**
 * Store a player's session information
 * @param {string} socketId - The socket ID of the player
 * @param {Object} sessionInfo - Session information
 * @param {string} sessionInfo.gameId - The game ID the player is in
 * @param {string} sessionInfo.playerName - The player's name
 * @param {boolean} sessionInfo.isHost - Whether the player is the host
 */
const trackPlayerSession = (socketId, { gameId, playerName, isHost }) => {
    playerSessions.set(socketId, {
        gameId,
        playerName,
        isHost,
        lastSeen: Date.now()
    });
    console.log(`📝 Tracking session for player ${playerName} (${socketId}) in game ${gameId}`);
};

/**
 * Remove a player's session
 * @param {string} socketId - The socket ID to remove
 */
const removePlayerSession = (socketId) => {
    const session = playerSessions.get(socketId);
    if (session) {
        console.log(`🗑️ Removing session for player ${session.playerName} (${socketId})`);
        playerSessions.delete(socketId);
    }
};

/**
 * Get a player's session information
 * @param {string} socketId - The socket ID to look up
 * @returns {Object|undefined} The session info or undefined if not found
 */
const getPlayerSession = (socketId) => {
    const session = playerSessions.get(socketId);
    if (session) {
        session.lastSeen = Date.now(); // Update last seen timestamp
    }
    return session;
};

/**
 * Find a player's session by their name and game ID
 * @param {string} playerName - The player's name
 * @param {string} gameId - The game ID
 * @returns {Object|undefined} The session info or undefined if not found
 */
const findPlayerSessionByName = (playerName, gameId) => {
    for (const [socketId, session] of playerSessions.entries()) {
        if (session.gameId === gameId && session.playerName === playerName) {
            return { socketId, ...session };
        }
    }
    return undefined;
};

/**
 * Check if a player name is available in a game
 * @param {string} playerName - The player name to check
 * @param {string} gameId - The game ID
 * @returns {boolean} True if the name is available
 */
const isPlayerNameAvailable = (playerName, gameId) => {
    return !Array.from(playerSessions.values()).some(
        session => session.gameId === gameId && 
                  session.playerName === playerName && 
                  Date.now() - session.lastSeen < 30000 // Consider sessions inactive after 30 seconds
    );
};

module.exports = {
    playerSessions,
    trackPlayerSession,
    removePlayerSession,
    getPlayerSession,
    findPlayerSessionByName,
    isPlayerNameAvailable
};
