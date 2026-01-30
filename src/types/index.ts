/**
 * Habitstacker Type Definitions
 *
 * Built on three psychological pillars:
 * 1. Identity - Habit stacking with anchors
 * 2. Friction - Two-minute versions to reduce resistance
 * 3. Momentum - Capacity meter to prevent burnout
 */

// Difficulty levels affect capacity cost
export type HabitDifficulty = 'trivial' | 'easy' | 'moderate' | 'challenging' | 'hard';

// Capacity costs by difficulty (percentage of daily willpower)
export const CAPACITY_COSTS: Record<HabitDifficulty, number> = {
  trivial: 5,    // Drinking water, taking vitamins
  easy: 10,      // 5-minute walk, gratitude journaling
  moderate: 15,  // 10-minute meditation, stretching
  challenging: 20, // Breathwork, cold shower
  hard: 30,      // 30-min workout, deep work session
};

// An anchor is an existing habit that triggers a new one
export interface Anchor {
  id: string;
  name: string;
  description: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'anytime';
  isDefault: boolean; // Pre-populated anchors vs user-created
  createdAt: number;
}

// Default anchors that most people already do
export const DEFAULT_ANCHORS: Omit<Anchor, 'id' | 'createdAt'>[] = [
  { name: 'Brewing coffee', description: 'Making your morning coffee or tea', timeOfDay: 'morning', isDefault: true },
  { name: 'Brushing teeth (morning)', description: 'Morning dental routine', timeOfDay: 'morning', isDefault: true },
  { name: 'Brushing teeth (evening)', description: 'Evening dental routine', timeOfDay: 'evening', isDefault: true },
  { name: 'Eating breakfast', description: 'Having your first meal', timeOfDay: 'morning', isDefault: true },
  { name: 'Eating lunch', description: 'Midday meal break', timeOfDay: 'afternoon', isDefault: true },
  { name: 'Getting into bed', description: 'Climbing into bed for the night', timeOfDay: 'evening', isDefault: true },
  { name: 'Arriving at desk', description: 'Sitting down to start work', timeOfDay: 'morning', isDefault: true },
  { name: 'Leaving work', description: 'Finishing your workday', timeOfDay: 'afternoon', isDefault: true },
  { name: 'Taking a shower', description: 'Daily shower routine', timeOfDay: 'anytime', isDefault: true },
  { name: 'Checking phone', description: 'First phone check of the day', timeOfDay: 'morning', isDefault: true },
];

// The core habit model
export interface Habit {
  id: string;

  // The habit itself
  name: string;
  description: string;

  // Two versions: ambitious and minimal
  fullVersion: string;        // "30 minutes of breathwork"
  twoMinuteVersion: string;   // "3 deep breaths"

  // Current active version (auto-shrinks after misses)
  isInTwoMinuteMode: boolean;

  // Habit stacking: links to anchor
  anchorId: string | null;
  stackPosition: 'before' | 'after'; // Before or after the anchor

  // Capacity/difficulty
  difficulty: HabitDifficulty;
  capacityCost: number; // Calculated from difficulty

  // Streak tracking
  currentStreak: number;
  longestStreak: number;
  consecutiveMisses: number; // Triggers auto-shrink at 2

  // Metadata
  createdAt: number;
  lastCompletedAt: number | null;
  isPaused: boolean;

  // Special habit types
  habitType: 'standard' | 'breathwork' | 'meditation' | 'exercise';

  // For breathwork/meditation: duration in seconds
  facilitated?: {
    durationSeconds: number;
    breathPattern?: BreathPattern;
  };
}

// Breathwork patterns for the facilitator
export interface BreathPattern {
  name: string;
  inhaleSeconds: number;
  holdInSeconds: number;
  exhaleSeconds: number;
  holdOutSeconds: number;
}

// Pre-defined breath patterns
export const BREATH_PATTERNS: Record<string, BreathPattern> = {
  box: {
    name: 'Box Breathing',
    inhaleSeconds: 4,
    holdInSeconds: 4,
    exhaleSeconds: 4,
    holdOutSeconds: 4,
  },
  relaxing: {
    name: '4-7-8 Relaxing',
    inhaleSeconds: 4,
    holdInSeconds: 7,
    exhaleSeconds: 8,
    holdOutSeconds: 0,
  },
  energizing: {
    name: 'Energizing Breath',
    inhaleSeconds: 2,
    holdInSeconds: 0,
    exhaleSeconds: 2,
    holdOutSeconds: 0,
  },
  calming: {
    name: 'Extended Exhale',
    inhaleSeconds: 4,
    holdInSeconds: 0,
    exhaleSeconds: 6,
    holdOutSeconds: 2,
  },
};

// Daily completion record
export interface HabitCompletion {
  id: string;
  habitId: string;
  completedAt: number;
  date: string; // YYYY-MM-DD format for easy querying
  wasInTwoMinuteMode: boolean;
  notes?: string;
}

// Weekly habit stack limit tracking
export interface WeeklyStackLimit {
  weekStart: string; // YYYY-MM-DD of week start (Monday)
  habitsAdded: number;
  canAddMore: boolean;
}

// User settings and state
export interface UserState {
  // Capacity tracking
  totalCapacity: number; // Always 100
  usedCapacity: number;  // Sum of active habit costs

  // Onboarding
  hasCompletedOnboarding: boolean;

  // Plus One limit
  currentWeekStart: string;
  habitsAddedThisWeek: number;

  // Preferences
  reminderTime: string | null; // HH:MM format
  hapticFeedbackEnabled: boolean;
}

// App-wide constants
export const APP_CONSTANTS = {
  MAX_CAPACITY: 100,
  MAX_HABITS_PER_WEEK: 1, // The "Plus One" limit
  CONSECUTIVE_MISSES_FOR_SHRINK: 2,
  STREAK_DAYS_TO_RESTORE_FULL: 3, // Days of completion to restore full version
};

// Helper type for creating new habits
export type NewHabitInput = Pick<Habit,
  'name' | 'description' | 'fullVersion' | 'twoMinuteVersion' |
  'anchorId' | 'stackPosition' | 'difficulty' | 'habitType'
> & {
  facilitated?: Habit['facilitated'];
};

// Navigation types
export type RootStackParamList = {
  Main: undefined;
  Onboarding: undefined;
  AddHabit: { anchorId?: string };
  HabitDetail: { habitId: string };
  Breathwork: { habitId: string };
  Settings: undefined;
};

export type MainTabParamList = {
  Today: undefined;
  Habits: undefined;
  Progress: undefined;
};
