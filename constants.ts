import { WeeklyPlan, DayPlan } from './types';

export const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

export const DEFAULT_PLAN: WeeklyPlan = DAYS_OF_WEEK.reduce((acc, day) => {
  acc[day] = {
    id: `plan-${day}`,
    dayOfWeek: day,
    isRestDay: day === 'Saturday' || day === 'Sunday',
    exercises: []
  };
  return acc;
}, {} as WeeklyPlan);

export const GEMINI_MODEL_TEXT = 'gemini-2.5-flash';
export const GEMINI_MODEL_REPORT = 'gemini-2.5-flash';