/**
 * LocalStorageRepository.ts
 * Concrete LocalStorage Repository implementation with robust error handling
 */

import { IStorageRepository, AppStatePayload } from './IStorageRepository';
import { appConfig } from '../config/AppConfig';
import { StorageError } from '../utils/errors';
import { Logger } from '../utils/logger';
import { HabitEngine } from '../core/engine/HabitEngine';

export class LocalStorageRepository implements IStorageRepository {
  public loadState(userId?: string | null): AppStatePayload | null {
    try {
      const activeRaw = localStorage.getItem(appConfig.storageKeys.activeState);
      if (!activeRaw) {
        Logger.info('LocalStorageRepository', 'No existing state found in localStorage.');
        return null;
      }

      const parsedActive = JSON.parse(activeRaw);
      let targetData = parsedActive;

      if (userId) {
        const userKey = `${appConfig.storageKeys.userStatePrefix}${userId}`;
        const rawUser = localStorage.getItem(userKey);
        if (rawUser) {
          targetData = JSON.parse(rawUser);
        }
      }

      Logger.info('LocalStorageRepository', 'Loaded app state successfully', {
        userId,
        habitsCount: targetData.habits?.length ?? 0,
      });

      return {
        currentUser: parsedActive.currentUser ?? null,
        habits: targetData.habits ?? [],
        archivedHabits: targetData.archivedHabits ?? [],
        stats: targetData.stats ?? {
          level: 1,
          xp: 0,
          totalCompletions: 0,
          grindScore: 0,
          streakFreezes: 1,
          achievements: [],
        },
        habitNotes: targetData.habitNotes ?? {},
        theme: parsedActive.theme ?? 'dark',
        soundEnabled: parsedActive.soundEnabled ?? true,
        routines: targetData.routines,
      };
    } catch (err) {
      Logger.error('LocalStorageRepository', 'Failed to parse localStorage state', err);
      throw new StorageError('Corrupted or unreadable LocalStorage data.');
    }
  }

  public saveState(state: AppStatePayload): void {
    try {
      localStorage.setItem(appConfig.storageKeys.activeState, JSON.stringify(state));

      if (state.currentUser) {
        const userKey = `${appConfig.storageKeys.userStatePrefix}${state.currentUser.id}`;
        localStorage.setItem(
          userKey,
          JSON.stringify({
            habits: state.habits,
            archivedHabits: state.archivedHabits,
            stats: state.stats,
            habitNotes: state.habitNotes,
            routines: state.routines,
          })
        );
      } else {
        localStorage.setItem(
          appConfig.storageKeys.guestState,
          JSON.stringify({
            habits: state.habits,
            archivedHabits: state.archivedHabits,
            stats: state.stats,
            habitNotes: state.habitNotes,
            routines: state.routines,
          })
        );
      }

      // Invalidate habit engine cache when state changes
      HabitEngine.clearCache();
    } catch (err) {
      Logger.error('LocalStorageRepository', 'Failed to save state to localStorage', err);
      throw new StorageError('Unable to write to LocalStorage.');
    }
  }

  public clearState(userId?: string | null): void {
    try {
      if (userId) {
        const userKey = `${appConfig.storageKeys.userStatePrefix}${userId}`;
        localStorage.removeItem(userKey);
      } else {
        localStorage.removeItem(appConfig.storageKeys.guestState);
      }
      localStorage.removeItem(appConfig.storageKeys.activeState);
      HabitEngine.clearCache();
      Logger.info('LocalStorageRepository', 'Cleared state', { userId });
    } catch (err) {
      Logger.error('LocalStorageRepository', 'Failed to clear state', err);
    }
  }
}
