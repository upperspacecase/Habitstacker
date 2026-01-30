/**
 * SQLite Database Layer for Habitstacker
 *
 * Offline-first storage - habits are always accessible
 * without an internet connection.
 */

import * as SQLite from 'expo-sqlite';
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

let db: SQLite.SQLiteDatabase | null = null;

// Initialize the database
export async function initSQLiteDatabase(): Promise<void> {
  db = await SQLite.openDatabaseAsync('habitstacker.db');

  // Create tables
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS anchors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      timeOfDay TEXT NOT NULL,
      isDefault INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      fullVersion TEXT NOT NULL,
      twoMinuteVersion TEXT NOT NULL,
      isInTwoMinuteMode INTEGER NOT NULL DEFAULT 0,
      anchorId TEXT,
      stackPosition TEXT DEFAULT 'after',
      difficulty TEXT NOT NULL,
      capacityCost INTEGER NOT NULL,
      currentStreak INTEGER NOT NULL DEFAULT 0,
      longestStreak INTEGER NOT NULL DEFAULT 0,
      consecutiveMisses INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL,
      lastCompletedAt INTEGER,
      isPaused INTEGER NOT NULL DEFAULT 0,
      habitType TEXT NOT NULL DEFAULT 'standard',
      facilitatedDuration INTEGER,
      breathPatternName TEXT,
      FOREIGN KEY (anchorId) REFERENCES anchors(id)
    );

    CREATE TABLE IF NOT EXISTS completions (
      id TEXT PRIMARY KEY,
      habitId TEXT NOT NULL,
      completedAt INTEGER NOT NULL,
      date TEXT NOT NULL,
      wasInTwoMinuteMode INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      FOREIGN KEY (habitId) REFERENCES habits(id)
    );

    CREATE TABLE IF NOT EXISTS user_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      totalCapacity INTEGER NOT NULL DEFAULT 100,
      usedCapacity INTEGER NOT NULL DEFAULT 0,
      hasCompletedOnboarding INTEGER NOT NULL DEFAULT 0,
      currentWeekStart TEXT NOT NULL,
      habitsAddedThisWeek INTEGER NOT NULL DEFAULT 0,
      reminderTime TEXT,
      hapticFeedbackEnabled INTEGER NOT NULL DEFAULT 1
    );

    CREATE INDEX IF NOT EXISTS idx_completions_date ON completions(date);
    CREATE INDEX IF NOT EXISTS idx_completions_habitId ON completions(habitId);
    CREATE INDEX IF NOT EXISTS idx_habits_anchorId ON habits(anchorId);
  `);

  // Seed default anchors if none exist
  await seedDefaultAnchors();

  // Initialize user state if not exists
  await initUserState();
}

// Seed default anchors
async function seedDefaultAnchors(): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  const existingAnchors = await db.getAllAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM anchors WHERE isDefault = 1'
  );

  if (existingAnchors[0].count === 0) {
    for (const anchor of DEFAULT_ANCHORS) {
      await db.runAsync(
        `INSERT INTO anchors (id, name, description, timeOfDay, isDefault, createdAt)
         VALUES (?, ?, ?, ?, 1, ?)`,
        [generateId(), anchor.name, anchor.description, anchor.timeOfDay, Date.now()]
      );
    }
  }
}

// Initialize user state
async function initUserState(): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  const existing = await db.getAllAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM user_state'
  );

  if (existing[0].count === 0) {
    const weekStart = getWeekStart(new Date());
    await db.runAsync(
      `INSERT INTO user_state (id, totalCapacity, usedCapacity, currentWeekStart, habitsAddedThisWeek)
       VALUES (1, 100, 0, ?, 0)`,
      [weekStart]
    );
  }
}

// ============ ANCHOR OPERATIONS ============

export async function getAllAnchors(): Promise<Anchor[]> {
  if (!db) throw new Error('Database not initialized');

  const rows = await db.getAllAsync<any>('SELECT * FROM anchors ORDER BY isDefault DESC, name ASC');

  return rows.map(row => ({
    id: row.id,
    name: row.name,
    description: row.description,
    timeOfDay: row.timeOfDay,
    isDefault: row.isDefault === 1,
    createdAt: row.createdAt,
  }));
}

export async function getAnchorById(id: string): Promise<Anchor | null> {
  if (!db) throw new Error('Database not initialized');

  const rows = await db.getAllAsync<any>('SELECT * FROM anchors WHERE id = ?', [id]);

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    timeOfDay: row.timeOfDay,
    isDefault: row.isDefault === 1,
    createdAt: row.createdAt,
  };
}

export async function createAnchor(
  name: string,
  description: string,
  timeOfDay: Anchor['timeOfDay']
): Promise<Anchor> {
  if (!db) throw new Error('Database not initialized');

  const id = generateId();
  const createdAt = Date.now();

  await db.runAsync(
    `INSERT INTO anchors (id, name, description, timeOfDay, isDefault, createdAt)
     VALUES (?, ?, ?, ?, 0, ?)`,
    [id, name, description, timeOfDay, createdAt]
  );

  return { id, name, description, timeOfDay, isDefault: false, createdAt };
}

// ============ HABIT OPERATIONS ============

export async function getAllHabits(): Promise<Habit[]> {
  if (!db) throw new Error('Database not initialized');

  const rows = await db.getAllAsync<any>('SELECT * FROM habits ORDER BY createdAt ASC');

  return rows.map(rowToHabit);
}

export async function getActiveHabits(): Promise<Habit[]> {
  if (!db) throw new Error('Database not initialized');

  const rows = await db.getAllAsync<any>(
    'SELECT * FROM habits WHERE isPaused = 0 ORDER BY createdAt ASC'
  );

  return rows.map(rowToHabit);
}

export async function getHabitById(id: string): Promise<Habit | null> {
  if (!db) throw new Error('Database not initialized');

  const rows = await db.getAllAsync<any>('SELECT * FROM habits WHERE id = ?', [id]);

  if (rows.length === 0) return null;
  return rowToHabit(rows[0]);
}

export async function getHabitsByAnchor(anchorId: string): Promise<Habit[]> {
  if (!db) throw new Error('Database not initialized');

  const rows = await db.getAllAsync<any>(
    'SELECT * FROM habits WHERE anchorId = ? ORDER BY createdAt ASC',
    [anchorId]
  );

  return rows.map(rowToHabit);
}

function rowToHabit(row: any): Habit {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    fullVersion: row.fullVersion,
    twoMinuteVersion: row.twoMinuteVersion,
    isInTwoMinuteMode: row.isInTwoMinuteMode === 1,
    anchorId: row.anchorId,
    stackPosition: row.stackPosition || 'after',
    difficulty: row.difficulty,
    capacityCost: row.capacityCost,
    currentStreak: row.currentStreak,
    longestStreak: row.longestStreak,
    consecutiveMisses: row.consecutiveMisses,
    createdAt: row.createdAt,
    lastCompletedAt: row.lastCompletedAt,
    isPaused: row.isPaused === 1,
    habitType: row.habitType || 'standard',
    facilitated: row.facilitatedDuration ? {
      durationSeconds: row.facilitatedDuration,
      breathPattern: row.breathPatternName ? {
        name: row.breathPatternName,
        inhaleSeconds: 4,
        holdInSeconds: 4,
        exhaleSeconds: 4,
        holdOutSeconds: 4,
      } : undefined,
    } : undefined,
  };
}

export async function createHabit(input: NewHabitInput): Promise<Habit> {
  if (!db) throw new Error('Database not initialized');

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

  const id = generateId();
  const createdAt = Date.now();

  await db.runAsync(
    `INSERT INTO habits (
      id, name, description, fullVersion, twoMinuteVersion,
      isInTwoMinuteMode, anchorId, stackPosition, difficulty, capacityCost,
      currentStreak, longestStreak, consecutiveMisses, createdAt,
      habitType, facilitatedDuration, breathPatternName
    ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 0, 0, 0, ?, ?, ?, ?)`,
    [
      id,
      input.name,
      input.description,
      input.fullVersion,
      input.twoMinuteVersion,
      input.anchorId,
      input.stackPosition,
      input.difficulty,
      capacityCost,
      createdAt,
      input.habitType,
      input.facilitated?.durationSeconds || null,
      input.facilitated?.breathPattern?.name || null,
    ]
  );

  // Update capacity and weekly count
  await updateUsedCapacity(userState.usedCapacity + capacityCost);
  await incrementWeeklyHabitCount();

  return {
    id,
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
    createdAt,
    lastCompletedAt: null,
    isPaused: false,
    habitType: input.habitType,
    facilitated: input.facilitated,
  };
}

export async function pauseHabit(habitId: string): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  const habit = await getHabitById(habitId);
  if (!habit) throw new Error('Habit not found');

  await db.runAsync('UPDATE habits SET isPaused = 1 WHERE id = ?', [habitId]);

  // Recalculate capacity
  const userState = await getUserState();
  await updateUsedCapacity(userState.usedCapacity - habit.capacityCost);
}

export async function resumeHabit(habitId: string): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  const habit = await getHabitById(habitId);
  if (!habit) throw new Error('Habit not found');

  const userState = await getUserState();

  if (userState.usedCapacity + habit.capacityCost > APP_CONSTANTS.MAX_CAPACITY) {
    throw new Error('Resuming this habit would exceed your willpower capacity.');
  }

  await db.runAsync('UPDATE habits SET isPaused = 0 WHERE id = ?', [habitId]);
  await updateUsedCapacity(userState.usedCapacity + habit.capacityCost);
}

export async function deleteHabit(habitId: string): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  const habit = await getHabitById(habitId);
  if (!habit) throw new Error('Habit not found');

  await db.runAsync('DELETE FROM completions WHERE habitId = ?', [habitId]);
  await db.runAsync('DELETE FROM habits WHERE id = ?', [habitId]);

  if (!habit.isPaused) {
    const userState = await getUserState();
    await updateUsedCapacity(userState.usedCapacity - habit.capacityCost);
  }
}

// ============ COMPLETION OPERATIONS ============

export async function completeHabit(habitId: string, notes?: string): Promise<HabitCompletion> {
  if (!db) throw new Error('Database not initialized');

  const habit = await getHabitById(habitId);
  if (!habit) throw new Error('Habit not found');

  const today = getTodayDate();
  const now = Date.now();

  // Check if already completed today
  const existing = await db.getAllAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM completions WHERE habitId = ? AND date = ?',
    [habitId, today]
  );

  if (existing[0].count > 0) {
    throw new Error('This habit has already been completed today');
  }

  const completionId = generateId();

  await db.runAsync(
    `INSERT INTO completions (id, habitId, completedAt, date, wasInTwoMinuteMode, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [completionId, habitId, now, today, habit.isInTwoMinuteMode ? 1 : 0, notes || null]
  );

  // Update habit streak
  const newStreak = habit.currentStreak + 1;
  const newLongestStreak = Math.max(newStreak, habit.longestStreak);

  // Check if we can restore to full version (3 consecutive days in 2-min mode)
  let shouldRestoreFull = false;
  if (habit.isInTwoMinuteMode && newStreak >= APP_CONSTANTS.STREAK_DAYS_TO_RESTORE_FULL) {
    shouldRestoreFull = true;
  }

  await db.runAsync(
    `UPDATE habits SET
      currentStreak = ?,
      longestStreak = ?,
      consecutiveMisses = 0,
      lastCompletedAt = ?,
      isInTwoMinuteMode = ?
     WHERE id = ?`,
    [
      newStreak,
      newLongestStreak,
      now,
      shouldRestoreFull ? 0 : (habit.isInTwoMinuteMode ? 1 : 0),
      habitId,
    ]
  );

  return {
    id: completionId,
    habitId,
    completedAt: now,
    date: today,
    wasInTwoMinuteMode: habit.isInTwoMinuteMode,
    notes,
  };
}

export async function getCompletionsForDate(date: string): Promise<HabitCompletion[]> {
  if (!db) throw new Error('Database not initialized');

  const rows = await db.getAllAsync<any>(
    'SELECT * FROM completions WHERE date = ?',
    [date]
  );

  return rows.map(row => ({
    id: row.id,
    habitId: row.habitId,
    completedAt: row.completedAt,
    date: row.date,
    wasInTwoMinuteMode: row.wasInTwoMinuteMode === 1,
    notes: row.notes,
  }));
}

export async function getCompletionsForHabit(habitId: string, limit = 30): Promise<HabitCompletion[]> {
  if (!db) throw new Error('Database not initialized');

  const rows = await db.getAllAsync<any>(
    'SELECT * FROM completions WHERE habitId = ? ORDER BY date DESC LIMIT ?',
    [habitId, limit]
  );

  return rows.map(row => ({
    id: row.id,
    habitId: row.habitId,
    completedAt: row.completedAt,
    date: row.date,
    wasInTwoMinuteMode: row.wasInTwoMinuteMode === 1,
    notes: row.notes,
  }));
}

// Process missed days - called daily to check for auto-shrink
export async function processMissedDays(): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  const today = getTodayDate();
  const activeHabits = await getActiveHabits();

  for (const habit of activeHabits) {
    // Skip if completed today
    const todayCompletions = await db.getAllAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM completions WHERE habitId = ? AND date = ?',
      [habit.id, today]
    );

    if (todayCompletions[0].count > 0) continue;

    // Check if completed yesterday
    const yesterday = getYesterdayDate();
    const yesterdayCompletions = await db.getAllAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM completions WHERE habitId = ? AND date = ?',
      [habit.id, yesterday]
    );

    if (yesterdayCompletions[0].count === 0 && habit.lastCompletedAt) {
      // Missed yesterday - increment consecutive misses
      const newMisses = habit.consecutiveMisses + 1;

      // Auto-shrink to 2-minute version after 2 consecutive misses
      const shouldShrink = newMisses >= APP_CONSTANTS.CONSECUTIVE_MISSES_FOR_SHRINK;

      await db.runAsync(
        `UPDATE habits SET
          consecutiveMisses = ?,
          currentStreak = 0,
          isInTwoMinuteMode = ?
         WHERE id = ?`,
        [newMisses, shouldShrink ? 1 : (habit.isInTwoMinuteMode ? 1 : 0), habit.id]
      );
    }
  }
}

function getYesterdayDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
}

// ============ USER STATE OPERATIONS ============

export async function getUserState(): Promise<UserState> {
  if (!db) throw new Error('Database not initialized');

  // Check if we need to reset weekly count
  await checkAndResetWeeklyLimit();

  const rows = await db.getAllAsync<any>('SELECT * FROM user_state WHERE id = 1');

  if (rows.length === 0) {
    throw new Error('User state not initialized');
  }

  const row = rows[0];
  return {
    totalCapacity: row.totalCapacity,
    usedCapacity: row.usedCapacity,
    hasCompletedOnboarding: row.hasCompletedOnboarding === 1,
    currentWeekStart: row.currentWeekStart,
    habitsAddedThisWeek: row.habitsAddedThisWeek,
    reminderTime: row.reminderTime,
    hapticFeedbackEnabled: row.hapticFeedbackEnabled === 1,
  };
}

async function updateUsedCapacity(newCapacity: number): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  await db.runAsync(
    'UPDATE user_state SET usedCapacity = ? WHERE id = 1',
    [Math.max(0, newCapacity)]
  );
}

export async function setOnboardingComplete(): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  await db.runAsync(
    'UPDATE user_state SET hasCompletedOnboarding = 1 WHERE id = 1'
  );
}

export async function updateSettings(settings: {
  reminderTime?: string | null;
  hapticFeedbackEnabled?: boolean;
}): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  if (settings.reminderTime !== undefined) {
    await db.runAsync(
      'UPDATE user_state SET reminderTime = ? WHERE id = 1',
      [settings.reminderTime]
    );
  }

  if (settings.hapticFeedbackEnabled !== undefined) {
    await db.runAsync(
      'UPDATE user_state SET hapticFeedbackEnabled = ? WHERE id = 1',
      [settings.hapticFeedbackEnabled ? 1 : 0]
    );
  }
}

// Plus One limit check
export async function canAddHabitThisWeek(): Promise<boolean> {
  const state = await getUserState();
  return state.habitsAddedThisWeek < APP_CONSTANTS.MAX_HABITS_PER_WEEK;
}

async function incrementWeeklyHabitCount(): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  await db.runAsync(
    'UPDATE user_state SET habitsAddedThisWeek = habitsAddedThisWeek + 1 WHERE id = 1'
  );
}

async function checkAndResetWeeklyLimit(): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  const rows = await db.getAllAsync<any>('SELECT currentWeekStart FROM user_state WHERE id = 1');

  if (rows.length === 0) return;

  const currentWeekStart = getWeekStart(new Date());

  if (rows[0].currentWeekStart !== currentWeekStart) {
    await db.runAsync(
      'UPDATE user_state SET currentWeekStart = ?, habitsAddedThisWeek = 0 WHERE id = 1',
      [currentWeekStart]
    );
  }
}

// Recalculate total used capacity from active habits
export async function recalculateCapacity(): Promise<number> {
  if (!db) throw new Error('Database not initialized');

  const rows = await db.getAllAsync<{ total: number }>(
    'SELECT COALESCE(SUM(capacityCost), 0) as total FROM habits WHERE isPaused = 0'
  );

  const total = rows[0].total;
  await updateUsedCapacity(total);
  return total;
}
