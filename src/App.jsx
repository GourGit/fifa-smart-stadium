import { useState } from 'react';
import ChatConcierge from './components/ChatConcierge';
import NavigationAssistant from './components/NavigationAssistant';
import StaffDashboard from './components/StaffDashboard';
import StaffChat from './components/StaffChat';
import { hasApiKey } from './services/gemini';
import './index.css';

// ─── Staff Credentials ────────────────────────────────────────────────────
const STAFF_CREDENTIALS = {
  'admin@fifa2026.com': 'FIFA@2026',
  'staff@fifa2026.com': 'Stadium#123',
  'manager@fifa2026.com': 'Ops@2026!',
};

// ─── Staff Login Modal ─────────────────────────────────────────────────────
function StaffLoginModal({ onSuccess, onCancel }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setTimeout(() => {
      const expected = STAFF_CREDENTIALS[email.trim().toLowerCase()];
      if (expected && expected === password) {
        onSuccess(email.trim().toLowerCase());
      } else {
        setError('Invalid credentials. Please check your email and password.');
      }
      setLoading(false);
    }, 800);
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-card">
        <div className="modal-lock-icon" aria-hidden="true">🔐</div>
        <h2 id="modal-title" className="modal-title gradient-text-cool">Staff Access</h2>
        <p className="modal-subtitle">
          Restricted to authorised venue staff.<br />Sign in with your credentials.
        </p>
        <form onSubmit={handleLogin} noValidate>
          <div className="modal-field">
            <label className="modal-label" htmlFor="staff-email">Staff Email</label>
            <input id="staff-email" type="email" className="modal-input" placeholder="you@fifa2026.com" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin(e)} autoFocus autoComplete="username" />
          </div>
          <div className="modal-field">
            <label className="modal-label" htmlFor="staff-password">Password</label>
            <input id="staff-password" type="password" className="modal-input" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>
          {error && <div className="modal-error" role="alert">❌ {error}</div>}
          <button id="staff-login-btn" type="submit" className="modal-btn" disabled={loading || !email || !password}>
            {loading ? '⏳ Verifying…' : '🛡️ Sign In'}
          </button>
        </form>
        <button id="staff-login-cancel" className="modal-cancel" onClick={onCancel}>Cancel — Back Home</button>
        <div className="modal-hint">
          <strong style={{ color: 'rgba(255,255,255,0.6)' }}>Demo credentials:</strong><br />
          📧 <code>admin@fifa2026.com</code> &nbsp;🔑 <code>FIFA@2026</code>
        </div>
      </div>
    </div>
  );
}

// ─── Feature Card ──────────────────────────────────────────────────────────
const FEATURES = [
  { icon: '🤖', title: 'AI Concierge', desc: 'Ask anything in 40+ languages' },
  { icon: '🗺️', title: 'Smart Navigation', desc: 'Step-by-step accessible routes' },
  { icon: '🌤️', title: 'Live Weather', desc: 'Real-time stadium conditions' },
  { icon: '⚽', title: 'Match Scores', desc: 'Live updates from ESPN' },
  { icon: '♿', title: 'Accessibility', desc: 'Wheelchair-friendly pathfinding' },
  { icon: '📊', title: 'Ops Intelligence', desc: 'AI-driven crowd analytics' },
];

// ─── Main App ──────────────────────────────────────────────────────────────
export default function App() {
  const [mode, setMode]                       = useState('home'); // 'home' | 'fan' | 'staff'
  const [showLoginModal, setShowLoginModal]   = useState(false);
  const [staffUser, setStaffUser]             = useState(null);
  const [overrideKey, setOverrideKey]         = useState('');
  const [keyInput, setKeyInput]               = useState('');
  const [showKeyForm, setShowKeyForm]         = useState(false);

  const apiKeyConfigured = hasApiKey(overrideKey);

  const handleStaffClick = () => {
    if (staffUser) { setMode('staff'); } else { setShowLoginModal(true); }
  };
  const handleLoginSuccess = (email) => { setStaffUser(email); setShowLoginModal(false); setMode('staff'); };
  const handleLoginCancel = () => setShowLoginModal(false);
  const handleLogout = () => { setStaffUser(null); setMode('home'); };
  const handleSaveKey = () => { const t = keyInput.trim(); if (t) { setOverrideKey(t); setShowKeyForm(false); setKeyInput(''); } };

  return (
    <>
      {showLoginModal && <StaffLoginModal onSuccess={handleLoginSuccess} onCancel={handleLoginCancel} />}

      {/* Header */}
      <header className="header" role="banner">
        <div className="header-logo" onClick={() => setMode('home')} style={{ cursor: 'pointer' }}>
          <div className="header-logo-icon" aria-hidden="true">⚽</div>
          <div className="header-logo-text">
            <span className="header-logo-title gradient-text">FIFA 2026</span>
            <span className="header-logo-sub">Smart Stadium Hub</span>
          </div>
        </div>

        <nav className="mode-toggle" role="navigation" aria-label="Mode selector">
          <button id="mode-home-btn" className={`mode-btn${mode === 'home' ? ' active-fan' : ''}`} onClick={() => setMode('home')}>
            🏠 <span>Home</span>
          </button>
          <button id="mode-fan-btn" className={`mode-btn${mode === 'fan' ? ' active-fan' : ''}`} onClick={() => setMode('fan')}>
            🎉 <span>Fan Mode</span>
          </button>
          <button id="mode-staff-btn" className={`mode-btn${mode === 'staff' ? ' active-staff' : ''}`} onClick={handleStaffClick}>
            {staffUser ? '🛡️' : '🔒'} <span>Staff Mode</span>
          </button>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {staffUser && mode === 'staff' && (
            <div className="staff-chip">
              <span>👤 {staffUser.split('@')[0]}</span>
              <button id="staff-logout-btn" className="staff-chip-logout" onClick={handleLogout} title="Logout">✕ Logout</button>
            </div>
          )}
          <div className="header-live">
            <div className="header-live-dot" aria-hidden="true" />
            LIVE
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content" role="main">

        {/* API Key warning */}
        {!apiKeyConfigured && mode !== 'home' && (
          <div className="api-key-banner" role="alert">
            <span className="api-key-banner-icon">🔑</span>
            <div className="api-key-banner-text">
              <strong>No API Key.</strong> Add <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 4 }}>VITE_OPENROUTER_API_KEY=your_key</code> to <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 4 }}>.env</code> and restart.
            </div>
            {!showKeyForm ? (
              <button id="api-key-show-btn" className="api-key-save-btn" onClick={() => setShowKeyForm(true)} style={{ marginTop: 8 }}>Or paste key temporarily</button>
            ) : (
              <div className="api-key-input-row">
                <input id="api-key-input" type="password" className="api-key-input" placeholder="Paste OpenRouter API key…" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSaveKey()} autoFocus />
                <button id="api-key-save-btn" className="api-key-save-btn" onClick={handleSaveKey}>Activate ✓</button>
              </div>
            )}
          </div>
        )}

        {/* ── HOME ── */}
        {mode === 'home' && (
          <div className="home-container">
            {/* Hero heading */}
            <div className="home-hero">
              <div className="home-hero-ball">⚽</div>
              <h1 className="home-hero-title">
                Your <span className="gradient-text">FIFA</span> Stadium Companion
              </h1>
              <p className="home-hero-subtitle">
                AI-powered navigation, multilingual assistance, live match scores, real-time weather, and operational intelligence — everything you need for the FIFA World Cup 2026.
              </p>
            </div>

            {/* Mode Buttons */}
            <div className="home-modes">
              <button className="home-mode-card home-mode-fan" onClick={() => setMode('fan')}>
                <div className="home-mode-icon">🎉</div>
                <div className="home-mode-title">Fan Mode</div>
                <div className="home-mode-desc">
                  AI concierge, stadium navigation, live scores, accessibility routes, and multilingual chat
                </div>
                <div className="home-mode-cta">Enter Fan Mode →</div>
              </button>

              <button className="home-mode-card home-mode-staff" onClick={handleStaffClick}>
                <div className="home-mode-icon">{staffUser ? '🛡️' : '🔒'}</div>
                <div className="home-mode-title">Staff Mode</div>
                <div className="home-mode-desc">
                  Operations dashboard, crowd analytics, incident management, AI insights, and live weather data
                </div>
                <div className="home-mode-cta">{staffUser ? 'Enter Staff Mode →' : 'Sign In Required →'}</div>
              </button>
            </div>

            {/* Feature Grid */}
            <div className="home-features">
              {FEATURES.map((f) => (
                <div key={f.title} className="home-feature-card glass">
                  <div className="home-feature-icon">{f.icon}</div>
                  <div className="home-feature-title">{f.title}</div>
                  <div className="home-feature-desc">{f.desc}</div>
                </div>
              ))}
            </div>

            {/* Powered by strip */}
            <div className="home-powered">
              Powered by Google Gemini AI · Real-time data from ESPN &amp; Open-Meteo · 16 host stadiums across USA, Canada &amp; Mexico
            </div>
          </div>
        )}

        {/* ── FAN MODE ── */}
        {mode === 'fan' && (
          <div className="fan-layout" role="region" aria-label="Fan assistance tools">
            <ChatConcierge apiKeyOverride={overrideKey} />
            <NavigationAssistant apiKeyOverride={overrideKey} />
          </div>
        )}

        {/* ── STAFF MODE ── */}
        {mode === 'staff' && staffUser && (
          <div role="region" aria-label="Staff operations dashboard">
            <StaffDashboard apiKeyOverride={overrideKey} />
            {/* Staff AI Chat */}
            <div style={{ marginTop: 'var(--space-xl)' }}>
              <StaffChat apiKeyOverride={overrideKey} />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="footer" role="contentinfo">
        <p>⚽ FIFA World Cup 2026 Smart Stadium Hub · Built for fans, volunteers &amp; staff</p>
      </footer>
    </>
  );
}
