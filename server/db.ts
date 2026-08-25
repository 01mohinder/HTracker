import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, getDocs, collection, Firestore } from "firebase/firestore";
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

// In-Memory Telemetry and Audit Registry for fast access
const userRegistry = new Map<string, UserRecord>();
const auditLogs: SyncAuditLog[] = [];

let serverFirestoreDb: Firestore | null = null;

export async function getFirestoreDb(): Promise<Firestore | null> {
  if (serverFirestoreDb) return serverFirestoreDb;

  try {
    const activeConfig = {
      apiKey: process.env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
      authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
      storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
      messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
      appId: process.env.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
    };

    const serverApp = getApps().find((a) => a.name === "server-app") || initializeApp(activeConfig, "server-app");
    serverFirestoreDb = getFirestore(serverApp);
    return serverFirestoreDb;
  } catch (err) {
    console.warn("[Server DB] Firestore server initialization fallback:", err);
    return null;
  }
}

/**
 * Normalizes email to a canonical document key
 */
export function getCanonicalUserDocId(email: string): string {
  return "user_" + email.toLowerCase().trim().replace(/[^a-zA-Z0-9]/g, "_");
}

/**
 * Synchronizes user visit, account registry, and device telemetry
 */
export async function syncUserRecord(
  userName: string,
  email: string,
  deviceMeta?: { deviceId?: string; deviceType?: string; userAgent?: string; grindScore?: number; totalHabits?: number }
): Promise<{
  user: UserRecord;
  storage: "FirestoreCloud" | "LocalSession";
  message: string;
}> {
  const cleanEmail = email.toLowerCase().trim();
  const cleanName = userName.trim();
  const nowIso = new Date().toISOString();
  const rawDeviceId = deviceMeta?.deviceId || "WebClient_" + Math.random().toString(36).substring(2, 8);
  const deviceId = rawDeviceId.replace(/[^a-zA-Z0-9_\-.:]/g, "").slice(0, 64) || "web";
  const docId = getCanonicalUserDocId(cleanEmail);

  let existing = userRegistry.get(docId);
  
  // If not in memory, try hydrating from Firestore
  const db = await getFirestoreDb();
  if (!existing && db) {
    try {
      const snap = await getDoc(doc(db, "server_telemetry_users", docId));
      if (snap.exists()) {
        existing = snap.data() as UserRecord;
      }
    } catch {
      // Continue with in-memory state
    }
  }

  let updatedVisits = 1;
  let dateOfFirstJoin = nowIso;
  let currentDevices: DeviceTelemetry[] = [];
  let latestGrindScore = deviceMeta?.grindScore ?? 85;
  let totalHabitsCount = deviceMeta?.totalHabits ?? 0;

  if (existing) {
    updatedVisits = (existing.returningVisitors || 1) + 1;
    dateOfFirstJoin = existing.dateOfFirstJoin || nowIso;
    currentDevices = Array.isArray(existing.devices) ? [...existing.devices] : [];
    if (typeof existing.latestGrindScore === "number" && !deviceMeta?.grindScore) {
      latestGrindScore = existing.latestGrindScore;
    }
    if (typeof existing.totalHabitsCount === "number" && !deviceMeta?.totalHabits) {
      totalHabitsCount = existing.totalHabitsCount;
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

  userRegistry.set(docId, userRecord);

  // Persist to Cloud Firestore
  if (db) {
    setDoc(doc(db, "server_telemetry_users", docId), userRecord, { merge: true }).catch((err) => {
      console.warn("[Server DB] Async Firestore telemetry persistence notice:", err);
    });
  }

  return {
    user: userRecord,
    storage: db ? "FirestoreCloud" : "LocalSession",
    message: "User session telemetry updated.",
  };
}

/**
 * Records an audit log entry
 */
export async function recordAuditLog(log: Omit<SyncAuditLog, "id" | "timestamp">): Promise<void> {
  const logId = "log_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
  const cleanDeviceId = (typeof log.deviceId === "string" ? log.deviceId : "web")
    .replace(/[^a-zA-Z0-9_\-.:]/g, "")
    .slice(0, 64) || "web";

  const entry: SyncAuditLog = {
    ...log,
    id: logId,
    deviceId: cleanDeviceId,
    timestamp: new Date().toISOString(),
  };

  auditLogs.push(entry);
  if (auditLogs.length > 500) {
    auditLogs.shift();
  }

  const db = await getFirestoreDb();
  if (db) {
    setDoc(doc(db, "server_audit_logs", logId), entry).catch(() => {});
  }
}

/**
 * Fetches all registered users from memory registry or Firestore
 */
export async function listUserRecords(): Promise<{
  users: UserRecord[];
  count: number;
  storage: "FirestoreCloud" | "LocalSession";
}> {
  const db = await getFirestoreDb();
  if (db && userRegistry.size === 0) {
    try {
      const snap = await getDocs(collection(db, "server_telemetry_users"));
      snap.forEach((d) => {
        const u = d.data() as UserRecord;
        if (u.email) {
          userRegistry.set(getCanonicalUserDocId(u.email), u);
        }
      });
    } catch {
      // Continue with in-memory
    }
  }

  const users = Array.from(userRegistry.values());
  users.sort((a, b) => (b.returningVisitors || 0) - (a.returningVisitors || 0));

  return {
    users,
    count: users.length,
    storage: db ? "FirestoreCloud" : "LocalSession",
  };
}

/**
 * Gets a single user profile from memory registry or Firestore
 */
export async function getUserProfile(email: string): Promise<UserRecord | null> {
  const cleanEmail = email.toLowerCase().trim();
  const docId = getCanonicalUserDocId(cleanEmail);
  const cached = userRegistry.get(docId);
  if (cached) return cached;

  const db = await getFirestoreDb();
  if (db) {
    try {
      const snap = await getDoc(doc(db, "server_telemetry_users", docId));
      if (snap.exists()) {
        const user = snap.data() as UserRecord;
        userRegistry.set(docId, user);
        return user;
      }
    } catch {
      // return null
    }
  }
  return null;
}
