import { GoogleGenAI } from "@google/genai";
import { GEMINI_MODEL_TEXT, GEMINI_MODEL_REPORT, DEFAULT_PLAN } from "../constants";
import { LoggedExercise, DailyLog, WeeklyPlan, DayPlan, Exercise } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getExerciseInstructions = async (exerciseName: string): Promise<string> => {
  if (!process.env.API_KEY) return "API Key not configured.";

  try {
    const prompt = `Provide detailed, concise instructions on how to perform the gym exercise: "${exerciseName}". 
    Include 3 key bullet points for perfect form and 1 common mistake to avoid. Format as Markdown.`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_TEXT,
      contents: prompt,
    });

    return response.text || "No instructions available.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Could not fetch instructions at this time.";
  }
};

export const getBatchExerciseTips = async (exercises: string[]): Promise<{ [key: string]: string }> => {
  if (!process.env.API_KEY || exercises.length === 0) return {};

  const prompt = `
    I have a workout plan with these exercises: ${exercises.join(', ')}.
    For EACH exercise, provide a single, short, high-impact "Pro Tip" (max 20 words) to help with form or intensity.
    Return ONLY a valid JSON object where keys are the exercise names and values are the tips.
    Example: { "Bench Press": "Keep your feet planted and squeeze your shoulder blades together." }
  `;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Batch Tip Error", error);
    return {};
  }
};

export const calculateCalories = async (log: DailyLog): Promise<number> => {
  if (!process.env.API_KEY) return 0;

  const workoutDetails = log.loggedExercises.map(ex =>
    `${ex.name}: ${ex.setsPerformed.length} sets completed. Weights: ${ex.setsPerformed.map(s => s.weight).join(',')}kg. Reps: ${ex.setsPerformed.map(s => s.reps).join(',')}`
  ).join('\n');

  const prompt = `
      Calculate the approximate TOTAL calories burned for a person with body weight ${log.bodyWeight || 70}kg performing this workout session.
      ${workoutDetails}
      
      IMPORTANT: Calculate the total from scratch based strictly on the exercises listed above. Do not add to any previous values.
      Consider intensity implied by weights and reps.
      Return ONLY a single number (integer) representing the calories. Do not output text.
    `;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_TEXT,
      contents: prompt,
    });

    // Match the first distinct number to avoid issues with text merging
    const text = response.text || "";
    const match = text.match(/(\d+)/);
    if (match) {
      const num = parseInt(match[0]);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  } catch (error) {
    console.error("Calorie Calc Error:", error);
    return 0;
  }
};

export const analyzeDailyWorkout = async (log: DailyLog): Promise<string> => {
  if (!process.env.API_KEY) return "AI unavailable.";

  const workoutDetails = log.loggedExercises.map(ex =>
    `${ex.name}: ${ex.setsPerformed.length} sets. Best Set: ${Math.max(...ex.setsPerformed.map(s => Number(s.weight)))}kg`
  ).join('\n');

  const prompt = `
      Analyze this daily workout for a gym goer (${log.bodyWeight || 70}kg).
      Workout Data:
      ${workoutDetails}
      
      Provide a short, friendly analysis in Markdown.
      1. Highlight one thing they did well (Volume/Intensity).
      2. Point out if they might be overtraining or undertraining based on standard patterns.
      3. One fun fact or motivation.
      Keep it under 100 words.
    `;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_TEXT,
      contents: prompt,
    });
    return response.text || "Analysis failed.";
  } catch (error) {
    return "Could not generate analysis.";
  }
};

export const generateProgressReport = async (logs: DailyLog[]): Promise<{ summary: string, tips: string[] }> => {
  if (!process.env.API_KEY) return { summary: "API Key not configured.", tips: [] };

  // Filter logs to last 30 entries with actual data
  const recentLogs = logs
    .filter(l => l.status === 'present')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 30);

  if (recentLogs.length === 0) {
    return { summary: "Not enough data to generate a report yet. Log some workouts first!", tips: ["Start by logging your first workout."] };
  }

  // Create a simplified text representation of history for the model
  const historyText = recentLogs.map(log => {
    return `Date: ${log.date}, Weight: ${log.bodyWeight || 'N/A'}kg, Calories: ${log.caloriesBurned || 'N/A'}, Workout: ${log.loggedExercises.map(e => `${e.name} (${e.setsPerformed.length} sets)`).join(', ')}`;
  }).join('\n');

  const prompt = `Analyze this gym workout history and body weight data for a user:
  ${historyText}

  Provide a motivating progress report.
  1. Summarize their consistency and volume.
  2. Identify trends in weight or activity.
  3. Give 3 specific actionable tips to improve.
  
  Return valid JSON in this format: { "summary": "string", "tips": ["string", "string", "string"] }`;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_REPORT,
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const json = JSON.parse(response.text || "{}");
    return {
      summary: json.summary || "Analysis complete.",
      tips: json.tips || ["Keep pushing!"]
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      summary: "Could not generate report.",
      tips: ["Check network connection."]
    };
  }
};

export const parseWorkoutPlanFromText = async (text: string): Promise<WeeklyPlan | null> => {
  if (!process.env.API_KEY) return null;

  const prompt = `
    You are an expert fitness planner. The user has provided a raw text description of their weekly workout plan.
    
    User Text:
    """
    ${text}
    """

    Your task:
    1. Parse this text into a structured Weekly Workout Plan JSON.
    2. The JSON must have keys for all 7 days: "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday".
    3. If a day is mentioned in the text, extract the exercises.
    4. For each exercise, extract the 'name', 'targetSets' (as a string, e.g. "3"), and 'targetReps' (as a string, e.g. "8-12").
    5. If a day is NOT mentioned in the text, set 'isRestDay' to true and 'exercises' to an empty array.
    6. Ensure 'isRestDay' is boolean.
    
    Return purely the JSON object matching the WeeklyPlan structure.
  `;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const rawPlan = JSON.parse(response.text || "{}");

    // Post-processing to ensure data integrity (ids, missing days)
    const processedPlan: any = { ...DEFAULT_PLAN };

    ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].forEach(day => {
      if (rawPlan[day]) {
        processedPlan[day] = {
          id: `plan-${day}-${Date.now()}`,
          dayOfWeek: day,
          isRestDay: rawPlan[day].isRestDay ?? true,
          exercises: Array.isArray(rawPlan[day].exercises) ? rawPlan[day].exercises.map((ex: any, idx: number) => ({
            id: `ex-${day}-${idx}-${Date.now()}`,
            name: ex.name || "Unknown Exercise",
            targetSets: String(ex.targetSets || "3"),
            targetReps: String(ex.targetReps || "10"),
          })) : []
        };
      }
    });

    return processedPlan as WeeklyPlan;

  } catch (error) {
    console.error("Gemini Parsing Error:", error);
    return null;
  }
};

export const getExerciseVisualDetails = async (exerciseName: string): Promise<{
  targetedMuscles: string[];
  equipment: string[];
  steps: { title: string; detail: string }[];
} | null> => {
  if (!process.env.API_KEY) return null;

  const prompt = `
      For the gym exercise "${exerciseName}", provide visual details for an animation guide.
      
      Return a JSON object with:
      1. "targetedMuscles": Array of strings (e.g. "Pectoralis Major", "Triceps").
      2. "equipment": Array of strings (e.g. "Barbell", "Bench").
      3. "steps": Array of objects, each having a "title" (short phase name, e.g. "Starting Position") and "detail" (visual description of body alignment).
      
      Keep descriptions visual and precise.
    `;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Visual Details Error:", e);
    return null;
  }
}