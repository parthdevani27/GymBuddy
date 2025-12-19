import React, { useState, useEffect } from 'react';
import { User, Mail, Calendar, Hash, LogOut, Save, Loader2, Moon, Sun } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import { supabase } from '../services/supabase';
import { useToast } from './ui/Toast';

export const Profile: React.FC = () => {
    const { user, signOut } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const { showToast } = useToast();

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        age: '',
        gender: 'Male' // Default, will update from load
    });

    useEffect(() => {
        if (user && user.user_metadata) {
            setFormData({
                username: user.user_metadata.username || '',
                age: user.user_metadata.age || '',
                gender: user.user_metadata.gender || 'Male'
            });
        }
    }, [user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Update Supabase Auth Metadata
            const { error: authError } = await supabase.auth.updateUser({
                data: {
                    username: formData.username,
                    age: parseInt(formData.age as string),
                    gender: formData.gender
                }
            });

            if (authError) throw authError;

            // 2. Update Public Profiles table
            if (user) {
                const { error: dbError } = await supabase
                    .from('profiles')
                    .update({
                        username: formData.username,
                        age: parseInt(formData.age as string),
                        gender: formData.gender,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', user.id);

                if (dbError) throw dbError;
            }

            showToast("Profile updated successfully!", "success");

        } catch (error: any) {
            console.error(error);
            showToast(error.message || "Failed to update profile", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-ios-bg-light dark:bg-black overflow-y-auto transition-colors duration-300">
            <div className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-ios-divider dark:border-slate-800 p-4 shadow-sm">
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    Profile
                </h2>
            </div>

            <div className="p-4 max-w-2xl mx-auto w-full space-y-6">

                {/* User Info Card */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-ios-divider dark:border-slate-800 shadow-sm flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                        {formData.username ? formData.username.substring(0, 1).toUpperCase() : 'U'}
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                            {formData.username || 'User'}
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm flex items-center gap-1">
                            <Mail size={14} /> {user?.email}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleUpdateProfile} className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-ios-divider dark:border-slate-800 shadow-sm space-y-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Edit Details</h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Username</label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 text-slate-400" size={18} />
                                <input
                                    name="username"
                                    type="text"
                                    value={formData.username}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-ios-blue outline-none"
                                    placeholder="Enter username"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Age</label>
                                <div className="relative">
                                    <Hash className="absolute left-3 top-3 text-slate-400" size={18} />
                                    <input
                                        name="age"
                                        type="number"
                                        value={formData.age}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-ios-blue outline-none"
                                        placeholder="Age"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Gender</label>
                                <select
                                    name="gender"
                                    value={formData.gender}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-ios-blue outline-none"
                                >
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-ios-blue hover:bg-blue-600 text-white py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                            Save Changes
                        </button>
                    </div>
                </form>

                {/* Appearance & Settings */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-ios-divider dark:border-slate-800 shadow-sm space-y-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">App Settings</h3>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300">
                                {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                            </div>
                            <div>
                                <p className="font-medium text-slate-900 dark:text-white">App Theme</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={toggleTheme}
                            className={`relative w-12 h-7 rounded-full transition-colors duration-300 focus:outline-none ${theme === 'dark' ? 'bg-ios-blue' : 'bg-slate-300'
                                }`}
                        >
                            <div
                                className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${theme === 'dark' ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                            />
                        </button>
                    </div>
                </div>

                <button
                    onClick={signOut}
                    type="button"
                    className="w-full bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 border border-red-200 dark:border-red-900/30"
                >
                    <LogOut size={20} /> Sign Out
                </button>
            </div>
        </div>
    );
};
