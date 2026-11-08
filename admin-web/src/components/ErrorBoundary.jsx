import React from 'react';
import { IoAlertCircleOutline, IoRefreshOutline, IoHomeOutline, IoChevronDownOutline, IoChevronUpOutline } from 'react-icons/io5';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[CitiVoice ErrorBoundary caught an unhandled error]:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoDashboard = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/dashboard';
  };

  toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, showDetails } = this.state;
      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.iconWrap}>
              <IoAlertCircleOutline size={44} color="#EF4444" />
            </div>

            <h2 style={styles.title}>Something went wrong</h2>
            <p style={styles.subtitle}>
              An unexpected application error occurred in this view. Your submitted data and municipal records are safe.
            </p>

            <div style={styles.actions}>
              <button onClick={this.handleReload} style={styles.primaryBtn}>
                <IoRefreshOutline size={18} style={{ marginRight: 6 }} />
                Reload Page
              </button>
              <button onClick={this.handleGoDashboard} style={styles.secondaryBtn}>
                <IoHomeOutline size={17} style={{ marginRight: 6 }} />
                Return to Dashboard
              </button>
            </div>

            {error && (
              <div style={styles.detailsBox}>
                <button onClick={this.toggleDetails} style={styles.detailsToggle}>
                  <span>Error Details</span>
                  {showDetails ? <IoChevronUpOutline size={16} /> : <IoChevronDownOutline size={16} />}
                </button>

                {showDetails && (
                  <div style={styles.errorStack}>
                    <div style={{ fontWeight: 600, color: '#EF4444', marginBottom: 6 }}>
                      {error.toString()}
                    </div>
                    {errorInfo?.componentStack && (
                      <pre style={styles.pre}>{errorInfo.componentStack}</pre>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '70vh',
    padding: 24,
    backgroundColor: 'var(--bg, #0B132B)',
    color: 'var(--text-1, #F8FAFC)',
    fontFamily: 'inherit',
  },
  card: {
    width: '100%',
    maxWidth: 540,
    backgroundColor: 'var(--surface, #111C38)',
    border: '1px solid var(--border-md, rgba(255, 255, 255, 0.12))',
    borderRadius: 16,
    padding: '36px 32px',
    textAlign: 'center',
    boxShadow: '0 20px 45px rgba(0, 0, 0, 0.4)',
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: '50%',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px auto',
  },
  title: {
    fontSize: 22,
    fontWeight: 800,
    margin: '0 0 10px 0',
    color: 'var(--text-1, #F8FAFC)',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 1.6,
    color: 'var(--text-2, #94A3B8)',
    margin: '0 0 24px 0',
  },
  actions: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  primaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 10,
    padding: '11px 20px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  secondaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--surface-2, rgba(255, 255, 255, 0.08))',
    color: 'var(--text-1, #F8FAFC)',
    border: '1px solid var(--border, rgba(255, 255, 255, 0.15))',
    borderRadius: 10,
    padding: '11px 20px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  detailsBox: {
    marginTop: 24,
    borderTop: '1px solid var(--border, rgba(255, 255, 255, 0.08))',
    paddingTop: 16,
    textAlign: 'left',
  },
  detailsToggle: {
    background: 'none',
    border: 'none',
    color: 'var(--text-3, #64748B)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '6px 0',
  },
  errorStack: {
    marginTop: 10,
    backgroundColor: 'var(--surface-3, rgba(0, 0, 0, 0.3))',
    borderRadius: 8,
    padding: 12,
    fontSize: 12,
    maxHeight: 180,
    overflowY: 'auto',
  },
  pre: {
    margin: 0,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    fontSize: 11,
    color: 'var(--text-2, #94A3B8)',
    fontFamily: 'monospace',
  },
};

