import React, { useState, useEffect } from 'react';
import { Lock, Unlock, ArrowRight } from 'lucide-react';

interface PinLockProps {
    onSuccess: () => void;
}

export const PinLock: React.FC<PinLockProps> = ({ onSuccess }) => {
    const [pin, setPin] = useState('');
    const [error, setError] = useState(false);
    const [currentTimeDisplay, setCurrentTimeDisplay] = useState('');

    useEffect(() => {
        // Update display time every second for UX
        const timer = setInterval(() => {
            const now = new Date();
            // Format: 10:23 PM
            setCurrentTimeDisplay(now.toLocaleTimeString('en-IN', {
                timeZone: 'Asia/Kolkata',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const getExpectedPin = () => {
        // 1. Get current time
        const now = new Date();

        // 2. Add 1 minute
        const future = new Date(now.getTime() + 60000); // +1 minute in ms

        // 3. Format as IST
        const istString = future.toLocaleTimeString('en-US', {
            timeZone: 'Asia/Kolkata',
            hour12: false, // Use 24h first to extract raw numbers easily, or use hour12 logic manually
            hour: '2-digit',
            minute: '2-digit'
        });

        // logic: 10:23 PM -> +1m -> 10:24 PM -> "1024"
        // logic: 06:59 AM -> +1m -> 07:00 AM -> "0700"
        // logic: 12:59 PM -> +1m -> 01:00 PM -> "0100" (Wrap around)

        // Let's do it manually to ensure 12h format correctness matching requirements
        const options: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Kolkata' };

        // We need the parts
        const parts = new Intl.DateTimeFormat('en-US', {
            ...options,
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
        }).formatToParts(future);

        const hourPart = parts.find(p => p.type === 'hour')?.value || '0';
        const minutePart = parts.find(p => p.type === 'minute')?.value || '0';

        // Pad with 0 if needed (e.g. 6 -> 06) and join
        const hh = hourPart.padStart(2, '0');
        const mm = minutePart.padStart(2, '0');

        return `${hh}${mm}`;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const expected = getExpectedPin();
        console.log("Expected PIN (Debug):", expected); // Remove in prod if needed, useful for testing

        if (pin === expected) {
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
                        Enter the time-based PIN to access GymGenius.
                        <br />
                        <span className="text-xs opacity-50 mt-1 block">Current IST: {currentTimeDisplay}</span>
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
                            Invalid PIN. Hint: IST Time + 1 min
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
