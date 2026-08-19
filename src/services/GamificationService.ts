/**
 * GamificationService.ts
 * Enterprise Gamification & Progression Service
 */

import { UserStats, Habit } from '../types';
import { HabitEngine } from '../core/engine/HabitEngine';
import { ALL_ACHIEVEMENTS } from '../utils/storage';
import { eventBus } from '../core/events/EventBus';

export class GamificationService {
  public static processHabitCompletion(
    currentStats: UserStats,
    habit: Habit,
    allHabits: Habit[]
  ): { updatedStats: UserStats; leveledUp: boolean; unlockedAchievements: string[] } {
    const xpGained = HabitEngine.getXpForHabitCompletion(habit);
    let newXp = currentStats.xp + xpGained;
    let newLevel = currentStats.level;
    let leveledUp = false;

    // Check for level up
    let requiredXp = HabitEngine.xpForLevel(newLevel);
    while (newXp >= requiredXp) {
      newXp -= requiredXp;
      newLevel++;
      leveledUp = true;
      requiredXp = HabitEngine.xpForLevel(newLevel);
    }

    const totalCompletions = currentStats.totalCompletions + 1;
    const overallGrindScore = HabitEngine.calcOverallGrindScore(allHabits);

    // Evaluate Achievement Unlocks
    const unlockedNow: string[] = [];
    const unlockedSet = new Set(currentStats.achievements || []);

    const checkAndUnlock = (id: string, condition: boolean) => {
      if (condition && !unlockedSet.has(id)) {
        unlockedSet.add(id);
        unlockedNow.push(id);
      }
    };

    checkAndUnlock('first_habit', allHabits.length >= 1);
    checkAndUnlock('habits_5', allHabits.length >= 5);
    checkAndUnlock('total_100', totalCompletions >= 100);
    checkAndUnlock('total_500', totalCompletions >= 500);
    checkAndUnlock('grind_90', overallGrindScore >= 90);
    checkAndUnlock('level_5', newLevel >= 5);
    checkAndUnlock('level_10', newLevel >= 10);

    const updatedStats: UserStats = {
      ...currentStats,
      xp: newXp,
      level: newLevel,
      totalCompletions,
      grindScore: overallGrindScore,
      achievements: Array.from(unlockedSet),
    };

    if (leveledUp) {
      eventBus.publish('LEVEL_UP', { newLevel, newXp });
    }
    eventBus.publish('XP_GAINED', { xpGained, currentXp: newXp });

    return {
      updatedStats,
      leveledUp,
      unlockedAchievements: unlockedNow,
    };
  }
}
