/**
 * HabitService.ts
 * Enterprise Habit Domain Application Service
 */

import { Habit, Category } from '../types';
import { HabitFactory } from '../core/factories/HabitFactory';
import { HabitEngine } from '../core/engine/HabitEngine';
import { eventBus } from '../core/events/EventBus';
import { formatDate } from '../utils/storage';
import { TelemetryService } from './TelemetryService';

export class HabitService {
  public static createHabit(
    name: string,
    category: Category = 'Routine',
    icon = '✨',
    color = '#818cf8',
    goal = 5
  ): Habit {
    TelemetryService.startTimer('HabitService.createHabit');
    const habit = HabitFactory.create(name, category, icon, color, goal);
    eventBus.publish('HABIT_CREATED', habit);
    TelemetryService.endTimer('HabitService.createHabit');
    return habit;
  }

  public static toggleCompletion(habit: Habit, dateKey = formatDate(new Date())): {
    updatedHabit: Habit;
    count: number;
    completedToday: boolean;
  } {
    TelemetryService.startTimer('HabitService.toggleCompletion');
    const current = habit.completions[dateKey] || 0;
    const nextCount = current > 0 ? 0 : 1;

    const newCompletions = { ...habit.completions };
    if (nextCount === 0) {
      delete newCompletions[dateKey];
    } else {
      newCompletions[dateKey] = nextCount;
    }

    const updatedHabit: Habit = {
      ...habit,
      completions: newCompletions,
    };

    if (nextCount > 0) {
      eventBus.publish('HABIT_COMPLETED', { habit: updatedHabit, dateKey });
    }

    TelemetryService.endTimer('HabitService.toggleCompletion');
    return {
      updatedHabit,
      count: nextCount,
      completedToday: nextCount > 0,
    };
  }

  public static archiveHabit(habit: Habit): Habit {
    const updated: Habit = { ...habit, archived: true };
    eventBus.publish('HABIT_ARCHIVED', updated);
    return updated;
  }
}
