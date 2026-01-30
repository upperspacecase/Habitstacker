/**
 * Native Storage Implementation
 *
 * Uses SQLite for native platforms (iOS/Android).
 */

export * from './sqlite';
export { initSQLiteDatabase as initDatabase } from './sqlite';
