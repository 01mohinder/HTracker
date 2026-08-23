import { getDeviceId } from './syncService';
import { auth } from './firebase';

export interface SyncedUserData {
  returningVisitors: number;
  dateOfFirstJoin: string;
  userName: string;
  email: string;
  storage: 'CloudFirebase' | 'LocalSession';
  message: string;
}

export const syncUserRecordToCloud = async (
  userName: string,
  email: string,
  extra?: { grindScore?: number; totalHabits?: number }
): Promise<SyncedUserData | null> => {
  try {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

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

    const res = await fetch('/api/users/sync', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        userName,
        email,
        deviceId: getDeviceId(),
        deviceType: isMobile ? 'Mobile' : 'Laptop',
        grindScore: extra?.grindScore,
        totalHabits: extra?.totalHabits,
      }),
    });

    if (!res.ok) {
      throw new Error(`Server returned status ${res.status}`);
    }

    const data: SyncedUserData = await res.json();
    return data;
  } catch (err) {
    console.warn('[UserSync] Server telemetry note:', err);
    return null;
  }
};

// Backwards compatibility alias
export const syncUserRecordToMongoDB = syncUserRecordToCloud;

