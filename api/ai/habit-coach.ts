import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

      return res.status(200).json({
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
    const prompt = `You are the HT GRIND AI Coach, an elite productivity expert, habit neuroscience researcher, and high-performance mentor.
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
1. **Current System Audit**
2. **Top 3 Actionable Tips**
3. **Recommended Habit Additions**

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
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      contents.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: cleanBase64
        }
      });
    }
    contents.push(prompt);

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
        console.warn(`Model ${modelName} failed, trying next fallback...`, err);
      }
    }

    if (!responseText) {
      throw lastError || new Error("Failed to get response from Gemini API");
    }

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

    return res.status(200).json({
      advice: cleanAdvice,
      recommendedHabits
    });
  } catch (error: any) {
    console.error("Vercel AI Route Error:", error);
    return res.status(500).json({
      error: "Failed to generate AI advice",
      details: error?.message || "Unknown error",
    });
  }
}
