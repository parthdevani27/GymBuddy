import React, { useState } from 'react';
import { DailyLog } from '../types';
import { ChevronLeft, ChevronRight, Calendar as CalIcon, Flame } from 'lucide-react';
import { getISTDate, getISTDateString } from '../utils/time';

interface Props {
  logs: { [date: string]: DailyLog };
  onSelectDate: (date: string) => void;
}

export const CalendarView: React.FC<Props> = ({ logs, onSelectDate }) => {
  const [currentDate, setCurrentDate] = useState(getISTDate());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 Sun - 6 Sat

  // Adjust for Monday start
  const startingSpace = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getDayStatus = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const log = logs[dateStr];
    const isToday = dateStr === getISTDateString();

    return { dateStr, log, isToday };
  };

  return (
    <div className="h-full flex flex-col p-4 bg-slate-950">
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 md:mb-6 gap-4">
        <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
          <CalIcon className="text-blue-500" size={24} /> Calendar
        </h2>
        <div className="flex items-center gap-4 bg-slate-900 rounded-lg p-1 border border-slate-800 w-full md:w-auto justify-between md:justify-start">
          <button onClick={prevMonth} className="p-2 hover:bg-slate-800 rounded-md text-white"><ChevronLeft size={20} /></button>
          <span className="text-white font-semibold w-32 text-center text-sm md:text-base">{monthNames[month]} {year}</span>
          <button onClick={nextMonth} className="p-2 hover:bg-slate-800 rounded-md text-white"><ChevronRight size={20} /></button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2 text-center text-slate-500 font-semibold text-xs md:text-sm">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <div key={d}>{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1 md:gap-2 auto-rows-fr flex-1 overflow-y-auto content-start">
        {Array.from({ length: startingSpace }).map((_, i) => (
          <div key={`empty-${i}`} className="bg-transparent" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const { dateStr, log, isToday } = getDayStatus(day);

          let bgColor = 'bg-slate-900';
          let borderColor = 'border-slate-800';

          if (log?.status === 'present') {
            bgColor = 'bg-green-900/30';
            borderColor = 'border-green-800';
          } else if (log?.status === 'absent') {
            bgColor = 'bg-red-900/20';
            borderColor = 'border-red-900/30';
          }

          if (isToday) borderColor = 'border-blue-500 border-2';

          return (
            <button
              key={day}
              onClick={() => onSelectDate(dateStr)}
              className={`relative rounded-lg md:rounded-xl border p-1 md:p-2 flex flex-col items-start justify-between hover:scale-[1.02] transition shadow-sm ${bgColor} ${borderColor} min-h-[70px] md:min-h-[100px] overflow-hidden`}
            >
              <span className={`text-xs md:text-sm font-bold ${isToday ? 'text-blue-400' : 'text-slate-300'}`}>{day}</span>

              <div className="flex flex-col items-end w-full gap-0.5 md:gap-1">
                {log?.caloriesBurned !== undefined && (
                  <span className="flex items-center gap-0.5 text-[8px] md:text-[9px] text-orange-400 font-bold bg-slate-950/50 px-1 rounded truncate max-w-full">
                    <Flame size={8} fill="currentColor" className="flex-shrink-0" /> {Math.round(log.caloriesBurned)}
                  </span>
                )}
                {log?.bodyWeight && (
                  <span className="text-[8px] md:text-[10px] bg-slate-800 text-slate-300 px-1 rounded truncate max-w-full">{log.bodyWeight}kg</span>
                )}
                {log?.progressPhotos && log.progressPhotos.length > 0 && (
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-purple-500"></div>
                )}
                {log?.status === 'present' && !log?.caloriesBurned && !log?.bodyWeight && (
                  <span className="text-[8px] md:text-[10px] text-green-400 font-semibold">Done</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};