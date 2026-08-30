import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToastState] = useState(null);

  const hideToast = useCallback(() => {
    setToastState(null);
  }, []);

  const setToast = useCallback((payload) => {
    if (!payload) {
      setToastState(null);
      return;
    }

    if (typeof payload === 'string') {
      setToastState({
        message: payload,
        type: 'success',
        duration: 3500
      });
    } else {
      setToastState({
        type: 'success',
        duration: 4000,
        ...payload
      });
    }
  }, []);

  useEffect(() => {
    if (toast) {
      const duration = toast.duration || 3500;
      const timer = setTimeout(() => {
        setToastState(null);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  return (
    <ToastContext.Provider value={{ toast, setToast, hideToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}

