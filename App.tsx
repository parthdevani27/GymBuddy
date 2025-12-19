import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, NavLink, useNavigate, useParams, Navigate } from 'react-router-dom';
import { AppState, WeeklyPlan, DailyLog } from './types';
import { loadData, saveData } from './services/storage';
import { WeeklyPlanEditor } from './components/WeeklyPlanEditor';
import { CalendarView } from './components/Calendar';
import { DayView } from './components/DayView';
import { Dashboard } from './components/Dashboard';
import { Profile } from './components/Profile';
import { ToastProvider, useToast } from './components/ui/Toast';
import { Modal } from './components/ui/Modal';
import { getISTDateString } from './utils/time';
import { LayoutDashboard, Calendar, ClipboardList, Loader2, CalendarCheck, Moon, Sun, LogOut, User } from 'lucide-react';
import { ThemeProvider, useTheme } from './components/ThemeContext';
import { MobileNav } from './components/MobileNav';

// Auth Imports
import { AuthProvider, useAuth } from './components/AuthContext';
import { Login } from './components/auth/Login';
import { Register } from './components/auth/Register';

const AuthenticatedAppContent = () => {
  const { user, signOut } = useAuth();
  const { showToast } = useToast();
  const { theme, toggleTheme } = useTheme();

  const [state, setState] = useState<AppState | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Ref to track if the initial data load has happened.
  const isFirstRender = useRef(true);

  // Calculate today's date string in IST
  const todayStr = getISTDateString();

  const handleInitData = async () => {
    if (!user) return;
    const { data, source } = await loadData(user.id);
    setState(data);

    if (source === 'cloud') {
      // showToast('Synced with Cloud Database', 'success');
    } else {
      showToast('Offline Mode: Using Local Data', 'info');
    }
  };

  // Load data asynchronously on mount when user is present
  useEffect(() => {
    if (user) {
      handleInitData();
    }
  }, [user, showToast]);

  // Save data whenever state changes, BUT NOT ON FIRST LOAD
  useEffect(() => {
    if (state && user) {
      if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
      }

      const save = async () => {
        await saveData(state, user.id);
      };
      save();
    }
  }, [state, user]);

  const handleSavePlan = (newPlan: WeeklyPlan) => {
    if (!state) return;
    setState(prev => prev ? ({ ...prev, weeklyPlan: newPlan }) : null);
  };

  const handleSaveLog = (date: string, log: DailyLog) => {
    if (!state) return;
    setState(prev => prev ? ({
      ...prev,
      logs: {
        ...prev.logs,
        [date]: log
      }
    }) : null);
  };

  const handleUpdateRestTimer = (seconds: number) => {
    if (!state) return;
    setState(prev => prev ? ({ ...prev, defaultRestTimer: seconds }) : null);
  };

  const handleNavClick = (e: React.MouseEvent) => {
    if (hasUnsavedChanges) {
      if (!window.confirm("You have unsaved changes. Are you sure you want to leave without saving?")) {
        e.preventDefault();
      } else {
        setHasUnsavedChanges(false);
      }
    }
  };

  if (!state) {
    return (
      <div className="flex h-screen w-full bg-ios-bg-light dark:bg-black items-center justify-center flex-col gap-4">
        <Loader2 className="animate-spin text-ios-blue" size={48} />
        <p className="text-slate-400 font-medium">Loading your workout data...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-ios-bg-light dark:bg-black text-slate-800 dark:text-slate-200 transition-colors duration-300">
      {/* Sidebar Navigation */}
      <div className="hidden md:flex w-20 md:w-64 flex-shrink-0 bg-ios-card-light dark:bg-ios-card-dark border-r border-ios-divider dark:border-slate-800 flex-col transition-colors duration-300">
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-ios-blue rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-ios-blue/30">G</div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white hidden md:block tracking-tight">GymGenius</h1>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <NavLink
            to="/"
            onClick={handleNavClick}
            className={({ isActive }) => `flex items-center gap-3 p-3 rounded-xl transition ${isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <LayoutDashboard size={20} />
            <span className="hidden md:block font-medium">Dashboard</span>
          </NavLink>

          <NavLink
            to={`/day/${todayStr}`}
            onClick={handleNavClick}
            className={({ isActive }) => `flex items-center gap-3 p-3 rounded-xl transition ${isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <CalendarCheck size={20} />
            <span className="hidden md:block font-medium">Today</span>
          </NavLink>

          <NavLink
            to="/calendar"
            onClick={handleNavClick}
            className={({ isActive }) => `flex items-center gap-3 p-3 rounded-xl transition ${isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <Calendar size={20} />
            <span className="hidden md:block font-medium">Calendar</span>
          </NavLink>
          <NavLink
            to="/planner"
            onClick={handleNavClick}
            className={({ isActive }) => `flex items-center gap-3 p-3 rounded-xl transition ${isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <ClipboardList size={20} />
            <span className="hidden md:block font-medium">Weekly Plan</span>
          </NavLink>

          <div className="my-4 border-t border-slate-200 dark:border-slate-800" />

          <NavLink
            to="/profile"
            onClick={handleNavClick}
            className={({ isActive }) => `flex items-center gap-3 p-3 rounded-xl transition ${isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <User size={20} />
            <span className="hidden md:block font-medium">Profile</span>
          </NavLink>


        </nav>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto relative pb-20 md:pb-0 h-screen">
        <Routes>
          <Route path="/" element={<Dashboard data={state} />} />
          <Route path="/calendar" element={<CalendarWrapper logs={state.logs} />} />
          <Route path="/profile" element={<Profile />} />
          <Route
            path="/planner"
            element={
              <WeeklyPlanEditor
                plan={state.weeklyPlan}
                onSave={handleSavePlan}
                setHasUnsavedChanges={setHasUnsavedChanges}
              />
            }
          />
          <Route
            path="/day/:dateStr"
            element={
              <DayViewWrapper
                state={state}
                onSaveLog={handleSaveLog}
                setHasUnsavedChanges={setHasUnsavedChanges}
                onUpdateRestTimer={handleUpdateRestTimer}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>

      <MobileNav handleNavClick={handleNavClick} />
    </div>
  );
};

// Wrappers for navigation handling
const CalendarWrapper = ({ logs }: { logs: { [key: string]: DailyLog } }) => {
  const navigate = useNavigate();
  return <CalendarView logs={logs} onSelectDate={(date) => navigate(`/day/${date}`)} />;
};

const DayViewWrapper = ({
  state,
  onSaveLog,
  setHasUnsavedChanges,
  onUpdateRestTimer
}: {
  state: AppState,
  onSaveLog: (d: string, l: DailyLog) => void,
  setHasUnsavedChanges: (val: boolean) => void,
  onUpdateRestTimer: (s: number) => void
}) => {
  const { dateStr } = useParams();
  const navigate = useNavigate();

  if (!dateStr) return <Navigate to="/calendar" />;

  return (
    <DayView
      dateStr={dateStr}
      weeklyPlan={state.weeklyPlan}
      log={state.logs[dateStr]}
      onSaveLog={onSaveLog}
      onBack={() => navigate('/calendar')}
      setHasUnsavedChanges={setHasUnsavedChanges}
      defaultRestTimer={state.defaultRestTimer || 120}
      onUpdateRestTimer={onUpdateRestTimer}
    />
  );
};

// Auth Wrapper
const AuthWrapper = () => {
  const { user, loading } = useAuth();
  const [view, setView] = useState<'login' | 'register'>('login');

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  if (!user) {
    return view === 'login'
      ? <Login onRegisterClick={() => setView('register')} />
      : <Register onLoginClick={() => setView('login')} />;
  }

  return <AuthenticatedAppContent />;
};

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <HashRouter>
          <ToastProvider>
            <AuthWrapper />
          </ToastProvider>
        </HashRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;