/**
 * Utility functions for Habitstacker
 */

// Generate a unique ID (simple UUID v4 implementation)
export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Get today's date in YYYY-MM-DD format
export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

// Get the start of the week (Monday) in YYYY-MM-DD format
export function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

// Format a date for display
export function formatDate(date: Date | number): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

// Get relative time string (e.g., "2 hours ago", "yesterday")
export function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;

  return formatDate(timestamp);
}

// Format duration in seconds to readable string
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (remainingSeconds === 0) return `${minutes}min`;
  return `${minutes}min ${remainingSeconds}s`;
}

// Get time of day category
export function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' {
  const hour = new Date().getHours();

  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

// Get greeting based on time of day
export function getGreeting(): string {
  const timeOfDay = getTimeOfDay();

  switch (timeOfDay) {
    case 'morning':
      return 'Good morning';
    case 'afternoon':
      return 'Good afternoon';
    case 'evening':
      return 'Good evening';
  }
}

// Calculate streak message
export function getStreakMessage(streak: number): string {
  if (streak === 0) return 'Start your streak today!';
  if (streak === 1) return "Great start! Day 1 complete.";
  if (streak < 7) return `${streak} days strong!`;
  if (streak < 14) return `${streak} days! A full week+!`;
  if (streak < 30) return `${streak} days! Amazing consistency!`;
  if (streak < 60) return `${streak} days! A whole month+!`;
  return `${streak} days! You're unstoppable!`;
}

// Get capacity status message
export function getCapacityMessage(used: number, total: number): string {
  const percentage = (used / total) * 100;

  if (percentage === 0) return 'Your willpower bank is full!';
  if (percentage < 50) return 'You have room for growth.';
  if (percentage < 75) return 'Building momentum...';
  if (percentage < 90) return 'Focus on consistency now.';
  if (percentage < 100) return 'Nearly at capacity. Maintain what you have.';
  return 'At capacity. Consider pausing a habit before adding more.';
}

// Clamp a number between min and max
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// Debounce function
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
