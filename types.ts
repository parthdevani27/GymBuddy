export type MediaType = 'image' | 'video';

export interface MediaItem {
  type: MediaType;
  url: string; // Base64 or URL
  name: string;
}

export interface SetDetail {
  id: string;
  reps: string;
  weight: string;
  completed: boolean;
}

export interface Exercise {
  id: string;
  name: string;
  targetSets: string;
  targetReps: string;
  media?: MediaItem; // Instructional image/video
  instructions?: string; // AI generated instructions
}

export interface LoggedExercise extends Exercise {
  setsPerformed: SetDetail[];
  isCustom?: boolean;
  aiHint?: string; // Short AI generated tip for the day
}

export interface DayPlan {
  id: string;
  dayOfWeek: string; // "Monday", "Tuesday", etc.
  isRestDay: boolean;
  exercises: Exercise[];
}

export interface WeeklyPlan {
  [key: string]: DayPlan; // Keyed by "Monday", "Tuesday" etc.
}

export type AttendanceStatus = 'present' | 'absent' | 'pending';

export interface DailyLog {
  date: string; // ISO string "YYYY-MM-DD"
  status: AttendanceStatus;
  loggedExercises: LoggedExercise[];
  bodyWeight?: number;
  progressPhotos?: string[]; // Array of base64 strings
  notes?: string;
  caloriesBurned?: number;
  dailyAnalysis?: string;
}

export interface AppState {
  weeklyPlan: WeeklyPlan;
  logs: { [date: string]: DailyLog };
}

export interface AIReport {
  summary: string;
  tips: string[];
}