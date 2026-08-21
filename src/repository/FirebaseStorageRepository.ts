/**
 * FirebaseStorageRepository.ts
 * Cloud Firebase Firestore Repository implementation for persistent cloud storage
 */

import { IStorageRepository, AppStatePayload } from './IStorageRepository';
import { db, doc, setDoc, getDoc } from '../lib/firebase';
import { getCanonicalUserDocId, getDeviceId } from '../lib/syncService';
import { Logger } from '../utils/logger';

export class FirebaseStorageRepository implements IStorageRepository {
  public async loadStateAsync(userId?: string | null): Promise<AppStatePayload | null> {
    if (!userId) {
      Logger.info('FirebaseStorageRepository', 'No user ID provided for cloud load.');
      return null;
    }

    try {
      const docId = getCanonicalUserDocId({ id: userId });
      if (!docId) return null;

      const docRef = doc(db, 'user_data', docId);
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        const data = snap.data();
        Logger.info('FirebaseStorageRepository', 'Cloud state loaded from Firebase Firestore', {
          userId,
          habitsCount: data.habits?.length ?? 0,
        });

        return {
          currentUser: null,
          habits: Array.isArray(data.habits) ? data.habits : [],
          archivedHabits: Array.isArray(data.archivedHabits) ? data.archivedHabits : [],
          stats: data.stats || {
            level: 1,
            xp: 0,
            totalCompletions: 0,
            grindScore: 0,
            streakFreezes: 1,
            achievements: [],
          },
          habitNotes: data.habitNotes || {},
          theme: 'dark',
          soundEnabled: true,
          routines: Array.isArray(data.routines) ? data.routines : [],
        };
      }

      return null;
    } catch (err) {
      Logger.error('FirebaseStorageRepository', 'Failed to load state from Firestore', err);
      return null;
    }
  }

  public loadState(userId?: string | null): AppStatePayload | null {
    // Synchronous contract helper
    return null;
  }

  public saveState(state: AppStatePayload): void {
    const user = state.currentUser;
    if (!user) return;

    const docId = getCanonicalUserDocId(user);
    if (!docId) return;

    try {
      const docRef = doc(db, 'user_data', docId);
      setDoc(
        docRef,
        {
          habits: state.habits,
          archivedHabits: state.archivedHabits,
          stats: state.stats,
          habitNotes: state.habitNotes,
          routines: state.routines || [],
          updatedAt: new Date().toISOString(),
          updatedByDevice: getDeviceId(),
          userEmail: user.email,
        },
        { merge: true }
      ).catch((err) => {
        Logger.error('FirebaseStorageRepository', 'Async write to Firestore failed', err);
      });
    } catch (err) {
      Logger.error('FirebaseStorageRepository', 'Failed to initiate save to Firestore', err);
    }
  }

  public clearState(userId?: string | null): void {
    if (!userId) return;
    const docId = getCanonicalUserDocId({ id: userId });
    if (!docId) return;

    try {
      const docRef = doc(db, 'user_data', docId);
      setDoc(
        docRef,
        {
          habits: [],
          archivedHabits: [],
          stats: {
            level: 1,
            xp: 0,
            totalCompletions: 0,
            grindScore: 0,
            streakFreezes: 1,
            achievements: [],
          },
          habitNotes: {},
          updatedAt: new Date().toISOString(),
          updatedByDevice: getDeviceId(),
        },
        { merge: true }
      ).catch((err) => {
        Logger.error('FirebaseStorageRepository', 'Clear Firestore document failed', err);
      });
    } catch (err) {
      Logger.error('FirebaseStorageRepository', 'Failed to clear state in Firestore', err);
    }
  }
}
