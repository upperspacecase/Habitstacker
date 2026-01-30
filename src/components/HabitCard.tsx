/**
 * Habit Card Component
 *
 * Displays a habit with its anchor (stack), streak, and completion state.
 * When in 2-minute mode, it clearly indicates the reduced version.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Habit, Anchor } from '../types';
import { useApp, useHabitCompletedToday } from '../context/AppContext';
import { getStreakMessage } from '../utils/helpers';

interface HabitCardProps {
  habit: Habit;
  anchor?: Anchor | null;
  onPress?: () => void;
  onComplete?: () => void;
}

export function HabitCard({ habit, anchor, onPress, onComplete }: HabitCardProps) {
  const { userState } = useApp();
  const isCompletedToday = useHabitCompletedToday(habit.id);
  const hapticEnabled = userState?.hapticFeedbackEnabled ?? true;

  const handleComplete = async () => {
    if (isCompletedToday) return;

    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    onComplete?.();
  };

  const currentVersion = habit.isInTwoMinuteMode
    ? habit.twoMinuteVersion
    : habit.fullVersion;

  return (
    <Pressable
      style={[
        styles.container,
        isCompletedToday && styles.containerCompleted,
      ]}
      onPress={onPress}
    >
      {/* Stack indicator */}
      {anchor && (
        <View style={styles.stackIndicator}>
          <View style={styles.stackLine} />
          <Text style={styles.stackText}>
            {habit.stackPosition === 'after' ? 'After' : 'Before'} {anchor.name}
          </Text>
        </View>
      )}

      {/* Main content */}
      <View style={styles.content}>
        {/* Check button */}
        <Pressable
          style={[
            styles.checkButton,
            isCompletedToday && styles.checkButtonCompleted,
          ]}
          onPress={handleComplete}
          disabled={isCompletedToday}
        >
          {isCompletedToday && (
            <Text style={styles.checkMark}>✓</Text>
          )}
        </Pressable>

        {/* Habit info */}
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text
              style={[
                styles.name,
                isCompletedToday && styles.nameCompleted,
              ]}
              numberOfLines={1}
            >
              {habit.name}
            </Text>

            {/* 2-minute mode badge */}
            {habit.isInTwoMinuteMode && !isCompletedToday && (
              <View style={styles.twoMinBadge}>
                <Text style={styles.twoMinText}>2min</Text>
              </View>
            )}

            {/* Breathwork indicator */}
            {habit.habitType === 'breathwork' && (
              <View style={styles.typeBadge}>
                <Text style={styles.typeText}>Breathe</Text>
              </View>
            )}
          </View>

          <Text
            style={[
              styles.version,
              isCompletedToday && styles.versionCompleted,
            ]}
            numberOfLines={1}
          >
            {currentVersion}
          </Text>

          {/* Streak */}
          {habit.currentStreak > 0 && (
            <View style={styles.streakRow}>
              <Text style={styles.streakFire}>🔥</Text>
              <Text style={styles.streakCount}>{habit.currentStreak}</Text>
            </View>
          )}
        </View>

        {/* Capacity indicator */}
        <View style={styles.capacityBadge}>
          <Text style={styles.capacityText}>{habit.capacityCost}%</Text>
        </View>
      </View>

      {/* Shrink warning */}
      {habit.consecutiveMisses === 1 && !isCompletedToday && (
        <View style={styles.warningBar}>
          <Text style={styles.warningText}>
            1 more miss will activate 2-minute mode
          </Text>
        </View>
      )}

      {/* Restored notification */}
      {!habit.isInTwoMinuteMode && habit.currentStreak === 3 && (
        <View style={styles.successBar}>
          <Text style={styles.successText}>
            Full version restored!
          </Text>
        </View>
      )}
    </Pressable>
  );
}

// Compact version for the Today view
export function HabitCardCompact({
  habit,
  onComplete,
  onPress,
}: {
  habit: Habit;
  onComplete: () => void;
  onPress: () => void;
}) {
  const isCompletedToday = useHabitCompletedToday(habit.id);
  const { userState } = useApp();
  const hapticEnabled = userState?.hapticFeedbackEnabled ?? true;

  const handleComplete = async () => {
    if (isCompletedToday) return;

    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    onComplete();
  };

  return (
    <View
      style={[
        styles.compactContainer,
        isCompletedToday && styles.compactContainerCompleted,
      ]}
    >
      <Pressable
        style={[
          styles.compactCheck,
          isCompletedToday && styles.compactCheckCompleted,
        ]}
        onPress={handleComplete}
        disabled={isCompletedToday}
      >
        {isCompletedToday && <Text style={styles.compactCheckMark}>✓</Text>}
      </Pressable>

      <Pressable style={styles.compactContent} onPress={onPress}>
        <Text
          style={[
            styles.compactName,
            isCompletedToday && styles.compactNameCompleted,
          ]}
          numberOfLines={1}
        >
          {habit.name}
          {habit.isInTwoMinuteMode && (
            <Text style={styles.compactTwoMin}> (2min)</Text>
          )}
        </Text>
      </Pressable>

      {habit.currentStreak > 0 && (
        <View style={styles.compactStreak}>
          <Text style={styles.compactStreakText}>
            🔥 {habit.currentStreak}
          </Text>
        </View>
      )}
    </View>
  );
}

// Empty state for when no habits exist
export function NoHabitsCard({ onAddHabit }: { onAddHabit: () => void }) {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No habits yet</Text>
      <Text style={styles.emptyText}>
        Start small. Think about what you already do every day,
        then stack a tiny new habit on top.
      </Text>
      <Pressable style={styles.emptyButton} onPress={onAddHabit}>
        <Text style={styles.emptyButtonText}>Add Your First Habit</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  containerCompleted: {
    backgroundColor: '#f8fdf8',
    opacity: 0.9,
  },
  stackIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  stackLine: {
    width: 2,
    height: 12,
    backgroundColor: '#E0E0E0',
    marginRight: 8,
    borderRadius: 1,
  },
  stackText: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 8,
  },
  checkButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#DDD',
    marginRight: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkButtonCompleted: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  checkMark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  nameCompleted: {
    color: '#888',
    textDecorationLine: 'line-through',
  },
  twoMinBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  twoMinText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#E65100',
  },
  typeBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1976D2',
  },
  version: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  versionCompleted: {
    color: '#aaa',
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  streakFire: {
    fontSize: 12,
  },
  streakCount: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '600',
    marginLeft: 2,
  },
  capacityBadge: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  capacityText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  warningBar: {
    backgroundColor: '#FFF3E0',
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  warningText: {
    fontSize: 11,
    color: '#E65100',
    textAlign: 'center',
  },
  successBar: {
    backgroundColor: '#E8F5E9',
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  successText: {
    fontSize: 11,
    color: '#2E7D32',
    textAlign: 'center',
  },
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  compactContainerCompleted: {
    backgroundColor: '#fafafa',
  },
  compactCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#DDD',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactCheckCompleted: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  compactCheckMark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  compactContent: {
    flex: 1,
  },
  compactName: {
    fontSize: 15,
    color: '#333',
  },
  compactNameCompleted: {
    color: '#888',
    textDecorationLine: 'line-through',
  },
  compactTwoMin: {
    fontSize: 12,
    color: '#E65100',
  },
  compactStreak: {
    marginLeft: 8,
  },
  compactStreakText: {
    fontSize: 12,
    color: '#FF9800',
  },
  // Empty state
  emptyContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
