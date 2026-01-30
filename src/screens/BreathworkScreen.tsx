/**
 * Breathwork Screen
 *
 * "The notification shouldn't say 'Do breathwork.'
 * It should say 'Breathe with me for 60 seconds.'"
 *
 * This screen IS the facilitator. It removes the decision phase
 * entirely and just starts breathing WITH the user.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useApp } from '../context/AppContext';
import { BreathworkFacilitator, QuickBreathwork } from '../components';
import { RootStackParamList, BREATH_PATTERNS } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Breathwork'>;
type BreathworkRoute = RouteProp<RootStackParamList, 'Breathwork'>;

export function BreathworkScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<BreathworkRoute>();
  const { habits, completeHabit } = useApp();

  const habit = habits.find(h => h.id === route.params.habitId);
  const [isCompleting, setIsCompleting] = useState(false);

  if (!habit) {
    // Habit not found, go back
    useEffect(() => {
      navigation.goBack();
    }, [navigation]);
    return null;
  }

  const handleComplete = async () => {
    if (isCompleting) return;

    setIsCompleting(true);
    try {
      await completeHabit(habit.id);
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to complete habit');
      setIsCompleting(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'End session?',
      'Your progress won\'t be saved.',
      [
        { text: 'Keep breathing', style: 'cancel' },
        { text: 'End', style: 'destructive', onPress: () => navigation.goBack() },
      ]
    );
  };

  // Determine which version to show
  const isQuickVersion = habit.isInTwoMinuteMode;

  if (isQuickVersion) {
    // Show the 3-breath quick version
    return (
      <View style={styles.container}>
        <QuickBreathwork breaths={3} onComplete={handleComplete} />
      </View>
    );
  }

  // Show the full facilitator
  const pattern = habit.facilitated?.breathPattern || BREATH_PATTERNS.box;
  const duration = habit.facilitated?.durationSeconds || 60;

  return (
    <View style={styles.container}>
      <BreathworkFacilitator
        durationSeconds={duration}
        pattern={pattern}
        onComplete={handleComplete}
        onCancel={handleCancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
});
