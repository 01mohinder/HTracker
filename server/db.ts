import { MongoClient, Db } from "mongodb";

export interface UserRecord {
  returningVisitors: number;
  dateOfFirstJoin: string;
  userName: string;
  email: string;
  updatedAt: string;
}

let mongoClient: MongoClient | null = null;
let dbInstance: Db | null = null;

const fallbackUsersStore: UserRecord[] = [];

/**
 * Lazy-initialized singleton MongoDB client with connection pooling and timeouts
 */
export async function getMongoDb(): Promise<Db | null> {
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;
  if (dbInstance) return dbInstance;

  try {
    mongoClient = new MongoClient(uri, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 5000,
      retryWrites: true,
      tlsAllowInvalidCertificates: true,
    });
    await mongoClient.connect();
    dbInstance = mongoClient.db("ht_grind");
    console.log("[MongoDB] Connected to ht_grind database successfully.");
    return dbInstance;
  } catch (_err: any) {
    mongoClient = null;
    dbInstance = null;
    console.log("[MongoDB Notice]: Direct cluster access restricted or SSL handshake paused. Using in-memory fallback.");
    return null;
  }
}

/**
 * Synchronizes user visit and account registry
 */
export async function syncUserRecord(userName: string, email: string): Promise<{
  user: UserRecord;
  storage: "MongoDB" | "LocalFallback";
  message: string;
}> {
  const cleanEmail = email.toLowerCase().trim();
  const cleanName = userName.trim();
  const nowIso = new Date().toISOString();
  const db = await getMongoDb();

  if (db) {
    const usersCol = db.collection("users");
    const existingUser = await usersCol.findOne({ email: cleanEmail });

    if (existingUser) {
      const currentVisits = typeof existingUser.returningVisitors === "number" ? existingUser.returningVisitors : 1;
      const updatedVisits = currentVisits + 1;

      await usersCol.updateOne(
        { email: cleanEmail },
        {
          $set: { userName: cleanName, updatedAt: nowIso, returningVisitors: updatedVisits },
        }
      );

      const userRecord: UserRecord = {
        userName: cleanName,
        email: cleanEmail,
        returningVisitors: updatedVisits,
        dateOfFirstJoin: existingUser.dateOfFirstJoin || nowIso,
        updatedAt: nowIso,
      };

      return {
        user: userRecord,
        storage: "MongoDB",
        message: "User revisit synchronized with MongoDB.",
      };
    } else {
      const newRecord: UserRecord = {
        returningVisitors: 1,
        dateOfFirstJoin: nowIso,
        userName: cleanName,
        email: cleanEmail,
        updatedAt: nowIso,
      };

      await usersCol.insertOne(newRecord);
      return {
        user: newRecord,
        storage: "MongoDB",
        message: "User registered in MongoDB.",
      };
    }
  }

  // Fallback in-memory store
  let existing = fallbackUsersStore.find((u) => u.email === cleanEmail);
  if (existing) {
    existing.userName = cleanName;
    existing.updatedAt = nowIso;
    existing.returningVisitors = (existing.returningVisitors || 1) + 1;
    return {
      user: { ...existing },
      storage: "LocalFallback",
      message: "User revisit synchronized.",
    };
  } else {
    const newRecord: UserRecord = {
      returningVisitors: 1,
      dateOfFirstJoin: nowIso,
      userName: cleanName,
      email: cleanEmail,
      updatedAt: nowIso,
    };
    fallbackUsersStore.push(newRecord);
    return {
      user: { ...newRecord },
      storage: "LocalFallback",
      message: "User registered in memory.",
    };
  }
}

/**
 * Fetches all registered users (for developer auditing)
 */
export async function listUserRecords(): Promise<{
  users: UserRecord[];
  count: number;
  storage: "MongoDB" | "LocalFallback";
}> {
  const db = await getMongoDb();
  if (db) {
    const usersCol = db.collection("users");
    const users = (await usersCol
      .find({}, { projection: { _id: 0 } })
      .sort({ returningVisitors: -1 })
      .toArray()) as unknown as UserRecord[];
    return { users, count: users.length, storage: "MongoDB" };
  }
  return { users: fallbackUsersStore, count: fallbackUsersStore.length, storage: "LocalFallback" };
}

/**
 * Gets a single user profile from database
 */
export async function getUserProfile(email: string): Promise<UserRecord | null> {
  const cleanEmail = email.toLowerCase().trim();
  const db = await getMongoDb();
  if (db) {
    const usersCol = db.collection("users");
    const doc = (await usersCol.findOne({ email: cleanEmail }, { projection: { _id: 0 } })) as unknown as UserRecord | null;
    return doc;
  }
  return fallbackUsersStore.find((u) => u.email === cleanEmail) || null;
}
