import React, { useState } from 'react';
import { Lock, ArrowRight } from 'lucide-react';

interface PinLockProps {
    onSuccess: () => void;
}

export const PinLock: React.FC<PinLockProps> = ({ onSuccess }) => {
    const [pin, setPin] = useState('');
    const [error, setError] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (pin === '1111') {
            onSuccess();
        } else {
            setError(true);
            setPin('');
            setTimeout(() => setError(false), 2000);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-ios-bg-light dark:bg-black p-4 transition-colors duration-300">
            {/* Glass Card */}
            <div className="w-full max-w-sm backdrop-blur-xl bg-white/70 dark:bg-slate-900/60 border border-white/20 dark:border-slate-800/50 rounded-3xl p-8 shadow-2xl relative overflow-hidden transition-colors duration-300">
                {/* Background Blobs for specific aesthetic */}
                <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-br from-blue-400/20 via-transparent to-purple-400/20 animate-spin-slow pointer-events-none opacity-50" />

                <div className="relative z-10 flex flex-col items-center gap-6 mb-8">
                    <div className="w-20 h-20 bg-ios-bg-light dark:bg-slate-800 rounded-full flex items-center justify-center shadow-inner mb-2">
                        {error ? (
                            <Lock size={32} className="text-red-500 animate-bounce" />
                        ) : (
                            <Lock size={32} className="text-ios-blue dark:text-blue-400" />
                        )}
                    </div>
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Welcome Back</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                            Enter your PIN to access GymGenius
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
                    <div className="flex justify-center">
                        <input
                            type="password"
                            maxLength={4}
                            value={pin}
                            onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                            placeholder="••••"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            autoComplete="one-time-code"
                            className={`w-4/5 bg-transparent border-b-2 ${error ? 'border-red-500 text-red-500' : 'border-slate-300 dark:border-slate-700 focus:border-ios-blue text-slate-900 dark:text-white'} py-2 text-center text-4xl tracking-[1em] outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700 font-mono`}
                            autoFocus
                        />
                    </div>

                    {error && (
                        <p className="text-red-500 text-xs text-center font-medium animate-pulse">
                            Incorrect PIN. Please try again.
                        </p>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-ios-blue hover:bg-blue-600 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 active:scale-95"
                    >
                        Unlock System <ArrowRight size={20} />
                    </button>

                    <div className="text-center">
                        <button type="button" className="text-xs text-ios-blue dark:text-blue-400 hover:underline">
                            Forgot Passcode?
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
