import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none w-full max-w-sm px-4">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 w-full p-4 rounded-2xl shadow-2xl backdrop-blur-xl border transition-all animate-slideDown ${toast.type === 'success' ? 'bg-white/90 dark:bg-slate-900/90 border-green-200 dark:border-green-900 text-green-700 dark:text-green-400' :
                toast.type === 'error' ? 'bg-white/90 dark:bg-slate-900/90 border-red-200 dark:border-red-900 text-red-700 dark:text-red-400' :
                  'bg-white/90 dark:bg-slate-900/90 border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-400'
              }`}
          >
            {toast.type === 'success' && <CheckCircle size={22} className="flex-shrink-0" />}
            {toast.type === 'error' && <AlertCircle size={22} className="flex-shrink-0" />}
            {toast.type === 'info' && <Info size={22} className="flex-shrink-0" />}
            <p className="flex-1 font-semibold text-sm text-slate-900 dark:text-white leading-tight">{toast.message}</p>
            <button onClick={() => removeToast(toast.id)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition p-1">
              <X size={18} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};