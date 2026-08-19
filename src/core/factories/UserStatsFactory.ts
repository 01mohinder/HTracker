/**
 * UserStatsFactory.ts
 * Enterprise Factory Pattern for user statistics domain models
 */

import { UserStats } from '../../types';

export class UserStatsFactory {
  public static createDefault(): UserStats {
    return {
      xp: 0,
      level: 1,
      grindScore: 0,
      totalCompletions: 0,
      streakFreezes: 1,
      achievements: ['welcome_badge'],
    };
  }
}
