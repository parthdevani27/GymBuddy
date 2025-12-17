import React, { useState, useEffect } from 'react';
import { getExerciseVisualDetails } from '../services/gemini';
import { Activity, Dumbbell, Play, Layers, ChevronRight, Loader2, Info } from 'lucide-react';

interface Props {
    exerciseName: string;
}

interface VisualData {
    targetedMuscles: string[];
    equipment: string[];
    steps: { title: string; detail: string }[];
}

export const ExerciseVisualizer: React.FC<Props> = ({ exerciseName }) => {
    const [data, setData] = useState<VisualData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeStep, setActiveStep] = useState(0);

    useEffect(() => {
        const fetch = async () => {
            setLoading(true);
            const res = await getExerciseVisualDetails(exerciseName);
            setData(res);
            setLoading(false);
        };
        fetch();
    }, [exerciseName]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Loader2 className="animate-spin mb-4 text-blue-500" size={32} />
                <p>Analyzing movement mechanics...</p>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="text-center py-8 text-slate-500">
                <Info className="mx-auto mb-2" />
                <p>Visual data unavailable for this exercise.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Target Muscles & Equipment */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                    <h4 className="flex items-center gap-2 text-slate-300 font-bold mb-3 text-xs uppercase tracking-wider">
                        <Activity size={14} className="text-red-400" /> Target Muscles
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {data.targetedMuscles.map((m, i) => (
                            <span key={i} className="bg-red-900/20 text-red-300 px-2 py-1 rounded text-xs font-medium border border-red-900/30">
                                {m}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                    <h4 className="flex items-center gap-2 text-slate-300 font-bold mb-3 text-xs uppercase tracking-wider">
                        <Dumbbell size={14} className="text-blue-400" /> Equipment
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {data.equipment.map((e, i) => (
                            <span key={i} className="bg-blue-900/20 text-blue-300 px-2 py-1 rounded text-xs font-medium border border-blue-900/30">
                                {e}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Visual Guide / Animation Mock */}
            <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
                <div className="bg-slate-800/80 px-4 py-3 border-b border-slate-700 flex justify-between items-center">
                    <h4 className="flex items-center gap-2 text-white font-bold text-sm">
                        <Play size={16} className="text-green-400 fill-current" /> Form Guide
                    </h4>
                    <span className="text-xs text-slate-500">Step {activeStep + 1} of {data.steps.length}</span>
                </div>

                <div className="p-6 min-h-[200px] flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950 relative">
                    {/* Visual Placeholder for Animation */}
                    <div className="absolute inset-0 opacity-10 flex items-center justify-center">
                        <Layers size={120} className="text-slate-500" />
                    </div>

                    <div className="z-10 text-center max-w-sm">
                        <h5 className="text-xl font-bold text-white mb-2">{data.steps[activeStep].title}</h5>
                        <p className="text-slate-300 leading-relaxed text-sm">{data.steps[activeStep].detail}</p>
                    </div>
                </div>

                <div className="flex border-t border-slate-800 divide-x divide-slate-800">
                    {data.steps.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setActiveStep(idx)}
                            className={`flex-1 py-3 transition hover:bg-slate-800 flex justify-center ${activeStep === idx ? 'bg-slate-800 text-blue-400' : 'text-slate-600'}`}
                        >
                            <div className={`h-1.5 w-8 rounded-full ${activeStep === idx ? 'bg-blue-500' : 'bg-slate-700'}`} />
                        </button>
                    ))}
                    <button
                        onClick={() => setActiveStep(prev => (prev + 1) % data.steps.length)}
                        className="px-4 hover:bg-slate-800 text-slate-400 hover:text-white transition"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};
