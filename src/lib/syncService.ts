import { doc, setDoc, getDoc, onSnapshot, db, auth } from './firebase';
import { Habit, UserStats, Routine } from '../types';

export interface CloudUserState {
  habits: Habit[];
  archivedHabits: Habit[];
  stats: UserStats;
  habitNotes: Record<string, string>;
  routines: Routine[];
  updatedAt: string;
  updatedByDevice?: string;
  userEmail?: string;
}

// Generate or retrieve a persistent client device identifier
export function getDeviceId(): string {
  try {
    let deviceId = localStorage.getItem('HT_DEVICE_ID');
    if (!deviceId) {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      deviceId = `${isMobile ? 'Mobile' : 'Laptop'}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('HT_DEVICE_ID', deviceId);
    }
    return deviceId;
  } catch {
    return 'WebClient_' + Math.random().toString(36).substring(2, 9);
  }
}

/**
 * Returns a canonical, consistent Firestore document ID for any user account.
 * This guarantees that when a user logs in with the same email on Laptop and Mobile,
 * both devices connect to the EXACT SAME real-time Firestore document.
 */
export function getCanonicalUserDocId(user: { email?: string; id?: string } | null): string | null {
  if (!user) return null;
  const email = user.email?.trim().toLowerCase();
  if (email && email !== 'guest@htgrind.app') {
    return 'user_' + email.replace(/[^a-zA-Z0-9]/g, '_');
  }
  if (user.id && user.id !== 'guest') {
    return 'user_' + user.id.replace(/[^a-zA-Z0-9]/g, '_');
  }
  return null;
}

/**
 * Subscribes to real-time changes on the user's Firestore document.
 * When ANY device updates the habit state, all other devices receive the changes in real time (<100ms).
 */
export function subscribeToUserCloudState(
  user: { email?: string; id?: string } | null,
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
    { includeMetadataChanges: false },
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Partial<CloudUserState>;
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
          userEmail: data.userEmail || user?.email,
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
 * Saves current user state to Firestore in real time.
 */
export async function writeUserCloudState(
  user: { email?: string; id?: string } | null,
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

  try {
    const userDocRef = doc(db, 'user_data', docId);
    const payload: CloudUserState = {
      habits: state.habits,
      archivedHabits: state.archivedHabits,
      stats: state.stats,
      habitNotes: state.habitNotes,
      routines: state.routines,
      updatedAt: new Date().toISOString(),
      updatedByDevice: getDeviceId(),
      userEmail: user?.email,
    };

    await setDoc(userDocRef, payload, { merge: true });

    // Also touch users collection for profile synchronization
    if (user?.email) {
      const userProfileRef = doc(db, 'users', docId);
      setDoc(
        userProfileRef,
        {
          docId,
          email: user.email,
          lastActive: new Date().toISOString(),
          lastDevice: getDeviceId(),
        },
        { merge: true }
      ).catch(() => {});
    }

    return true;
  } catch (err) {
    console.warn('[Real-Time Multi-Device Sync] write error:', err);
    return false;
  }
}

/**
 * Fetches user state once directly from Firestore
 */
export async function fetchUserCloudStateDirect(
  user: { email?: string; id?: string } | null
): Promise<CloudUserState | null> {
  const docId = getCanonicalUserDocId(user);
  if (!docId) return null;

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
        userEmail: data.userEmail || user?.email,
      };
    }
  } catch (err) {
    console.warn('[Real-Time Multi-Device Sync] Direct fetch error:', err);
  }
  return null;
}
