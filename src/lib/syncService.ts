import { doc, setDoc, getDoc, onSnapshot, db, serverTimestamp } from './firebase';
import { Habit, UserStats, Routine } from '../types';

export interface CloudUserState {
  habits: Habit[];
  archivedHabits: Habit[];
  stats: UserStats;
  habitNotes: Record<string, string>;
  routines: Routine[];
  updatedAt: any;
  updatedByDevice?: string;
  userEmail?: string;
}

// Generate or retrieve a persistent client device identifier in memory / storage
let cachedDeviceId: string | null = null;
export function getDeviceId(): string {
  if (cachedDeviceId) return cachedDeviceId;
  try {
    let deviceId = localStorage.getItem('HT_DEVICE_ID');
    if (!deviceId) {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      deviceId = `${isMobile ? 'Mobile' : 'Laptop'}_${Math.random().toString(36).substring(2, 9)}`;
      try {
        localStorage.setItem('HT_DEVICE_ID', deviceId);
      } catch {}
    }
    cachedDeviceId = deviceId;
    return deviceId;
  } catch {
    cachedDeviceId = 'WebClient_' + Math.random().toString(36).substring(2, 9);
    return cachedDeviceId;
  }
}

/**
 * Returns the canonical Firestore document ID for an authenticated user.
 * Keys directly on auth.uid to ensure strict match with request.auth.uid security rules.
 */
export function getCanonicalUserDocId(
  user: { email?: string; id?: string; uid?: string } | string | null | undefined
): string | null {
  if (!user) return null;

  if (typeof user === 'string') {
    const clean = user.trim();
    if (!clean || clean === 'guest') return null;
    return clean;
  }

  const uid = user.id || (user as any).uid;
  if (uid && uid !== 'guest') {
    return uid.trim();
  }

  return null;
}

/**
 * Subscribes to real-time changes on the user's Firestore document.
 * Includes echo-prevention to avoid clobbering in-flight optimistic UI edits.
 */
export function subscribeToUserCloudState(
  user: { email?: string; id?: string; uid?: string } | string | null,
  onStateReceived: (data: CloudUserState) => void,
  onError?: (error: any) => void
): () => void {
  const docId = getCanonicalUserDocId(user);
  if (!docId) {
    return () => {};
  }

  const userDocRef = doc(db, 'user_data', docId);

  const unsubscribe = onSnapshot(
    userDocRef,
    { includeMetadataChanges: true },
    (snapshot) => {
      // Guard 1: Do not overwrite optimistic local UI state while local write is in flight
      if (snapshot.metadata.hasPendingWrites) {
        return;
      }

      if (snapshot.exists()) {
        const data = snapshot.data() as Partial<CloudUserState>;
        
        // Guard 2: If this update originated from this exact device, skip to avoid echo loop
        if (data.updatedByDevice && data.updatedByDevice === getDeviceId()) {
          return;
        }

        const cleanState: CloudUserState = {
          habits: Array.isArray(data.habits) ? data.habits : [],
          archivedHabits: Array.isArray(data.archivedHabits) ? data.archivedHabits : [],
          stats: data.stats || {
            level: 1,
            xp: 0,
            totalCompletions: 0,
            grindScore: 0,
            streakFreezes: 1,
            achievements: ['welcome_badge'],
          },
          habitNotes: data.habitNotes || {},
          routines: Array.isArray(data.routines) ? data.routines : [],
          updatedAt: data.updatedAt || new Date().toISOString(),
          updatedByDevice: data.updatedByDevice,
          userEmail: data.userEmail || (typeof user === 'object' ? user?.email : undefined),
        };
        onStateReceived(cleanState);
      }
    },
    (err) => {
      console.warn('[Real-Time Multi-Device Sync] onSnapshot notification:', err);
      if (onError) onError(err);
    }
  );

  return unsubscribe;
}

/**
 * Saves current user state to Firestore in real time using server timestamp.
 */
export async function writeUserCloudState(
  user: { email?: string; id?: string; name?: string; uid?: string } | string | null,
  state: {
    habits: Habit[];
    archivedHabits: Habit[];
    stats: UserStats;
    habitNotes: Record<string, string>;
    routines: Routine[];
  }
): Promise<boolean> {
  const docId = getCanonicalUserDocId(user);
  if (!docId) return false;

  const email = typeof user === 'object' ? user?.email : undefined;
  const name = typeof user === 'object' ? user?.name : undefined;

  try {
    const userDocRef = doc(db, 'user_data', docId);
    const payload = {
      habits: state.habits,
      archivedHabits: state.archivedHabits,
      stats: state.stats,
      habitNotes: state.habitNotes,
      routines: state.routines || [],
      updatedAt: serverTimestamp(),
      updatedByDevice: getDeviceId(),
      userEmail: email,
    };

    await setDoc(userDocRef, payload, { merge: true });

    // Synchronize authenticated user profile document under auth.uid
    if (email) {
      const userProfileRef = doc(db, 'users', docId);
      setDoc(
        userProfileRef,
        {
          uid: docId,
          email,
          name: name || email.split('@')[0],
          lastActive: serverTimestamp(),
          lastDevice: getDeviceId(),
        },
        { merge: true }
      ).catch(() => {});
    }

    return true;
  } catch (err) {
    console.error('[Real-Time Multi-Device Sync] write error:', err);
    return false;
  }
}

/**
 * Fetches user state once directly from Firestore with automatic legacy migration.
 */
export async function fetchUserCloudStateDirect(
  user: { email?: string; id?: string; uid?: string } | string | null
): Promise<CloudUserState | null> {
  const docId = getCanonicalUserDocId(user);
  if (!docId) return null;

  const email = typeof user === 'object' ? user?.email : undefined;

  try {
    const userDocRef = doc(db, 'user_data', docId);
    const snap = await getDoc(userDocRef);
    
    if (snap.exists()) {
      const data = snap.data() as Partial<CloudUserState>;
      return {
        habits: Array.isArray(data.habits) ? data.habits : [],
        archivedHabits: Array.isArray(data.archivedHabits) ? data.archivedHabits : [],
        stats: data.stats || {
          level: 1,
          xp: 0,
          totalCompletions: 0,
          grindScore: 0,
          streakFreezes: 1,
          achievements: ['welcome_badge'],
        },
        habitNotes: data.habitNotes || {},
        routines: Array.isArray(data.routines) ? data.routines : [],
        updatedAt: data.updatedAt || new Date().toISOString(),
        updatedByDevice: data.updatedByDevice,
        userEmail: data.userEmail || email,
      };
    }

    // Auto-migration: Check legacy email-keyed document if UID doc doesn't exist yet
    if (email && email !== 'guest@htgrind.app') {
      const legacyDocId = 'user_' + email.toLowerCase().trim().replace(/[^a-zA-Z0-9]/g, '_');
      if (legacyDocId !== docId) {
        try {
          const legacyRef = doc(db, 'user_data', legacyDocId);
          const legacySnap = await getDoc(legacyRef);
          if (legacySnap.exists()) {
            const legacyData = legacySnap.data() as Partial<CloudUserState>;
            const migratedState: CloudUserState = {
              habits: Array.isArray(legacyData.habits) ? legacyData.habits : [],
              archivedHabits: Array.isArray(legacyData.archivedHabits) ? legacyData.archivedHabits : [],
              stats: legacyData.stats || {
                level: 1,
                xp: 0,
                totalCompletions: 0,
                grindScore: 0,
                streakFreezes: 1,
                achievements: ['welcome_badge'],
              },
              habitNotes: legacyData.habitNotes || {},
              routines: Array.isArray(legacyData.routines) ? legacyData.routines : [],
              updatedAt: serverTimestamp(),
              updatedByDevice: getDeviceId(),
              userEmail: email,
            };
            // Save to new canonical UID doc
            await setDoc(userDocRef, migratedState, { merge: true });
            return migratedState;
          }
        } catch {
          // Ignore legacy read error
        }
      }
    }
  } catch (err) {
    console.warn('[Real-Time Multi-Device Sync] Direct fetch error:', err);
  }
  return null;
}


