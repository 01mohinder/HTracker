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

// In-Memory Telemetry and Audit Registry for Express Server
const userRegistry = new Map<string, UserRecord>();
const auditLogs: SyncAuditLog[] = [];

export async function getFirestoreDb() {
  return null;
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
  storage: "LocalSession";
  message: string;
}> {
  const cleanEmail = email.toLowerCase().trim();
  const cleanName = userName.trim();
  const nowIso = new Date().toISOString();
  const deviceId = deviceMeta?.deviceId || "WebClient_" + Math.random().toString(36).substring(2, 8);
  const docId = getCanonicalUserDocId(cleanEmail);

  let existing = userRegistry.get(docId);
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

  return {
    user: userRecord,
    storage: "LocalSession",
    message: "User session telemetry updated.",
  };
}

/**
 * Records an audit log entry
 */
export async function recordAuditLog(log: Omit<SyncAuditLog, "id" | "timestamp">): Promise<void> {
  const logId = "log_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
  const entry: SyncAuditLog = {
    ...log,
    id: logId,
    timestamp: new Date().toISOString(),
  };

  auditLogs.push(entry);
  if (auditLogs.length > 500) {
    auditLogs.shift();
  }
}

/**
 * Fetches all registered users from memory registry
 */
export async function listUserRecords(): Promise<{
  users: UserRecord[];
  count: number;
  storage: "LocalSession";
}> {
  const users = Array.from(userRegistry.values());
  users.sort((a, b) => (b.returningVisitors || 0) - (a.returningVisitors || 0));

  return {
    users,
    count: users.length,
    storage: "LocalSession",
  };
}

/**
 * Gets a single user profile from memory registry
 */
export async function getUserProfile(email: string): Promise<UserRecord | null> {
  const cleanEmail = email.toLowerCase().trim();
  const docId = getCanonicalUserDocId(cleanEmail);
  return userRegistry.get(docId) || null;
}
