/**
 * validation.ts
 * Enterprise Input Validation Schemas & Type Guards
 */

import { Habit, UserAccount, UserStats } from '../types';
import { ValidationError } from './errors';

export function validateHabit(habit: Partial<Habit>): void {
  if (!habit.name || typeof habit.name !== 'string' || habit.name.trim().length === 0) {
    throw new ValidationError('Habit name must be a non-empty string.');
  }
  if (!habit.category || typeof habit.category !== 'string') {
    throw new ValidationError('Habit category is required.');
  }
  if (habit.goal !== undefined && (typeof habit.goal !== 'number' || habit.goal < 1 || habit.goal > 7)) {
    throw new ValidationError('Habit weekly goal must be a number between 1 and 7.');
  }
}

export function validateUserAccount(user: Partial<UserAccount>): void {
  if (!user.email || typeof user.email !== 'string' || !user.email.includes('@')) {
    throw new ValidationError('User account must have a valid email address.');
  }
  if (!user.name || typeof user.name !== 'string') {
    throw new ValidationError('User account name is required.');
  }
}

export function validateUserStats(stats: Partial<UserStats>): void {
  if (stats.xp !== undefined && (typeof stats.xp !== 'number' || stats.xp < 0)) {
    throw new ValidationError('User XP must be a non-negative number.');
  }
  if (stats.level !== undefined && (typeof stats.level !== 'number' || stats.level < 1)) {
    throw new ValidationError('User Level must be at least 1.');
  }
}
