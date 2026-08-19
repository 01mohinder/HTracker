/**
 * IStorageRepository.ts
 * Repository Interface for persistence abstraction layer
 */

import { Habit, UserAccount, UserStats } from '../types';
import { Routine } from '../core/engine/RoutineEngine';

export interface AppStatePayload {
  currentUser: UserAccount | null;
  habits: Habit[];
  archivedHabits: Habit[];
  stats: UserStats;
  habitNotes: Record<string, string>;
  theme: string;
  soundEnabled: boolean;
  routines?: Routine[];
}

export interface IStorageRepository {
  loadState(userId?: string | null): AppStatePayload | null;
  saveState(state: AppStatePayload): void;
  clearState(userId?: string | null): void;
}
