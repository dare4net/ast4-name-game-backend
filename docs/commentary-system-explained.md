# Name Game Commentary System: A Complete Beginner's Guide

## Overview
The commentary system is like a smart sports commentator that watches players during the game and makes fun, personalized comments about how they're doing. Let's break it down step by step!

## Part 1: Understanding Player Data

### Sample Game Scenario
Let's follow a player named "Alex" through a game:

```javascript
const player = {
    id: "player123",
    name: "Alex",
    score: 85,
    submissions: [
        { word: "apple", time: 2.5 },
        { word: "extraordinary", time: 4.1 }
    ]
};
```

### What We Track For Each Player

1. **Score History**
   ```javascript
   scoreHistory: [50, 65, 85]  // Their scores over time
   ```

2. **Delta (Score Changes)**
   ```javascript
   // How their score changed:
   currentScore: 85
   previousScore: 65
   delta: +20  // They improved by 20 points!
   ```

3. **Position Context**
   ```javascript
   // In a 6-player game:
   position: 2         // Alex is in 2nd place
   nextPlayer: "Bob"   // Player ahead (1st place)
   prevPlayer: "Carol" // Player behind (3rd place)
   pointsToNext: 10    // Points needed to catch Bob
   pointsToPrev: 15    // Points ahead of Carol
   ```

## Part 2: How We Determine Their Situation

### Percentile Calculation
```javascript
// Example with 6 players, scores sorted high to low:
allScores = [95, 85, 70, 65, 60, 45]
           [Bob, Alex, Carol, Dan, Eve, Frank]

// Alex's percentile calculation:
position = 2
totalPlayers = 6
percentile = (1 - (position - 1) / totalPlayers) * 100
// = (1 - (2-1)/6) * 100
// = (1 - 1/6) * 100
// = 0.833 * 100
// = 83.3
```

This means Alex is performing better than 83.3% of players!

### Situation Detection
```javascript
// Looking at Alex's stats:
metrics = {
    percentile: 83.3,    // Top 20%
    delta: +20,          // Big improvement!
    consecutiveWins: 2   // Won last 2 rounds
}

// This triggers the following thresholds:
if (percentile >= 75 && delta > 5) {
    situation = "WINNING"
    subCategory = "CONSISTENT"
}
```

## Part 3: Commentary Generation

### 1. Base Commentary
```javascript
// With these parameters:
params = {
    nextPlayer: "Bob",
    prevPlayer: "Carol",
    pointsToNext: 10,
    rivalName: "Bob",
    rivalGap: 10
}

// Might select this comment:
"keeping {nextPlayer} at arm's length purr 💅"
// Becomes:
"keeping Bob at arm's length purr 💅"
```

### 2. Bonus Achievements
For that round, Alex also:
```javascript
round.extraBonuses = {
    longestWord: {
        playerId: "player123",  // Alex's ID
        word: "extraordinary"
    }
}

// Adds bonus comment:
"flexing with 'extraordinary' 📚"
```

### 3. Final Commentary Output
```javascript
// Combines everything into:
"""
keeping Bob at arm's length purr 💅

try some spicy words next round? 🌶️ 
show them consistency is key 🔑

the consistency is giving winner 📈

flexing with 'extraordinary' 📚
"""
```

## Part 4: Special Variables and Terms

### Deltas (Score Changes)
1. **Short-term Delta**:
   ```javascript
   // Last round change
   currentScore: 85
   lastScore: 65
   shortDelta: +20  // Immediate improvement
   ```

2. **Long-term Delta**:
   ```javascript
   // Last three rounds
   scores: [50, 65, 85]
   longDelta: +35  // Overall trend upward
   ```

### Rivalry Detection
```javascript
// Points difference between players
alex: 85
bob: 95  // gap: 10 points ahead
carol: 70 // gap: 15 points behind

// Bob is rival because:
Math.min(gapAhead, gapBehind) = 10 // Closest competition
```

## Part 5: Example Game Flow

### Round 1:
```javascript
Alex: {
    score: 50,
    position: 3,
    percentile: 50,
    situation: "NEUTRAL.CONSISTENT"
}
Commentary: "giving very much... present 👀"
```

### Round 2:
```javascript
Alex: {
    score: 65 (+15),
    position: 2,
    percentile: 83.3,
    situation: "COMEBACK.POTENTIAL"
}
Commentary: "the improvement? we love to see it 📈"
```

### Round 3:
```javascript
Alex: {
    score: 85 (+20),
    position: 2,
    percentile: 83.3,
    situation: "WINNING.CONSISTENT",
    bonus: "LONGEST_WORD"
}
Commentary: "keeping Bob at arm's length purr 💅
flexing with 'extraordinary' 📚"
```

## Common Scenarios and Their Comments

### 1. Close Competition
```javascript
// When points gap is very small
pointsToNext: 2
Commentary: "that {pointsToNext} gap won't last bestie 📉"
```

### 2. Dominating Performance
```javascript
percentile: 95
delta: +25
Commentary: "bestie really woke up and chose violence 💅"
```

### 3. Struggling Performance
```javascript
percentile: 20
delta: -15
Commentary: "bestie wyd? you good? 💀"
```

This documentation will continue to expand with more examples and scenarios. Would you like me to add any specific scenarios or explain any part in more detail?
