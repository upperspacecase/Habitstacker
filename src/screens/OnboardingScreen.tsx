/**
 * Onboarding Screen
 *
 * Introduces the core concepts:
 * 1. Habit stacking - using anchors
 * 2. The 2-minute rule - small versions of habits
 * 3. Capacity - willpower is finite
 * 4. Plus One - one new habit per week
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useApp } from '../context/AppContext';
import { RootStackParamList } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;

const { width } = Dimensions.get('window');

interface OnboardingSlide {
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  color: string;
}

const SLIDES: OnboardingSlide[] = [
  {
    title: 'Habit Stacking',
    subtitle: 'The anchor principle',
    description: 'Instead of creating habits from scratch, attach new behaviors to things you already do. "After I brush my teeth, I will take 3 deep breaths."',
    icon: '🔗',
    color: '#2196F3',
  },
  {
    title: 'The 2-Minute Rule',
    subtitle: 'Start impossibly small',
    description: 'Every habit has a tiny version. When life gets hard, the app shrinks your habit automatically. 30 minutes of breathwork becomes 3 deep breaths. Just keep the chain alive.',
    icon: '⏱️',
    color: '#FF9800',
  },
  {
    title: 'Willpower is Finite',
    subtitle: 'The capacity meter',
    description: "You only have so much energy each day. This app tracks your 'capacity' and warns you before you overcommit. Less is more.",
    icon: '🔋',
    color: '#4CAF50',
  },
  {
    title: 'One Habit Per Week',
    subtitle: 'The Plus One limit',
    description: 'You can only add one new habit per week. This isn\'t a limitation—it\'s protection. Sustainable beats spectacular every time.',
    icon: '🎯',
    color: '#9C27B0',
  },
];

export function OnboardingScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { completeOnboarding } = useApp();
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = async () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      await completeOnboarding();
      navigation.replace('Main');
    }
  };

  const handleSkip = async () => {
    await completeOnboarding();
    navigation.replace('Main');
  };

  const slide = SLIDES[currentSlide];
  const isLast = currentSlide === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      {/* Skip button */}
      {!isLast && (
        <Pressable style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      )}

      {/* Content */}
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: slide.color + '20' }]}>
          <Text style={styles.icon}>{slide.icon}</Text>
        </View>

        <Text style={styles.title}>{slide.title}</Text>
        <Text style={[styles.subtitle, { color: slide.color }]}>{slide.subtitle}</Text>
        <Text style={styles.description}>{slide.description}</Text>
      </View>

      {/* Progress dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === currentSlide && styles.dotActive,
              index === currentSlide && { backgroundColor: slide.color },
            ]}
          />
        ))}
      </View>

      {/* Next button */}
      <Pressable
        style={[styles.nextButton, { backgroundColor: slide.color }]}
        onPress={handleNext}
      >
        <Text style={styles.nextButtonText}>
          {isLast ? 'Get Started' : 'Next'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  skipButton: {
    alignSelf: 'flex-end',
    padding: 8,
  },
  skipText: {
    fontSize: 15,
    color: '#999',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  icon: {
    fontSize: 56,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
  },
  dotActive: {
    width: 24,
  },
  nextButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
});
