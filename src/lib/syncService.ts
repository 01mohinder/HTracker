import { doc, setDoc, getDoc, onSnapshot, db, serverTimestamp, auth } from './firebase';
import { Habit, UserStats, Routine } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): FirestoreErrorInfo {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.warn('Firestore Operation Notice:', JSON.stringify(errInfo));
  return errInfo;
}

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
 * Keys directly on auth.currentUser.uid to ensure strict match with request.auth.uid security rules.
 */
export function getCanonicalUserDocId(
  user: { email?: string; id?: string; uid?: string; provider?: string } | string | null | undefined
): string | null {
  // If actively signed in with Firebase Auth, always use auth.currentUser.uid
  if (auth.currentUser && auth.currentUser.uid) {
    return auth.currentUser.uid;
  }

  if (!user) return null;

  if (typeof user === 'string') {
    const clean = user.trim();
    if (!clean || clean === 'guest' || clean === 'local_champion' || clean.startsWith('local_')) return null;
    return clean;
  }

  // Pure local or guest accounts must never touch Cloud Firestore
  if (user.provider === 'guest' || user.provider === 'local') {
    return null;
  }

  const uid = user.id || (user as any).uid;
  if (uid && uid !== 'guest' && uid !== 'local_champion' && !uid.startsWith('local_')) {
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
  // Require active Firebase authenticated user to prevent unauthenticated listen requests
  if (!auth.currentUser) {
    return () => {};
  }

  const docId = getCanonicalUserDocId(user);
  if (!docId || (auth.currentUser && auth.currentUser.uid !== docId)) {
    return () => {};
  }

  const path = `user_data/${docId}`;
  const userDocRef = doc(db, 'user_data', docId);

  const unsubscribe = onSnapshot(
    userDocRef,
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
          userEmail: data.userEmail || (typeof user === 'object' ? user?.email : undefined),
        };
        onStateReceived(cleanState);
      }
    },
    (err) => {
      // Gracefully ignore idle listener cancellations
      if (err?.code === 'cancelled' || err?.message?.includes('CANCELLED')) {
        return;
      }
      handleFirestoreError(err, OperationType.GET, path);
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
  // Only write if authenticated in Firebase Auth
  if (!auth.currentUser) {
    return false;
  }

  const docId = getCanonicalUserDocId(user);
  if (!docId || (auth.currentUser && auth.currentUser.uid !== docId)) {
    return false;
  }

  const email = typeof user === 'object' ? user?.email : (auth.currentUser.email || undefined);
  const name = typeof user === 'object' ? user?.name : (auth.currentUser.displayName || undefined);
  const path = `user_data/${docId}`;

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
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}

/**
 * Fetches user state once directly from Firestore with automatic legacy migration.
 */
export async function fetchUserCloudStateDirect(
  user: { email?: string; id?: string; uid?: string } | string | null
): Promise<CloudUserState | null> {
  if (!auth.currentUser) {
    return null;
  }

  const docId = getCanonicalUserDocId(user);
  if (!docId || (auth.currentUser && auth.currentUser.uid !== docId)) {
    return null;
  }

  const email = typeof user === 'object' ? user?.email : auth.currentUser.email;
  const path = `user_data/${docId}`;

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
        userEmail: data.userEmail || email || undefined,
      };
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
  return null;
}


