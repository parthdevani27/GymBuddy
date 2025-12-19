import React, { useState, useEffect } from 'react';
import { WeeklyPlan, Exercise, MediaItem } from '../types';
import { DAYS_OF_WEEK } from '../constants';
import { Plus, Trash2, Dumbbell, Upload, Sparkles, X, Loader2 } from 'lucide-react';
import { fileToBase64 } from '../services/storage';
import { parseWorkoutPlanFromText } from '../services/gemini';
import { Modal } from './ui/Modal';
import { useToast } from './ui/Toast';

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

  const handleMediaUpload = async (id: string, file: File) => {
    try {
      const base64 = await fileToBase64(file);
      const mediaItem: MediaItem = {
        type: file.type.startsWith('video') ? 'video' : 'image',
        url: base64,
        name: file.name
      };
      updateExercise(id, 'media', mediaItem);
    } catch (e) {
      console.error(e);
      showToast('Failed to upload media', 'error');
    }
  };

  const removeExercise = (id: string) => {
    setLocalPlan(prev => ({
      ...prev,
      [selectedDay]: {
        ...prev[selectedDay],
        exercises: prev[selectedDay].exercises.filter(ex => ex.id !== id)
      }
    }));
  };

  const handleSave = () => {
    onSave(localPlan);
    setOriginalPlanJson(JSON.stringify(localPlan));
    showToast('Weekly plan saved successfully!', 'success');
  };

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

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Dumbbell className="text-ios-blue" /> Weekly Planner
        </h2>
        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex-1 md:flex-none justify-center bg-purple-600 hover:bg-purple-500 text-white px-3 md:px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 text-sm md:text-base"
          >
            <Sparkles size={18} /> <span className="hidden xs:inline">AI Import</span>
          </button>
          <button
            onClick={handleSave}
            className="flex-1 md:flex-none justify-center bg-blue-600 hover:bg-blue-500 text-white px-4 md:px-6 py-2 rounded-lg font-semibold transition shadow-lg shadow-blue-900/20 text-sm md:text-base"
          >
            Save Plan
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {DAYS_OF_WEEK.map(day => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition ${selectedDay === day
              ? 'bg-ios-blue text-white shadow-md'
              : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-ios-divider dark:border-transparent'
              }`}
          >
            {day}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-ios-divider dark:border-slate-800 flex-1 overflow-y-auto shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-blue-100">{selectedDay}</h3>
          <div className="flex items-center gap-3">
            <span className="text-slate-400 text-sm">Rest Day?</span>
            <button
              onClick={toggleRestDay}
              className={`w-12 h-6 rounded-full transition-colors relative ${currentDayPlan.isRestDay ? 'bg-green-500' : 'bg-slate-700'
                }`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${currentDayPlan.isRestDay ? 'left-7' : 'left-1'
                }`} />
            </button>
          </div>
        </div>

        {currentDayPlan.isRestDay ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <div className="text-6xl mb-4">😴</div>
            <p className="text-lg">Enjoy your rest day!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {currentDayPlan.exercises.map((ex, idx) => (
              <div key={ex.id} className="bg-ios-bg-light dark:bg-slate-800 p-4 rounded-lg border border-ios-divider dark:border-slate-700">
                <div className="flex justify-between items-start mb-3 gap-4">
                  <div className="flex-1 space-y-3">
                    <input
                      type="text"
                      placeholder="Exercise Name (e.g. Bench Press)"
                      value={ex.name}
                      onChange={(e) => updateExercise(ex.id, 'name', e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-ios-blue outline-none"
                    />
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="text-xs text-slate-500 uppercase">Sets</label>
                        <input
                          type="number"
                          value={ex.targetSets}
                          onChange={(e) => updateExercise(ex.id, 'targetSets', e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-slate-500 uppercase">Reps</label>
                        <input
                          type="text"
                          value={ex.targetReps}
                          onChange={(e) => updateExercise(ex.id, 'targetReps', e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="cursor-pointer bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 p-2 rounded text-center transition border border-slate-300 dark:border-transparent">
                      <Upload size={18} className="mx-auto text-ios-blue dark:text-blue-400" />
                      <span className="text-[10px] text-slate-500 dark:text-slate-300">Media</span>
                      <input
                        type="file"
                        accept="image/*,video/*"
                        className="hidden"
                        onChange={(e) => e.target.files && handleMediaUpload(ex.id, e.target.files[0])}
                      />
                    </label>
                    <button
                      onClick={() => removeExercise(ex.id)}
                      className="bg-red-900/30 hover:bg-red-900/50 text-red-400 p-2 rounded transition"
                    >
                      <Trash2 size={18} className="mx-auto" />
                    </button>
                  </div>
                </div>
                {ex.media && (
                  <div className="mt-2 text-xs text-green-400 flex items-center gap-1">
                    ✓ {ex.media.name} attached
                  </div>
                )}
              </div>
            ))}

            <button
              onClick={addExercise}
              className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-lg hover:border-ios-blue hover:text-ios-blue transition flex items-center justify-center gap-2"
            >
              <Plus size={20} /> Add Exercise
            </button>
          </div>
        )}
      </div>

      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="AI Plan Import"
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
                  <Sparkles size={18} /> Generate & Save
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};