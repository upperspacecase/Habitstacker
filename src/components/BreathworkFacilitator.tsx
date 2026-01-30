/**
 * Breathwork Facilitator Component
 *
 * The key insight: The notification shouldn't say "Do breathwork."
 * It should say "Breathe with me for 60 seconds."
 *
 * By removing the "decision" phase, we increase the "doing" phase.
 * This component IS the facilitator - it breathes WITH the user.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { BreathPattern, BREATH_PATTERNS } from '../types';
import { useApp } from '../context/AppContext';

interface BreathworkFacilitatorProps {
  durationSeconds: number;
  pattern: BreathPattern;
  onComplete: () => void;
  onCancel: () => void;
}

type BreathPhase = 'inhale' | 'holdIn' | 'exhale' | 'holdOut' | 'complete';

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = width * 0.6;

export function BreathworkFacilitator({
  durationSeconds,
  pattern,
  onComplete,
  onCancel,
}: BreathworkFacilitatorProps) {
  const { userState } = useApp();
  const hapticEnabled = userState?.hapticFeedbackEnabled ?? true;

  const [phase, setPhase] = useState<BreathPhase>('inhale');
  const [timeRemaining, setTimeRemaining] = useState(durationSeconds);
  const [cyclesCompleted, setCyclesCompleted] = useState(0);
  const [isActive, setIsActive] = useState(true);

  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const opacityAnim = useRef(new Animated.Value(0.3)).current;

  // Calculate total cycle time
  const cycleTime =
    pattern.inhaleSeconds +
    pattern.holdInSeconds +
    pattern.exhaleSeconds +
    pattern.holdOutSeconds;

  // Haptic feedback
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy') => {
    if (!hapticEnabled) return;

    switch (type) {
      case 'light':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
    }
  }, [hapticEnabled]);

  // Animate circle based on breath phase
  const animateBreath = useCallback((newPhase: BreathPhase) => {
    setPhase(newPhase);

    switch (newPhase) {
      case 'inhale':
        triggerHaptic('light');
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: pattern.inhaleSeconds * 1000,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.8,
            duration: pattern.inhaleSeconds * 1000,
            useNativeDriver: true,
          }),
        ]).start();
        break;

      case 'holdIn':
        triggerHaptic('medium');
        // No animation during hold
        break;

      case 'exhale':
        triggerHaptic('light');
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 0.6,
            duration: pattern.exhaleSeconds * 1000,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.3,
            duration: pattern.exhaleSeconds * 1000,
            useNativeDriver: true,
          }),
        ]).start();
        break;

      case 'holdOut':
        triggerHaptic('medium');
        // No animation during hold
        break;

      case 'complete':
        triggerHaptic('heavy');
        break;
    }
  }, [pattern, scaleAnim, opacityAnim, triggerHaptic]);

  // Main breath cycle effect
  useEffect(() => {
    if (!isActive) return;

    let isMounted = true;

    const runCycle = async () => {
      if (!isMounted) return;

      // Inhale
      animateBreath('inhale');
      await sleep(pattern.inhaleSeconds * 1000);
      if (!isMounted) return;

      // Hold in (if any)
      if (pattern.holdInSeconds > 0) {
        animateBreath('holdIn');
        await sleep(pattern.holdInSeconds * 1000);
        if (!isMounted) return;
      }

      // Exhale
      animateBreath('exhale');
      await sleep(pattern.exhaleSeconds * 1000);
      if (!isMounted) return;

      // Hold out (if any)
      if (pattern.holdOutSeconds > 0) {
        animateBreath('holdOut');
        await sleep(pattern.holdOutSeconds * 1000);
        if (!isMounted) return;
      }

      setCyclesCompleted(c => c + 1);
    };

    runCycle();

    return () => {
      isMounted = false;
    };
  }, [cyclesCompleted, isActive, pattern, animateBreath]);

  // Timer countdown
  useEffect(() => {
    if (!isActive || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining(t => {
        if (t <= 1) {
          setIsActive(false);
          animateBreath('complete');
          setTimeout(onComplete, 500);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, timeRemaining, animateBreath, onComplete]);

  // Get instruction text for current phase
  const getInstructionText = (): string => {
    switch (phase) {
      case 'inhale':
        return 'Breathe in...';
      case 'holdIn':
        return 'Hold...';
      case 'exhale':
        return 'Breathe out...';
      case 'holdOut':
        return 'Hold...';
      case 'complete':
        return 'Well done';
    }
  };

  // Get phase duration for display
  const getPhaseDuration = (): number => {
    switch (phase) {
      case 'inhale':
        return pattern.inhaleSeconds;
      case 'holdIn':
        return pattern.holdInSeconds;
      case 'exhale':
        return pattern.exhaleSeconds;
      case 'holdOut':
        return pattern.holdOutSeconds;
      default:
        return 0;
    }
  };

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <View style={styles.background} />

      {/* Timer */}
      <View style={styles.timerContainer}>
        <Text style={styles.timerText}>{formatTime(timeRemaining)}</Text>
        <Text style={styles.patternName}>{pattern.name}</Text>
      </View>

      {/* Breathing circle */}
      <View style={styles.circleContainer}>
        <Animated.View
          style={[
            styles.circle,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        />

        {/* Inner circle with instruction */}
        <View style={styles.innerCircle}>
          <Text style={styles.instructionText}>{getInstructionText()}</Text>
          {phase !== 'complete' && (
            <Text style={styles.phaseSeconds}>{getPhaseDuration()}s</Text>
          )}
        </View>
      </View>

      {/* Progress info */}
      <View style={styles.infoContainer}>
        <Text style={styles.cyclesText}>
          {cyclesCompleted} breath{cyclesCompleted !== 1 ? 's' : ''} completed
        </Text>
      </View>

      {/* Cancel button */}
      <Pressable style={styles.cancelButton} onPress={onCancel}>
        <Text style={styles.cancelText}>End early</Text>
      </Pressable>
    </View>
  );
}

// Quick breathwork session (for 2-minute version)
export function QuickBreathwork({
  breaths = 3,
  onComplete,
}: {
  breaths?: number;
  onComplete: () => void;
}) {
  const [currentBreath, setCurrentBreath] = useState(1);
  const [phase, setPhase] = useState<'inhale' | 'exhale' | 'complete'>('inhale');
  const scaleAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (currentBreath > breaths) {
      setPhase('complete');
      setTimeout(onComplete, 1000);
      return;
    }

    const runBreath = async () => {
      // Inhale
      setPhase('inhale');
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      }).start();
      await sleep(3000);

      // Exhale
      setPhase('exhale');
      Animated.timing(scaleAnim, {
        toValue: 0.6,
        duration: 4000,
        useNativeDriver: true,
      }).start();
      await sleep(4000);

      setCurrentBreath(c => c + 1);
    };

    runBreath();
  }, [currentBreath, breaths, scaleAnim, onComplete]);

  return (
    <View style={styles.quickContainer}>
      <Animated.View
        style={[
          styles.quickCircle,
          { transform: [{ scale: scaleAnim }] },
        ]}
      />
      <View style={styles.quickContent}>
        {phase !== 'complete' ? (
          <>
            <Text style={styles.quickInstruction}>
              {phase === 'inhale' ? 'Breathe in...' : 'Breathe out...'}
            </Text>
            <Text style={styles.quickCount}>
              {currentBreath} of {breaths}
            </Text>
          </>
        ) : (
          <Text style={styles.quickComplete}>Done!</Text>
        )}
      </View>
    </View>
  );
}

// Breath pattern selector
export function BreathPatternSelector({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (patternName: string) => void;
}) {
  return (
    <View style={styles.patternSelector}>
      {Object.entries(BREATH_PATTERNS).map(([key, pattern]) => (
        <Pressable
          key={key}
          style={[
            styles.patternOption,
            selected === key && styles.patternOptionSelected,
          ]}
          onPress={() => onSelect(key)}
        >
          <Text
            style={[
              styles.patternOptionName,
              selected === key && styles.patternOptionNameSelected,
            ]}
          >
            {pattern.name}
          </Text>
          <Text style={styles.patternOptionTiming}>
            {pattern.inhaleSeconds}-{pattern.holdInSeconds}-
            {pattern.exhaleSeconds}-{pattern.holdOutSeconds}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// Helper functions
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1a1a2e',
  },
  timerContainer: {
    position: 'absolute',
    top: 60,
    alignItems: 'center',
  },
  timerText: {
    fontSize: 48,
    fontWeight: '200',
    color: '#fff',
    letterSpacing: 2,
  },
  patternName: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 8,
  },
  circleContainer: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circle: {
    position: 'absolute',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: '#4facfe',
  },
  innerCircle: {
    width: CIRCLE_SIZE * 0.5,
    height: CIRCLE_SIZE * 0.5,
    borderRadius: CIRCLE_SIZE * 0.25,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '300',
    textAlign: 'center',
  },
  phaseSeconds: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  infoContainer: {
    position: 'absolute',
    bottom: 140,
    alignItems: 'center',
  },
  cyclesText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
  },
  cancelButton: {
    position: 'absolute',
    bottom: 60,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
  },
  // Quick breathwork styles
  quickContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  quickCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#4facfe',
    opacity: 0.6,
  },
  quickContent: {
    alignItems: 'center',
  },
  quickInstruction: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '300',
  },
  quickCount: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 8,
  },
  quickComplete: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '300',
  },
  // Pattern selector styles
  patternSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 8,
  },
  patternOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  patternOptionSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  patternOptionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  patternOptionNameSelected: {
    color: '#1976D2',
  },
  patternOptionTiming: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});
