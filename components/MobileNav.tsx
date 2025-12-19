import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CalendarCheck, Calendar, ClipboardList } from 'lucide-react';
import { getISTDateString } from '../utils/time';

interface MobileNavProps {
    handleNavClick: (e: React.MouseEvent) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ handleNavClick }) => {
    const todayStr = getISTDateString();

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-ios-divider dark:border-slate-800 z-50 md:hidden pb-safe">
            <div className="flex justify-around items-center h-16">
                <NavLink
                    to="/"
                    onClick={handleNavClick}
                    className={({ isActive }) =>
                        `flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-blue-500' : 'text-slate-400 hover:text-slate-300'}`
                    }
                >
                    <LayoutDashboard size={24} />
                    <span className="text-[10px] font-medium">Home</span>
                </NavLink>

                <NavLink
                    to={`/day/${todayStr}`}
                    onClick={handleNavClick}
                    className={({ isActive }) =>
                        `flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-blue-500' : 'text-slate-400 hover:text-slate-300'}`
                    }
                >
                    <CalendarCheck size={24} />
                    <span className="text-[10px] font-medium">Today</span>
                </NavLink>

                <NavLink
                    to="/calendar"
                    onClick={handleNavClick}
                    className={({ isActive }) =>
                        `flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-blue-500' : 'text-slate-400 hover:text-slate-300'}`
                    }
                >
                    <Calendar size={24} />
                    <span className="text-[10px] font-medium">Calendar</span>
                </NavLink>

                <NavLink
                    to="/planner"
                    onClick={handleNavClick}
                    className={({ isActive }) =>
                        `flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-ios-blue' : 'text-slate-400 hover:text-slate-300'}`
                    }
                >
                    <ClipboardList size={24} />
                    <span className="text-[10px] font-medium">Plan</span>
                </NavLink>

                <button
                    onClick={() => {
                        // We access the global context here, or dispatch a custom event if Context isn't easily reachable
                        // Since MobileNav is inside App, we can't easily use hooks unless we pass props or move hook usage up.
                        // However, since we are inside HashRouter in App -> AppContent, we CAN access valid Context if MobileNav is child.
                        // Ideally MobileNav should receive toggleTheme as prop or useTheme. 
                        // Let's rely on Props update or dispatch event.
                        // Actually, let's fix the Component to use Theme.
                        const root = window.document.documentElement;
                        const isDark = root.classList.contains('dark');
                        if (isDark) {
                            root.classList.remove('dark');
                            localStorage.setItem('gymgenius-theme', 'light');
                        } else {
                            root.classList.add('dark');
                            localStorage.setItem('gymgenius-theme', 'dark');
                        }
                    }}
                    className="flex flex-col items-center justify-center w-full h-full space-y-1 text-slate-400 hover:text-slate-300"
                >
                    {/* Simple toggle trigger without context for now, or update App.tsx to pass it */}
                    {/* Better approach: Let's assume we can add a simple toggle here visually */}
                    <div className="w-6 h-6 rounded-full border-2 border-slate-500 flex items-center justify-center">
                        <span className="block w-3 h-3 bg-slate-500 rounded-full dark:bg-transparent" />
                    </div>
                    <span className="text-[10px] font-medium">Mode</span>
                </button>
            </div>
        </nav>
    );
};
