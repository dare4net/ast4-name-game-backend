# Name Game Commentary: Technical Implementation Guide

## System Architecture

### 1. Core Classes

```javascript
// Main orchestrator
class AICommentaryService {
    static updatePlayerProfile()
    static generateCommentary()
}

// Manages player stats and analysis
class PlayerProfileManager {
    static initializeProfile()
    static updateBonusHistory()
    static calculateMetrics()
    static analyzeSituation()
}

// Handles comment selection and formatting
class CommentaryGenerator {
    static getRandomComment()
    static getRandomBonusComment()
}
```

### 2. Data Flow

```javascript
Game Round Complete
    ↓
Update Player Profiles
    ↓
Calculate Metrics
    ↓
Analyze Situation
    ↓
Generate Commentary
    ↓
Apply Bonus Comments
```

## Implementation Details

### 1. Profile Initialization

```javascript
function initializeProfile() {
    return {
        scoreHistory: [],
        lastThreeRoundsDelta: 0,
        currentSituation: null,
        lastSituation: null,
        bonusHistory: {
            fastest: [],
            longest: [],
            rare: [],
            master: []
        }
    };
}
```

### 2. Metrics Calculation

```javascript
function calculateMetrics(profile, player, round, allScores, allDeltas) {
    // Sort players by score
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    
    // Find player's position
    const position = sortedPlayers.findIndex(p => p.id === player.id);
    
    // Calculate percentile
    const percentile = ((totalPlayers - position) / totalPlayers) * 100;
    
    // Calculate delta (score change)
    const delta = player.score - profile.scoreHistory[profile.scoreHistory.length - 1];
    
    // Find adjacent players
    const nextPlayer = sortedPlayers[position - 1]?.name;
    const prevPlayer = sortedPlayers[position + 1]?.name;
    
    return {
        percentile,
        delta,
        position,
        nextPlayer,
        prevPlayer,
        // ... other metrics
    };
}
```

### 3. Situation Analysis

```javascript
function analyzeSituation(metrics, game, roundIndex) {
    // Check WINNING conditions
    if (metrics.percentile >= 90 && metrics.delta > 15) {
        return {
            situation: "WINNING",
            subCategory: "DOMINANT"
        };
    }
    
    if (metrics.percentile >= 75 && metrics.delta > 5) {
        return {
            situation: "WINNING",
            subCategory: "CONSISTENT"
        };
    }
    
    // Check COMEBACK conditions
    if (metrics.delta > 10 && metrics.previousDelta < 0) {
        return {
            situation: "COMEBACK",
            subCategory: "STRONG"
        };
    }
    
    // ... more conditions
}
```

### 4. Commentary Generation

```javascript
function generateCommentary(game, roundIndex) {
    const comments = new Map();
    
    game.players.forEach(player => {
        let commentary = '';
        
        // Get main comment
        commentary += getMainComment(player, situation);
        
        // Add advice
        commentary += getAdvice(player, situation);
        
        // Add insight
        commentary += getInsight(player, situation);
        
        // Add bonuses
        commentary += getBonusComments(player, round);
        
        comments.set(player.id, commentary);
    });
    
    return comments;
}
```

### 5. Parameter Substitution

```javascript
function substituteParams(comment, params) {
    return comment.replace(/{(\w+)}/g, (match, key) => {
        return params[key] || match;
    });
}

// Example:
const comment = "keeping {nextPlayer} at arm's length purr 💅";
const params = { nextPlayer: "Bob" };
// Results in: "keeping Bob at arm's length purr 💅"
```

## Commentary Rules

### 1. Situation Hierarchy

```javascript
const SITUATIONS = {
    WINNING: {
        DOMINANT: { minPercentile: 90, minDelta: 15 },
        CONSISTENT: { minPercentile: 75, minDelta: 5 }
    },
    LOSING: {
        PLUMMETING: { maxPercentile: 25, maxDelta: -10 },
        STRUGGLING: { maxPercentile: 40, maxDelta: 0 }
    },
    COMEBACK: {
        STRONG: { minDelta: 15, previousDeltaMax: 0 },
        POTENTIAL: { minDelta: 5, previousDeltaMax: 0 }
    },
    NEUTRAL: {
        CONSISTENT: { percentileRange: [40, 60], deltaRange: [-5, 5] }
    }
};
```

### 2. Comment Selection Logic

```javascript
function getRandomComment(gameId, playerId, situation, subCategory, type, params) {
    // Get all comments for this situation/subcategory
    const comments = gameComments[situation][subCategory][type];
    
    // Filter out recently used comments for this player
    const unusedComments = comments.filter(c => 
        !recentlyUsed(gameId, playerId, c)
    );
    
    // Select random comment
    const comment = unusedComments[
        Math.floor(Math.random() * unusedComments.length)
    ];
    
    // Track usage
    trackCommentUsage(gameId, playerId, comment);
    
    // Replace parameters
    return substituteParams(comment, params);
}
```

Would you like me to explain any of these components in more detail?
