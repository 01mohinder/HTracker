/**
 * HabitEngine.test.ts
 * Vitest Unit Test Suite for HabitEngine calculations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HabitEngine } from '../core/engine/HabitEngine';
import { Habit } from '../types';

describe('HabitEngine Unit Tests', () => {
  beforeEach(() => {
    HabitEngine.clearCache();
  });

  it('should calculate current streak correctly', () => {
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const completions = {
      [formatDate(today)]: 1,
      [formatDate(yesterday)]: 1,
    };

    const streak = HabitEngine.calcStreak(completions);
    expect(streak).toBe(2);
  });

  it('should calculate best streak correctly', () => {
    const completions = {
      '2026-08-01': 1,
      '2026-08-02': 1,
      '2026-08-03': 1,
      '2026-08-05': 1,
    };

    const bestStreak = HabitEngine.calcBestStreak(completions);
    expect(bestStreak).toBe(3);
  });

  it('should calculate habit grind score bounded between 0 and 100', () => {
    const habit: Habit = {
      id: 'h1',
      name: 'Test Habit',
      icon: '✨',
      color: '#818cf8',
      goal: 5,
      category: 'Health',
      completions: { '2026-08-06': 1 },
    };

    const score = HabitEngine.calcHabitGrindScore(habit);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});
