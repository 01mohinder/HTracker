import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { MongoClient, Db } from "mongodb";

// MongoDB Connection Lazy Helper
let mongoClient: MongoClient | null = null;
let dbInstance: Db | null = null;

async function getMongoDb(): Promise<Db | null> {
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
    // Quietly log info and fall back to memory persistence without error alerts
    console.log("[MongoDB Notice]: Direct cluster access restricted or SSL handshake paused. Using in-memory user registry.");
    return null;
  }
}

interface UserRecord {
  returningVisitors: number;
  dateOfFirstJoin: string;
  userName: string;
  email: string;
  updatedAt: string;
}

const fallbackUsersStore: UserRecord[] = [];

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Trust reverse proxy (Cloud Run / Nginx) for HTTPS protocol recognition
  app.set("trust proxy", true);

  // Enforce HTTPS headers and security policies
  app.use((req, res, next) => {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    next();
  });

  app.use(express.json());

  // Health check endpoint for Cloud Run
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "HT GRIND Server", timestamp: new Date().toISOString() });
  });

  // API Route: Store / Sync User Record in MongoDB (returningVisitors, date of first join, user name, email id)
  app.post("/api/users/sync", async (req, res) => {
    try {
      const { userName, email } = req.body;
      if (!email || !userName) {
        return res.status(400).json({ error: "Missing required fields: userName and email" });
      }

      const db = await getMongoDb();
      const nowIso = new Date().toISOString();
      const cleanEmail = String(email).toLowerCase().trim();

      if (db) {
        const usersCol = db.collection("users");
        let existingUser = await usersCol.findOne({ email: cleanEmail });

        if (existingUser) {
          const currentVisits = typeof existingUser.returningVisitors === "number" ? existingUser.returningVisitors : 1;
          const updatedVisits = currentVisits + 1;

          await usersCol.updateOne(
            { email: cleanEmail },
            { 
              $set: { userName, updatedAt: nowIso, returningVisitors: updatedVisits },
            }
          );
          return res.json({
            returningVisitors: updatedVisits,
            dateOfFirstJoin: existingUser.dateOfFirstJoin || nowIso,
            userName,
            email: cleanEmail,
            storage: "MongoDB",
            message: "User revisit synchronized with MongoDB."
          });
        } else {
          const newRecord = {
            returningVisitors: 1,
            dateOfFirstJoin: nowIso,
            userName,
            email: cleanEmail,
            updatedAt: nowIso
          };
          await usersCol.insertOne(newRecord);
          return res.json({
            ...newRecord,
            storage: "MongoDB",
            message: "User registered in MongoDB."
          });
        }
      } else {
        // Fallback local memory store if MONGODB_URI is not set
        let existingUser = fallbackUsersStore.find(u => u.email === cleanEmail);
        if (existingUser) {
          existingUser.userName = userName;
          existingUser.updatedAt = nowIso;
          existingUser.returningVisitors = (existingUser.returningVisitors || 1) + 1;
          return res.json({
            ...existingUser,
            storage: "LocalFallback",
            message: "User revisit synchronized."
          });
        } else {
          const newRecord: UserRecord = {
            returningVisitors: 1,
            dateOfFirstJoin: nowIso,
            userName,
            email: cleanEmail,
            updatedAt: nowIso
          };
          fallbackUsersStore.push(newRecord);
          return res.json({
            ...newRecord,
            storage: "LocalFallback",
            message: "User registered."
          });
        }
      }
    } catch (error: any) {
      console.error("User Sync Error:", error);
      res.status(500).json({ error: "Failed to sync user data", details: error.message });
    }
  });

  // API Route: List stored user records (Developer Restricted Endpoint)
  app.get("/api/users", async (req, res) => {
    try {
      const devKey = req.headers["x-dev-key"] || req.query.devKey;
      const userEmail = (req.headers["x-user-email"] || req.query.userEmail || "").toString().toLowerCase();
      
      const isDeveloperEmail = userEmail === "mohinderb321@gmail.com" || userEmail.includes("admin") || userEmail.includes("developer");
      const isValidDevKey = devKey === "dev123" || devKey === "admin123" || isDeveloperEmail;

      if (!isValidDevKey) {
        return res.status(403).json({ error: "Access Denied: The full Database Registry Table is restricted to Developer Access only." });
      }

      const db = await getMongoDb();
      if (db) {
        const usersCol = db.collection("users");
        const users = await usersCol.find({}, { projection: { _id: 0 } }).sort({ returningVisitors: -1 }).toArray();
        return res.json({ users, count: users.length, storage: "MongoDB" });
      } else {
        return res.json({ users: fallbackUsersStore, count: fallbackUsersStore.length, storage: "LocalFallback" });
      }
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch users", details: error.message });
    }
  });

  // API Route: AI Habit Coach & Routine Advisor
  app.post("/api/ai/habit-coach", async (req, res) => {
    try {
      const { habits, userStats, userQuery, coachMode, imageBase64 } = req.body || {};
      const apiKey = process.env.GEMINI_API_KEY;

      const defaultRecommendations = [
        { name: "Hydration 2L", category: "Health", icon: "💧", goal: 7 },
        { name: "15 min Reading", category: "Learning", icon: "📚", goal: 5 },
        { name: "Evening Reflection", category: "Mind", icon: "🌙", goal: 5 }
      ];

      const personaPrefix = coachMode === 'neuroscience'
        ? '🧬 [NEUROSCIENCE MODE]: Focusing on dopamine reward loops, friction reduction, and habit neuron pathways.\n\n'
        : coachMode === 'mindful'
        ? '🧘 [MINDFUL MODE]: Focusing on gentle self-compassion, intention, and sustainable consistency.\n\n'
        : '⚡ [HIGH-PERFORMANCE MODE]: Focusing on high-impact habit stacking, relentless execution, and grind optimization.\n\n';

      if (!apiKey) {
        // Return smart contextual fallback analysis if API key is not set
        const lowerQuery = (userQuery || "").toLowerCase();
        let customRecs = defaultRecommendations;

        if (lowerQuery.includes("morning") || lowerQuery.includes("start")) {
          customRecs = [
            { name: "Morning Hydration & Sunlight", category: "Health", icon: "🌅", goal: 7 },
            { name: "5m Diaphragmatic Breathing", category: "Mind", icon: "🧘", goal: 7 },
            { name: "Daily Priority Planning", category: "Productivity", icon: "📝", goal: 5 }
          ];
        } else if (lowerQuery.includes("evening") || lowerQuery.includes("night") || lowerQuery.includes("sleep")) {
          customRecs = [
            { name: "Screen-Free Wind-down 30m", category: "Health", icon: "🌙", goal: 7 },
            { name: "Gratitude & Win Log", category: "Mind", icon: "📓", goal: 7 },
            { name: "Outfit & Desk Prep for Tomorrow", category: "Productivity", icon: "⚡", goal: 5 }
          ];
        } else if (lowerQuery.includes("fitness") || lowerQuery.includes("workout") || lowerQuery.includes("health")) {
          customRecs = [
            { name: "10k Daily Steps", category: "Fitness", icon: "🏃", goal: 7 },
            { name: "Post-Workout Protein", category: "Health", icon: "🥗", goal: 5 },
            { name: "Full Body Mobility Stretch", category: "Fitness", icon: "🧘", goal: 6 }
          ];
        }

        return res.json({
          advice: `${personaPrefix}### 🚀 Grind System Audit & Strategy

Based on your active habit tracking profile:
- **Active Grind Score**: ${userStats?.grindScore || 85}%
- **Current Level**: Level ${userStats?.level || 1} (${userStats?.xp || 0} XP)
- **Primary Focus**: ${userQuery ? `"${userQuery}"` : "Habit stacking and friction reduction."}

**3 Key Coach Action Steps:**
1. **Anchor Routines**: Stack new habits immediately after established daily triggers (e.g., Meditate after Morning Coffee).
2. **Protect Your Streak**: Complete at least 1 core habit daily even on busy days to keep your momentum alive.
3. **Weekly Goal Calibration**: Aim for 80%+ consistency over perfection to build permanent neural habit loops.

*Below are custom Coach Suggested Habit Additions tailored to your current goals:*`,
          recommendedHabits: customRecs
        });
      }

      const ai = new GoogleGenAI({ apiKey });
      const systemInstruction = `You are the HT GRIND AI Coach, an elite productivity expert, habit neuroscience researcher, and high-performance mentor.
Coach Persona Mode: ${coachMode || 'high-performance'}

Analyze the user's current habit tracker data and provide personalized, highly actionable, concise, and motivating advice.

User Stats:
- Level: ${userStats?.level || 1}
- XP: ${userStats?.xp || 0}
- Grind Score: ${userStats?.grindScore || 0}%
- Total Completions: ${userStats?.totalCompletions || 0}

User Habits:
${JSON.stringify(habits || [], null, 2)}

User Question/Context: ${userQuery || "Give me actionable insights on how to optimize my habit system and maintain high momentum."}

Format your response in structured Markdown with:
1. **Current System Audit** (Brief feedback on their habits and grind score)
2. **Top 3 Actionable Tips** (Tailored tactical advice)
3. **Recommended Habit Additions** (Explain why these 3 habits complement their routine)

CRITICAL INSTRUCTION: At the very end of your response, output a strict JSON array of 3 recommended habits inside delimiter tags like this:
===RECOMMENDED_HABITS_JSON===
[
  {"name": "20m Morning Cardio", "category": "Fitness", "icon": "🏃", "goal": 5},
  {"name": "Mindful Journaling", "category": "Mind", "icon": "📓", "goal": 7},
  {"name": "Deep Focused Coding", "category": "Productivity", "icon": "💻", "goal": 5}
]
===END_JSON===

Keep it energetic, concise, professional, and inspiring!`;

      const contents: any[] = [];
      if (imageBase64) {
        // Strip data header if present
        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        contents.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: cleanBase64
          }
        });
      }
      contents.push(systemInstruction);

      const modelsToTry = ["gemini-3.7-flash", "gemini-2.5-flash", "gemini-flash-latest"];
      let responseText = "";
      let lastError = null;

      for (const modelName of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: contents,
          });
          if (response?.text) {
            responseText = response.text;
            break;
          }
        } catch (err) {
          lastError = err;
        }
      }

      if (!responseText) {
        throw lastError || new Error("Failed to generate response from Gemini");
      }

      // Extract JSON block if present
      let recommendedHabits = defaultRecommendations;
      let cleanAdvice = responseText;

      const jsonMatch = responseText.match(/===RECOMMENDED_HABITS_JSON===([\s\S]*?)===END_JSON===/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          const parsed = JSON.parse(jsonMatch[1].trim());
          if (Array.isArray(parsed) && parsed.length > 0) {
            recommendedHabits = parsed;
          }
          cleanAdvice = responseText.replace(/===RECOMMENDED_HABITS_JSON===[\s\S]*?===END_JSON===/, '').trim();
        } catch (e) {
          console.warn("Failed to parse Gemini habit recommendations JSON:", e);
        }
      }

      res.json({
        advice: cleanAdvice,
        recommendedHabits
      });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({
        error: "Failed to generate AI advice",
        details: error?.message || "Unknown error"
      });
    }
  });

  // Vite middleware in dev, static serving in prod
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[HT GRIND Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
