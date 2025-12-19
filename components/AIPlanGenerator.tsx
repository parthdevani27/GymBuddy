import React, { useState } from 'react';
import { Dumbbell, ArrowRight, ArrowLeft, BrainCircuit, Sparkles, Check, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';
import { useToast } from './ui/Toast';
import { generateWeeklyPlanFromProfile } from '../services/gemini';
import { WeeklyPlan } from '../types';

interface Props {
    onPlanGenerated: (plan: WeeklyPlan) => void;
    onCancel: () => void;
}

// Defining the questions structure
const QUESTIONS = [
    {
        id: 'goal',
        question: "What is your primary goal?",
        type: 'select',
        options: ["Fat loss", "Muscle gain", "Strength", "Endurance", "General fitness"]
    },
    {
        id: 'target',
        question: "Do you have a target weight or body-fat percentage?",
        type: 'text',
        placeholder: "e.g. 70kg or 15% BF"
    },
    {
        id: 'experience',
        question: "What is your training experience level?",
        type: 'select',
        options: ["Beginner (0–6 months)", "Intermediate (6 months–2 years)", "Advanced (2+ years)"]
    },
    {
        id: 'compounds',
        question: "How familiar are you with major compound lifts?",
        type: 'select',
        options: ["Never done them", "Know the basics", "Comfortable with them", "Very confident"]
    },
    {
        id: 'equipment',
        question: "What equipment do you have access to?",
        type: 'select',
        options: ["Full commercial gym", "Machines only", "Free weights", "Cables", "Squat rack", "Treadmill", "Other"]
    },
    {
        id: 'focus_areas',
        question: "Which body parts do you want to focus on the most?",
        type: 'multiselect',
        options: ["Chest", "Arms", "Shoulders", "Back", "Legs", "Glutes", "Abs/Core", "Full-body"]
    },
    {
        id: 'days_per_week',
        question: "How many days can you work out per week?",
        type: 'select',
        options: ["2 days", "3 days", "4 days", "5 days", "6 days"]
    },
    {
        id: 'duration',
        question: "How much time per session?",
        type: 'select',
        options: ["30 mins", "45 mins", "60 mins", "75–90 mins", "More than 90 mins"]
    },
    {
        id: 'rest_days',
        question: "Do you have preferred rest days?",
        type: 'text',
        placeholder: "e.g. Sunday"
    },
    {
        id: 'preference',
        question: "Do you prefer machines or free weights?",
        type: 'select',
        options: ["Machines", "Free weights", "Mix of both"]
    },
    {
        id: 'intensity',
        question: "How intense do you want your workouts to be?",
        type: 'select',
        options: ["Light", "Moderate", "High-Intensity"]
    },
    {
        id: 'injuries',
        question: "Do you have any injuries?",
        type: 'text',
        placeholder: "No, or update details here..."
    },
    {
        id: 'limitations',
        question: "Any medical or mobility limitations?",
        type: 'text',
        placeholder: "No, or describe limitations..."
    },
    {
        id: 'excluded_exercises',
        question: "Any exercises you cannot perform?",
        type: 'text',
        placeholder: "List exercises..."
    },
    {
        id: 'current_weight',
        question: "Current weight",
        type: 'number',
        placeholder: "kg"
    },
    {
        id: 'current_height',
        question: "Current height",
        type: 'number',
        placeholder: "cm"
    },
    {
        id: 'activity_level',
        question: "What is your daily activity level?",
        type: 'select',
        options: ["Mostly desk job / low activity", "Moderately active", "Very active / physical work"]
    },
    {
        id: 'sleep',
        question: "How is your sleep & recovery?",
        type: 'select',
        options: ["Poor (4–5 hrs)", "Average (6–7 hrs)", "Good (7–8+ hrs)"]
    },
    {
        id: 'diet',
        question: "How do you manage your diet?",
        type: 'select',
        options: ["Tracking calories", "Protein-focused but not tracking", "No specific diet", "Want diet guidance"]
    }
];

export const AIPlanGenerator: React.FC<Props> = ({ onPlanGenerated, onCancel }) => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);

    // Prefill user data if available in metadata (Age/Gender handled separately or added to answers)
    // Actually the prompt asked for "Age #prefill" but our loop logic is generic. 
    // We can just inject age/gender from Auth Context into the final payload.

    const handleAnswer = (key: string, value: any) => {
        setAnswers(prev => ({ ...prev, [key]: value }));
    };

    const handleNext = () => {
        if (currentStep < QUESTIONS.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleGenerate();
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleGenerate = async () => {
        setLoading(true);
        try {
            // 1. Construct final profile
            const userProfile = {
                ...answers,
                age: user?.user_metadata?.age || "Not specified",
                gender: user?.user_metadata?.gender || "Not specified"
            };

            // 2. Save answers to Supabase for future reference
            if (supabase && user) {
                await supabase.from('user_questionnaire').insert({
                    user_id: user.id,
                    answers: userProfile
                });
            }

            // 3. Call AI
            const plan = await generateWeeklyPlanFromProfile(userProfile);

            if (plan) {
                onPlanGenerated(plan);
                showToast("Plan generated successfully!", "success");
            } else {
                showToast("AI failed to generate a valid plan.", "error");
            }

        } catch (e) {
            console.error(e);
            showToast("Error generating plan", "error");
        } finally {
            setLoading(false);
        }
    };

    const q = QUESTIONS[currentStep];
    const progress = ((currentStep + 1) / QUESTIONS.length) * 100;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-full min-h-[400px]">
                <div className="relative mb-6">
                    <div className="absolute inset-0 bg-purple-500 blur-xl opacity-20 animate-pulse rounded-full"></div>
                    <BrainCircuit size={64} className="text-purple-500 relative z-10 animate-bounce" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Designing Your Perfect Plan</h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-md">
                    Analyzing your goals, biometrics, and equipment availability to craft a personalized weekly routine...
                </p>
                <div className="mt-8 flex items-center gap-2 text-sm text-purple-600 font-semibold">
                    <Loader2 className="animate-spin" size={16} /> Processing data...
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-ios-divider dark:border-slate-800 shadow-sm relative">
            {/* Progress Bar */}
            <div className="h-1 bg-slate-100 dark:bg-slate-800 w-full">
                <div className="h-full bg-ios-blue transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>

            <div className="flex-1 p-6 md:p-10 flex flex-col justify-center max-w-2xl mx-auto w-full">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                    Question {currentStep + 1} of {QUESTIONS.length}
                </span>

                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-8 leading-tight">
                    {q.question}
                </h2>

                <div className="space-y-4">
                    {q.type === 'select' && q.options?.map(opt => (
                        <button
                            key={opt}
                            onClick={() => {
                                handleAnswer(q.id, opt);
                                if (currentStep < QUESTIONS.length - 1) setTimeout(() => handleNext(), 200); // Auto-advance
                            }}
                            className={`w-full p-4 rounded-xl border-2 text-left font-medium transition-all ${answers[q.id] === opt
                                    ? 'border-ios-blue bg-blue-50 dark:bg-blue-900/20 text-ios-blue'
                                    : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-slate-500 text-slate-700 dark:text-slate-200'
                                }`}
                        >
                            <div className="flex items-center justify-between">
                                {opt}
                                {answers[q.id] === opt && <Check size={20} className="text-ios-blue" />}
                            </div>
                        </button>
                    ))}

                    {q.type === 'multiselect' && q.options?.map(opt => {
                        const currentSelected = (answers[q.id] || []) as string[];
                        const isSelected = currentSelected.includes(opt);

                        return (
                            <button
                                key={opt}
                                onClick={() => {
                                    const newSelection = isSelected
                                        ? currentSelected.filter(i => i !== opt)
                                        : [...currentSelected, opt];
                                    handleAnswer(q.id, newSelection);
                                }}
                                className={`w-full p-4 rounded-xl border-2 text-left font-medium transition-all ${isSelected
                                        ? 'border-ios-blue bg-blue-50 dark:bg-blue-900/20 text-ios-blue'
                                        : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-slate-500 text-slate-700 dark:text-slate-200'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    {opt}
                                    {isSelected && <Check size={20} className="text-ios-blue" />}
                                </div>
                            </button>
                        );
                    })}

                    {(q.type === 'text' || q.type === 'number') && (
                        <input
                            type={q.type}
                            placeholder={q.placeholder}
                            value={answers[q.id] || ''}
                            onChange={(e) => handleAnswer(q.id, e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-ios-blue transition placeholder:text-slate-400"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleNext();
                            }}
                        />
                    )}
                </div>
            </div>

            {/* Footer Navigation */}
            <div className="p-6 border-t border-ios-divider dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm">
                <button
                    onClick={currentStep === 0 ? onCancel : handleBack}
                    className="px-6 py-3 text-slate-500 dark:text-slate-400 font-semibold hover:text-slate-900 dark:hover:text-white transition"
                >
                    {currentStep === 0 ? 'Cancel' : 'Back'}
                </button>

                <button
                    onClick={handleNext}
                    className="bg-ios-blue hover:bg-blue-600 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition flex items-center gap-2"
                >
                    {currentStep === QUESTIONS.length - 1 ? (
                        <>Generate Plan <Sparkles size={18} /></>
                    ) : (
                        <>Next <ArrowRight size={18} /></>
                    )}
                </button>
            </div>
        </div>
    );
};
