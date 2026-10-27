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
      // Prevent duplicate identical toasts from appearing concurrently
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
      {/* Keyframe animation injection for smooth slide-in */}
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
      `}</style>
      <div style={containerStyle} aria-live="polite">
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

  const accentColor = isError ? 'var(--red, #EF4444)' : isInfo ? 'var(--cyan, #06B6D4)' : 'var(--green, #10B981)';
  const iconBg = isError
    ? 'rgba(239, 68, 68, 0.16)'
    : isInfo
    ? 'rgba(6, 182, 212, 0.16)'
    : 'rgba(16, 185, 129, 0.16)';

  return (
    <div
      style={{
        ...cardStyle,
        opacity: exiting ? 0 : 1,
        transform: exiting ? 'translateX(110%) scale(0.95)' : 'translateX(0) scale(1)',
        borderColor: isError ? 'rgba(239, 68, 68, 0.28)' : 'rgba(255, 255, 255, 0.09)',
      }}
      role="status"
    >
      {/* Top Header Bar */}
      <div style={headerStyle}>
        <div style={headerLeftStyle}>
          <span style={{ ...badgeStyle, color: isError ? 'var(--red, #EF4444)' : 'var(--amber, #F59E0B)' }}>
            CITIVOICE
          </span>
          <span style={dotStyle}>•</span>
          <span style={timeStyle}>Just now</span>
        </div>
        <button
          onClick={onClose}
          style={closeBtnStyle}
          title="Dismiss"
          aria-label="Dismiss notification"
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-1, #F1F5F9)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-3, #64748B)')}
        >
          ✕
        </button>
      </div>

      {/* Main Body */}
      <div style={bodyStyle}>
        {/* Minimal Icon Badge */}
        <div style={{ ...iconBadgeStyle, background: iconBg, color: accentColor }}>
          {isError ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          ) : isInfo ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          )}
        </div>

        {/* Message Content */}
        <div style={messageStyle}>
          {message}
        </div>
      </div>
    </div>
  );
}

const containerStyle = {
  position: 'fixed',
  top: 20,
  right: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  zIndex: 99999,
  pointerEvents: 'none',
  maxWidth: 'calc(100vw - 40px)',
};

const cardStyle = {
  pointerEvents: 'auto',
  width: 360,
  maxWidth: '100%',
  background: 'rgba(13, 27, 46, 0.95)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255, 255, 255, 0.09)',
  borderRadius: '14px',
  boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.5), 0 4px 12px rgba(0, 0, 0, 0.3)',
  padding: '11px 14px',
  color: 'var(--text-1, #F1F5F9)',
  fontFamily: 'var(--font, inherit)',
  transition: 'transform 0.24s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.24s ease',
  animation: 'cvToastSlide 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 7,
};

const headerLeftStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

const badgeStyle = {
  fontSize: '10px',
  fontWeight: 800,
  letterSpacing: '0.6px',
};

const dotStyle = {
  fontSize: '10px',
  color: 'var(--text-3, #64748B)',
  lineHeight: 1,
};

const timeStyle = {
  fontSize: '10.5px',
  color: 'var(--text-3, #64748B)',
  fontWeight: 500,
};

const closeBtnStyle = {
  background: 'none',
  border: 'none',
  color: 'var(--text-3, #64748B)',
  cursor: 'pointer',
  padding: '2px 4px',
  fontSize: '12px',
  lineHeight: 1,
  borderRadius: '4px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'color 0.15s ease',
};

const bodyStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 10,
};

const iconBadgeStyle = {
  width: 28,
  height: 28,
  borderRadius: 8,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  marginTop: 1,
};

const messageStyle = {
  fontSize: '12.5px',
  lineHeight: '17px',
  color: 'var(--text-1, #F1F5F9)',
  fontWeight: 500,
  wordBreak: 'break-word',
};
