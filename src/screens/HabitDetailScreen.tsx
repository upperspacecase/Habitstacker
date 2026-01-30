/**
 * Habit Detail Screen
 *
 * Shows full habit details, streak history, and allows
 * pausing/resuming/deleting habits.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useApp } from '../context/AppContext';
import { RootStackParamList, HabitCompletion } from '../types';
import * as db from '../database';
import { formatDate, getStreakMessage } from '../utils/helpers';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'HabitDetail'>;
type HabitDetailRoute = RouteProp<RootStackParamList, 'HabitDetail'>;

export function HabitDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<HabitDetailRoute>();
  const { habits, anchors, pauseHabit, resumeHabit, deleteHabit } = useApp();

  const habit = habits.find(h => h.id === route.params.habitId);
  const anchor = habit?.anchorId ? anchors.find(a => a.id === habit.anchorId) : null;

  const [recentCompletions, setRecentCompletions] = useState<HabitCompletion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (habit) {
      db.getCompletionsForHabit(habit.id, 14).then(setRecentCompletions);
    }
  }, [habit]);

  if (!habit) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Habit not found</Text>
      </View>
    );
  }

  const handlePause = async () => {
    Alert.alert(
      'Pause habit?',
      'This will remove it from your daily list and free up capacity. Your streak will be preserved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pause',
          onPress: async () => {
            setIsLoading(true);
            try {
              await pauseHabit(habit.id);
              navigation.goBack();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
            setIsLoading(false);
          },
        },
      ]
    );
  };

  const handleResume = async () => {
    setIsLoading(true);
    try {
      await resumeHabit(habit.id);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
    setIsLoading(false);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete habit?',
      'This will permanently remove this habit and all its history. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await deleteHabit(habit.id);
              navigation.goBack();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
            setIsLoading(false);
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.name}>{habit.name}</Text>
        {habit.description && (
          <Text style={styles.description}>{habit.description}</Text>
        )}

        {anchor && (
          <View style={styles.stackInfo}>
            <Text style={styles.stackText}>
              {habit.stackPosition === 'after' ? 'After' : 'Before'} {anchor.name}
            </Text>
          </View>
        )}

        {habit.isPaused && (
          <View style={styles.pausedBadge}>
            <Text style={styles.pausedText}>Paused</Text>
          </View>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {habit.currentStreak}
          </Text>
          <Text style={styles.statLabel}>Current Streak</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {habit.longestStreak}
          </Text>
          <Text style={styles.statLabel}>Longest Streak</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {recentCompletions.length}
          </Text>
          <Text style={styles.statLabel}>Last 14 Days</Text>
        </View>
      </View>

      {/* Streak message */}
      <View style={styles.streakMessage}>
        <Text style={styles.streakEmoji}>
          {habit.currentStreak > 0 ? '🔥' : '💪'}
        </Text>
        <Text style={styles.streakText}>
          {getStreakMessage(habit.currentStreak)}
        </Text>
      </View>

      {/* Versions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Versions</Text>

        <View style={[
          styles.versionCard,
          !habit.isInTwoMinuteMode && styles.versionCardActive,
        ]}>
          <Text style={styles.versionLabel}>Full Version</Text>
          <Text style={styles.versionText}>{habit.fullVersion}</Text>
          {!habit.isInTwoMinuteMode && (
            <View style={styles.activeTag}>
              <Text style={styles.activeTagText}>Active</Text>
            </View>
          )}
        </View>

        <View style={[
          styles.versionCard,
          habit.isInTwoMinuteMode && styles.versionCardActive,
        ]}>
          <Text style={styles.versionLabel}>2-Minute Version</Text>
          <Text style={styles.versionText}>{habit.twoMinuteVersion}</Text>
          {habit.isInTwoMinuteMode && (
            <View style={styles.activeTag}>
              <Text style={styles.activeTagText}>Active</Text>
            </View>
          )}
        </View>

        {habit.isInTwoMinuteMode && (
          <View style={styles.shrinkInfo}>
            <Text style={styles.shrinkInfoText}>
              Complete {3 - habit.currentStreak} more days to restore full version
            </Text>
          </View>
        )}
      </View>

      {/* Recent history */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent History</Text>

        {recentCompletions.length === 0 ? (
          <Text style={styles.emptyHistory}>No completions yet</Text>
        ) : (
          <View style={styles.historyList}>
            {recentCompletions.map(completion => (
              <View key={completion.id} style={styles.historyItem}>
                <Text style={styles.historyDate}>
                  {formatDate(new Date(completion.date))}
                </Text>
                {completion.wasInTwoMinuteMode && (
                  <Text style={styles.historyBadge}>2min</Text>
                )}
                <Text style={styles.historyCheck}>✓</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Capacity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Capacity Cost</Text>
        <View style={styles.capacityInfo}>
          <Text style={styles.capacityValue}>{habit.capacityCost}%</Text>
          <Text style={styles.capacityLabel}>
            {habit.difficulty.charAt(0).toUpperCase() + habit.difficulty.slice(1)} difficulty
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {habit.isPaused ? (
          <Pressable
            style={styles.resumeButton}
            onPress={handleResume}
            disabled={isLoading}
          >
            <Text style={styles.resumeButtonText}>Resume Habit</Text>
          </Pressable>
        ) : (
          <Pressable
            style={styles.pauseButton}
            onPress={handlePause}
            disabled={isLoading}
          >
            <Text style={styles.pauseButtonText}>Pause Habit</Text>
          </Pressable>
        )}

        <Pressable
          style={styles.deleteButton}
          onPress={handleDelete}
          disabled={isLoading}
        >
          <Text style={styles.deleteButtonText}>Delete Habit</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 40,
  },
  header: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  stackInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  stackText: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
  },
  pausedBadge: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
  },
  pausedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E65100',
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stat: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
  },
  statLabel: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
    textAlign: 'center',
  },
  streakMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  streakEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  streakText: {
    fontSize: 15,
    color: '#F57C00',
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  versionCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  versionCardActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  versionLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  versionText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  activeTag: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#2196F3',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  activeTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  shrinkInfo: {
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  shrinkInfoText: {
    fontSize: 13,
    color: '#F57C00',
    textAlign: 'center',
  },
  emptyHistory: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  historyList: {
    gap: 4,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  historyDate: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  historyBadge: {
    fontSize: 10,
    color: '#E65100',
    backgroundColor: '#FFF3E0',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
    marginRight: 8,
  },
  historyCheck: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  capacityInfo: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  capacityValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#333',
  },
  capacityLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  actions: {
    gap: 12,
    marginTop: 8,
  },
  pauseButton: {
    backgroundColor: '#FFF3E0',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  pauseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E65100',
  },
  resumeButton: {
    backgroundColor: '#E3F2FD',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  resumeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
  },
  deleteButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 15,
    color: '#F44336',
  },
});
