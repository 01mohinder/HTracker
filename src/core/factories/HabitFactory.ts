/**
 * HabitFactory.ts
 * Enterprise Factory Pattern for creating validated Habit domain objects
 */

import { Habit, Category } from '../../types';
import { generateId } from '../../utils/storage';
import { validateHabit } from '../../utils/validation';

export class HabitFactory {
  public static create(
    name: string,
    category: Category = 'Routine',
    icon = '✨',
    color = '#818cf8',
    goal = 5
  ): Habit {
    const raw: Partial<Habit> = {
      id: generateId(),
      name: name.trim(),
      icon,
      color,
      goal,
      category,
      completions: {},
      createdAt: new Date().toISOString(),
      archived: false,
    };

    validateHabit(raw);
    return raw as Habit;
  }
}
