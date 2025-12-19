import React from 'react';
import { Moon, Sun, Monitor, Trash2 } from 'lucide-react';
import { useTheme } from './ThemeContext';
import { useAuth } from './AuthContext';
import { useToast } from './ui/Toast';

export const Settings: React.FC = () => {
    const { theme, toggleTheme } = useTheme();
    const { user } = useAuth(); // Could be used later for data reset if authorized
    const { showToast } = useToast();

    // Placeholder for future data reset feature if needed
    const handleResetData = () => {
        if (confirm("Are you sure? This will delete all your local data backups. Cloud data remains safe.")) {
            localStorage.clear();
            showToast("Local cache cleared", "success");
            window.location.reload();
        }
    };

    return (
        <div className="flex flex-col h-full bg-ios-bg-light dark:bg-black overflow-y-auto transition-colors duration-300">
            <div className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-ios-divider dark:border-slate-800 p-4 shadow-sm">
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    Settings
                </h2>
            </div>

            <div className="p-4 max-w-2xl mx-auto w-full space-y-6">

                {/* Appearance Section */}
                <section className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-ios-divider dark:border-slate-800 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Monitor className="text-ios-blue" size={20} /> Appearance
                    </h3>

                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="font-medium text-slate-900 dark:text-white">App Theme</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Switch between light and dark mode</p>
                        </div>

                        <button
                            onClick={toggleTheme}
                            className={`relative px-4 py-2 rounded-full font-semibold transition-all flex items-center gap-2 ${theme === 'dark'
                                    ? 'bg-slate-700 text-white hover:bg-slate-600'
                                    : 'bg-ios-blue text-white hover:bg-blue-600'
                                }`}
                        >
                            {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
                            {theme === 'dark' ? 'Dark' : 'Light'}
                        </button>
                    </div>
                </section>

                {/* Data Section (Optional/Stub) */}
                <section className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-ios-divider dark:border-slate-800 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2 text-red-500">
                        <Trash2 size={20} /> Danger Zone
                    </h3>

                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="font-medium text-slate-900 dark:text-white">Clear Local Cache</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Fix sync issues by resetting local storage</p>
                        </div>
                        <button
                            onClick={handleResetData}
                            className="px-4 py-2 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg font-semibold hover:bg-red-200 dark:hover:bg-red-900/40 transition"
                        >
                            Clear Cache
                        </button>
                    </div>
                </section>

                <div className="text-center text-xs text-slate-400 mt-8">
                    GymGenius v1.0.0
                </div>
            </div>
        </div>
    );
};
