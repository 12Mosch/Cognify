# Personalized Learning Patterns

## Overview

The Personalized Learning Patterns system enhances the flashcard app's study path generation by incorporating user-specific learning analytics and behavioral patterns. This feature adapts the traditional spaced repetition algorithm to each user's unique learning style and performance history.

## Key Features

### 1. Learning Pattern Analysis

The system analyzes user review history to identify:

- **Inconsistency Patterns**: Cards where users alternate between correct/incorrect answers
- **Plateau Detection**: Topics where performance has stagnated over time
- **Recent Performance Trends**: Rolling averages of success rates and response times
- **Time-based Learning Preferences**: Optimal study times based on historical performance

### 2. Adaptive Path Generation

All study path generation functions now incorporate personalized data:

- `generateReviewFocusedPath`: Prioritizes cards with inconsistent performance
- `generateDifficultyBasedPath`: Adapts difficulty progression based on user patterns
- `generatePrerequisitePath`: Considers user's topic-specific struggles
- `generateDomainFocusedPath`: Focuses on plateau topics within domains

### 3. Configurable Personalization

Users can customize their learning experience through configuration options:

- **Learning Pattern Influence** (0-1): How much to weight personalized factors vs traditional SRS
- **Prioritize Inconsistent Cards**: Whether to boost cards with variable performance
- **Focus on Plateau Topics**: Whether to emphasize stagnant learning areas
- **Optimize for Time of Day**: Whether to consider optimal study times
- **Adapt Difficulty Progression**: Whether to modify difficulty based on user patterns

## Technical Implementation

### Data Model

The `learningPatterns` table stores comprehensive user analytics:

```typescript
interface UserLearningPatterns {
  userId: string;
  averageSuccessRate: number;
  learningVelocity: number; // Cards mastered per day
  
  // Inconsistency patterns
  inconsistencyPatterns: {
    cardIds: string[]; // Cards with high variance
    averageVariance: number;
    detectionThreshold: number;
    lastCalculated: number;
  };
  
  // Plateau detection
  plateauDetection: {
    stagnantTopics: Array<{
      topicKeywords: string[];
      cardIds: string[];
      plateauDuration: number;
      lastImprovement: number;
      averagePerformance: number;
    }>;
    plateauThreshold: number;
    lastAnalyzed: number;
  };
  
  // Recent performance trends
  recentPerformanceTrends: {
    last7Days: PerformanceMetrics;
    last14Days: PerformanceMetrics;
    trend: {
      successRateChange: number;
      responseTimeChange: number;
      confidenceChange: number;
    };
    lastUpdated: number;
  };
  
  // Time-based preferences
  timeOfDayPerformance: Record<TimeSlot, {
    successRate: number;
    reviewCount: number;
    averageResponseTime: number;
    confidenceLevel: number;
    optimalForLearning: boolean;
  }>;
  
  // Configuration
  personalizationConfig: {
    learningPatternInfluence: number;
    prioritizeInconsistentCards: boolean;
    focusOnPlateauTopics: boolean;
    optimizeForTimeOfDay: boolean;
    adaptDifficultyProgression: boolean;
  };
}
```

### Core Functions

#### Learning Pattern Calculation

```typescript
// Calculate inconsistency patterns
function calculateInconsistencyPatterns(reviews): InconsistencyPatterns

// Detect plateau patterns
function detectPlateauPatterns(reviews, cards): PlateauDetection

// Calculate recent performance trends
function calculateRecentPerformanceTrends(reviews): PerformanceTrends
```

#### Weighted Scoring Algorithm

```typescript
// Combine traditional SRS with personalized metrics
function calculateWeightedScore(
  traditionalScore: number,
  learningPatterns: UserLearningPatterns,
  cardId: string,
  config: PathPersonalizationConfig
): WeightedScoreResult
```

#### Path Generation Enhancement

All path generation functions now accept optional parameters:

```typescript
function generateDifficultyBasedPath(
  cards: Card[],
  reviews: Review[],
  language: string,
  learningPatterns?: UserLearningPatterns,
  personalizationConfig?: PathPersonalizationConfig
): PathCard[]
```

## API Reference

### Mutations

#### `calculateUserLearningPatterns`
Calculates comprehensive learning patterns for a user.

**Parameters:**
- `userId: string` - User identifier
- `forceRecalculation?: boolean` - Force recalculation even if recent data exists

**Returns:** `UserLearningPatterns | null`

#### `updatePersonalizationConfig`
Updates user's personalization settings.

**Parameters:**
- `learningPatternInfluence?: number` - Weight for learning patterns (0-1)
- `prioritizeInconsistentCards?: boolean` - Boost inconsistent cards
- `focusOnPlateauTopics?: boolean` - Emphasize plateau topics
- `optimizeForTimeOfDay?: boolean` - Consider optimal study times
- `adaptDifficultyProgression?: boolean` - Adapt difficulty based on patterns

**Returns:** `{ success: boolean, updatedConfig: PersonalizationConfig }`

### Queries

#### `getCachedLearningPatterns`
Retrieves cached learning patterns with automatic refresh.

**Parameters:**
- `maxAgeHours?: number` - Maximum age before refresh (default: 6)

**Returns:** `UserLearningPatterns | null`

#### `getPersonalizationConfig`
Gets user's current personalization configuration.

**Returns:** `PersonalizationConfig`

## Configuration Guide

### Default Settings

New users start with these default settings:
- Learning Pattern Influence: 30%
- Prioritize Inconsistent Cards: Enabled
- Focus on Plateau Topics: Enabled
- Optimize for Time of Day: Enabled
- Adapt Difficulty Progression: Enabled

### Recommended Configurations

#### Conservative Approach
For users who prefer traditional SRS:
```typescript
{
  learningPatternInfluence: 0.1,
  prioritizeInconsistentCards: false,
  focusOnPlateauTopics: false,
  optimizeForTimeOfDay: true,
  adaptDifficultyProgression: false
}
```

#### Aggressive Personalization
For users who want maximum adaptation:
```typescript
{
  learningPatternInfluence: 0.8,
  prioritizeInconsistentCards: true,
  focusOnPlateauTopics: true,
  optimizeForTimeOfDay: true,
  adaptDifficultyProgression: true
}
```

#### Balanced Approach (Default)
For most users:
```typescript
{
  learningPatternInfluence: 0.3,
  prioritizeInconsistentCards: true,
  focusOnPlateauTopics: true,
  optimizeForTimeOfDay: true,
  adaptDifficultyProgression: true
}
```

## Performance Considerations

### Caching Strategy
- Learning patterns are cached for 6 hours by default
- Background refresh triggered when patterns become stale
- Efficient queries use database indexes for large datasets

### Calculation Optimization
- Uses `take()` limits to avoid processing excessive data
- Compound indexes for efficient filtering
- Parallel processing for independent calculations

### Memory Management
- Patterns calculated on-demand, not stored in memory
- Cleanup of old pattern data after updates
- Efficient data structures for large review histories

## Benefits for Users

### Improved Learning Efficiency
- Cards are presented in optimal order for each user
- Struggling topics receive appropriate attention
- Time-based optimization maximizes retention

### Personalized Experience
- Adapts to individual learning styles
- Recognizes and addresses specific weaknesses
- Provides relevant feedback and recommendations

### Better Retention
- Identifies and reinforces inconsistent knowledge
- Prevents plateau by focusing on stagnant areas
- Optimizes review timing based on personal patterns

## Future Enhancements

### Planned Features
- Machine learning models for pattern prediction
- Cross-deck learning pattern analysis
- Social learning insights from anonymized data
- Advanced topic modeling for better categorization

### Potential Improvements
- Real-time pattern updates during study sessions
- Integration with external learning analytics
- Collaborative filtering for similar users
- Adaptive confidence interval adjustments
