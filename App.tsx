/**
 * Habitstacker - A Psychology-Driven Habit Tracker
 *
 * Built on three pillars:
 * 1. Identity - Habit stacking with anchors
 * 2. Friction - Two-minute versions to reduce resistance
 * 3. Momentum - Capacity meter to prevent burnout
 *
 * "Most people fail because they design for their 'Ideal Self'
 * rather than their 'Tuesday Morning Self'."
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AppProvider, useApp } from './src/context/AppContext';
import {
  TodayScreen,
  AddHabitScreen,
  HabitDetailScreen,
  BreathworkScreen,
  OnboardingScreen,
} from './src/screens';
import { RootStackParamList } from './src/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator() {
  const { isLoading, isInitialized, userState } = useApp();

  if (isLoading || !isInitialized) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  const showOnboarding = !userState?.hasCompletedOnboarding;

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={showOnboarding ? 'Onboarding' : 'Main'}
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#fff' },
          headerTitleStyle: { fontWeight: '600' },
        }}
      >
        {/* Onboarding */}
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{ headerShown: false }}
        />

        {/* Main screen (Today view) */}
        <Stack.Screen
          name="Main"
          component={TodayScreen}
          options={{ headerShown: false }}
        />

        {/* Add habit flow */}
        <Stack.Screen
          name="AddHabit"
          component={AddHabitScreen}
          options={{
            title: 'New Habit',
            presentation: 'modal',
          }}
        />

        {/* Habit detail */}
        <Stack.Screen
          name="HabitDetail"
          component={HabitDetailScreen}
          options={{
            title: 'Habit Details',
          }}
        />

        {/* Breathwork facilitator */}
        <Stack.Screen
          name="Breathwork"
          component={BreathworkScreen}
          options={{
            headerShown: false,
            presentation: 'fullScreenModal',
            animation: 'fade',
          }}
        />
      </Stack.Navigator>

      <StatusBar style="dark" />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppNavigator />
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
