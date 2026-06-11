import { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);

let _id = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(({ type = 'info', title, message, duration = 4000 }) => {
    const id = ++_id;
    setToasts((prev) => [...prev.slice(-4), { id, type, title, message }]); // max 5
    if (duration > 0) setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  const toast = {
    success: (title, message, opts) => addToast({ type: 'success', title, message, ...opts }),
    error:   (title, message, opts) => addToast({ type: 'error',   title, message, duration: 6000, ...opts }),
    info:    (title, message, opts) => addToast({ type: 'info',    title, message, ...opts }),
    warning: (title, message, opts) => addToast({ type: 'warning', title, message, ...opts }),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx.toast;
};

// ─── Toast Container (rendered at root) ─────────────────────
const ICONS = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };

const ToastContainer = ({ toasts, dismiss }) => (
  <div className="toast-container" aria-live="polite">
    {toasts.map((t) => (
      <div key={t.id} className={`toast toast-${t.type}`}>
        <span className="toast-icon">{ICONS[t.type]}</span>
        <div className="toast-body">
          {t.title && <div className="toast-title">{t.title}</div>}
          {t.message && <div className="toast-message">{t.message}</div>}
        </div>
        <button className="toast-close" onClick={() => dismiss(t.id)}>×</button>
        <div className="toast-progress" />
      </div>
    ))}
  </div>
);
