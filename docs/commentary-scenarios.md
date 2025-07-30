# Name Game Commentary: Real-World Scenarios

## Scenario 1: The Comeback Story

### Initial State (Round 1)
```javascript
const player = {
    name: "Emma",
    score: 45,
    position: 5,
    metrics: {
        percentile: 16.7,
        delta: 0,
        scoreHistory: [45]
    }
}

// Results in:
situation: "LOSING.STRUGGLING"
commentary: "bestie... you're trying and that's what counts 🥺"
```

### Middle Game (Round 3)
```javascript
player.score = 75
player.metrics = {
    percentile: 50,
    delta: +15,
    scoreHistory: [45, 60, 75]
}

// Results in:
situation: "COMEBACK.POTENTIAL"
commentary: "bestie... is that a glow up I see? 👀"
```

### End Game (Round 5)
```javascript
player.score = 95
player.metrics = {
    percentile: 83.3,
    delta: +10,
    scoreHistory: [45, 60, 75, 85, 95],
    bonuses: {
        fastestSubmission: true
    }
}

// Results in:
situation: "COMEBACK.STRONG"
commentary: """
THE REDEMPTION ARC WE NEEDED 😭

time to show them who's boss fr 💪
channel that main character energy 🌟

watching a legend in the making 📈

with that sonic speed ⚡
"""
```

## Scenario 2: The Rivalry

### Two Players Neck and Neck

```javascript
// Round 4 State
const gameState = {
    players: [
        {
            name: "Jade",
            score: 88,
            position: 2
        },
        {
            name: "Kim",
            score: 90,
            position: 1
        }
    ]
}

// For Jade:
metrics = {
    percentile: 83.3,
    delta: +5,
    pointsToNext: 2,
    rivalName: "Kim",
    rivalGap: 2
}

// Results in:
situation: "WINNING.CONSISTENT"
commentary: """
keeping {rivalName} in your peripheral fr 🔭

show them consistency is key 🔑
time to unlock your final form maybe? 🔓

the calm before the storm perhaps? ⚡
"""
```

## Scenario 3: The Perfect Round

```javascript
const round = {
    letter: "S",
    extraBonuses: {
        fastestSubmission: {
            playerId: "player123",
            time: 1.5
        },
        longestWord: {
            playerId: "player123",
            word: "supernatural"
        },
        rareWords: [{
            playerId: "player123",
            word: "serendipity"
        }],
        master: {
            playerId: "player123"
        }
    }
}

// Results in all bonus comments:
commentary: """
[Main situation comment]

[Advice]

[Insight]

with that sonic speed ⚡
flexing with 'supernatural' 📚
rare word collector fr 🎯
letter master era unlocked 👑
"""
```

## Scenario 4: The Group Battle

```javascript
// Close scores among multiple players
const scores = [88, 85, 84, 82]
           // [Kim, Jade, Alex, Lee]

// For all players:
situation: "DRAW.GROUP"
commentary: """
it's giving battle royale fr 👊

time to stand out from the crowd 🌟
break away from the pack fr 🐺

the plot has so many protagonists rn 📖
"""
```

## Understanding Commentary Parameters

### 1. Player References
```javascript
params = {
    nextPlayer: "player above",    // Target to catch
    prevPlayer: "player behind",   // Threat from behind
    pointsToNext: 5,              // Gap to close
    pointsToPrev: 8               // Lead to maintain
}
```

### 2. Achievement Context
```javascript
params = {
    word: "extraordinary",         // For longest word
    letter: "S",                  // For master bonus
    playerName: "Alex"            // For personal mentions
}
```

### 3. Game Context
```javascript
params = {
    position: 2,                  // Current rank
    totalPlayers: 6,             // Field size
    rivalName: "closest player",  // Main competition
    rivalGap: 3                  // Points gap to rival
}
```

## How Percentiles Affect Commentary

### Top Tier (90%+)
```javascript
metrics = {
    percentile: 95,
    delta: +15
}
// Results in:
situation: "WINNING.DOMINANT"
```

### Mid-High (75-90%)
```javascript
metrics = {
    percentile: 82,
    delta: +5
}
// Results in:
situation: "WINNING.CONSISTENT"
```

### Middle (40-60%)
```javascript
metrics = {
    percentile: 50,
    delta: +/-2
}
// Results in:
situation: "NEUTRAL.CONSISTENT"
```

### Low (Below 25%)
```javascript
metrics = {
    percentile: 20,
    delta: -10
}
// Results in:
situation: "LOSING.PLUMMETING"
```

Would you like me to expand on any of these scenarios or add more examples?
