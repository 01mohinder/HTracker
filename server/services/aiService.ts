import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

export interface HabitRecommendation {
  name: string;
  category: string;
  icon: string;
  goal: number;
}

export interface CoachAdviceParams {
  habits?: any[];
  userStats?: {
    level?: number;
    xp?: number;
    grindScore?: number;
    totalCompletions?: number;
  };
  userQuery?: string;
  coachMode?: "high-performance" | "neuroscience" | "mindful" | string;
  imageBase64?: string;
}

const DEFAULT_RECOMMENDATIONS: HabitRecommendation[] = [
  { name: "Hydration 2L", category: "Health", icon: "💧", goal: 7 },
  { name: "15 min Reading", category: "Learning", icon: "📚", goal: 5 },
  { name: "Evening Reflection", category: "Mind", icon: "🌙", goal: 5 },
];

/**
 * Generates personalized AI Habit Coach advice and smart recommendations
 */
export async function generateHabitCoachAdvice(params: CoachAdviceParams): Promise<{
  advice: string;
  recommendedHabits: HabitRecommendation[];
}> {
  const { habits, userStats, userQuery, coachMode, imageBase64 } = params;
  const ai = getGenAI();

  const personaPrefix =
    coachMode === "neuroscience"
      ? "🧬 [NEUROSCIENCE MODE]: Focusing on dopamine reward loops, friction reduction, and habit neuron pathways.\n\n"
      : coachMode === "mindful"
      ? "🧘 [MINDFUL MODE]: Focusing on gentle self-compassion, intention, and sustainable consistency.\n\n"
      : "⚡ [HIGH-PERFORMANCE MODE]: Focusing on high-impact habit stacking, relentless execution, and grind optimization.\n\n";

  if (!ai) {
    // Contextual fallback when GEMINI_API_KEY is not set
    const lowerQuery = (userQuery || "").toLowerCase();
    let customRecs = DEFAULT_RECOMMENDATIONS;

    if (lowerQuery.includes("morning") || lowerQuery.includes("start")) {
      customRecs = [
        { name: "Morning Hydration & Sunlight", category: "Health", icon: "🌅", goal: 7 },
        { name: "5m Diaphragmatic Breathing", category: "Mind", icon: "🧘", goal: 7 },
        { name: "Daily Priority Planning", category: "Productivity", icon: "📝", goal: 5 },
      ];
    } else if (lowerQuery.includes("evening") || lowerQuery.includes("night") || lowerQuery.includes("sleep")) {
      customRecs = [
        { name: "Screen-Free Wind-down 30m", category: "Health", icon: "🌙", goal: 7 },
        { name: "Gratitude & Win Log", category: "Mind", icon: "📓", goal: 7 },
        { name: "Outfit & Desk Prep for Tomorrow", category: "Productivity", icon: "⚡", goal: 5 },
      ];
    } else if (lowerQuery.includes("fitness") || lowerQuery.includes("workout") || lowerQuery.includes("health")) {
      customRecs = [
        { name: "10k Daily Steps", category: "Fitness", icon: "🏃", goal: 7 },
        { name: "Post-Workout Protein", category: "Health", icon: "🥗", goal: 5 },
        { name: "Full Body Mobility Stretch", category: "Fitness", icon: "🧘", goal: 6 },
      ];
    }

    return {
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
      recommendedHabits: customRecs,
    };
  }

  const prompt = `You are the HT GRIND AI Coach, an elite productivity expert, habit neuroscience researcher, and high-performance mentor.
Coach Persona Mode: ${coachMode || "high-performance"}

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
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    contents.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: cleanBase64,
      },
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
    }
  }

  if (!responseText) {
    throw lastError || new Error("Failed to generate response from Gemini");
  }

  let recommendedHabits = DEFAULT_RECOMMENDATIONS;
  let cleanAdvice = responseText;

  const jsonMatch = responseText.match(/===RECOMMENDED_HABITS_JSON===([\s\S]*?)===END_JSON===/);
  if (jsonMatch && jsonMatch[1]) {
    try {
      const parsed = JSON.parse(jsonMatch[1].trim());
      if (Array.isArray(parsed) && parsed.length > 0) {
        recommendedHabits = parsed;
      }
      cleanAdvice = responseText.replace(/===RECOMMENDED_HABITS_JSON===[\s\S]*?===END_JSON===/, "").trim();
    } catch (e) {
      console.warn("Failed to parse Gemini habit recommendations JSON:", e);
    }
  }

  return {
    advice: cleanAdvice,
    recommendedHabits,
  };
}

/**
 * Generates an automated habit stack / routine flow from a text prompt
 */
export async function generateRoutineFlow(goal: string, timeOfDay: string): Promise<{
  title: string;
  timeOfDay: string;
  icon: string;
  color: string;
  targetVelocityMinutes: number;
  steps: Array<{ title: string; durationMinutes: number; icon: string }>;
}> {
  const ai = getGenAI();
  const defaultRoutine = {
    title: goal ? `${goal} Routine` : "Optimal Routine Flow",
    timeOfDay: timeOfDay || "Morning",
    icon: timeOfDay === "Evening" ? "🌙" : "🌅",
    color: "indigo",
    targetVelocityMinutes: 25,
    steps: [
      { title: "Hydrate & Awaken", durationMinutes: 2, icon: "💧" },
      { title: "Focused Practice / Deep Work", durationMinutes: 20, icon: "⚡" },
      { title: "Progress Reflection", durationMinutes: 3, icon: "📓" },
    ],
  };

  if (!ai) return defaultRoutine;

  try {
    const prompt = `Create a structured daily routine flow for the goal: "${goal}" (${timeOfDay || "Morning"}).
Return a strictly valid JSON object with the following schema:
{
  "title": "Short Routine Title",
  "timeOfDay": "Morning" | "Afternoon" | "Evening" | "Anytime",
  "icon": "emoji icon",
  "color": "indigo" | "emerald" | "amber" | "rose" | "cyan",
  "targetVelocityMinutes": total minutes as number,
  "steps": [
    { "title": "Step action", "durationMinutes": number, "icon": "emoji" }
  ]
}
Only output the JSON object with no additional markdown fences.`;

    const res = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
    });

    const text = res.text?.trim() || "";
    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleanJson);
    if (parsed && Array.isArray(parsed.steps)) {
      return parsed;
    }
  } catch (err) {
    console.warn("generateRoutineFlow fallback:", err);
  }

  return defaultRoutine;
}
