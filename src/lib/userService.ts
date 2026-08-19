import { UserAccount } from '../types';

export interface SyncedUserData {
  returningVisitors: number;
  dateOfFirstJoin: string;
  userName: string;
  email: string;
  storage: 'MongoDB' | 'LocalFallback';
  message: string;
}

export const syncUserRecordToMongoDB = async (userName: string, email: string): Promise<SyncedUserData> => {
  try {
    const res = await fetch('/api/users/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userName, email }),
    });

    if (!res.ok) {
      throw new Error(`Server returned status ${res.status}`);
    }

    const data: SyncedUserData = await res.json();
    return data;
  } catch (err) {
    console.warn('[UserSync] Server sync offline, generating local fallback:', err);
    // Fallback if server or network issue occurs
    return {
      returningVisitors: 1,
      dateOfFirstJoin: new Date().toISOString(),
      userName,
      email,
      storage: 'LocalFallback',
      message: 'Local fallback active',
    };
  }
};
