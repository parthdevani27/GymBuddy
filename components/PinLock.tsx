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
        <div className="flex items-center justify-center min-h-screen bg-slate-950 px-4">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
                <div className="flex flex-col items-center gap-4 mb-8">
                    <div className="w-16 h-16 bg-blue-600/20 text-blue-500 rounded-full flex items-center justify-center">
                        {error ? <Lock size={32} className="text-red-500" /> : <Lock size={32} />}
                    </div>
                    <h1 className="text-2xl font-bold text-white">Security Check</h1>
                    <p className="text-slate-400 text-center text-sm">
                        Enter PIN to access GymGenius.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="password"
                        maxLength={4}
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="0000"
                        className={`w-full bg-slate-950 border ${error ? 'border-red-500/50 focus:border-red-500' : 'border-slate-800 focus:border-blue-500'} rounded-xl px-4 py-4 text-center text-2xl tracking-widest text-white outline-none transition-all placeholder:text-slate-800`}
                        autoFocus
                    />

                    {error && (
                        <p className="text-red-400 text-xs text-center animate-pulse">
                            Invalid PIN.
                        </p>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                        Unlock <ArrowRight size={18} />
                    </button>
                </form>
            </div>
        </div>
    );
};
