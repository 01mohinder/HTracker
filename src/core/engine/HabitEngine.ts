/**
 * HabitEngine.ts
 * High-Performance Core Calculation & Analytics Engine with LRU Caching
 */

import { Habit, UserStats } from '../../types';
import { LRUCache } from '../../utils/cache';
import { appConfig } from '../../config/AppConfig';
import {
  calcStreak as calcStreakRaw,
  calcBestStreak as calcBestStreakRaw,
  calcRate as calcRateRaw,
  calcMissed as calcMissedRaw,
} from '../../utils/storage';

export class HabitEngine {
  private static cache = new LRUCache<string, any>(150);

  public static calcStreak(completions: Record<string, number>): number {
    const key = `streak_${JSON.stringify(completions)}`;
    const cached = this.cache.get(key);
    if (cached !== undefined) return cached;

    const result = calcStreakRaw(completions);
    this.cache.set(key, result);
    return result;
  }

  public static calcBestStreak(completions: Record<string, number>): number {
    const key = `best_streak_${JSON.stringify(completions)}`;
    const cached = this.cache.get(key);
    if (cached !== undefined) return cached;

    const result = calcBestStreakRaw(completions);
    this.cache.set(key, result);
    return result;
  }

  public static calcRate(completions: Record<string, number>, days = 30): number {
    const key = `rate_${days}_${JSON.stringify(completions)}`;
    const cached = this.cache.get(key);
    if (cached !== undefined) return cached;

    const result = calcRateRaw(completions, days);
    this.cache.set(key, result);
    return result;
  }

  public static calcMissed(completions: Record<string, number>, days = 30): number {
    return calcMissedRaw(completions, days);
  }

  public static calcHabitGrindScore(habit: Habit): number {
    const streak = this.calcStreak(habit.completions);
    const rate = this.calcRate(habit.completions, 30);
    const total = Object.values(habit.completions).reduce((a: number, b: number) => a + b, 0);
    const goal = habit.goal || 5;
    const daysLogged = Object.keys(habit.completions).length || 1;
    const avgWeekly = (total / daysLogged) * 7;
    const goalRatio = Math.min(avgWeekly / goal, 1);

    const score = streak * 0.35 + rate * 0.35 + goalRatio * 30;
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  public static calcOverallGrindScore(habits: Habit[]): number {
    if (!habits.length) return 0;
    const scores = habits.map((h) => this.calcHabitGrindScore(h));
    const sum = scores.reduce((a, b) => a + b, 0);
    return Math.round(sum / habits.length);
  }

  public static xpForLevel(lvl: number): number {
    const { levelXpBase, levelXpExponent, levelXpFlat } = appConfig.defaults;
    return Math.floor(levelXpBase * Math.pow(lvl, levelXpExponent) + levelXpFlat);
  }

  public static getXpForHabitCompletion(habit: Habit): number {
    const streak = this.calcStreak(habit.completions);
    const rate = this.calcRate(habit.completions, 30);
    return 10 + Math.min(streak * 2, 25) + (rate > 75 ? 10 : 0);
  }

  public static getCacheStats() {
    return this.cache.getStats();
  }

  public static clearCache() {
    this.cache.clear();
  }
}
