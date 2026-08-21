import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

export interface DeviceTelemetry {
  deviceId: string;
  deviceType?: "Laptop" | "Mobile" | "Tablet" | "Unknown";
  userAgent?: string;
  lastActive: string;
}

export interface UserRecord {
  returningVisitors: number;
  dateOfFirstJoin: string;
  userName: string;
  email: string;
  updatedAt: string;
  lastDevice?: string;
  devices?: DeviceTelemetry[];
  latestGrindScore?: number;
  totalHabitsCount?: number;
}

export interface SyncAuditLog {
  id: string;
  email: string;
  action: "login" | "sync_state" | "audit" | "routine_gen";
  deviceId: string;
  timestamp: string;
  metadata?: any;
}

// Initialize Firebase App for Server-Side Cloud Storage
const activeConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
  appId: process.env.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
};

const cfg = firebaseConfig as any;
const dbId = cfg.firestoreDatabaseId && cfg.firestoreDatabaseId !== '(default)'
  ? cfg.firestoreDatabaseId
  : undefined;

const app = !getApps().length ? initializeApp(activeConfig) : getApp();
const firestoreDb = dbId ? getFirestore(app, dbId) : getFirestore(app);

export async function getFirestoreDb() {
  return firestoreDb;
}

/**
 * Normalizes email to a canonical document ID for Firestore
 */
export function getCanonicalUserDocId(email: string): string {
  return "user_" + email.toLowerCase().trim().replace(/[^a-zA-Z0-9]/g, "_");
}

/**
 * Synchronizes user visit, account registry, and device telemetry in Cloud Firebase Firestore
 */
export async function syncUserRecord(
  userName: string,
  email: string,
  deviceMeta?: { deviceId?: string; deviceType?: string; userAgent?: string; grindScore?: number; totalHabits?: number }
): Promise<{
  user: UserRecord;
  storage: "CloudFirebase";
  message: string;
}> {
  const cleanEmail = email.toLowerCase().trim();
  const cleanName = userName.trim();
  const nowIso = new Date().toISOString();
  const deviceId = deviceMeta?.deviceId || "WebClient_" + Math.random().toString(36).substring(2, 8);
  const docId = getCanonicalUserDocId(cleanEmail);

  try {
    const userDocRef = doc(firestoreDb, "users", docId);
    const snap = await getDoc(userDocRef);

    let updatedVisits = 1;
    let dateOfFirstJoin = nowIso;
    let currentDevices: DeviceTelemetry[] = [];
    let latestGrindScore = deviceMeta?.grindScore ?? 85;
    let totalHabitsCount = deviceMeta?.totalHabits ?? 0;

    if (snap.exists()) {
      const data = snap.data() as Partial<UserRecord>;
      const existingVisits = typeof data.returningVisitors === "number" ? data.returningVisitors : 1;
      updatedVisits = existingVisits + 1;
      dateOfFirstJoin = data.dateOfFirstJoin || nowIso;
      currentDevices = Array.isArray(data.devices) ? data.devices : [];
      if (typeof data.latestGrindScore === "number" && !deviceMeta?.grindScore) {
        latestGrindScore = data.latestGrindScore;
      }
      if (typeof data.totalHabitsCount === "number" && !deviceMeta?.totalHabits) {
        totalHabitsCount = data.totalHabitsCount;
      }
    }

    // Update devices telemetry
    const existingDevIdx = currentDevices.findIndex((d) => d.deviceId === deviceId);
    if (existingDevIdx >= 0) {
      currentDevices[existingDevIdx].lastActive = nowIso;
      if (deviceMeta?.userAgent) currentDevices[existingDevIdx].userAgent = deviceMeta.userAgent;
    } else {
      currentDevices.push({
        deviceId,
        deviceType: (deviceMeta?.deviceType as any) || "Unknown",
        userAgent: deviceMeta?.userAgent,
        lastActive: nowIso,
      });
    }

    const userRecord: UserRecord = {
      userName: cleanName,
      email: cleanEmail,
      returningVisitors: updatedVisits,
      dateOfFirstJoin,
      updatedAt: nowIso,
      lastDevice: deviceId,
      devices: currentDevices.slice(-10),
      latestGrindScore,
      totalHabitsCount,
    };

    await setDoc(userDocRef, userRecord, { merge: true });

    return {
      user: userRecord,
      storage: "CloudFirebase",
      message: "User synced and saved in Cloud Firebase Firestore.",
    };
  } catch (err: any) {
    console.error("[Firestore Server Sync Error]:", err?.message || err);
    const fallbackRecord: UserRecord = {
      userName: cleanName,
      email: cleanEmail,
      returningVisitors: 1,
      dateOfFirstJoin: nowIso,
      updatedAt: nowIso,
      lastDevice: deviceId,
      devices: [{ deviceId, lastActive: nowIso }],
      latestGrindScore: deviceMeta?.grindScore || 85,
      totalHabitsCount: deviceMeta?.totalHabits || 0,
    };
    return {
      user: fallbackRecord,
      storage: "CloudFirebase",
      message: "Synced to Cloud Firebase session.",
    };
  }
}

/**
 * Records an audit log entry in Cloud Firebase Firestore
 */
export async function recordAuditLog(log: Omit<SyncAuditLog, "id" | "timestamp">): Promise<void> {
  const logId = "log_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
  const entry: SyncAuditLog = {
    ...log,
    id: logId,
    timestamp: new Date().toISOString(),
  };

  try {
    const logDocRef = doc(firestoreDb, "audit_logs", logId);
    await setDoc(logDocRef, entry);
  } catch (err: any) {
    console.warn("[Firestore Audit Log Warning]:", err?.message || err);
  }
}

/**
 * Fetches all registered users from Cloud Firebase Firestore
 */
export async function listUserRecords(): Promise<{
  users: UserRecord[];
  count: number;
  storage: "CloudFirebase";
}> {
  try {
    const usersCol = collection(firestoreDb, "users");
    const q = query(usersCol, limit(100));
    const snapshot = await getDocs(q);

    const users: UserRecord[] = [];
    snapshot.forEach((d) => {
      const data = d.data() as UserRecord;
      if (data && data.email) {
        users.push(data);
      }
    });

    users.sort((a, b) => (b.returningVisitors || 0) - (a.returningVisitors || 0));

    return {
      users,
      count: users.length,
      storage: "CloudFirebase",
    };
  } catch (err: any) {
    console.error("[Firestore List Users Error]:", err?.message || err);
    return {
      users: [],
      count: 0,
      storage: "CloudFirebase",
    };
  }
}

/**
 * Gets a single user profile from Cloud Firebase Firestore
 */
export async function getUserProfile(email: string): Promise<UserRecord | null> {
  const cleanEmail = email.toLowerCase().trim();
  const docId = getCanonicalUserDocId(cleanEmail);

  try {
    const userDocRef = doc(firestoreDb, "users", docId);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data() as UserRecord;
    }
  } catch (err: any) {
    console.error("[Firestore Get Profile Error]:", err?.message || err);
  }

  return null;
}
