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
 * @param {string} sessionInfo.playerId - The player's persistent id
 * @param {string} sessionInfo.playerName - The player's name
 * @param {boolean} sessionInfo.isHost - Whether the player is the host
 */
const trackPlayerSession = (playerId, { gameId, playerName, isHost }) => {
    console.log(`📝 Tracking session for player ${playerName} (id: ${playerId}, socket: ) in game ${gameId} is he the host? ${isHost}`);
    playerSessions.set(playerId, {
        gameId,
        playerId,
        playerName,
        isHost,
        lastSeen: Date.now()
    });
    //console.log(`📝 Tracking session for player ${playerName} (id: ${playerId}, socket: ) in game ${gameId}`);
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

module.exports = {
    playerSessions,
    trackPlayerSession,
    removePlayerSession,
    getPlayerSession,
    findPlayerSession,
    isPlayerIdAvailable
};
