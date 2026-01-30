/**
 * App Context - Central state management for Habitstacker
 *
 * Provides access to habits, anchors, completions, and user state
 * throughout the app.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  Habit,
  Anchor,
  HabitCompletion,
  UserState,
  NewHabitInput,
} from '../types';
import * as db from '../database';
import { getTodayDate } from '../utils/helpers';

interface AppState {
  // Data
  habits: Habit[];
  anchors: Anchor[];
  todayCompletions: HabitCompletion[];
  userState: UserState | null;

  // Loading states
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  refreshData: () => Promise<void>;
  addHabit: (input: NewHabitInput) => Promise<Habit>;
  completeHabit: (habitId: string, notes?: string) => Promise<void>;
  pauseHabit: (habitId: string) => Promise<void>;
  resumeHabit: (habitId: string) => Promise<void>;
  deleteHabit: (habitId: string) => Promise<void>;
  addAnchor: (name: string, description: string, timeOfDay: Anchor['timeOfDay']) => Promise<Anchor>;
  completeOnboarding: () => Promise<void>;
  updateSettings: (settings: { reminderTime?: string | null; hapticFeedbackEnabled?: boolean }) => Promise<void>;

  // Computed
  canAddHabitThisWeek: boolean;
  todayProgress: { completed: number; total: number };
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [anchors, setAnchors] = useState<Anchor[]>([]);
  const [todayCompletions, setTodayCompletions] = useState<HabitCompletion[]>([]);
  const [userState, setUserState] = useState<UserState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize database and load data
  useEffect(() => {
    async function init() {
      try {
        await db.initDatabase();

        // Process any missed days (for auto-shrink logic)
        await db.processMissedDays();

        // Load all data
        await loadAllData();

        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize app:', error);
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, []);

  const loadAllData = useCallback(async () => {
    const [habitsData, anchorsData, completionsData, stateData] = await Promise.all([
      db.getActiveHabits(),
      db.getAllAnchors(),
      db.getCompletionsForDate(getTodayDate()),
      db.getUserState(),
    ]);

    setHabits(habitsData);
    setAnchors(anchorsData);
    setTodayCompletions(completionsData);
    setUserState(stateData);
  }, []);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    await loadAllData();
    setIsLoading(false);
  }, [loadAllData]);

  const addHabit = useCallback(async (input: NewHabitInput): Promise<Habit> => {
    const newHabit = await db.createHabit(input);
    await refreshData();
    return newHabit;
  }, [refreshData]);

  const completeHabit = useCallback(async (habitId: string, notes?: string) => {
    await db.completeHabit(habitId, notes);
    await refreshData();
  }, [refreshData]);

  const pauseHabit = useCallback(async (habitId: string) => {
    await db.pauseHabit(habitId);
    await refreshData();
  }, [refreshData]);

  const resumeHabit = useCallback(async (habitId: string) => {
    await db.resumeHabit(habitId);
    await refreshData();
  }, [refreshData]);

  const deleteHabit = useCallback(async (habitId: string) => {
    await db.deleteHabit(habitId);
    await refreshData();
  }, [refreshData]);

  const addAnchor = useCallback(async (
    name: string,
    description: string,
    timeOfDay: Anchor['timeOfDay']
  ): Promise<Anchor> => {
    const newAnchor = await db.createAnchor(name, description, timeOfDay);
    await refreshData();
    return newAnchor;
  }, [refreshData]);

  const completeOnboarding = useCallback(async () => {
    await db.setOnboardingComplete();
    await refreshData();
  }, [refreshData]);

  const updateSettings = useCallback(async (settings: {
    reminderTime?: string | null;
    hapticFeedbackEnabled?: boolean;
  }) => {
    await db.updateSettings(settings);
    await refreshData();
  }, [refreshData]);

  // Computed values
  const canAddHabitThisWeek = userState
    ? userState.habitsAddedThisWeek < 1
    : false;

  const activeHabits = habits.filter(h => !h.isPaused);
  const completedToday = todayCompletions.length;
  const todayProgress = {
    completed: completedToday,
    total: activeHabits.length,
  };

  const value: AppState = {
    habits,
    anchors,
    todayCompletions,
    userState,
    isLoading,
    isInitialized,
    refreshData,
    addHabit,
    completeHabit,
    pauseHabit,
    resumeHabit,
    deleteHabit,
    addAnchor,
    completeOnboarding,
    updateSettings,
    canAddHabitThisWeek,
    todayProgress,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

// Hook to check if a specific habit is completed today
export function useHabitCompletedToday(habitId: string): boolean {
  const { todayCompletions } = useApp();
  return todayCompletions.some(c => c.habitId === habitId);
}

// Hook to get habits grouped by anchor
export function useHabitsByAnchor(): Map<string | null, Habit[]> {
  const { habits, anchors } = useApp();

  const grouped = new Map<string | null, Habit[]>();

  // Group habits by anchor
  for (const habit of habits) {
    const key = habit.anchorId;
    const existing = grouped.get(key) || [];
    grouped.set(key, [...existing, habit]);
  }

  return grouped;
}
