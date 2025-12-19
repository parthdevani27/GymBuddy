import React, { useState } from 'react';
import { supabase } from '../../services/supabase';
import { Dumbbell, Loader2, User, Mail, Lock, Calendar } from 'lucide-react';
import { useToast } from '../ui/Toast';

interface Props {
    onLoginClick: () => void;
}

export const Register: React.FC<Props> = ({ onLoginClick }) => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        age: '',
        gender: 'Male'
    });
    const [loading, setLoading] = useState(false);
    const [verificationSent, setVerificationSent] = useState(false);
    const { showToast } = useToast();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            showToast("Passwords do not match", "error");
            return;
        }

        if (!supabase) {
            showToast("Supabase client not initialized", "error");
            return;
        }

        setLoading(true);

        try {
            // 1. Sign Up
            const { data, error } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        username: formData.username,
                        age: parseInt(formData.age),
                        gender: formData.gender
                    }
                }
            });

            if (error) throw error;

            if (data.user) {
                setVerificationSent(true);
                showToast("Registration successful! check your email.", "success");
            }

        } catch (error: any) {
            showToast(error.message, "error");
        } finally {
            setLoading(false);
        }
    };

    if (verificationSent) {
        return (
            <div className="min-h-screen bg-ios-bg-light dark:bg-black flex flex-col justify-center items-center p-4">
                <div className="text-center max-w-sm bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-green-100 dark:border-slate-800">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600 dark:text-green-400">
                        <Mail size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Verify your Email</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-6">
                        We've sent a verification link to <strong>{formData.email}</strong>. Please check your inbox (and spam folder) to activate your account.
                    </p>
                    <button
                        onClick={onLoginClick}
                        className="text-ios-blue font-bold hover:underline"
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-ios-bg-light dark:bg-black flex flex-col justify-center items-center p-4 transition-colors duration-300">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Create Account</h1>
                    <p className="text-slate-500 dark:text-slate-400">Join GymGenius to smash your goals</p>
                </div>

                <form onSubmit={handleRegister} className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-ios-divider dark:border-slate-800 space-y-4">

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Username</label>
                        <input
                            name="username"
                            required
                            value={formData.username}
                            onChange={handleChange}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-ios-blue transition"
                            placeholder="FitnessWarrior"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Email</label>
                        <input
                            name="email"
                            type="email"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-ios-blue transition"
                            placeholder="you@example.com"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Age</label>
                            <input
                                name="age"
                                type="number"
                                required
                                value={formData.age}
                                onChange={handleChange}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-ios-blue transition"
                                placeholder="25"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Gender</label>
                            <select
                                name="gender"
                                value={formData.gender}
                                onChange={handleChange}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-ios-blue transition appearance-none"
                            >
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Password</label>
                        <input
                            name="password"
                            type="password"
                            required
                            value={formData.password}
                            onChange={handleChange}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-ios-blue transition"
                            placeholder="••••••••"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Confirm Password</label>
                        <input
                            name="confirmPassword"
                            type="password"
                            required
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-ios-blue transition"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-ios-blue hover:bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition flex items-center justify-center gap-2 mt-4"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : "Sign Up"}
                    </button>
                </form>

                <div className="text-center mt-6">
                    <p className="text-slate-500 dark:text-slate-400">
                        Already have an account?{' '}
                        <button
                            onClick={onLoginClick}
                            className="text-ios-blue font-bold hover:underline"
                        >
                            Sign In
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};
