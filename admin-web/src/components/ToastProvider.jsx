import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

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

  const removeToast = useCallback((id) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 240);
  }, []);

  const addToast = useCallback((message, type = 'success', duration = 4500) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => {
      if (prev.some((t) => t.message === message && !t.exiting)) {
        return prev;
      }
      return [...prev, { id, message, type, exiting: false }];
    });

    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  const contextValue = useMemo(() => ({ addToast, removeToast }), [addToast, removeToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {/* Toast scoped styles: fully adaptive for Dark and Light mode */}
      <style>{`
        @keyframes cvToastSlide {
          from {
            transform: translateX(110%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .cv-toast-container {
          position: fixed;
          top: 20px;
          right: 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          z-index: 99999;
          pointer-events: none;
          max-width: calc(100vw - 40px);
        }

        /* Dark mode card (default) */
        .cv-toast-card {
          pointer-events: auto;
          width: 360px;
          max-width: 100%;
          border-radius: 14px;
          padding: 12px 14px;
          font-family: var(--font, inherit);
          transition: transform 0.24s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.24s ease;
          animation: cvToastSlide 0.28s cubic-bezier(0.16, 1, 0.3, 1);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          background: rgba(13, 27, 46, 0.96);
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 14px 34px -4px rgba(0, 0, 0, 0.55), 0 4px 12px rgba(0, 0, 0, 0.3);
          color: #F8FAFC;
        }

        /* Light mode card */
        [data-theme="light"] .cv-toast-card {
          background: rgba(255, 255, 255, 0.98);
          border: 1px solid rgba(15, 23, 42, 0.14);
          box-shadow: 0 14px 32px -4px rgba(15, 23, 42, 0.14), 0 4px 12px rgba(15, 23, 42, 0.08);
          color: #0F172A;
        }

        .cv-toast-card.exiting {
          opacity: 0 !important;
          transform: translateX(110%) scale(0.95) !important;
        }

        .cv-toast-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 7px;
        }

        .cv-toast-header-left {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .cv-toast-badge {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.6px;
          color: #F59E0B;
        }

        [data-theme="light"] .cv-toast-badge {
          color: #D97706;
        }

        .cv-toast-badge.error {
          color: #EF4444;
        }

        [data-theme="light"] .cv-toast-badge.error {
          color: #DC2626;
        }

        .cv-toast-dot {
          font-size: 10px;
          color: #64748B;
          line-height: 1;
        }

        .cv-toast-time {
          font-size: 10.5px;
          color: #94A3B8;
          font-weight: 500;
        }

        [data-theme="light"] .cv-toast-time {
          color: #64748B;
        }

        .cv-toast-close {
          background: none;
          border: none;
          color: #94A3B8;
          cursor: pointer;
          padding: 2px 5px;
          font-size: 12px;
          line-height: 1;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.15s ease, background 0.15s ease;
        }

        [data-theme="light"] .cv-toast-close {
          color: #64748B;
        }

        .cv-toast-close:hover {
          color: #F8FAFC;
          background: rgba(255, 255, 255, 0.1);
        }

        [data-theme="light"] .cv-toast-close:hover {
          color: #0F172A;
          background: rgba(0, 0, 0, 0.06);
        }

        .cv-toast-body {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .cv-toast-icon {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .cv-toast-icon.success {
          background: rgba(16, 185, 129, 0.18);
          color: #10B981;
        }

        [data-theme="light"] .cv-toast-icon.success {
          background: rgba(16, 185, 129, 0.14);
          color: #059669;
        }

        .cv-toast-icon.error {
          background: rgba(239, 68, 68, 0.18);
          color: #EF4444;
        }

        [data-theme="light"] .cv-toast-icon.error {
          background: rgba(239, 68, 68, 0.14);
          color: #DC2626;
        }

        .cv-toast-icon.info {
          background: rgba(6, 182, 212, 0.18);
          color: #22D3EE;
        }

        [data-theme="light"] .cv-toast-icon.info {
          background: rgba(6, 182, 212, 0.14);
          color: #0891B2;
        }

        .cv-toast-message {
          font-size: 13px;
          line-height: 18px;
          font-weight: 500;
          word-break: break-word;
          color: #F8FAFC;
        }

        [data-theme="light"] .cv-toast-message {
          color: #0F172A !important;
        }
      `}</style>
      <div className="cv-toast-container" aria-live="polite">
        {toasts.map((toast) => (
          <ToastCard
            key={toast.id}
            toast={toast}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onClose }) {
  const { type, message, exiting } = toast;
  const isError = type === 'error';
  const isInfo = type === 'info';
  const variant = isError ? 'error' : isInfo ? 'info' : 'success';

  return (
    <div
      className={`cv-toast-card ${exiting ? 'exiting' : ''}`}
      style={isError ? { borderColor: 'rgba(239, 68, 68, 0.35)' } : {}}
      role="status"
    >
      {/* Top Header Bar */}
      <div className="cv-toast-header">
        <div className="cv-toast-header-left">
          <span className={`cv-toast-badge ${isError ? 'error' : ''}`}>
            CITIVOICE
          </span>
          <span className="cv-toast-dot">•</span>
          <span className="cv-toast-time">Just now</span>
        </div>
        <button
          onClick={onClose}
          className="cv-toast-close"
          title="Dismiss"
          aria-label="Dismiss notification"
        >
          ✕
        </button>
      </div>

      {/* Main Body */}
      <div className="cv-toast-body">
        <div className={`cv-toast-icon ${variant}`}>
          {isError ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          ) : isInfo ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          )}
        </div>

        <div className="cv-toast-message">
          {message}
        </div>
      </div>
    </div>
  );
}
