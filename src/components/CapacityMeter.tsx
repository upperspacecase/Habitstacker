/**
 * Capacity Meter Component
 *
 * Visualizes willpower as a finite resource. This grounds the user
 * and prevents the "over-excitement" problem where they add too many habits.
 *
 * - Simple habits (drinking water): 5% capacity
 * - Difficult habits (breathwork): 20% capacity
 * - Warning when exceeding 100%
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { getCapacityMessage } from '../utils/helpers';
import { APP_CONSTANTS } from '../types';

interface CapacityMeterProps {
  showDetails?: boolean;
  compact?: boolean;
}

export function CapacityMeter({ showDetails = true, compact = false }: CapacityMeterProps) {
  const { userState, habits } = useApp();

  if (!userState) return null;

  const { usedCapacity, totalCapacity } = userState;
  const percentage = Math.min((usedCapacity / totalCapacity) * 100, 100);

  // Color based on capacity usage
  const getBarColor = () => {
    if (percentage < 50) return '#4CAF50'; // Green - plenty of room
    if (percentage < 75) return '#8BC34A'; // Light green - getting full
    if (percentage < 90) return '#FFC107'; // Yellow - caution
    if (percentage < 100) return '#FF9800'; // Orange - nearly full
    return '#F44336'; // Red - at capacity
  };

  const activeHabits = habits.filter(h => !h.isPaused);

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactBar}>
          <View
            style={[
              styles.compactFill,
              { width: `${percentage}%`, backgroundColor: getBarColor() },
            ]}
          />
        </View>
        <Text style={styles.compactText}>{Math.round(percentage)}%</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Willpower Capacity</Text>
        <Text style={styles.percentage}>{usedCapacity}/{totalCapacity}</Text>
      </View>

      <View style={styles.barContainer}>
        <View style={styles.barBackground}>
          <Animated.View
            style={[
              styles.barFill,
              { width: `${percentage}%`, backgroundColor: getBarColor() },
            ]}
          />
        </View>

        {/* Threshold markers */}
        <View style={styles.markers}>
          <View style={[styles.marker, { left: '50%' }]} />
          <View style={[styles.marker, { left: '75%' }]} />
          <View style={[styles.marker, { left: '100%' }]} />
        </View>
      </View>

      {showDetails && (
        <>
          <Text style={styles.message}>
            {getCapacityMessage(usedCapacity, totalCapacity)}
          </Text>

          {percentage >= 100 && (
            <View style={styles.warningBox}>
              <Text style={styles.warningIcon}>!</Text>
              <Text style={styles.warningText}>
                Consider pausing a habit before adding a new one.
                This helps prevent burnout and builds sustainable habits.
              </Text>
            </View>
          )}

          <View style={styles.breakdown}>
            <Text style={styles.breakdownTitle}>
              Active Habits ({activeHabits.length})
            </Text>
            {activeHabits.map(habit => (
              <View key={habit.id} style={styles.habitRow}>
                <Text style={styles.habitName} numberOfLines={1}>
                  {habit.name}
                </Text>
                <Text style={styles.habitCost}>
                  {habit.capacityCost}%
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

// Mini version for the Today screen header
export function CapacityMeterMini() {
  const { userState } = useApp();

  if (!userState) return null;

  const { usedCapacity, totalCapacity } = userState;
  const percentage = (usedCapacity / totalCapacity) * 100;

  const getColor = () => {
    if (percentage < 75) return '#4CAF50';
    if (percentage < 100) return '#FFC107';
    return '#F44336';
  };

  return (
    <View style={styles.miniContainer}>
      <Text style={styles.miniLabel}>Energy</Text>
      <View style={styles.miniBar}>
        <View
          style={[
            styles.miniFill,
            { width: `${100 - percentage}%`, backgroundColor: getColor() },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  percentage: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  barContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  barBackground: {
    height: 12,
    backgroundColor: '#E0E0E0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 6,
  },
  markers: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 12,
  },
  marker: {
    position: 'absolute',
    width: 2,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  message: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  warningIcon: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9800',
    marginRight: 8,
    width: 20,
    textAlign: 'center',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#E65100',
    lineHeight: 18,
  },
  breakdown: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 12,
  },
  breakdownTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  habitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  habitName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  habitCost: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: 8,
  },
  compactFill: {
    height: '100%',
    borderRadius: 3,
  },
  compactText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    width: 35,
    textAlign: 'right',
  },
  // Mini styles (for header)
  miniContainer: {
    alignItems: 'center',
  },
  miniLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 2,
  },
  miniBar: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
    transform: [{ scaleX: -1 }], // Reversed to show "energy remaining"
  },
  miniFill: {
    height: '100%',
    borderRadius: 2,
  },
});
