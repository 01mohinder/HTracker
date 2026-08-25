import { MongoClient, Db, Collection } from "mongodb";

export interface MongoUserRecord {
  _id?: any;
  uniqueId: string;
  dateOfFirstJoin: string;
  email: string;
  userName: string;
  returningVisitors: number;
  lastActivedate: string;
}

const DEFAULT_MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://1mohinder7864_db_user:ujSAzXAwBoagbBV4@htgrind.hlvenuz.mongodb.net";

let client: MongoClient | null = null;
let dbInstance: Db | null = null;
let isConnecting = false;

/**
 * Lazy, connection-pooled MongoDB client initialization
 */
export async function getMongoDb(): Promise<Db | null> {
  if (dbInstance) return dbInstance;
  if (isConnecting) {
    // Wait briefly if connection is in-flight
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (dbInstance) return dbInstance;
  }

  const uri = process.env.MONGODB_URI || DEFAULT_MONGODB_URI;
  if (!uri) {
    console.warn("[MongoDB] No MONGODB_URI configured. Operating in fallback mode.");
    return null;
  }

  try {
    isConnecting = true;
    client = new MongoClient(uri, {
      connectTimeoutMS: 8000,
      serverSelectionTimeoutMS: 8000,
      maxPoolSize: 10,
      minPoolSize: 1,
    });

    await client.connect();
    // Default database name "ht_grind"
    dbInstance = client.db("ht_grind");
    console.log("[MongoDB] Successfully connected to MongoDB Atlas (database: ht_grind)");

    // Ensure index on uniqueId and email
    const usersCol = dbInstance.collection<MongoUserRecord>("users");
    usersCol.createIndex({ email: 1 }, { unique: true, sparse: true }).catch(() => {});
    usersCol.createIndex({ uniqueId: 1 }, { unique: true, sparse: true }).catch(() => {});

    return dbInstance;
  } catch (error) {
    console.error("[MongoDB] Connection error:", error);
    dbInstance = null;
    return null;
  } finally {
    isConnecting = false;
  }
}

/**
 * Returns the users collection from MongoDB
 */
export async function getUsersCollection(): Promise<Collection<MongoUserRecord> | null> {
  const db = await getMongoDb();
  if (!db) return null;
  return db.collection<MongoUserRecord>("users");
}

/**
 * Saves or updates ONLY the required user schema in MongoDB:
 * - uniqueId
 * - dateOfFirstJoin
 * - email
 * - userName
 * - returningVisitors
 * - lastActivedate
 */
export async function syncUserToMongo(params: {
  uniqueId?: string;
  email: string;
  userName: string;
}): Promise<{
  success: boolean;
  user: MongoUserRecord;
  storage: "MongoDB" | "Fallback";
}> {
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanName = params.userName.trim() || "Champion";
  const nowIso = new Date().toISOString();
  const fallbackUniqueId =
    params.uniqueId?.trim() ||
    `usr_${cleanEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;

  const usersCol = await getUsersCollection();

  if (!usersCol) {
    // Fallback when MongoDB is unreachable
    const fallbackRecord: MongoUserRecord = {
      uniqueId: fallbackUniqueId,
      dateOfFirstJoin: nowIso,
      email: cleanEmail,
      userName: cleanName,
      returningVisitors: 1,
      lastActivedate: nowIso,
    };
    return {
      success: true,
      user: fallbackRecord,
      storage: "Fallback",
    };
  }

  try {
    // Check if user already exists by email or uniqueId
    const existing = await usersCol.findOne({
      $or: [{ email: cleanEmail }, { uniqueId: fallbackUniqueId }],
    });

    if (existing) {
      const nextVisits = (existing.returningVisitors || 0) + 1;
      const targetUniqueId = existing.uniqueId || fallbackUniqueId;
      const targetFirstJoin = existing.dateOfFirstJoin || nowIso;

      await usersCol.updateOne(
        { _id: existing._id },
        {
          $set: {
            uniqueId: targetUniqueId,
            userName: cleanName,
            email: cleanEmail,
            lastActivedate: nowIso,
          },
          $inc: {
            returningVisitors: 1,
          },
        }
      );

      const updatedRecord: MongoUserRecord = {
        uniqueId: targetUniqueId,
        dateOfFirstJoin: targetFirstJoin,
        email: cleanEmail,
        userName: cleanName,
        returningVisitors: nextVisits,
        lastActivedate: nowIso,
      };

      return {
        success: true,
        user: updatedRecord,
        storage: "MongoDB",
      };
    } else {
      // Create fresh user record strictly matching requested schema
      const newRecord: MongoUserRecord = {
        uniqueId: fallbackUniqueId,
        dateOfFirstJoin: nowIso,
        email: cleanEmail,
        userName: cleanName,
        returningVisitors: 1,
        lastActivedate: nowIso,
      };

      await usersCol.insertOne(newRecord);

      return {
        success: true,
        user: newRecord,
        storage: "MongoDB",
      };
    }
  } catch (err) {
    console.error("[MongoDB] syncUserToMongo error:", err);
    return {
      success: false,
      user: {
        uniqueId: fallbackUniqueId,
        dateOfFirstJoin: nowIso,
        email: cleanEmail,
        userName: cleanName,
        returningVisitors: 1,
        lastActivedate: nowIso,
      },
      storage: "Fallback",
    };
  }
}

/**
 * Fetches user from MongoDB by email
 */
export async function getMongoUserByEmail(email: string): Promise<MongoUserRecord | null> {
  const usersCol = await getUsersCollection();
  if (!usersCol) return null;

  try {
    const cleanEmail = email.trim().toLowerCase();
    const doc = await usersCol.findOne(
      { email: cleanEmail },
      {
        projection: {
          _id: 0,
          uniqueId: 1,
          dateOfFirstJoin: 1,
          email: 1,
          userName: 1,
          returningVisitors: 1,
          lastActivedate: 1,
        },
      }
    );
    return doc || null;
  } catch (err) {
    console.error("[MongoDB] getMongoUserByEmail error:", err);
    return null;
  }
}

/**
 * Lists all users stored in MongoDB (for admin view / telemetry dashboard)
 */
export async function listMongoUsers(): Promise<MongoUserRecord[]> {
  const usersCol = await getUsersCollection();
  if (!usersCol) return [];

  try {
    const cursor = usersCol.find(
      {},
      {
        projection: {
          _id: 0,
          uniqueId: 1,
          dateOfFirstJoin: 1,
          email: 1,
          userName: 1,
          returningVisitors: 1,
          lastActivedate: 1,
        },
      }
    ).sort({ lastActivedate: -1 }).limit(200);

    return await cursor.toArray();
  } catch (err) {
    console.error("[MongoDB] listMongoUsers error:", err);
    return [];
  }
}
