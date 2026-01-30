/**
 * Today Screen
 *
 * The main screen showing today's habits to complete.
 * Groups habits by their anchors to reinforce the stacking concept.
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useApp } from '../context/AppContext';
import { HabitCard, NoHabitsCard, CapacityMeterMini } from '../components';
import { getGreeting, getTodayDate, formatDate } from '../utils/helpers';
import { RootStackParamList, Anchor, Habit } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function TodayScreen() {
  const navigation = useNavigation<NavigationProp>();
  const {
    habits,
    anchors,
    todayProgress,
    isLoading,
    refreshData,
    completeHabit,
  } = useApp();

  // Group habits by anchor
  const groupedHabits = useMemo(() => {
    const groups: { anchor: Anchor | null; habits: Habit[] }[] = [];
    const anchorMap = new Map(anchors.map(a => [a.id, a]));
    const habitsByAnchor = new Map<string | null, Habit[]>();

    // Group habits
    for (const habit of habits) {
      const key = habit.anchorId;
      const existing = habitsByAnchor.get(key) || [];
      habitsByAnchor.set(key, [...existing, habit]);
    }

    // Convert to array, sorted by anchor time of day
    const timeOrder = { morning: 0, afternoon: 1, evening: 2, anytime: 3 };

    for (const [anchorId, habitList] of habitsByAnchor) {
      const anchor = anchorId ? anchorMap.get(anchorId) || null : null;
      groups.push({ anchor, habits: habitList });
    }

    groups.sort((a, b) => {
      const aTime = a.anchor?.timeOfDay || 'anytime';
      const bTime = b.anchor?.timeOfDay || 'anytime';
      return timeOrder[aTime] - timeOrder[bTime];
    });

    return groups;
  }, [habits, anchors]);

  const handleCompleteHabit = async (habit: Habit) => {
    if (habit.habitType === 'breathwork' && habit.facilitated) {
      // Navigate to breathwork facilitator
      navigation.navigate('Breathwork', { habitId: habit.id });
    } else {
      await completeHabit(habit.id);
    }
  };

  const handleHabitPress = (habit: Habit) => {
    navigation.navigate('HabitDetail', { habitId: habit.id });
  };

  const handleAddHabit = () => {
    navigation.navigate('AddHabit', {});
  };

  const today = new Date();
  const greeting = getGreeting();
  const dateStr = formatDate(today);

  const allComplete = todayProgress.completed === todayProgress.total && todayProgress.total > 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.date}>{dateStr}</Text>
        </View>
        <CapacityMeterMini />
      </View>

      {/* Progress summary */}
      <View style={styles.progressCard}>
        {allComplete ? (
          <View style={styles.completeMessage}>
            <Text style={styles.completeEmoji}>🎉</Text>
            <Text style={styles.completeText}>All habits complete!</Text>
          </View>
        ) : (
          <>
            <Text style={styles.progressText}>
              {todayProgress.completed} of {todayProgress.total} complete
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: todayProgress.total > 0
                      ? `${(todayProgress.completed / todayProgress.total) * 100}%`
                      : '0%'
                  },
                ]}
              />
            </View>
          </>
        )}
      </View>

      {/* Habits list */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refreshData} />
        }
      >
        {habits.length === 0 ? (
          <NoHabitsCard onAddHabit={handleAddHabit} />
        ) : (
          groupedHabits.map(({ anchor, habits: groupHabits }) => (
            <View key={anchor?.id || 'unanchored'} style={styles.group}>
              {anchor && (
                <View style={styles.anchorHeader}>
                  <View style={styles.anchorDot} />
                  <Text style={styles.anchorName}>{anchor.name}</Text>
                  <Text style={styles.anchorTime}>
                    {anchor.timeOfDay.charAt(0).toUpperCase() + anchor.timeOfDay.slice(1)}
                  </Text>
                </View>
              )}

              {groupHabits.map(habit => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  anchor={anchor}
                  onPress={() => handleHabitPress(habit)}
                  onComplete={() => handleCompleteHabit(habit)}
                />
              ))}
            </View>
          ))
        )}

        {/* Spacer for FAB */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Floating Add Button */}
      <Pressable style={styles.fab} onPress={handleAddHabit}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  date: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  progressCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  completeMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  completeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  group: {
    marginBottom: 8,
  },
  anchorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 8,
    paddingLeft: 4,
  },
  anchorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2196F3',
    marginRight: 8,
  },
  anchorName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    flex: 1,
  },
  anchorTime: {
    fontSize: 11,
    color: '#999',
    textTransform: 'uppercase',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '300',
  },
});
