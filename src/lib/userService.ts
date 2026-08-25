import { getDeviceId } from './syncService';
import { auth } from './firebase';

export interface SyncedUserData {
  uniqueId: string;
  dateOfFirstJoin: string;
  email: string;
  userName: string;
  returningVisitors: number;
  lastActivedate: string;
  storage?: string;
  message?: string;
}

export const syncUserRecordToMongoDB = async (
  userName: string,
  email: string,
  uniqueId?: string
): Promise<SyncedUserData | null> => {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (auth.currentUser) {
      try {
        const idToken = await auth.currentUser.getIdToken();
        if (idToken) {
          headers['Authorization'] = `Bearer ${idToken}`;
        }
      } catch {}
    }

    const targetUniqueId = uniqueId || auth.currentUser?.uid || getDeviceId();

    const res = await fetch('/api/users/sync', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        uniqueId: targetUniqueId,
        userName,
        email,
      }),
    });

    if (!res.ok) {
      throw new Error(`Server returned status ${res.status}`);
    }

    const data: SyncedUserData = await res.json();
    return data;
  } catch (err) {
    console.warn('[MongoDB UserSync] Notice:', err);
    return null;
  }
};

// Cloud alias
export const syncUserRecordToCloud = syncUserRecordToMongoDB;


