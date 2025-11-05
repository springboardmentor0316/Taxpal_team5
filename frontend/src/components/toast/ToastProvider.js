import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import './toast.css';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  const showToast = useCallback(({ message, type = 'success', duration = 4000 }) => {
    setToast({ message, type, duration, key: Date.now() });
  }, []);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = setTimeout(() => {
      hideToast();
    }, toast.duration);

    return () => clearTimeout(timer);
  }, [toast, hideToast]);

  const contextValue = useMemo(
    () => ({ showToast, hideToast }),
    [showToast, hideToast]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {toast && (
        <div
          key={toast.key}
          className={`toast toast-${toast.type}`}
          role="status"
          aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
          onClick={hideToast}
        >
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
};
