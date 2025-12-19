import React, { useState, useEffect } from 'react';
import { WeeklyPlan, Exercise, MediaItem } from '../types';
import { DAYS_OF_WEEK } from '../constants';
import { Plus, Trash2, Dumbbell, Upload, Sparkles, X, Loader2, BrainCircuit } from 'lucide-react';
import { fileToBase64 } from '../services/storage';
import { parseWorkoutPlanFromText } from '../services/gemini';
import { Modal } from './ui/Modal';
import { useToast } from './ui/Toast';
import { SaveIndicator } from './ui/SaveIndicator';
import { AIPlanGenerator } from './AIPlanGenerator';

interface Props {
  plan: WeeklyPlan;
  onSave: (newPlan: WeeklyPlan) => void;
  setHasUnsavedChanges: (val: boolean) => void;
}

export const WeeklyPlanEditor: React.FC<Props> = ({ plan, onSave, setHasUnsavedChanges }) => {
  const { showToast } = useToast();
  const [localPlan, setLocalPlan] = useState<WeeklyPlan>(() => JSON.parse(JSON.stringify(plan)));
  const [originalPlanJson, setOriginalPlanJson] = useState(() => JSON.stringify(plan));
  const [selectedDay, setSelectedDay] = useState<string>('Monday');

  // Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // AI Generator Modal State
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);

  const currentDayPlan = localPlan[selectedDay];

  // Check for unsaved changes
  useEffect(() => {
    const isDirty = JSON.stringify(localPlan) !== originalPlanJson;
    setHasUnsavedChanges(isDirty);

    // Cleanup on unmount
    return () => setHasUnsavedChanges(false);
  }, [localPlan, originalPlanJson, setHasUnsavedChanges]);

  const toggleRestDay = () => {
    setLocalPlan(prev => ({
      ...prev,
      [selectedDay]: {
        ...prev[selectedDay],
        isRestDay: !prev[selectedDay].isRestDay
      }
    }));
  };

  const addExercise = () => {
    const newExercise: Exercise = {
      id: Date.now().toString(),
      name: '',
      targetSets: '3',
      targetReps: '10',
    };
    setLocalPlan(prev => ({
      ...prev,
      [selectedDay]: {
        ...prev[selectedDay],
        exercises: [...prev[selectedDay].exercises, newExercise]
      }
    }));
  };

  const updateExercise = (id: string, field: keyof Exercise, value: any) => {
    setLocalPlan(prev => ({
      ...prev,
      [selectedDay]: {
        ...prev[selectedDay],
        exercises: prev[selectedDay].exercises.map(ex =>
          ex.id === id ? { ...ex, [field]: value } : ex
        )
      }
    }));
  };

  // Image upload removed as per request

  const removeExercise = (id: string) => {
    setLocalPlan(prev => ({
      ...prev,
      [selectedDay]: {
        ...prev[selectedDay],
        exercises: prev[selectedDay].exercises.filter(ex => ex.id !== id)
      }
    }));
  };

  const moveExercise = (index: number, direction: 'up' | 'down') => {
    const exercises = [...currentDayPlan.exercises];
    if (direction === 'up' && index > 0) {
      [exercises[index], exercises[index - 1]] = [exercises[index - 1], exercises[index]];
    } else if (direction === 'down' && index < exercises.length - 1) {
      [exercises[index], exercises[index + 1]] = [exercises[index + 1], exercises[index]];
    }

    setLocalPlan(prev => ({
      ...prev,
      [selectedDay]: {
        ...prev[selectedDay],
        exercises
      }
    }));
  };

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Auto-save Effect
  useEffect(() => {
    // Skip if not dirty or locked
    if (JSON.stringify(localPlan) === originalPlanJson) return;

    // Immediately show spinner when dirty
    setSaveStatus('saving');

    const timer = setTimeout(() => {
      onSave(localPlan);
      setOriginalPlanJson(JSON.stringify(localPlan));

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1000);
    }, 2000); // 2 seconds debounce

    return () => clearTimeout(timer);
  }, [localPlan, originalPlanJson, onSave]);

  const handleAIImport = async () => {
    if (!importText.trim()) return;

    setIsImporting(true);
    const newPlan = await parseWorkoutPlanFromText(importText);
    setIsImporting(false);

    if (newPlan) {
      setLocalPlan(newPlan);
      onSave(newPlan); // Auto save
      setOriginalPlanJson(JSON.stringify(newPlan)); // Sync baseline to avoid dirty state

      setIsImportModalOpen(false);
      setImportText('');
      showToast('Plan imported and saved successfully!', 'success');
    } else {
      showToast("Failed to parse the plan. Please check your text or try again.", 'error');
    }
  };

  const handlePlanGenerated = (newPlan: WeeklyPlan) => {
    setLocalPlan(newPlan);
    onSave(newPlan);
    setOriginalPlanJson(JSON.stringify(newPlan));
    setIsGeneratorOpen(false);
    showToast('Weekly plan generated and saved!', 'success');
  };

  return (
    <div className="flex flex-col h-full bg-ios-bg-light dark:bg-black overflow-y-auto transition-colors duration-300">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-ios-divider dark:border-slate-800 p-4 flex flex-col md:flex-row items-center justify-between shadow-sm transition-colors duration-300 gap-4">
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2 self-start md:self-center">
          <Dumbbell className="text-ios-blue" /> Weekly Planner
          <div className="ml-2">
            <SaveIndicator status={saveStatus} />
          </div>
        </h2>

        <div className="flex gap-3 w-full md:w-auto items-center">
          <button
            onClick={() => setIsGeneratorOpen(true)}
            className="flex-1 whitespace-nowrap bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 active:scale-95 text-sm"
          >
            <BrainCircuit size={18} /> Generate Plan (AI)
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex-1 whitespace-nowrap bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-5 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 text-sm"
          >
            <Sparkles size={18} /> Import Text
          </button>
        </div>
      </div>

      <div className="p-4 max-w-5xl mx-auto w-full space-y-6 pb-32">
        {/* Days Toggle */}

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {DAYS_OF_WEEK.map(day => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition font-medium ${selectedDay === day
                ? 'bg-ios-blue text-white shadow-md shadow-blue-500/20'
                : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-ios-divider dark:border-transparent'
                }`}
            >
              {day}
            </button>
          ))}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-ios-divider dark:border-slate-800 flex-1 overflow-y-auto shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedDay} Workout</h3>
            <div className="flex items-center gap-3">
              <span className="text-slate-400 text-sm font-medium">Rest Day</span>
              <button
                onClick={toggleRestDay}
                className={`w-12 h-6 rounded-full transition-colors relative ${currentDayPlan.isRestDay ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${currentDayPlan.isRestDay ? 'translate-x-7' : 'translate-x-1'
                  }`} />
              </button>
            </div>
          </div>

          {currentDayPlan.isRestDay ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 dark:text-slate-500">
              <div className="text-6xl mb-4 opacity-50">😴</div>
              <p className="text-lg font-medium">Enjoy your rest day!</p>
              <p className="text-sm">Recovery is key to growth.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {currentDayPlan.exercises.map((ex, idx) => (
                <div key={ex.id} className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide rounded-xl">
                  {/* Swipe Container */}

                  {/* Main Card Content */}
                  <div className="min-w-full snap-center bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-200 dark:border-slate-700/50 flex flex-col md:flex-row gap-4 group">

                    {/* Reorder Controls */}
                    <div className="hidden md:flex flex-col items-center justify-center gap-1 text-slate-400">
                      <button
                        onClick={() => moveExercise(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 hover:text-ios-blue disabled:opacity-30 disabled:hover:text-slate-400 transition"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6" /></svg>
                      </button>
                      <button
                        onClick={() => moveExercise(idx, 'down')}
                        disabled={idx === currentDayPlan.exercises.length - 1}
                        className="p-1 hover:text-ios-blue disabled:opacity-30 disabled:hover:text-slate-400 transition"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                      </button>
                    </div>

                    <div className="flex-1 space-y-3">
                      <div className="flex gap-2">
                        {/* Mobile Reorder (Horizontal) */}
                        <div className="md:hidden flex flex-col justify-center gap-2 mr-2 border-r border-slate-200 dark:border-slate-700 pr-2">
                          <button
                            onClick={() => moveExercise(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 text-slate-400 hover:text-ios-blue disabled:opacity-30"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6" /></svg>
                          </button>
                          <button
                            onClick={() => moveExercise(idx, 'down')}
                            disabled={idx === currentDayPlan.exercises.length - 1}
                            className="p-1 text-slate-400 hover:text-ios-blue disabled:opacity-30"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                          </button>
                        </div>

                        <input
                          type="text"
                          placeholder="Exercise Name (e.g. Bench Press)"
                          value={ex.name}
                          onChange={(e) => updateExercise(ex.id, 'name', e.target.value)}
                          className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-ios-blue outline-none font-semibold placeholder:font-normal"
                        />
                      </div>

                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Sets</label>
                          <input
                            type="number"
                            value={ex.targetSets}
                            onChange={(e) => updateExercise(ex.id, 'targetSets', e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-ios-blue outline-none"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Reps / Time</label>
                          <input
                            type="text"
                            value={ex.targetReps}
                            onChange={(e) => updateExercise(ex.id, 'targetReps', e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-ios-blue outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Delete Action Pane (Revealed on Swipe) */}
                  <div className="min-w-[80px] md:min-w-[100px] snap-center bg-red-500 flex items-center justify-center">
                    <button
                      onClick={() => removeExercise(ex.id)}
                      className="w-full h-full flex items-center justify-center text-white hover:bg-red-600 transition"
                    >
                      <Trash2 size={24} />
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={addExercise}
                className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-500 hover:text-ios-blue hover:border-ios-blue hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-xl transition font-semibold flex items-center justify-center gap-2 mt-4"
              >
                <Plus size={20} /> Add Exercise
              </button>
            </div>
          )
          }
        </div >
      </div >

      <Modal
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        title="AI Plan Generator"
      >
        <AIPlanGenerator
          onPlanGenerated={handlePlanGenerated}
          onCancel={() => setIsGeneratorOpen(false)}
        />
      </Modal>

      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import from Text"
      >
        <div className="space-y-4">
          <p className="text-slate-500 dark:text-slate-300 text-sm">
            Paste your workout plan below. The AI will automatically detect days, exercises, sets, and reps.
            <span className="text-orange-500 dark:text-orange-400 block mt-1">Note: This will replace your current unsaved changes and automatically save the new plan.</span>
          </p>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={`Example:\nMONDAY: Chest\nBench Press: 3 sets x 10 reps\nPushups: 3 sets x 15 reps\n\nWEDNESDAY: Legs...`}
            className="w-full h-64 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none font-mono placeholder:text-slate-400"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsImportModalOpen(false)}
              className="px-4 py-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
              disabled={isImporting}
            >
              Cancel
            </button>
            <button
              onClick={handleAIImport}
              disabled={isImporting || !importText.trim()}
              className="bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-6 py-2 rounded-lg font-semibold transition flex items-center gap-2"
            >
              {isImporting ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Processing...
                </>
              ) : (
                <>
                  <Sparkles size={18} /> Parse & Save
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div >
  );
};