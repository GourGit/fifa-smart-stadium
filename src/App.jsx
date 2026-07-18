/**
 * @module App
 * @description Root application component for FIFA 2026 Smart Stadium Hub.
 * Implements code splitting via React.lazy, error boundaries,
 * session management, and secure authentication.
 */
import { useState, useEffect, useRef, useCallback, lazy, Suspense, memo } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import { hasApiKey } from './services/gemini';
import {
  hashPassword, getHashedCredentials,
  isLoginLocked, recordFailedLogin, resetLoginAttempts,
  getLockoutRemaining, getLoginAttemptsLeft,
  SessionManager, securityLog,
} from './services/security';
import './index.css';

// ─── Code Splitting — lazy-load heavy components ───────────────────────────
const ChatConcierge      = lazy(() => import('./components/ChatConcierge'));
const NavigationAssistant = lazy(() => import('./components/NavigationAssistant'));
const StaffDashboard     = lazy(() => import('./components/StaffDashboard'));
const StaffChat          = lazy(() => import('./components/StaffChat'));

// ─── Constants ─────────────────────────────────────────────────────────────
/** @constant {Object} STAFF_CREDENTIALS - Demo credentials (hashed at runtime) */
const STAFF_EMAILS = ['admin@fifa2026.com', 'staff@fifa2026.com', 'manager@fifa2026.com'];

/** @constant {number} LOGIN_DELAY_MS - Simulated auth network delay */
const LOGIN_DELAY_MS = 800;

/** @constant {number} SESSION_WARNING_DURATION_MS - How long the session timeout toast shows */
const SESSION_WARNING_DURATION_MS = 8000;

/** @constant {Array<Object>} FEATURES - Feature cards shown on home page */
const FEATURES = Object.freeze([
  { icon: '🤖', title: 'AI Concierge', desc: 'Ask anything in 40+ languages' },
  { icon: '🗺️', title: 'Smart Navigation', desc: 'Step-by-step accessible routes' },
  { icon: '🌤️', title: 'Live Weather', desc: 'Real-time stadium conditions' },
  { icon: '⚽', title: 'Match Scores', desc: 'Live updates from ESPN' },
  { icon: '♿', title: 'Accessibility', desc: 'Wheelchair-friendly pathfinding' },
  { icon: '📊', title: 'Ops Intelligence', desc: 'AI-driven crowd analytics' },
]);

// ─── Loading Fallback ──────────────────────────────────────────────────────
/** @component LoadingFallback - Shown while lazy components load */
const LoadingFallback = memo(function LoadingFallback() {
  return (
    <div className="loading-fallback" role="status" aria-label="Loading">
      <div className="loading-spinner" />
      <span>Loading…</span>
    </div>
  );
});

// ─── Staff Login Modal ─────────────────────────────────────────────────────
/**
 * @component StaffLoginModal
 * @description Secure login modal with SHA-256 hashing and brute-force protection.
 * @param {Object} props
 * @param {Function} props.onSuccess - Called with email on successful login
 * @param {Function} props.onCancel - Called when user cancels
 */
function StaffLoginModal({ onSuccess, onCancel }) {
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [locked, setLocked]       = useState(isLoginLocked());
  const [lockTimer, setLockTimer] = useState(getLockoutRemaining());
  const timerRef = useRef(null);

  useEffect(() => {
    if (!locked) return;
    timerRef.current = setInterval(() => {
      const remaining = getLockoutRemaining();
      setLockTimer(remaining);
      if (remaining <= 0) {
        setLocked(false);
        setError('');
        clearInterval(timerRef.current);
      }
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [locked]);

  const handleLogin = useCallback(async (e) => {
    e.preventDefault();
    if (isLoginLocked()) {
      setLocked(true);
      setLockTimer(getLockoutRemaining());
      return;
    }

    setError('');
    setLoading(true);

    try {
      const creds = await getHashedCredentials();
      const inputHash = await hashPassword(password);
      const normalizedEmail = email.trim().toLowerCase();
      const expectedHash = creds[normalizedEmail];

      await new Promise((r) => setTimeout(r, LOGIN_DELAY_MS));

      if (expectedHash && expectedHash === inputHash) {
        resetLoginAttempts();
        securityLog('LOGIN_SUCCESS', { email: normalizedEmail });
        onSuccess(normalizedEmail);
      } else {
        recordFailedLogin();
        const attemptsLeft = getLoginAttemptsLeft();
        securityLog('LOGIN_FAILED', { email: normalizedEmail, attemptsLeft });

        if (isLoginLocked()) {
          setLocked(true);
          setLockTimer(getLockoutRemaining());
          setError('Too many failed attempts. Account locked.');
        } else {
          setError(`Invalid credentials. ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining.`);
        }
      }
    } catch {
      setError('Authentication error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [email, password, onSuccess]);

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-card">
        <div className="modal-lock-icon" aria-hidden="true">🔐</div>
        <h2 id="modal-title" className="modal-title gradient-text-cool">Staff Access</h2>
        <p className="modal-subtitle">Restricted to authorised venue staff.<br />Sign in with your credentials.</p>

        <form onSubmit={handleLogin} noValidate>
          <div className="modal-field">
            <label className="modal-label" htmlFor="staff-email">Staff Email</label>
            <input id="staff-email" type="email" className="modal-input" placeholder="you@fifa2026.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={locked} autoFocus autoComplete="username" />
          </div>
          <div className="modal-field">
            <label className="modal-label" htmlFor="staff-password">Password</label>
            <input id="staff-password" type="password" className="modal-input" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} disabled={locked} autoComplete="current-password" />
          </div>

          {error && <div className="modal-error" role="alert">❌ {error}</div>}
          {locked && (
            <div className="modal-error" role="alert" style={{ background: 'rgba(255,171,0,0.1)', borderColor: 'rgba(255,171,0,0.25)', color: '#ffcc44' }}>
              🔒 Locked for {lockTimer}s — too many failed attempts
            </div>
          )}

          <button id="staff-login-btn" type="submit" className="modal-btn" disabled={loading || !email || !password || locked}>
            {locked ? `🔒 Locked (${lockTimer}s)` : loading ? '⏳ Verifying…' : '🛡️ Sign In'}
          </button>
        </form>

        <button id="staff-login-cancel" className="modal-cancel" onClick={onCancel}>Cancel — Back Home</button>

        <div className="modal-hint">
          <strong style={{ color: 'rgba(255,255,255,0.6)' }}>Demo credentials:</strong><br />
          📧 <code>admin@fifa2026.com</code> &nbsp;🔑 <code>FIFA@2026</code>
        </div>
        <div className="modal-security-info">
          🔒 SHA-256 hashed · {getLoginAttemptsLeft()}/{5} attempts · 2 min lockout · 15 min session timeout
        </div>
      </div>
    </div>
  );
}

// ─── Memoized Home Feature Card ────────────────────────────────────────────
/** @component FeatureCard - Single feature card, memoized to prevent re-renders */
const FeatureCard = memo(function FeatureCard({ icon, title, desc }) {
  return (
    <div className="home-feature-card glass">
      <div className="home-feature-icon">{icon}</div>
      <div className="home-feature-title">{title}</div>
      <div className="home-feature-desc">{desc}</div>
    </div>
  );
});

// ─── Main App ──────────────────────────────────────────────────────────────
/**
 * @component App
 * @description Root component managing routing (home/fan/staff modes),
 * authentication state, session management, and API key configuration.
 */
export default function App() {
  const [mode, setMode]                       = useState('home');
  const [showLoginModal, setShowLoginModal]   = useState(false);
  const [staffUser, setStaffUser]             = useState(null);
  const [overrideKey, setOverrideKey]         = useState('');
  const [keyInput, setKeyInput]               = useState('');
  const [showKeyForm, setShowKeyForm]         = useState(false);
  const [sessionWarning, setSessionWarning]   = useState(false);
  const sessionRef = useRef(null);

  const apiKeyConfigured = hasApiKey(overrideKey);

  // Session timeout handler
  const handleSessionTimeout = useCallback(() => {
    securityLog('SESSION_TIMEOUT', { user: staffUser });
    setStaffUser(null);
    setMode('home');
    setSessionWarning(true);
    setTimeout(() => setSessionWarning(false), SESSION_WARNING_DURATION_MS);
  }, [staffUser]);

  // Start/stop session manager when staff logs in/out
  useEffect(() => {
    if (!staffUser) return;
    sessionRef.current = new SessionManager(handleSessionTimeout);
    sessionRef.current.start();
    return () => sessionRef.current?.stop();
  }, [staffUser, handleSessionTimeout]);

  const handleStaffClick = useCallback(() => {
    if (staffUser) setMode('staff');
    else setShowLoginModal(true);
  }, [staffUser]);

  const handleLoginSuccess = useCallback((email) => {
    setStaffUser(email);
    setShowLoginModal(false);
    setMode('staff');
  }, []);

  const handleLoginCancel = useCallback(() => setShowLoginModal(false), []);

  const handleLogout = useCallback(() => {
    securityLog('LOGOUT', { user: staffUser });
    sessionRef.current?.stop();
    setStaffUser(null);
    setMode('home');
  }, [staffUser]);

  const handleSaveKey = useCallback(() => {
    const trimmed = keyInput.trim();
    if (trimmed) {
      setOverrideKey(trimmed);
      setShowKeyForm(false);
      setKeyInput('');
    }
  }, [keyInput]);

  const navigateHome = useCallback(() => setMode('home'), []);
  const navigateFan  = useCallback(() => setMode('fan'), []);

  return (
    <>
      {showLoginModal && <StaffLoginModal onSuccess={handleLoginSuccess} onCancel={handleLoginCancel} />}

      {/* Session timeout toast */}
      {sessionWarning && (
        <div className="session-timeout-toast" role="alert">
          ⏱️ Staff session expired due to inactivity. Please sign in again.
        </div>
      )}

      {/* Header */}
      <header className="header" role="banner">
        <div className="header-logo" onClick={navigateHome} style={{ cursor: 'pointer' }} role="button" tabIndex={0} aria-label="Go to home page" onKeyDown={(e) => e.key === 'Enter' && navigateHome()}>
          <div className="header-logo-icon" aria-hidden="true">⚽</div>
          <div className="header-logo-text">
            <span className="header-logo-title gradient-text">FIFA 2026</span>
            <span className="header-logo-sub">Smart Stadium Hub</span>
          </div>
        </div>

        <nav className="mode-toggle" role="navigation" aria-label="Mode selector">
          <button id="mode-home-btn" className={`mode-btn${mode === 'home' ? ' active-fan' : ''}`} onClick={navigateHome}>
            🏠 <span>Home</span>
          </button>
          <button id="mode-fan-btn" className={`mode-btn${mode === 'fan' ? ' active-fan' : ''}`} onClick={navigateFan}>
            🎉 <span>Fan Mode</span>
          </button>
          <button id="mode-staff-btn" className={`mode-btn${mode === 'staff' ? ' active-staff' : ''}`} onClick={handleStaffClick}>
            {staffUser ? '🛡️' : '🔒'} <span>Staff Mode</span>
          </button>
        </nav>

        <div className="header-actions">
          {staffUser && mode === 'staff' && (
            <div className="staff-chip">
              <span>👤 {staffUser.split('@')[0]}</span>
              <button id="staff-logout-btn" className="staff-chip-logout" onClick={handleLogout} title="Logout" aria-label="Log out">✕ Logout</button>
            </div>
          )}
          <div className="header-live" aria-live="polite">
            <div className="header-live-dot" aria-hidden="true" />
            LIVE
          </div>
        </div>
      </header>

      <main className="main-content" role="main">
        {/* API Key warning — only in functional modes */}
        {!apiKeyConfigured && mode !== 'home' && (
          <div className="api-key-banner" role="alert">
            <span className="api-key-banner-icon">🔑</span>
            <div className="api-key-banner-text">
              <strong>No API Key.</strong> Add <code className="code-inline">VITE_OPENROUTER_API_KEY=your_key</code> to <code className="code-inline">.env</code> and restart.
            </div>
            {!showKeyForm ? (
              <button id="api-key-show-btn" className="api-key-save-btn" onClick={() => setShowKeyForm(true)} style={{ marginTop: 8 }}>Or paste key temporarily</button>
            ) : (
              <div className="api-key-input-row">
                <input id="api-key-input" type="password" className="api-key-input" placeholder="Paste OpenRouter API key…" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSaveKey()} autoFocus aria-label="API key input" />
                <button id="api-key-save-btn" className="api-key-save-btn" onClick={handleSaveKey}>Activate ✓</button>
              </div>
            )}
          </div>
        )}

        {/* ── HOME ── */}
        {mode === 'home' && (
          <div className="home-container">
            <div className="home-hero">
              <div className="home-hero-ball">⚽</div>
              <h1 className="home-hero-title">
                Your <span className="gradient-text">FIFA</span> Stadium Companion
              </h1>
              <p className="home-hero-subtitle">
                AI-powered navigation, multilingual assistance, live match scores, real-time weather, and operational intelligence — everything you need for the FIFA World Cup 2026.
              </p>
            </div>
            <div className="home-modes">
              <button className="home-mode-card home-mode-fan" onClick={navigateFan}>
                <div className="home-mode-icon">🎉</div>
                <div className="home-mode-title">Fan Mode</div>
                <div className="home-mode-desc">AI concierge, stadium navigation, live scores, accessibility routes, and multilingual chat</div>
                <div className="home-mode-cta">Enter Fan Mode →</div>
              </button>
              <button className="home-mode-card home-mode-staff" onClick={handleStaffClick}>
                <div className="home-mode-icon">{staffUser ? '🛡️' : '🔒'}</div>
                <div className="home-mode-title">Staff Mode</div>
                <div className="home-mode-desc">Operations dashboard, crowd analytics, incident management, AI insights, and live weather data</div>
                <div className="home-mode-cta">{staffUser ? 'Enter Staff Mode →' : 'Sign In Required →'}</div>
              </button>
            </div>
            <div className="home-features">
              {FEATURES.map((f) => (
                <FeatureCard key={f.title} icon={f.icon} title={f.title} desc={f.desc} />
              ))}
            </div>
            <div className="home-powered">
              Powered by Google Gemini AI · Real-time data from ESPN &amp; Open-Meteo · 16 host stadiums across USA, Canada &amp; Mexico
            </div>
          </div>
        )}

        {/* ── FAN MODE — lazy loaded with error boundary ── */}
        {mode === 'fan' && (
          <ErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
              <div className="fan-layout" role="region" aria-label="Fan assistance tools">
                <ChatConcierge apiKeyOverride={overrideKey} />
                <NavigationAssistant apiKeyOverride={overrideKey} />
              </div>
            </Suspense>
          </ErrorBoundary>
        )}

        {/* ── STAFF MODE — lazy loaded with error boundary ── */}
        {mode === 'staff' && staffUser && (
          <ErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
              <div role="region" aria-label="Staff operations dashboard">
                <StaffDashboard apiKeyOverride={overrideKey} />
                <div style={{ marginTop: 'var(--space-xl)' }}>
                  <StaffChat apiKeyOverride={overrideKey} />
                </div>
              </div>
            </Suspense>
          </ErrorBoundary>
        )}
      </main>

      <footer className="footer" role="contentinfo">
        <p>⚽ FIFA World Cup 2026 Smart Stadium Hub · Built for fans, volunteers &amp; staff</p>
      </footer>
    </>
  );
}
