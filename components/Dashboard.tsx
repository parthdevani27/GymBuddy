import React, { useState } from 'react';
import { AppState, AIReport, DailyLog } from '../types';
import { generateProgressReport } from '../services/gemini';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts';
import { Activity, TrendingUp, Sparkles, Flame } from 'lucide-react';

interface Props {
  data: AppState;
}

export const Dashboard: React.FC<Props> = ({ data }) => {
  const [report, setReport] = useState<AIReport | null>(null);
  const [loading, setLoading] = useState(false);

  const logs = Object.values(data.logs) as DailyLog[];

  // Prepare chart data
  const chartData = logs
    .filter(log => log.status === 'present')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(log => ({
      date: log.date.substring(5), // MM-DD
      weight: log.bodyWeight,
      calories: Math.round(log.caloriesBurned || 0)
    }));

  // Stats
  const totalWorkouts = logs.filter(l => l.status === 'present').length;
  const totalSkipped = logs.filter(l => l.status === 'absent').length;
  const totalCalories = logs.reduce((acc, log) => acc + (log.caloriesBurned || 0), 0);

  const handleGenerateReport = async () => {
    setLoading(true);
    const result = await generateProgressReport(logs);
    setReport(result);
    setLoading(false);
  };

  return (
    <div className="p-6 h-full overflow-y-auto bg-slate-950 space-y-6">
      <h2 className="text-3xl font-bold text-white mb-6">Dashboard</h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-slate-900 p-4 md:p-6 rounded-xl border border-slate-800 shadow-lg">
          <div className="flex items-center gap-2 md:gap-3 mb-2">
            <Activity className="text-green-500 w-4 h-4 md:w-6 md:h-6" />
            <h3 className="text-slate-400 font-semibold text-xs md:text-base">Workouts</h3>
          </div>
          <p className="text-2xl md:text-4xl font-bold text-white">{totalWorkouts}</p>
        </div>
        <div className="bg-slate-900 p-4 md:p-6 rounded-xl border border-slate-800 shadow-lg overflow-hidden">
          <div className="flex items-center gap-2 md:gap-3 mb-2">
            <Flame className="text-orange-500 w-4 h-4 md:w-6 md:h-6" />
            <h3 className="text-slate-400 font-semibold text-xs md:text-base">Calories</h3>
          </div>
          <p className="text-2xl md:text-4xl font-bold text-white truncate" title={`${Math.round(totalCalories).toLocaleString()} kcal`}>
            {Math.round(totalCalories).toLocaleString()} <span className="text-xs md:text-lg text-slate-500 font-normal">kcal</span>
          </p>
        </div>
        <div className="bg-slate-900 p-4 md:p-6 rounded-xl border border-slate-800 shadow-lg">
          <div className="flex items-center gap-2 md:gap-3 mb-2">
            <TrendingUp className="text-blue-500 w-4 h-4 md:w-6 md:h-6" />
            <h3 className="text-slate-400 font-semibold text-xs md:text-base">Entries</h3>
          </div>
          <p className="text-2xl md:text-4xl font-bold text-white">{logs.length}</p>
        </div>
        <div className="bg-slate-900 p-4 md:p-6 rounded-xl border border-slate-800 shadow-lg">
          <div className="flex items-center gap-2 md:gap-3 mb-2">
            <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-red-500/20 border border-red-500 flex items-center justify-center text-[10px] md:text-xs text-red-500 font-bold">!</div>
            <h3 className="text-slate-400 font-semibold text-xs md:text-base">Skipped</h3>
          </div>
          <p className="text-2xl md:text-4xl font-bold text-white">{totalSkipped}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weight Chart */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-lg h-80">
          <h3 className="text-xl font-bold text-white mb-4">Weight Trend</h3>
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis domain={['auto', 'auto']} stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                  itemStyle={{ color: '#60a5fa' }}
                  formatter={(value: number) => [`${value} kg`, 'Weight']}
                />
                <Line type="monotone" dataKey="weight" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500">
              Log at least two weight entries.
            </div>
          )}
        </div>

        {/* Calories Chart */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-lg h-80">
          <h3 className="text-xl font-bold text-white mb-4">Calorie Burn</h3>
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                  itemStyle={{ color: '#fb923c' }}
                  formatter={(value: number) => [`${value} kcal`, 'Calories']}
                />
                <Area type="monotone" dataKey="calories" stroke="#fb923c" fill="#fb923c" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500">
              Log at least two workouts.
            </div>
          )}
        </div>
      </div>

      {/* AI Report Section */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-900 border border-slate-700 rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 bg-slate-800/50 border-b border-slate-700 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="text-purple-400" /> AI Progress Report
          </h3>
          <button
            onClick={handleGenerateReport}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 text-white px-4 py-2 rounded-lg font-semibold transition"
          >
            {loading ? 'Analyzing...' : 'Generate New Report'}
          </button>
        </div>

        <div className="p-6">
          {report ? (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                <h4 className="text-purple-300 font-bold mb-2 uppercase text-sm">Analysis Summary</h4>
                <p className="text-slate-300 leading-relaxed">{report.summary}</p>
              </div>

              <div>
                <h4 className="text-blue-300 font-bold mb-3 uppercase text-sm">Actionable Tips</h4>
                <ul className="space-y-2">
                  {report.tips.map((tip, idx) => (
                    <li key={idx} className="flex gap-3 bg-slate-800 p-3 rounded-lg">
                      <span className="text-blue-500 font-bold">{idx + 1}.</span>
                      <span className="text-slate-300">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-slate-500">
              Click generate to analyze your workout history and get personalized tips.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};