import React, { useState, useEffect, useRef } from 'react';
import { DailyLog, WeeklyPlan, LoggedExercise, SetDetail } from '../types';
import { DAYS_OF_WEEK } from '../constants';
import { Save, Plus, Camera, Bot, Trash2, ArrowLeft, CheckCircle2, Dumbbell, Lightbulb, Loader2, Calculator, BrainCircuit, CalendarClock, Lock, History, Play } from 'lucide-react';
import { fileToBase64 } from '../services/storage';
import { getExerciseInstructions, getBatchExerciseTips, calculateCalories, analyzeDailyWorkout } from '../services/gemini';
import { Modal } from './ui/Modal';
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
}

export const DayView: React.FC<Props> = ({ dateStr, weeklyPlan, log, onSaveLog, onBack, setHasUnsavedChanges }) => {
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

  const handlePhotoUpload = async (file: File) => {
    if (!isEditable) return;
    try {
      const base64 = await fileToBase64(file);
      setCurrentLog(prev => ({
        ...prev,
        progressPhotos: [...(prev.progressPhotos || []), base64]
      }));
      showToast('Photo added successfully!', 'success');
    } catch (e) {
      console.error(e);
      showToast('Failed to upload photo', 'error');
    }
  };

  const handleSave = () => {
    if (!isEditable) {
      showToast("Cannot save changes. This log is read-only.", "error");
      return;
    }
    onSaveLog(dateStr, currentLog);
    setOriginalLogJson(JSON.stringify(currentLog)); // Update baseline
    showToast("Workout saved successfully!", "success");
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
    <div className="flex flex-col h-full bg-slate-950 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-700 p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <button onClick={handleBack} className="p-2 hover:bg-slate-800 rounded-full transition text-slate-400">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">{dayName}</h2>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span>{dateStr}</span>
              {isToday && <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Today</span>}
              {isYesterday && <span className="bg-orange-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Yesterday</span>}
              {isFuture && <span className="bg-purple-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Future</span>}
              {!isEditable && !isFuture && <span className="bg-slate-700 text-slate-300 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1"><Lock size={10} /> Locked</span>}
            </div>
          </div>
        </div>
        {isEditable && (
          <button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 transition shadow-blue-900/20 shadow-lg"
          >
            <Save size={18} /> <span className="hidden sm:inline">Save</span>
          </button>
        )}
      </div>

      <div className="p-4 max-w-4xl mx-auto w-full space-y-8 pb-32">

        {/* Status Banners */}
        {isFuture && (
          <div className="bg-slate-900 border border-purple-500/30 rounded-xl p-6 text-center">
            <CalendarClock size={48} className="mx-auto text-purple-400 mb-3" />
            <h3 className="text-xl font-bold text-white">Upcoming Workout</h3>
            <p className="text-slate-400 mt-2">This workout is scheduled for the future. You can view the plan, but you cannot log sets until the day arrives.</p>
          </div>
        )}

        {!isEditable && !isFuture && (
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 text-center opacity-80">
            <History size={48} className="mx-auto text-slate-500 mb-3" />
            <h3 className="text-xl font-bold text-white">Past Workout</h3>
            <p className="text-slate-400 mt-2">This entry is archived. Editing is restricted to Today and Yesterday only.</p>
          </div>
        )}

        {/* Status Selection (Editable Only) */}
        {isEditable && (
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleStatusChange('present')}
              className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${currentLog.status === 'present'
                ? 'bg-green-600/20 border-green-500 text-green-400 shadow-lg shadow-green-900/20'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'
                }`}
            >
              <CheckCircle2 size={32} />
              <span className="font-bold">I'm Training</span>
            </button>
            <button
              onClick={() => handleStatusChange('absent')}
              className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${currentLog.status === 'absent'
                ? 'bg-red-600/20 border-red-500 text-red-400 shadow-lg shadow-red-900/20'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'
                }`}
            >
              <div className="text-3xl">💤</div>
              <span className="font-bold">Rest Day</span>
            </button>
          </div>
        )}

        {/* Body Stats */}
        <div className={`bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm ${!isEditable ? 'opacity-90' : ''}`}>
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
                  className={`w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none text-lg font-mono ${!isEditable ? 'opacity-50' : ''}`}
                />
                <span className="absolute right-4 top-3.5 text-slate-500 font-bold">kg</span>
              </div>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-slate-500 font-semibold mb-2 block">PROGRESS PHOTO</label>
              <label className={`flex items-center justify-center gap-3 w-full bg-slate-950 hover:bg-slate-800 p-3 rounded-xl cursor-pointer transition border border-dashed border-slate-700 group h-[52px] ${!isEditable ? 'opacity-50 pointer-events-none' : ''}`}>
                <Camera size={20} className="text-slate-400 group-hover:text-blue-400 transition" />
                <span className="text-sm text-slate-400 font-medium group-hover:text-slate-200">Upload Photo</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && handlePhotoUpload(e.target.files[0])} />
              </label>
            </div>
          </div>
          {currentLog.progressPhotos && currentLog.progressPhotos.length > 0 && (
            <div className="flex gap-3 mt-4 overflow-x-auto pb-2">
              {currentLog.progressPhotos.map((img, i) => (
                <div key={i} className="relative group">
                  <img src={img} alt="Progress" className="h-24 w-24 object-cover rounded-xl border-2 border-slate-700 shadow-md" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Exercises Section */}
        {currentLog.status !== 'absent' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Dumbbell className="text-blue-500" /> Workout Routine
              </h3>
              {tipsFetching && (
                <div className="text-xs text-purple-400 flex items-center gap-2 animate-pulse bg-purple-900/20 px-3 py-1 rounded-full">
                  <Loader2 size={12} className="animate-spin" />
                  Generating AI Tips...
                </div>
              )}
            </div>

            {currentLog.loggedExercises.map((ex, exIdx) => (
              <div key={ex.id} className={`bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden group ${!isEditable ? 'opacity-90' : ''}`}>
                {/* Exercise Header */}
                <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700/50 flex justify-between items-start relative">
                  <div className="flex-1 relative z-10">
                    {ex.isCustom && isEditable ? (
                      <input
                        value={ex.name}
                        onChange={(e) => handleExerciseNameChange(exIdx, e.target.value)}
                        placeholder="Exercise Name"
                        className="bg-transparent text-xl font-bold text-white w-full outline-none placeholder:text-slate-600"
                      />
                    ) : (
                      <h3 className="text-xl font-bold text-white">{ex.name}</h3>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs font-mono text-slate-400">
                      <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800">TARGET: {ex.targetSets} SETS</span>
                      <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800">REPS: {ex.targetReps}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 relative z-10">
                    <button
                      onClick={() => handleGetDetailedAdvice(ex.name)}
                      className="p-2 bg-slate-800 text-slate-400 rounded-lg hover:bg-slate-700 hover:text-white transition"
                      title="Detailed Instructions"
                    >
                      <Bot size={20} />
                    </button>
                    <button
                      onClick={() => {
                        setVisualizerExercise(ex.name);
                        setVisualizerOpen(true);
                      }}
                      className="p-2 bg-slate-800 text-purple-400 rounded-lg hover:bg-slate-700 hover:text-purple-300 transition"
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
                  <div className="bg-purple-900/10 border-b border-purple-500/10 px-5 py-3 flex items-start gap-3">
                    <Lightbulb size={18} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-purple-200 font-medium leading-relaxed italic">
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
                  <div className="grid grid-cols-12 gap-1 md:gap-2 text-[8px] md:text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-2 px-1">
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
                          <span className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-[10px] md:text-xs font-mono font-bold">
                            {setIdx + 1}
                          </span>
                        </div>
                        <div className="col-span-4">
                          <input
                            type="number"
                            value={set.weight}
                            disabled={!isEditable}
                            onChange={(e) => updateSet(exIdx, setIdx, 'weight', e.target.value)}
                            className={`w-full bg-slate-950 border border-slate-700 rounded-lg py-1.5 md:py-2 text-center text-white font-mono focus:border-blue-500 outline-none transition-colors text-sm md:text-base ${!isEditable ? 'opacity-50' : ''}`}
                          />
                        </div>
                        <div className="col-span-4">
                          <input
                            type="number"
                            value={set.reps}
                            disabled={!isEditable}
                            onChange={(e) => updateSet(exIdx, setIdx, 'reps', e.target.value)}
                            className={`w-full bg-slate-950 border border-slate-700 rounded-lg py-1.5 md:py-2 text-center text-white font-mono focus:border-blue-500 outline-none transition-colors text-sm md:text-base ${!isEditable ? 'opacity-50' : ''}`}
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
                            <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg border-2 border-slate-700 bg-slate-900 peer-checked:bg-green-500 peer-checked:border-green-500 transition-all flex items-center justify-center text-slate-900">
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
                      className="w-full mt-4 py-3 bg-slate-800/50 hover:bg-slate-800 text-slate-400 text-sm font-semibold rounded-xl transition flex justify-center items-center gap-2 border border-dashed border-slate-700 hover:border-slate-600"
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
                className="w-full py-6 border-2 border-dashed border-slate-800 text-slate-500 rounded-2xl hover:border-blue-500/50 hover:bg-blue-500/5 hover:text-blue-400 transition font-bold uppercase tracking-wide flex items-center justify-center gap-2"
              >
                <Plus size={24} /> Add Extra Exercise
              </button>
            )}

            {/* AI Calculation Section */}
            {isEditable && (
              <div className="mt-8 grid grid-cols-2 gap-4">
                <button
                  onClick={handleCalculateCalories}
                  className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-slate-800 transition shadow-lg"
                >
                  <Calculator className="text-orange-400" />
                  <span className="text-white font-bold text-sm">Calculate Calories</span>
                  {currentLog.caloriesBurned ? (
                    <span className="text-orange-400 text-xs font-mono">{currentLog.caloriesBurned} kcal saved</span>
                  ) : (
                    <span className="text-slate-500 text-xs">AI estimate</span>
                  )}
                </button>

                <button
                  onClick={handleDailyAnalysis}
                  className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-slate-800 transition shadow-lg"
                >
                  <BrainCircuit className="text-purple-400" />
                  <span className="text-white font-bold text-sm">AI Analysis</span>
                  {currentLog.dailyAnalysis ? (
                    <span className="text-purple-400 text-xs font-mono">Report saved</span>
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