import React, { useState } from 'react';
import { supabase } from '../../services/supabase';
import { Dumbbell, Loader2, ArrowRight } from 'lucide-react';
import { useToast } from '../ui/Toast';

interface Props {
    onRegisterClick: () => void;
}

export const Login: React.FC<Props> = ({ onRegisterClick }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { showToast } = useToast();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) return;

        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            showToast(error.message, 'error');
        } else {
            showToast('Welcome back!', 'success');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-ios-bg-light dark:bg-black flex flex-col justify-center items-center p-4 transition-colors duration-300">
            <div className="w-full max-w-md">
                <div className="text-center mb-10">
                    <div className="bg-ios-blue w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
                        <Dumbbell className="text-white" size={32} />
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">GymGenius AI</h1>
                    <p className="text-slate-500 dark:text-slate-400">Sign in to continue your fitness journey</p>
                </div>

                <form onSubmit={handleLogin} className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-ios-divider dark:border-slate-800 space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-ios-blue transition"
                            placeholder="you@example.com"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-ios-blue transition"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-ios-blue hover:bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <>Sign In <ArrowRight size={20} /></>}
                    </button>
                </form>

                <div className="text-center mt-8">
                    <p className="text-slate-500 dark:text-slate-400">
                        Don't have an account?{' '}
                        <button
                            onClick={onRegisterClick}
                            className="text-ios-blue font-bold hover:underline"
                        >
                            Sign Up
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};
