import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, NavLink, useNavigate, useParams, Navigate } from 'react-router-dom';
import { AppState, WeeklyPlan, DailyLog } from './types';
import { loadData, saveData, getCurrentApiUrl, setCustomApiUrl, resetApiUrl } from './services/storage';
import { WeeklyPlanEditor } from './components/WeeklyPlanEditor';
import { CalendarView } from './components/Calendar';
import { DayView } from './components/DayView';
import { Dashboard } from './components/Dashboard';
import { ToastProvider, useToast } from './components/ui/Toast';
import { Modal } from './components/ui/Modal';
import { getISTDateString } from './utils/time';
import { LayoutDashboard, Calendar, ClipboardList, Loader2, CalendarCheck, Cloud, CloudOff, Wifi, WifiOff, Settings, RefreshCw } from 'lucide-react';
import { PinLock } from './components/PinLock';

import { MobileNav } from './components/MobileNav';

const AppContent = () => {
  const { showToast } = useToast();
  const [state, setState] = useState<AppState | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'connected' | 'offline'>('offline');
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);

  // Ref to track if the initial data load has happened.
  const isFirstRender = useRef(true);

  // Calculate today's date string in IST
  const todayStr = getISTDateString();

  const handleInitData = async () => {
    const { data, source } = await loadData();
    setState(data);
    setSyncStatus(source === 'cloud' ? 'connected' : 'offline');

    if (source === 'cloud') {
      showToast('Synced with Cloud Database', 'success');
    } else {
      showToast('Offline Mode: Using Local Data', 'info');
    }
  };

  // Load data asynchronously on mount
  useEffect(() => {
    handleInitData();
  }, [showToast]);

  // Save data whenever state changes, BUT NOT ON FIRST LOAD
  useEffect(() => {
    if (state) {
      if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
      }

      const save = async () => {
        const success = await saveData(state);
        setSyncStatus(success ? 'connected' : 'offline');
      };
      save();
    }
  }, [state]);

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
      <div className="flex h-screen w-full bg-slate-950 items-center justify-center flex-col gap-4">
        <Loader2 className="animate-spin text-blue-600" size={48} />
        <p className="text-slate-400 font-medium">Syncing with GymGenius Cloud...</p>
        <button
          onClick={() => setIsConnectionModalOpen(true)}
          className="text-sm text-slate-500 underline hover:text-blue-400"
        >
          Connection Issues?
        </button>
        <ConnectionModal
          isOpen={isConnectionModalOpen}
          onClose={() => setIsConnectionModalOpen(false)}
          onRetry={handleInitData}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-200">
      {/* Sidebar Navigation */}
      <div className="hidden md:flex w-20 md:w-64 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white">G</div>
          <h1 className="text-xl font-bold text-white hidden md:block">GymGenius</h1>
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
        </nav>

        {/* Sync Status Indicator */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={() => setIsConnectionModalOpen(true)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition hover:opacity-80 ${syncStatus === 'connected' ? 'bg-green-900/20 text-green-400 border border-green-900/30' : 'bg-red-900/20 text-red-400 border border-red-900/30'}`}
          >
            {syncStatus === 'connected' ? <Cloud size={16} /> : <CloudOff size={16} />}
            <span className="hidden md:block">
              {syncStatus === 'connected' ? 'Cloud Synced' : 'Offline Mode'}
            </span>
            {syncStatus === 'offline' && <Settings size={14} className="ml-auto opacity-50" />}
          </button>
          {syncStatus === 'offline' && (
            <p className="text-[10px] text-slate-500 mt-2 px-1">Ensure <code>node server.js</code> is running.</p>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto relative pb-20 md:pb-0 h-screen">
        <Routes>
          <Route path="/" element={<Dashboard data={state} />} />
          <Route path="/calendar" element={<CalendarWrapper logs={state.logs} />} />
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
              />
            }
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>

      <ConnectionModal
        isOpen={isConnectionModalOpen}
        onClose={() => setIsConnectionModalOpen(false)}
        onRetry={async () => {
          const { source } = await loadData();
          setSyncStatus(source === 'cloud' ? 'connected' : 'offline');
          if (source === 'cloud') {
            showToast('Connected successfully!', 'success');
            setIsConnectionModalOpen(false);
          } else {
            showToast('Still offline. Check settings.', 'error');
          }
        }}
      />

      <MobileNav handleNavClick={handleNavClick} />
    </div>
  );
};

// Connection Settings Modal Component
const ConnectionModal = ({ isOpen, onClose, onRetry }: { isOpen: boolean, onClose: () => void, onRetry: () => Promise<void> }) => {
  const [apiUrl, setApiUrl] = useState(getCurrentApiUrl());
  const [isTesting, setIsTesting] = useState(false);

  // Refresh API url when modal opens
  useEffect(() => {
    if (isOpen) setApiUrl(getCurrentApiUrl());
  }, [isOpen]);

  const handleSave = () => {
    setCustomApiUrl(apiUrl);
    handleRetry();
  };

  const handleReset = () => {
    resetApiUrl();
    setApiUrl(getCurrentApiUrl()); // Gets default
  };

  const handleRetry = async () => {
    setIsTesting(true);
    await onRetry();
    setIsTesting(false);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Connection Settings">
      <div className="space-y-6">
        <div className="bg-slate-800 p-4 rounded-lg">
          <p className="text-sm text-slate-300 mb-2">
            If you see "Offline Mode", the app cannot talk to your local server.
          </p>
          <ul className="text-xs text-slate-400 list-disc list-inside space-y-1">
            <li>Ensure <code>node server.js</code> is running in your terminal.</li>
            <li>Ensure your device (phone/laptop) is on the same WiFi.</li>
            <li>Check if your firewall allows port 3001.</li>
            <li>Verify the IP address below matches your computer's local IP.</li>
          </ul>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Backend API URL</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white font-mono text-sm"
              placeholder="http://192.168.1.X:3001/api/sync"
            />
          </div>
          <div className="flex justify-between mt-2">
            <button onClick={handleReset} className="text-xs text-blue-400 hover:underline">Reset to Auto-detect</button>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
          <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
          <button
            onClick={handleSave}
            disabled={isTesting}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2"
          >
            {isTesting ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Save & Retry
          </button>
        </div>
      </div>
    </Modal>
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
  setHasUnsavedChanges
}: {
  state: AppState,
  onSaveLog: (d: string, l: DailyLog) => void,
  setHasUnsavedChanges: (val: boolean) => void
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
    />
  );
};

const App = () => {
  const [isVerified, setIsVerified] = useState(false);

  if (!isVerified) {
    return <PinLock onSuccess={() => setIsVerified(true)} />;
  }

  return (
    <HashRouter>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </HashRouter>
  );
};

export default App;