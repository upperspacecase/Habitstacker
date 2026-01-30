/**
 * Web Storage Implementation
 *
 * Uses localStorage for web platform.
 */

import {
  Anchor,
  Habit,
  HabitCompletion,
  UserState,
  DEFAULT_ANCHORS,
  CAPACITY_COSTS,
  NewHabitInput,
  APP_CONSTANTS,
} from '../types';
import { generateId, getWeekStart, getTodayDate } from '../utils/helpers';

// Storage keys
const STORAGE_KEYS = {
  ANCHORS: 'habitstacker_anchors',
  HABITS: 'habitstacker_habits',
  COMPLETIONS: 'habitstacker_completions',
  USER_STATE: 'habitstacker_user_state',
};

// ============ HELPERS ============

function getItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function getYesterdayDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
}

// ============ INITIALIZATION ============

let isInitialized = false;

export async function initDatabase(): Promise<void> {
  if (isInitialized) return;

  // Initialize with default anchors if none exist
  const anchors = getItem<Anchor[]>(STORAGE_KEYS.ANCHORS, []);
  if (anchors.length === 0) {
    const defaultAnchors: Anchor[] = DEFAULT_ANCHORS.map(anchor => ({
      ...anchor,
      id: generateId(),
      createdAt: Date.now(),
    }));
    setItem(STORAGE_KEYS.ANCHORS, defaultAnchors);
  }

  // Initialize user state if not exists
  if (!getItem<UserState | null>(STORAGE_KEYS.USER_STATE, null)) {
    setItem(STORAGE_KEYS.USER_STATE, {
      totalCapacity: 100,
      usedCapacity: 0,
      hasCompletedOnboarding: false,
      currentWeekStart: getWeekStart(new Date()),
      habitsAddedThisWeek: 0,
      reminderTime: null,
      hapticFeedbackEnabled: true,
    });
  }

  isInitialized = true;
}

// ============ ANCHOR OPERATIONS ============

export async function getAllAnchors(): Promise<Anchor[]> {
  return getItem<Anchor[]>(STORAGE_KEYS.ANCHORS, []).sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return a.name.localeCompare(b.name);
  });
}

export async function getAnchorById(id: string): Promise<Anchor | null> {
  return getItem<Anchor[]>(STORAGE_KEYS.ANCHORS, []).find(a => a.id === id) || null;
}

export async function createAnchor(
  name: string,
  description: string,
  timeOfDay: Anchor['timeOfDay']
): Promise<Anchor> {
  const anchor: Anchor = {
    id: generateId(),
    name,
    description,
    timeOfDay,
    isDefault: false,
    createdAt: Date.now(),
  };
  const anchors = getItem<Anchor[]>(STORAGE_KEYS.ANCHORS, []);
  setItem(STORAGE_KEYS.ANCHORS, [...anchors, anchor]);
  return anchor;
}

// ============ HABIT OPERATIONS ============

export async function getAllHabits(): Promise<Habit[]> {
  return getItem<Habit[]>(STORAGE_KEYS.HABITS, []);
}

export async function getActiveHabits(): Promise<Habit[]> {
  return getItem<Habit[]>(STORAGE_KEYS.HABITS, []).filter(h => !h.isPaused);
}

export async function getHabitById(id: string): Promise<Habit | null> {
  return getItem<Habit[]>(STORAGE_KEYS.HABITS, []).find(h => h.id === id) || null;
}

export async function createHabit(input: NewHabitInput): Promise<Habit> {
  // Check Plus One limit
  const canAdd = await canAddHabitThisWeek();
  if (!canAdd) {
    throw new Error('You can only add one new habit per week. This limit helps you build sustainable habits.');
  }

  // Check capacity
  const userState = await getUserState();
  const capacityCost = CAPACITY_COSTS[input.difficulty];

  if (userState.usedCapacity + capacityCost > APP_CONSTANTS.MAX_CAPACITY) {
    throw new Error(
      `Adding this habit would exceed your willpower capacity. ` +
      `Consider pausing an existing habit first.`
    );
  }

  const habit: Habit = {
    id: generateId(),
    name: input.name,
    description: input.description,
    fullVersion: input.fullVersion,
    twoMinuteVersion: input.twoMinuteVersion,
    isInTwoMinuteMode: false,
    anchorId: input.anchorId,
    stackPosition: input.stackPosition,
    difficulty: input.difficulty,
    capacityCost,
    currentStreak: 0,
    longestStreak: 0,
    consecutiveMisses: 0,
    createdAt: Date.now(),
    lastCompletedAt: null,
    isPaused: false,
    habitType: input.habitType,
    facilitated: input.facilitated,
  };

  const habits = getItem<Habit[]>(STORAGE_KEYS.HABITS, []);
  setItem(STORAGE_KEYS.HABITS, [...habits, habit]);

  // Update capacity and weekly count
  const state = getItem<UserState>(STORAGE_KEYS.USER_STATE, {} as UserState);
  setItem(STORAGE_KEYS.USER_STATE, {
    ...state,
    usedCapacity: state.usedCapacity + capacityCost,
    habitsAddedThisWeek: state.habitsAddedThisWeek + 1,
  });

  return habit;
}

export async function pauseHabit(habitId: string): Promise<void> {
  const habits = getItem<Habit[]>(STORAGE_KEYS.HABITS, []);
  const habit = habits.find(h => h.id === habitId);
  if (!habit) throw new Error('Habit not found');

  habit.isPaused = true;
  setItem(STORAGE_KEYS.HABITS, habits);

  const state = getItem<UserState>(STORAGE_KEYS.USER_STATE, {} as UserState);
  setItem(STORAGE_KEYS.USER_STATE, {
    ...state,
    usedCapacity: state.usedCapacity - habit.capacityCost,
  });
}

export async function resumeHabit(habitId: string): Promise<void> {
  const habits = getItem<Habit[]>(STORAGE_KEYS.HABITS, []);
  const habit = habits.find(h => h.id === habitId);
  if (!habit) throw new Error('Habit not found');

  const state = getItem<UserState>(STORAGE_KEYS.USER_STATE, {} as UserState);
  if (state.usedCapacity + habit.capacityCost > APP_CONSTANTS.MAX_CAPACITY) {
    throw new Error('Resuming this habit would exceed your willpower capacity.');
  }

  habit.isPaused = false;
  setItem(STORAGE_KEYS.HABITS, habits);

  setItem(STORAGE_KEYS.USER_STATE, {
    ...state,
    usedCapacity: state.usedCapacity + habit.capacityCost,
  });
}

export async function deleteHabit(habitId: string): Promise<void> {
  const habits = getItem<Habit[]>(STORAGE_KEYS.HABITS, []);
  const habit = habits.find(h => h.id === habitId);
  if (!habit) throw new Error('Habit not found');

  setItem(STORAGE_KEYS.HABITS, habits.filter(h => h.id !== habitId));
  setItem(
    STORAGE_KEYS.COMPLETIONS,
    getItem<HabitCompletion[]>(STORAGE_KEYS.COMPLETIONS, []).filter(c => c.habitId !== habitId)
  );

  if (!habit.isPaused) {
    const state = getItem<UserState>(STORAGE_KEYS.USER_STATE, {} as UserState);
    setItem(STORAGE_KEYS.USER_STATE, {
      ...state,
      usedCapacity: state.usedCapacity - habit.capacityCost,
    });
  }
}

// ============ COMPLETION OPERATIONS ============

export async function completeHabit(habitId: string, notes?: string): Promise<HabitCompletion> {
  const habits = getItem<Habit[]>(STORAGE_KEYS.HABITS, []);
  const habit = habits.find(h => h.id === habitId);
  if (!habit) throw new Error('Habit not found');

  const today = getTodayDate();
  const completions = getItem<HabitCompletion[]>(STORAGE_KEYS.COMPLETIONS, []);

  // Check if already completed today
  if (completions.some(c => c.habitId === habitId && c.date === today)) {
    throw new Error('This habit has already been completed today');
  }

  const completion: HabitCompletion = {
    id: generateId(),
    habitId,
    completedAt: Date.now(),
    date: today,
    wasInTwoMinuteMode: habit.isInTwoMinuteMode,
    notes,
  };

  setItem(STORAGE_KEYS.COMPLETIONS, [...completions, completion]);

  // Update habit streak
  const newStreak = habit.currentStreak + 1;
  habit.currentStreak = newStreak;
  habit.longestStreak = Math.max(newStreak, habit.longestStreak);
  habit.consecutiveMisses = 0;
  habit.lastCompletedAt = Date.now();

  // Restore full version after 3 days in 2-min mode
  if (habit.isInTwoMinuteMode && newStreak >= APP_CONSTANTS.STREAK_DAYS_TO_RESTORE_FULL) {
    habit.isInTwoMinuteMode = false;
  }

  setItem(STORAGE_KEYS.HABITS, habits);
  return completion;
}

export async function getCompletionsForDate(date: string): Promise<HabitCompletion[]> {
  return getItem<HabitCompletion[]>(STORAGE_KEYS.COMPLETIONS, []).filter(c => c.date === date);
}

export async function getCompletionsForHabit(habitId: string, limit = 30): Promise<HabitCompletion[]> {
  return getItem<HabitCompletion[]>(STORAGE_KEYS.COMPLETIONS, [])
    .filter(c => c.habitId === habitId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}

export async function processMissedDays(): Promise<void> {
  const today = getTodayDate();
  const yesterday = getYesterdayDate();
  const habits = getItem<Habit[]>(STORAGE_KEYS.HABITS, []);
  const completions = getItem<HabitCompletion[]>(STORAGE_KEYS.COMPLETIONS, []);

  for (const habit of habits) {
    if (habit.isPaused) continue;

    // Skip if completed today
    if (completions.some(c => c.habitId === habit.id && c.date === today)) continue;

    // Check if completed yesterday
    const completedYesterday = completions.some(
      c => c.habitId === habit.id && c.date === yesterday
    );

    if (!completedYesterday && habit.lastCompletedAt) {
      habit.consecutiveMisses += 1;
      habit.currentStreak = 0;

      if (habit.consecutiveMisses >= APP_CONSTANTS.CONSECUTIVE_MISSES_FOR_SHRINK) {
        habit.isInTwoMinuteMode = true;
      }
    }
  }

  setItem(STORAGE_KEYS.HABITS, habits);
}

// ============ USER STATE OPERATIONS ============

export async function getUserState(): Promise<UserState> {
  const state = getItem<UserState | null>(STORAGE_KEYS.USER_STATE, null);
  if (!state) throw new Error('User state not initialized');

  const currentWeekStart = getWeekStart(new Date());
  if (state.currentWeekStart !== currentWeekStart) {
    state.currentWeekStart = currentWeekStart;
    state.habitsAddedThisWeek = 0;
    setItem(STORAGE_KEYS.USER_STATE, state);
  }

  return state;
}

export async function setOnboardingComplete(): Promise<void> {
  const state = getItem<UserState>(STORAGE_KEYS.USER_STATE, {} as UserState);
  setItem(STORAGE_KEYS.USER_STATE, { ...state, hasCompletedOnboarding: true });
}

export async function updateSettings(settings: {
  reminderTime?: string | null;
  hapticFeedbackEnabled?: boolean;
}): Promise<void> {
  const state = getItem<UserState>(STORAGE_KEYS.USER_STATE, {} as UserState);
  if (settings.reminderTime !== undefined) {
    state.reminderTime = settings.reminderTime;
  }
  if (settings.hapticFeedbackEnabled !== undefined) {
    state.hapticFeedbackEnabled = settings.hapticFeedbackEnabled;
  }
  setItem(STORAGE_KEYS.USER_STATE, state);
}

export async function canAddHabitThisWeek(): Promise<boolean> {
  const state = await getUserState();
  return state.habitsAddedThisWeek < APP_CONSTANTS.MAX_HABITS_PER_WEEK;
}

export async function recalculateCapacity(): Promise<number> {
  const habits = getItem<Habit[]>(STORAGE_KEYS.HABITS, []);
  const total = habits
    .filter(h => !h.isPaused)
    .reduce((sum, h) => sum + h.capacityCost, 0);

  const state = getItem<UserState>(STORAGE_KEYS.USER_STATE, {} as UserState);
  setItem(STORAGE_KEYS.USER_STATE, { ...state, usedCapacity: total });
  return total;
}
