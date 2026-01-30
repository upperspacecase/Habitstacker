/**
 * Database entry point
 *
 * Re-exports the platform-agnostic storage interface.
 * Uses localStorage on web, SQLite on native platforms.
 */

export * from './storage';
