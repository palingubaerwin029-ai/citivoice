import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success', duration = 3000) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div style={toastContainerStyle}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              ...toastStyle,
              ...(toast.type === 'error' ? toastErrorStyle : {}),
            }}
            onClick={() => removeToast(toast.id)}
          >
            <span style={{ marginRight: 8 }}>
              {toast.type === 'error' ? '⚠' : '✓'}
            </span>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const toastContainerStyle = {
  position: 'fixed',
  top: 24,
  right: 24,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  zIndex: 9999,
};

const toastStyle = {
  background: 'var(--surface)',
  border: '1px solid rgba(16, 185, 129, 0.2)',
  borderLeft: '4px solid var(--green)',
  color: 'var(--text-1)',
  padding: '12px 16px',
  borderRadius: 'var(--r-md)',
  boxShadow: 'var(--shadow-lg)',
  fontSize: '13px',
  fontWeight: 500,
  cursor: 'pointer',
  animation: 'fadeUp 0.3s ease',
  display: 'flex',
  alignItems: 'center',
};

const toastErrorStyle = {
  border: '1px solid rgba(239, 68, 68, 0.2)',
  borderLeft: '4px solid var(--red)',
};
