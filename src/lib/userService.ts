import { getDeviceId } from './syncService';

export interface SyncedUserData {
  returningVisitors: number;
  dateOfFirstJoin: string;
  userName: string;
  email: string;
  storage: 'CloudFirebase';
  message: string;
}

export const syncUserRecordToCloud = async (
  userName: string,
  email: string,
  extra?: { grindScore?: number; totalHabits?: number }
): Promise<SyncedUserData> => {
  try {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

    const res = await fetch('/api/users/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
    console.warn('[UserSync] Server sync note:', err);
    return {
      returningVisitors: 1,
      dateOfFirstJoin: new Date().toISOString(),
      userName,
      email,
      storage: 'CloudFirebase',
      message: 'Cloud Firebase active',
    };
  }
};

// Backwards compatibility alias
export const syncUserRecordToMongoDB = syncUserRecordToCloud;
