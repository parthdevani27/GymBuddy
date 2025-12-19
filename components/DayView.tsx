import React, { useState, useEffect, useRef } from 'react';
import { DailyLog, WeeklyPlan, LoggedExercise, SetDetail } from '../types';
import { DAYS_OF_WEEK } from '../constants';
import { Save, Plus, Camera, Bot, Trash2, ArrowLeft, CheckCircle2, Dumbbell, Lightbulb, Loader2, Calculator, BrainCircuit, CalendarClock, Lock, History, Play, Timer, Settings, Bell } from 'lucide-react';
import { fileToBase64 } from '../services/storage';
import { getExerciseInstructions, getBatchExerciseTips, calculateCalories, analyzeDailyWorkout } from '../services/gemini';
import { Modal } from './ui/Modal';
import { SaveIndicator } from './ui/SaveIndicator';
import { ExerciseVisualizer } from './ExerciseVisualizer';
import ReactMarkdown from 'react-markdown';
import { isFutureDate, isTodayDate, isYesterdayDate } from '../utils/time';
import { useToast } from './ui/Toast';

interface Props {
  dateStr: string;
  weeklyPlan: WeeklyPlan;
  log?: DailyLog;
  onSaveLog: (date: string, log: DailyLog) => void;
  onBack: () => void;
  setHasUnsavedChanges: (val: boolean) => void;
  defaultRestTimer: number;
  onUpdateRestTimer: (seconds: number) => void;
}

export const DayView: React.FC<Props> = ({ dateStr, weeklyPlan, log, onSaveLog, onBack, setHasUnsavedChanges, defaultRestTimer, onUpdateRestTimer }) => {
  const { showToast } = useToast();
  const dateObj = new Date(dateStr);
  const dayName = DAYS_OF_WEEK[dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1];

  const plannedDay = weeklyPlan[dayName];
  const isToday = isTodayDate(dateStr);
  const isYesterday = isYesterdayDate(dateStr);
  const isFuture = isFutureDate(dateStr);

  // Logic: User can only edit Today and Yesterday. Older dates are locked history. Future dates are locked plans.
  const isEditable = isToday || isYesterday;

  // Initialize state
  const [currentLog, setCurrentLog] = useState<DailyLog>(() => {
    // If a log exists, use it
    if (log) return log;

    // If it's a future date, we construct a dummy log just for rendering, 
    // but we won't treat it as a real log yet.
    const initialExercises: LoggedExercise[] = plannedDay.isRestDay ? [] : plannedDay.exercises.map(ex => ({
      ...ex,
      setsPerformed: [] // Future: empty sets
    }));

    return {
      date: dateStr,
      status: 'pending',
      loggedExercises: initialExercises,
      bodyWeight: undefined,
      progressPhotos: [],
    };
  });

  const [originalLogJson, setOriginalLogJson] = useState(() => JSON.stringify(currentLog));
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiContent, setAiContent] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTitle, setAiTitle] = useState('');

  // Rest Timer State
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showTimerSettings, setShowTimerSettings] = useState(false);

  // Audio Playback Helper
  const playTimerSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = 'sine';
      oscillator.frequency.value = 880; // A5
      gainNode.gain.value = 0.1;

      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        // Play a second beep
        setTimeout(() => {
          const osc2 = audioContext.createOscillator();
          const gain2 = audioContext.createGain();
          osc2.connect(gain2);
          gain2.connect(audioContext.destination);
          osc2.type = 'sine';
          osc2.frequency.value = 880;
          gain2.gain.value = 0.1;
          osc2.start();
          setTimeout(() => osc2.stop(), 200);
        }, 300);
      }, 200);
    } catch (e) {
      console.error("Audio playback failed", e);
    }
  };

  useEffect(() => {
    if ("Notification" in window) {
      if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
      }
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0 && isTimerRunning) {
      setIsTimerRunning(false);

      // 1. Vibrate (Android)
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }

      // 2. Play Sound (iOS/Desktop)
      playTimerSound();

      // 3. System Notification (Background support)
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Rest Time Over!", {
          body: "Get back to your workout!",
          icon: "/pwa-192x192.png" // Assuming standard PWA icon exists or default
        });
      }

      showToast("Rest time over! Get back to work!", "success");
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds, showToast]);


  const [visualizerOpen, setVisualizerOpen] = useState(false);
  const [visualizerExercise, setVisualizerExercise] = useState('');

  const [tipsFetching, setTipsFetching] = useState(false);
  const tipsFetchedRef = useRef(false);

  // Track unsaved changes
  useEffect(() => {
    // We only care about unsaved changes if it's editable
    if (!isEditable) return;

    const isDirty = JSON.stringify(currentLog) !== originalLogJson;
    setHasUnsavedChanges(isDirty);

    return () => setHasUnsavedChanges(false);
  }, [currentLog, originalLogJson, setHasUnsavedChanges, isEditable]);

  // Background Tips Fetch (Only for Today)
  useEffect(() => {
    const fetchTips = async () => {
      if (!isToday || isFuture || tipsFetchedRef.current || currentLog.status === 'absent' || currentLog.loggedExercises.length === 0) return;

      const exercisesNeedingTips = currentLog.loggedExercises
        .filter(ex => !ex.aiHint && !ex.isCustom)
        .map(ex => ex.name);

      if (exercisesNeedingTips.length > 0) {
        setTipsFetching(true);
        tipsFetchedRef.current = true;

        try {
          const tipsMap = await getBatchExerciseTips(exercisesNeedingTips);
          setCurrentLog(prev => ({
            ...prev,
            loggedExercises: prev.loggedExercises.map(ex => ({
              ...ex,
              aiHint: tipsMap[ex.name] || ex.aiHint
            }))
          }));
        } catch (e) {
          console.error("Background tip fetch failed", e);
        } finally {
          setTipsFetching(false);
        }
      }
    };

    fetchTips();
  }, [isToday, isFuture, currentLog.loggedExercises.length]);

  const handleStatusChange = (status: 'present' | 'absent') => {
    if (!isEditable) return;
    setCurrentLog(prev => ({ ...prev, status }));
  };

  const handleAddSet = (exerciseIndex: number) => {
    if (!isEditable) return;
    setCurrentLog(prev => {
      const newLogs = [...prev.loggedExercises];
      const ex = newLogs[exerciseIndex];
      const newSet: SetDetail = {
        id: Date.now().toString(),
        reps: ex.targetReps || '0',
        weight: '0',
        completed: false
      };
      ex.setsPerformed = [...ex.setsPerformed, newSet];
      return { ...prev, loggedExercises: newLogs };
    });
  };

  const updateSet = (exIndex: number, setIndex: number, field: keyof SetDetail, value: any) => {
    if (!isEditable) return;
    setCurrentLog(prev => {
      const newLogs = [...prev.loggedExercises];
      newLogs[exIndex].setsPerformed[setIndex] = {
        ...newLogs[exIndex].setsPerformed[setIndex],
        [field]: value
      };

      if (field === 'completed' && value === true) {
        setTimerSeconds(defaultRestTimer);
        setIsTimerRunning(true);
      }

      return { ...prev, loggedExercises: newLogs };
    });
  };

  const removeSet = (exIndex: number, setIndex: number) => {
    if (!isEditable) return;
    setCurrentLog(prev => {
      const newLogs = [...prev.loggedExercises];
      newLogs[exIndex].setsPerformed = newLogs[exIndex].setsPerformed.filter((_, i) => i !== setIndex);
      return { ...prev, loggedExercises: newLogs };
    });
  }

  const handleAddCustomExercise = () => {
    if (!isEditable) return;
    const custom: LoggedExercise = {
      id: `custom-${Date.now()}`,
      name: 'Custom Exercise',
      targetReps: '10',
      targetSets: '3',
      setsPerformed: [],
      isCustom: true
    };
    setCurrentLog(prev => ({
      ...prev,
      loggedExercises: [...prev.loggedExercises, custom]
    }));
  };

  const handleExerciseNameChange = (index: number, name: string) => {
    if (!isEditable) return;
    setCurrentLog(prev => {
      const newLogs = [...prev.loggedExercises];
      newLogs[index].name = name;
      return { ...prev, loggedExercises: newLogs };
    });
  }

  const handleGetDetailedAdvice = async (exerciseName: string) => {
    setAiTitle(`How to: ${exerciseName}`);
    setAiModalOpen(true);
    setAiLoading(true);
    setAiContent('');
    const advice = await getExerciseInstructions(exerciseName);
    setAiContent(advice);
    setAiLoading(false);
  };

  // Photo upload removed as per request

  const handleSave = () => {
    // No-op or internal implementation if needed, but UI button is gone.
  };

  // AI Actions for End of Day
  const handleCalculateCalories = async () => {
    if (!isEditable) return;
    setAiTitle("Calculating Calories...");
    setAiModalOpen(true);
    setAiLoading(true);

    const calories = await calculateCalories(currentLog);

    const updatedLog = { ...currentLog, caloriesBurned: calories };
    setCurrentLog(updatedLog);
    onSaveLog(dateStr, updatedLog);
    setOriginalLogJson(JSON.stringify(updatedLog)); // Auto-save logic triggers update

    setAiContent(`🔥 Estimated Calories Burned: **${calories} kcal**\n\nGreat job! This is based on your logged sets, reps, and weights.`);
    setAiTitle("Energy Output");
    setAiLoading(false);
    showToast("Calories updated and saved!", "success");
  };

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Auto-save Effect for Day Log
  useEffect(() => {
    if (!isEditable) return;
    if (JSON.stringify(currentLog) === originalLogJson) return;

    setSaveStatus('saving');

    const timer = setTimeout(() => {
      onSaveLog(dateStr, currentLog);
      setOriginalLogJson(JSON.stringify(currentLog));

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1000);
    }, 2000);

    return () => clearTimeout(timer);
  }, [currentLog, originalLogJson, isEditable, dateStr, onSaveLog]);

  // Removed manual save button logic, but kept internal helper for other saves if needed?
  // Actually, other actions like Calorie/AI analysis force a save too.
  // We should update saveStatus for them as well if we want consistency,
  // or just let them rely on their own logic. 
  // But wait, they call onSaveLog directly.
  // The 'originalLogJson' update triggers a re-render which avoids the effect firing if we sync it.

  const handleDailyAnalysis = async () => {
    // Analysis can be allowed even if locked? No, it updates the log.
    if (!isEditable) return;
    setAiTitle("Workout Analysis");
    setAiModalOpen(true);
    setAiLoading(true);

    const analysis = await analyzeDailyWorkout(currentLog);

    const updatedLog = { ...currentLog, dailyAnalysis: analysis };
    setCurrentLog(updatedLog);
    onSaveLog(dateStr, updatedLog);
    setOriginalLogJson(JSON.stringify(updatedLog));

    setAiContent(analysis);
    setAiLoading(false);
    showToast("Analysis complete and saved!", "success");
  };

  // Intercept back navigation manually if user clicks back arrow
  const handleBack = () => {
    if (JSON.stringify(currentLog) !== originalLogJson && isEditable) {
      if (window.confirm("You have unsaved changes. Discard them?")) {
        onBack();
      }
    } else {
      onBack();
    }
  };

  return (
    <div className="flex flex-col h-full bg-ios-bg-light dark:bg-black overflow-y-auto transition-colors duration-300">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-ios-divider dark:border-slate-800 p-4 flex items-center justify-between shadow-sm transition-colors duration-300">
        <div className="flex items-center gap-4">
          <button onClick={handleBack} className="p-2 hover:bg-black/5 dark:hover:bg-slate-800 rounded-full transition text-ios-blue dark:text-blue-400">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">{dayName}</h2>
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 font-medium">
              <span>{dateStr}</span>
              {isToday && <span className="bg-ios-blue text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-sm">Today</span>}
              {isYesterday && <span className="bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-sm">Yesterday</span>}
              {isFuture && <span className="bg-purple-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-sm">Future</span>}
              {!isEditable && !isFuture && <span className="bg-slate-700 text-slate-300 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1"><Lock size={10} /> Locked</span>}
            </div>
          </div>
        </div>

        {/* Timer UI in Header */}
        <div className="flex items-center gap-3">
          {isTimerRunning && (
            <div className="flex items-center gap-2 bg-ios-blue text-white px-3 py-1.5 rounded-full animate-pulse shadow-lg shadow-blue-500/20">
              <Timer size={16} />
              <span className="font-mono font-bold text-lg">
                {Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, '0')}
              </span>
            </div>
          )}

          {isEditable && (
            <button
              onClick={() => setShowTimerSettings(true)}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-black/5 dark:hover:bg-slate-800 transition"
              title="Rest Timer Settings"
            >
              <Settings size={22} />
            </button>
          )}

          {isEditable && (
            <div className="w-10 flex justify-center">
              <SaveIndicator status={saveStatus} />
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={showTimerSettings}
        onClose={() => setShowTimerSettings(false)}
        title="Rest Timer Settings"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Set the default rest duration triggered after completing a set.
          </p>
          <div className="flex items-center gap-4">
            <Timer size={24} className="text-ios-blue" />
            <input
              type="range"
              min="10"
              max="600"
              step="10"
              value={defaultRestTimer}
              onChange={(e) => onUpdateRestTimer(parseInt(e.target.value))}
              className="flex-1 accent-ios-blue"
            />
            <span className="font-mono font-bold text-slate-900 dark:text-white w-16 text-right">
              {defaultRestTimer}s
            </span>
          </div>
          <div className="flex flex-col gap-3 pt-4 border-t border-ios-divider dark:border-slate-800">
            <button
              onClick={() => {
                if ("Notification" in window) {
                  Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                      showToast("Notifications enabled!", "success");
                    } else {
                      showToast("Notifications denied.", "error");
                    }
                  });
                }
              }}
              className="flex items-center justify-center gap-2 w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              <Bell size={18} /> Enable Notifications
            </button>

            <button
              onClick={() => setShowTimerSettings(false)}
              className="w-full py-3 bg-ios-blue text-white rounded-xl hover:bg-blue-600 font-bold shadow-lg shadow-blue-500/20"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>

      <div className="p-4 max-w-4xl mx-auto w-full space-y-8 pb-32">

        {/* Status Banners */}
        {isFuture && (
          <div className="bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-500/30 rounded-3xl p-8 text-center shadow-sm">
            <CalendarClock size={48} className="mx-auto text-purple-500 dark:text-purple-400 mb-4" />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Upcoming Workout</h3>
            <p className="text-slate-500 dark:text-slate-400 mt-2">This workout is scheduled for the future. You can view the plan, but you cannot log sets until the day arrives.</p>
          </div>
        )}

        {!isEditable && !isFuture && (
          <div className="bg-ios-card-light dark:bg-slate-900 border border-ios-divider dark:border-slate-800 rounded-3xl p-8 text-center opacity-80 shadow-inner">
            <History size={48} className="mx-auto text-slate-400 dark:text-slate-600 mb-4" />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Past Workout</h3>
            <p className="text-slate-500 dark:text-slate-400 mt-2">This entry is archived. Editing is restricted to Today and Yesterday only.</p>
          </div>
        )}

        {/* Status Selection (Editable Only) */}
        {isEditable && (
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleStatusChange('present')}
              className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${currentLog.status === 'present'
                ? 'bg-green-600/20 border-green-500 text-green-600 dark:text-green-400 shadow-lg shadow-green-900/20'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
            >
              <CheckCircle2 size={32} />
              <span className="font-bold">I'm Training</span>
            </button>
            <button
              onClick={() => handleStatusChange('absent')}
              className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${currentLog.status === 'absent'
                ? 'bg-red-600/20 border-red-500 text-red-600 dark:text-red-400 shadow-lg shadow-red-900/20'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
            >
              <div className="text-3xl">💤</div>
              <span className="font-bold">Rest Day</span>
            </button>
          </div>
        )}

        {/* Body Stats */}
        <div className={`bg-white dark:bg-slate-900 p-6 rounded-3xl border border-ios-divider dark:border-slate-800 shadow-sm transition-colors duration-300 ${!isEditable ? 'opacity-90' : ''}`}>
          <h3 className="text-slate-400 font-bold uppercase text-xs tracking-wider mb-4">Daily Check-in</h3>
          <div className="flex flex-wrap gap-6">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-slate-500 font-semibold mb-2 block">BODY WEIGHT</label>
              <div className="relative">
                <input
                  type="number"
                  disabled={!isEditable}
                  value={currentLog.bodyWeight || ''}
                  onChange={(e) => setCurrentLog(prev => ({ ...prev, bodyWeight: parseFloat(e.target.value) }))}
                  placeholder="0.0"
                  className={`w-full bg-ios-bg-light dark:bg-black border-none rounded-2xl px-6 py-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-ios-blue outline-none text-2xl font-bold text-center shadow-inner transition-all ${!isEditable ? 'opacity-50' : ''}`}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">kg</span>
              </div>
            </div>
            <div className="flex-1 min-w-[200px] hidden">
              {/* Photo upload removed */}
            </div>
          </div>

        </div>

        {/* Exercises Section */}
        {currentLog.status !== 'absent' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Dumbbell className="text-ios-blue" /> Workout Routine
              </h3>
              {tipsFetching && (
                <div className="text-xs text-purple-400 flex items-center gap-2 animate-pulse bg-purple-900/20 px-3 py-1 rounded-full">
                  <Loader2 size={12} className="animate-spin" />
                  Generating AI Tips...
                </div>
              )}
            </div>

            {currentLog.loggedExercises.map((ex, exIdx) => (
              <div key={ex.id} className={`bg-white dark:bg-slate-900 rounded-3xl border border-ios-divider dark:border-slate-800 shadow-sm overflow-hidden group transition-all duration-300 ${!isEditable ? 'opacity-90' : ''}`}>
                {/* Exercise Header */}
                <div className="p-5 bg-ios-bg-light dark:bg-gradient-to-r dark:from-slate-900 dark:to-slate-800 border-b border-ios-divider dark:border-slate-700/50 flex justify-between items-start relative">
                  <div className="flex-1 relative z-10">
                    {ex.isCustom && isEditable ? (
                      <input
                        value={ex.name}
                        onChange={(e) => handleExerciseNameChange(exIdx, e.target.value)}
                        placeholder="Exercise Name"
                        className="bg-transparent text-xl font-bold text-slate-900 dark:text-white w-full outline-none placeholder:text-slate-400"
                      />
                    ) : (
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">{ex.name}</h3>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs font-bold text-slate-600 dark:text-slate-400">
                      <span className="bg-slate-100 dark:bg-black px-2 py-1 rounded-md border border-slate-200 dark:border-slate-800">TARGET: {ex.targetSets} SETS</span>
                      <span className="bg-slate-100 dark:bg-black px-2 py-1 rounded-md border border-slate-200 dark:border-slate-800">REPS: {ex.targetReps}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 relative z-10">
                    <button
                      onClick={() => handleGetDetailedAdvice(ex.name)}
                      className="p-2 bg-white dark:bg-slate-800 text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition shadow-sm border border-ios-divider dark:border-transparent"
                      title="Detailed Instructions"
                    >
                      <Bot size={20} />
                    </button>
                    <button
                      onClick={() => {
                        setVisualizerExercise(ex.name);
                        setVisualizerOpen(true);
                      }}
                      className="p-2 bg-purple-100 dark:bg-slate-800 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-200 dark:hover:bg-slate-700 transition"
                      title="Visualize Form"
                    >
                      <Play size={20} fill="currentColor" />
                    </button>
                  </div>

                  {/* Background Media Hint */}
                  {ex.media && (
                    <div className="absolute right-0 top-0 h-full w-48 opacity-10 bg-gradient-to-l from-white to-transparent pointer-events-none" />
                  )}
                </div>

                {/* AI Tip Section */}
                {ex.aiHint && isEditable && (
                  <div className="bg-purple-50 dark:bg-purple-900/10 border-b border-purple-100 dark:border-purple-500/10 px-5 py-3 flex items-start gap-3">
                    <Lightbulb size={18} className="text-purple-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-purple-900 dark:text-purple-200 font-medium leading-relaxed italic">
                      "{ex.aiHint}"
                    </p>
                  </div>
                )}

                <div className="p-5">
                  {/* Media Display */}
                  {ex.media && (
                    <div className="mb-6 rounded-xl overflow-hidden max-h-64 bg-black flex justify-center shadow-inner">
                      {ex.media.type === 'video' ? (
                        <video src={ex.media.url} controls className="h-full max-w-full" />
                      ) : (
                        <img src={ex.media.url} alt={ex.name} className="h-full max-w-full object-contain" />
                      )}
                    </div>
                  )}

                  {/* Sets Table Header */}
                  <div className="grid grid-cols-12 gap-1 md:gap-2 text-[8px] md:text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider mb-2 px-1">
                    <div className="col-span-1 text-center flex items-center justify-center">#</div>
                    <div className="col-span-4 text-center">Weight (kg)</div>
                    <div className="col-span-4 text-center">Reps</div>
                    <div className="col-span-2 text-center">Done</div>
                    <div className="col-span-1"></div>
                  </div>

                  {/* Sets Rows */}
                  <div className="space-y-2">
                    {ex.setsPerformed.map((set, setIdx) => (
                      <div key={set.id} className="grid grid-cols-12 gap-1 md:gap-2 items-center group/set">
                        <div className="col-span-1 flex justify-center">
                          <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center text-[10px] md:text-xs font-mono font-bold">
                            {setIdx + 1}
                          </span>
                        </div>
                        <div className="col-span-4">
                          <input
                            type="number"
                            value={set.weight}
                            disabled={!isEditable}
                            onChange={(e) => updateSet(exIdx, setIdx, 'weight', e.target.value)}
                            className={`w-full bg-slate-100 dark:bg-slate-950 border border-transparent dark:border-slate-700 rounded-lg py-1.5 md:py-2 text-center text-slate-900 dark:text-white font-mono focus:border-ios-blue focus:ring-1 focus:ring-ios-blue outline-none transition-all text-sm md:text-base font-bold shadow-sm ${!isEditable ? 'opacity-50' : ''}`}
                          />
                        </div>
                        <div className="col-span-4">
                          <input
                            type="number"
                            value={set.reps}
                            disabled={!isEditable}
                            onChange={(e) => updateSet(exIdx, setIdx, 'reps', e.target.value)}
                            className={`w-full bg-slate-100 dark:bg-slate-950 border border-transparent dark:border-slate-700 rounded-lg py-1.5 md:py-2 text-center text-slate-900 dark:text-white font-mono focus:border-ios-blue focus:ring-1 focus:ring-ios-blue outline-none transition-all text-sm md:text-base font-bold shadow-sm ${!isEditable ? 'opacity-50' : ''}`}
                          />
                        </div>
                        <div className="col-span-2 flex justify-center">
                          <label className={`cursor-pointer relative ${!isEditable ? 'pointer-events-none opacity-50' : ''}`}>
                            <input
                              type="checkbox"
                              checked={set.completed}
                              onChange={(e) => updateSet(exIdx, setIdx, 'completed', e.target.checked)}
                              className="peer sr-only"
                            />
                            <div className="w-8 h-8 rounded-full border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 peer-checked:bg-green-500 peer-checked:border-green-500 transition-all flex items-center justify-center text-slate-900 dark:text-white shadow-sm">
                              <CheckCircle2 size={16} className="opacity-0 peer-checked:opacity-100 transition-opacity md:w-[18px] md:h-[18px]" />
                            </div>
                          </label>
                        </div>
                        <div className="col-span-1 flex justify-center">
                          {isEditable && (
                            <button
                              onClick={() => removeSet(exIdx, setIdx)}
                              className="text-slate-700 hover:text-red-500 transition-colors opacity-100 md:opacity-0 md:group-hover/set:opacity-100"
                            >
                              <Trash2 size={14} className="md:w-4 md:h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {isEditable && (
                    <button
                      onClick={() => handleAddSet(exIdx)}
                      className="w-full mt-4 py-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 text-sm font-semibold rounded-xl transition flex justify-center items-center gap-2 border border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600"
                    >
                      <Plus size={16} /> Add Set
                    </button>
                  )}
                </div>
              </div>
            ))}

            {isEditable && (
              <button
                onClick={handleAddCustomExercise}
                className="w-full py-6 border-2 border-dashed border-slate-300 dark:border-slate-800 text-slate-400 dark:text-slate-500 rounded-2xl hover:border-blue-500/50 hover:bg-blue-500/5 hover:text-blue-500 transition font-bold uppercase tracking-wide flex items-center justify-center gap-2"
              >
                <Plus size={24} /> Add Extra Exercise
              </button>
            )}

            {/* AI Calculation Section */}
            {isEditable && (
              <div className="mt-8 grid grid-cols-2 gap-4">
                <button
                  onClick={handleCalculateCalories}
                  className="bg-white dark:bg-slate-900 border border-ios-divider dark:border-slate-800 p-4 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm hover:shadow-md"
                >
                  <Calculator className="text-orange-400" />
                  <span className="text-slate-900 dark:text-white font-bold text-sm">Calculate Calories</span>
                  {currentLog.caloriesBurned ? (
                    <span className="text-orange-500 dark:text-orange-400 text-xs font-mono">{currentLog.caloriesBurned} kcal saved</span>
                  ) : (
                    <span className="text-slate-500 text-xs">AI estimate</span>
                  )}
                </button>

                <button
                  onClick={handleDailyAnalysis}
                  className="bg-white dark:bg-slate-900 border border-ios-divider dark:border-slate-800 p-4 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm hover:shadow-md"
                >
                  <BrainCircuit className="text-purple-400" />
                  <span className="text-slate-900 dark:text-white font-bold text-sm">AI Analysis</span>
                  {currentLog.dailyAnalysis ? (
                    <span className="text-purple-600 dark:text-purple-400 text-xs font-mono">Report saved</span>
                  ) : (
                    <span className="text-slate-500 text-xs">Get feedback</span>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      <Modal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        title={`AI Coach: ${aiTitle}`}
      >
        {aiLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-slate-400 font-medium">Processing...</p>
          </div>
        ) : (
          <div className="prose prose-invert prose-p:text-slate-300 prose-headings:text-white max-w-none">
            <ReactMarkdown>{aiContent}</ReactMarkdown>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={visualizerOpen}
        onClose={() => setVisualizerOpen(false)}
        title={`Visual Guide: ${visualizerExercise}`}
      >
        <ExerciseVisualizer exerciseName={visualizerExercise} />
      </Modal>
    </div>
  );
};