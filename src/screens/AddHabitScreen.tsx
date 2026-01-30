/**
 * Add Habit Screen
 *
 * Instead of just asking "What do you want to do?", this screen asks
 * "What do you already do every day?" (anchor detection) first.
 *
 * Key UX principles:
 * 1. Start with anchors - existing habits the user already has
 * 2. Require both full version and 2-minute version
 * 3. Show capacity impact before committing
 * 4. Enforce the Plus One limit
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useApp } from '../context/AppContext';
import { CapacityMeter, BreathPatternSelector } from '../components';
import {
  RootStackParamList,
  HabitDifficulty,
  CAPACITY_COSTS,
  BREATH_PATTERNS,
  APP_CONSTANTS,
} from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'AddHabit'>;
type AddHabitRoute = RouteProp<RootStackParamList, 'AddHabit'>;

type Step = 'anchor' | 'habit' | 'versions' | 'difficulty' | 'review';

const DIFFICULTY_OPTIONS: { value: HabitDifficulty; label: string; description: string }[] = [
  { value: 'trivial', label: 'Trivial', description: 'Takes seconds (drinking water)' },
  { value: 'easy', label: 'Easy', description: '1-5 minutes (gratitude journaling)' },
  { value: 'moderate', label: 'Moderate', description: '5-15 minutes (stretching)' },
  { value: 'challenging', label: 'Challenging', description: '15-30 minutes (breathwork)' },
  { value: 'hard', label: 'Hard', description: '30+ minutes (workout)' },
];

export function AddHabitScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<AddHabitRoute>();
  const {
    anchors,
    addHabit,
    addAnchor,
    canAddHabitThisWeek,
    userState,
  } = useApp();

  const [step, setStep] = useState<Step>(route.params?.anchorId ? 'habit' : 'anchor');
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [selectedAnchorId, setSelectedAnchorId] = useState<string | null>(
    route.params?.anchorId || null
  );
  const [stackPosition, setStackPosition] = useState<'before' | 'after'>('after');
  const [customAnchorName, setCustomAnchorName] = useState('');
  const [customAnchorTime, setCustomAnchorTime] = useState<'morning' | 'afternoon' | 'evening'>('morning');

  const [habitName, setHabitName] = useState('');
  const [habitDescription, setHabitDescription] = useState('');
  const [isBreathwork, setIsBreathwork] = useState(false);

  const [fullVersion, setFullVersion] = useState('');
  const [twoMinuteVersion, setTwoMinuteVersion] = useState('');
  const [breathDuration, setBreathDuration] = useState(60);
  const [breathPattern, setBreathPattern] = useState('box');

  const [difficulty, setDifficulty] = useState<HabitDifficulty>('easy');

  // Selected anchor object
  const selectedAnchor = useMemo(() => {
    return anchors.find(a => a.id === selectedAnchorId) || null;
  }, [anchors, selectedAnchorId]);

  // Check if can proceed
  const canProceed = useMemo(() => {
    switch (step) {
      case 'anchor':
        return selectedAnchorId !== null || customAnchorName.trim().length > 0;
      case 'habit':
        return habitName.trim().length > 0;
      case 'versions':
        if (isBreathwork) return breathDuration > 0;
        return fullVersion.trim().length > 0 && twoMinuteVersion.trim().length > 0;
      case 'difficulty':
        return true;
      case 'review':
        return true;
      default:
        return false;
    }
  }, [step, selectedAnchorId, customAnchorName, habitName, fullVersion, twoMinuteVersion, isBreathwork, breathDuration]);

  // Calculate capacity impact
  const capacityImpact = CAPACITY_COSTS[difficulty];
  const newTotalCapacity = (userState?.usedCapacity || 0) + capacityImpact;
  const wouldExceedCapacity = newTotalCapacity > APP_CONSTANTS.MAX_CAPACITY;

  const handleNext = async () => {
    if (step === 'anchor' && customAnchorName.trim() && !selectedAnchorId) {
      // Create custom anchor first
      try {
        const newAnchor = await addAnchor(
          customAnchorName.trim(),
          '',
          customAnchorTime
        );
        setSelectedAnchorId(newAnchor.id);
      } catch (error) {
        Alert.alert('Error', 'Failed to create anchor');
        return;
      }
    }

    const steps: Step[] = ['anchor', 'habit', 'versions', 'difficulty', 'review'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const steps: Step[] = ['anchor', 'habit', 'versions', 'difficulty', 'review'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    } else {
      navigation.goBack();
    }
  };

  const handleSubmit = async () => {
    if (!canAddHabitThisWeek) {
      Alert.alert(
        'Weekly Limit Reached',
        'You can only add one new habit per week. This limit helps you build sustainable habits without overwhelming yourself.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (wouldExceedCapacity) {
      Alert.alert(
        'Capacity Full',
        'Adding this habit would exceed your willpower capacity. Consider pausing an existing habit first.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsLoading(true);
    try {
      await addHabit({
        name: habitName.trim(),
        description: habitDescription.trim(),
        fullVersion: isBreathwork ? `${Math.floor(breathDuration / 60)} minute ${BREATH_PATTERNS[breathPattern].name}` : fullVersion.trim(),
        twoMinuteVersion: isBreathwork ? '3 deep breaths' : twoMinuteVersion.trim(),
        anchorId: selectedAnchorId,
        stackPosition,
        difficulty,
        habitType: isBreathwork ? 'breathwork' : 'standard',
        facilitated: isBreathwork ? {
          durationSeconds: breathDuration,
          breathPattern: BREATH_PATTERNS[breathPattern],
        } : undefined,
      });

      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create habit');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'anchor':
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>What do you already do every day?</Text>
            <Text style={styles.stepDescription}>
              Pick an existing habit to attach your new habit to. This is called habit stacking.
            </Text>

            <ScrollView style={styles.anchorList}>
              {anchors.map(anchor => (
                <Pressable
                  key={anchor.id}
                  style={[
                    styles.anchorItem,
                    selectedAnchorId === anchor.id && styles.anchorItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedAnchorId(anchor.id);
                    setCustomAnchorName('');
                  }}
                >
                  <Text
                    style={[
                      styles.anchorItemName,
                      selectedAnchorId === anchor.id && styles.anchorItemNameSelected,
                    ]}
                  >
                    {anchor.name}
                  </Text>
                  <Text style={styles.anchorItemTime}>
                    {anchor.timeOfDay}
                  </Text>
                </Pressable>
              ))}

              <View style={styles.divider}>
                <Text style={styles.dividerText}>Or add your own</Text>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Something you do daily..."
                value={customAnchorName}
                onChangeText={text => {
                  setCustomAnchorName(text);
                  if (text.trim()) setSelectedAnchorId(null);
                }}
              />

              {customAnchorName.trim().length > 0 && (
                <View style={styles.timeOfDayPicker}>
                  {(['morning', 'afternoon', 'evening'] as const).map(time => (
                    <Pressable
                      key={time}
                      style={[
                        styles.timeOption,
                        customAnchorTime === time && styles.timeOptionSelected,
                      ]}
                      onPress={() => setCustomAnchorTime(time)}
                    >
                      <Text
                        style={[
                          styles.timeOptionText,
                          customAnchorTime === time && styles.timeOptionTextSelected,
                        ]}
                      >
                        {time.charAt(0).toUpperCase() + time.slice(1)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        );

      case 'habit':
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>What habit do you want to build?</Text>

            {selectedAnchor && (
              <View style={styles.stackPreview}>
                <Text style={styles.stackPreviewText}>
                  {stackPosition === 'after' ? 'After' : 'Before'} "{selectedAnchor.name}"
                </Text>
                <View style={styles.positionToggle}>
                  <Pressable
                    style={[
                      styles.positionOption,
                      stackPosition === 'after' && styles.positionOptionSelected,
                    ]}
                    onPress={() => setStackPosition('after')}
                  >
                    <Text style={styles.positionOptionText}>After</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.positionOption,
                      stackPosition === 'before' && styles.positionOptionSelected,
                    ]}
                    onPress={() => setStackPosition('before')}
                  >
                    <Text style={styles.positionOptionText}>Before</Text>
                  </Pressable>
                </View>
              </View>
            )}

            <TextInput
              style={styles.input}
              placeholder="Habit name (e.g., Breathwork)"
              value={habitName}
              onChangeText={setHabitName}
            />

            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Description (optional)"
              value={habitDescription}
              onChangeText={setHabitDescription}
              multiline
              numberOfLines={2}
            />

            <Pressable
              style={[
                styles.breathworkToggle,
                isBreathwork && styles.breathworkToggleActive,
              ]}
              onPress={() => setIsBreathwork(!isBreathwork)}
            >
              <Text style={styles.breathworkToggleText}>
                This is a breathwork/meditation habit
              </Text>
              <View style={[
                styles.toggle,
                isBreathwork && styles.toggleActive,
              ]}>
                <View style={[
                  styles.toggleKnob,
                  isBreathwork && styles.toggleKnobActive,
                ]} />
              </View>
            </Pressable>
          </View>
        );

      case 'versions':
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Design both versions</Text>
            <Text style={styles.stepDescription}>
              The 2-minute version kicks in when you miss 2 days.
              It keeps the habit alive until you're ready for the full version again.
            </Text>

            {isBreathwork ? (
              <>
                <Text style={styles.label}>Duration (seconds)</Text>
                <View style={styles.durationPicker}>
                  {[30, 60, 120, 180, 300].map(sec => (
                    <Pressable
                      key={sec}
                      style={[
                        styles.durationOption,
                        breathDuration === sec && styles.durationOptionSelected,
                      ]}
                      onPress={() => setBreathDuration(sec)}
                    >
                      <Text
                        style={[
                          styles.durationOptionText,
                          breathDuration === sec && styles.durationOptionTextSelected,
                        ]}
                      >
                        {sec >= 60 ? `${sec / 60}m` : `${sec}s`}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={[styles.label, { marginTop: 20 }]}>Breathing Pattern</Text>
                <BreathPatternSelector
                  selected={breathPattern}
                  onSelect={setBreathPattern}
                />

                <View style={styles.twoMinPreview}>
                  <Text style={styles.twoMinPreviewLabel}>2-minute version:</Text>
                  <Text style={styles.twoMinPreviewText}>3 deep breaths</Text>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.label}>Full version (your ambition)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 30 minutes of meditation"
                  value={fullVersion}
                  onChangeText={setFullVersion}
                />

                <Text style={[styles.label, { marginTop: 16 }]}>2-minute version (the minimum)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 3 deep breaths"
                  value={twoMinuteVersion}
                  onChangeText={setTwoMinuteVersion}
                />

                <View style={styles.tipBox}>
                  <Text style={styles.tipText}>
                    Tip: The 2-minute version should be so easy you can do it even on your worst day.
                  </Text>
                </View>
              </>
            )}
          </View>
        );

      case 'difficulty':
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>How much willpower does this take?</Text>
            <Text style={styles.stepDescription}>
              Be honest. Willpower is a finite resource.
            </Text>

            <View style={styles.difficultyList}>
              {DIFFICULTY_OPTIONS.map(option => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.difficultyItem,
                    difficulty === option.value && styles.difficultyItemSelected,
                  ]}
                  onPress={() => setDifficulty(option.value)}
                >
                  <View style={styles.difficultyMain}>
                    <Text
                      style={[
                        styles.difficultyLabel,
                        difficulty === option.value && styles.difficultyLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Text style={styles.difficultyDescription}>
                      {option.description}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.difficultyCost,
                      difficulty === option.value && styles.difficultyCostSelected,
                    ]}
                  >
                    {CAPACITY_COSTS[option.value]}%
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        );

      case 'review':
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Review your habit</Text>

            <View style={styles.reviewCard}>
              {selectedAnchor && (
                <Text style={styles.reviewStack}>
                  {stackPosition === 'after' ? 'After' : 'Before'} {selectedAnchor.name}
                </Text>
              )}

              <Text style={styles.reviewName}>{habitName}</Text>

              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Full version:</Text>
                <Text style={styles.reviewValue}>
                  {isBreathwork
                    ? `${Math.floor(breathDuration / 60)} min ${BREATH_PATTERNS[breathPattern].name}`
                    : fullVersion}
                </Text>
              </View>

              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>2-min version:</Text>
                <Text style={styles.reviewValue}>
                  {isBreathwork ? '3 deep breaths' : twoMinuteVersion}
                </Text>
              </View>

              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Difficulty:</Text>
                <Text style={styles.reviewValue}>
                  {difficulty} ({capacityImpact}% capacity)
                </Text>
              </View>
            </View>

            <View style={styles.capacityPreview}>
              <Text style={styles.capacityPreviewTitle}>Capacity Impact</Text>
              <View style={styles.capacityBar}>
                <View
                  style={[
                    styles.capacityBarFill,
                    { width: `${userState?.usedCapacity || 0}%` },
                    { backgroundColor: '#4CAF50' },
                  ]}
                />
                <View
                  style={[
                    styles.capacityBarFill,
                    { width: `${capacityImpact}%` },
                    { backgroundColor: wouldExceedCapacity ? '#F44336' : '#8BC34A' },
                    { marginLeft: `${userState?.usedCapacity || 0}%`, position: 'absolute' },
                  ]}
                />
              </View>
              <Text style={styles.capacityPreviewText}>
                {userState?.usedCapacity || 0}% + {capacityImpact}% = {newTotalCapacity}%
              </Text>

              {wouldExceedCapacity && (
                <View style={styles.warningBox}>
                  <Text style={styles.warningText}>
                    This would exceed your capacity. Pause an existing habit first.
                  </Text>
                </View>
              )}

              {!canAddHabitThisWeek && (
                <View style={styles.warningBox}>
                  <Text style={styles.warningText}>
                    You've already added a habit this week. Come back next week!
                  </Text>
                </View>
              )}
            </View>
          </View>
        );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Progress indicator */}
      <View style={styles.progress}>
        {['anchor', 'habit', 'versions', 'difficulty', 'review'].map((s, i) => (
          <View
            key={s}
            style={[
              styles.progressDot,
              step === s && styles.progressDotActive,
              ['anchor', 'habit', 'versions', 'difficulty', 'review'].indexOf(step) > i && styles.progressDotComplete,
            ]}
          />
        ))}
      </View>

      <ScrollView style={styles.scrollView}>
        {renderStep()}
      </ScrollView>

      {/* Navigation buttons */}
      <View style={styles.buttons}>
        <Pressable style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>

        {step === 'review' ? (
          <Pressable
            style={[
              styles.submitButton,
              (!canAddHabitThisWeek || wouldExceedCapacity) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isLoading || !canAddHabitThisWeek || wouldExceedCapacity}
          >
            <Text style={styles.submitButtonText}>
              {isLoading ? 'Creating...' : 'Create Habit'}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            style={[
              styles.nextButton,
              !canProceed && styles.nextButtonDisabled,
            ]}
            onPress={handleNext}
            disabled={!canProceed}
          >
            <Text style={styles.nextButtonText}>Next</Text>
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  progress: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
  },
  progressDotActive: {
    backgroundColor: '#2196F3',
    width: 24,
  },
  progressDotComplete: {
    backgroundColor: '#4CAF50',
  },
  scrollView: {
    flex: 1,
  },
  stepContent: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 24,
  },
  anchorList: {
    maxHeight: 400,
  },
  anchorItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  anchorItemSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  anchorItemName: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  anchorItemNameSelected: {
    color: '#1976D2',
    fontWeight: '600',
  },
  anchorItemTime: {
    fontSize: 12,
    color: '#999',
    textTransform: 'capitalize',
  },
  divider: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerText: {
    fontSize: 13,
    color: '#999',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  timeOfDayPicker: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  timeOption: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  timeOptionSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  timeOptionText: {
    fontSize: 13,
    color: '#666',
  },
  timeOptionTextSelected: {
    color: '#1976D2',
    fontWeight: '600',
  },
  stackPreview: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  stackPreviewText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  positionToggle: {
    flexDirection: 'row',
    gap: 8,
  },
  positionOption: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  positionOptionSelected: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  positionOptionText: {
    fontSize: 14,
    color: '#666',
  },
  breathworkToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    marginTop: 8,
  },
  breathworkToggleActive: {
    backgroundColor: '#E3F2FD',
  },
  breathworkToggleText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: '#2196F3',
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  durationPicker: {
    flexDirection: 'row',
    gap: 8,
  },
  durationOption: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  durationOptionSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  durationOptionText: {
    fontSize: 14,
    color: '#666',
  },
  durationOptionTextSelected: {
    color: '#1976D2',
    fontWeight: '600',
  },
  twoMinPreview: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
  },
  twoMinPreviewLabel: {
    fontSize: 12,
    color: '#F57C00',
    marginBottom: 4,
  },
  twoMinPreviewText: {
    fontSize: 15,
    color: '#E65100',
    fontWeight: '500',
  },
  tipBox: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
  },
  tipText: {
    fontSize: 13,
    color: '#2E7D32',
    lineHeight: 18,
  },
  difficultyList: {
    gap: 8,
  },
  difficultyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  difficultyItemSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  difficultyMain: {
    flex: 1,
  },
  difficultyLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  difficultyLabelSelected: {
    color: '#1976D2',
  },
  difficultyDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  difficultyCost: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginLeft: 12,
  },
  difficultyCostSelected: {
    color: '#1976D2',
  },
  reviewCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  reviewStack: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  reviewName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  reviewRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  reviewLabel: {
    fontSize: 14,
    color: '#666',
    width: 100,
  },
  reviewValue: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  capacityPreview: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  capacityPreviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  capacityBar: {
    height: 12,
    backgroundColor: '#E0E0E0',
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  capacityBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  capacityPreviewText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  warningBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
  },
  warningText: {
    fontSize: 13,
    color: '#E65100',
    textAlign: 'center',
  },
  buttons: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  backButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  backButtonText: {
    fontSize: 15,
    color: '#666',
  },
  nextButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  nextButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
