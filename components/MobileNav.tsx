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
        <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 z-50 md:hidden pb-safe">
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
                        `flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-blue-500' : 'text-slate-400 hover:text-slate-300'}`
                    }
                >
                    <ClipboardList size={24} />
                    <span className="text-[10px] font-medium">Plan</span>
                </NavLink>
            </div>
        </nav>
    );
};
