import { useState, useEffect, useCallback } from 'react';
import { generateStaffInsights, parseGeminiError } from '../services/gemini';
import { fetchRealWeather, DATA_SOURCES, STADIUMS } from '../services/realData';
import LiveMatches from './LiveMatches';

// ─── Static (hardware-required) gate layout ────────────────────────────────
const GATE_DATA = [
  { id: 'A', pct: 42, color: '#00e676' },
  { id: 'B', pct: 87, color: '#e8002d' },
  { id: 'C', pct: 55, color: '#ffab00' },
  { id: 'D', pct: 33, color: '#00e676' },
  { id: 'E', pct: 61, color: '#ffab00' },
  { id: 'F', pct: 28, color: '#00e676' },
];

const INITIAL_INCIDENTS = [
  { id: 1, severity: 'critical', title: 'Gate B Congestion — Critical', location: 'Gate B', time: '14:23', desc: 'Fan density exceeding safe threshold. Deploy crowd control.' },
  { id: 2, severity: 'warning',  title: 'Medical Request — Section 215', location: 'Sec 215', time: '14:19', desc: 'Fan reported dizziness. First Aid dispatched.' },
  { id: 3, severity: 'info',     title: 'Concession Wait High — North', location: 'N. Concourse', time: '14:15', desc: 'Avg wait ~18 min. Consider mobile carts.' },
  { id: 4, severity: 'good',     title: 'Parking Lot A Cleared', location: 'Parking A', time: '14:08', desc: 'Ingress complete. Staff reassigned to inner gates.' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────
function MetricCard({ icon, label, value, unit, trend, trendLabel, severity, isReal = false, sensorNote }) {
  return (
    <div className={`metric-card glass severity-${severity}`} title={sensorNote}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="metric-card-icon">{icon}</div>
        <span style={{
          fontSize: '0.6rem', padding: '2px 6px', borderRadius: 999, fontWeight: 700,
          background: isReal ? 'rgba(0,230,118,0.15)' : 'rgba(123,47,255,0.15)',
          color: isReal ? '#00e676' : '#bf80ff',
          border: `1px solid ${isReal ? 'rgba(0,230,118,0.25)' : 'rgba(123,47,255,0.25)'}`,
          textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
        }}>
          {isReal ? '● Live' : '◌ Sensor Req.'}
        </span>
      </div>
      <div className="metric-card-label">{label}</div>
      <div className="metric-card-value" style={{
        color: severity === 'critical' ? '#ff6b8a' : severity === 'warning' ? '#ffcc44' : severity === 'good' ? '#00e676' : '#fff',
      }}>
        {value}<span style={{ fontSize: '0.9rem', fontWeight: 400, color: 'rgba(255,255,255,0.4)', marginLeft: 4 }}>{unit}</span>
      </div>
      <div className={`metric-card-trend trend-${trend}`}>
        {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendLabel}
      </div>
    </div>
  );
}

const dotClass = { critical: 'dot-critical', warning: 'dot-warning', info: 'dot-info', good: 'dot-good' };

// ─── Main Component ────────────────────────────────────────────────────────
export default function StaffDashboard({ apiKeyOverride }) {
  const [activeTab, setActiveTab]           = useState('overview');
  const [selectedStadium, setSelectedStadium] = useState(Object.keys(STADIUMS)[0]);
  const [insights, setInsights]             = useState('');
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError]   = useState('');
  const [incidents, setIncidents]           = useState(INITIAL_INCIDENTS);
  const [lastUpdated, setLastUpdated]       = useState(new Date());

  // ── Real weather state ──
  const [weather, setWeather]               = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError]     = useState('');

  // ── Hardware-pending metrics (still simulated) ──
  const [metrics, setMetrics] = useState({
    fanCount: 67842,
    capacity: STADIUMS[Object.keys(STADIUMS)[0]].capacity,
    occupancy: 82,
    gateB: 87, gateA: 42, gateC: 55,
    medicalIncidents: 3,
    securityAlerts: 1,
    concessionWait: 14,
    parkingAvail: 8,
    minsToHalftime: 18,
  });

  // ── Fetch real weather whenever stadium changes ──
  const loadWeather = useCallback(async () => {
    setWeatherLoading(true);
    setWeatherError('');
    try {
      const w = await fetchRealWeather(selectedStadium);
      setWeather(w);
    } catch (e) {
      setWeatherError('Weather unavailable — check internet connection.');
    } finally {
      setWeatherLoading(false);
    }
  }, [selectedStadium]);

  useEffect(() => { loadWeather(); }, [loadWeather]);

  // ── Refresh weather every 10 minutes ──
  useEffect(() => {
    const interval = setInterval(loadWeather, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadWeather]);

  // ── Update capacity when stadium changes ──
  useEffect(() => {
    setMetrics(prev => ({ ...prev, capacity: STADIUMS[selectedStadium].capacity }));
  }, [selectedStadium]);

  // ── Simulate minor fluctuation in hardware-pending fields ──
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        fanCount:       prev.fanCount + Math.floor(Math.random() * 40 - 20),
        gateB:          Math.min(99, Math.max(70, prev.gateB + Math.floor(Math.random() * 6 - 3))),
        concessionWait: Math.max(5, prev.concessionWait + Math.floor(Math.random() * 4 - 2)),
        minsToHalftime: Math.max(0, prev.minsToHalftime - 0.1),
        occupancy:      Math.min(99, Math.round((prev.fanCount / prev.capacity) * 100)),
      }));
      setLastUpdated(new Date());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleGetInsights = useCallback(async () => {
    setInsightsError('');
    setInsights('');
    setInsightsLoading(true);
    try {
      const text = await generateStaffInsights(apiKeyOverride, {
        ...metrics,
        weather: weather ? weather.summary : 'Weather data loading…',
      });
      setInsights(text);
    } catch (err) {
      setInsightsError(parseGeminiError(err));
    } finally {
      setInsightsLoading(false);
    }
  }, [apiKeyOverride, metrics, weather]);

  const addSimulatedIncident = () => {
    const newIncident = {
      id: Date.now(),
      severity: ['warning', 'info', 'critical'][Math.floor(Math.random() * 3)],
      title: ['Fan Medical Request', 'Crowd Surge Detected', 'Lost Child Report', 'Equipment Failure'][Math.floor(Math.random() * 4)],
      location: ['Gate D', 'Section 118', 'Concourse B', 'Parking C'][Math.floor(Math.random() * 4)],
      time: new Date().toTimeString().slice(0, 5),
      desc: 'New incident reported. Staff response required.',
    };
    setIncidents(prev => [newIncident, ...prev.slice(0, 6)]);
  };

  return (
    <div className="staff-layout">

      {/* Stadium Selector */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>📍 Active Stadium:</span>
        <select
          id="dashboard-stadium-select"
          className="nav-select"
          style={{ flex: 1, maxWidth: 360 }}
          value={selectedStadium}
          onChange={e => setSelectedStadium(e.target.value)}
          aria-label="Select active stadium"
        >
          {Object.keys(STADIUMS).map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Controls Row */}
      <div className="staff-controls">
        <div className="staff-controls-left">
          <h2 className="staff-title gradient-text-cool">Operations Command</h2>
          <div className="last-updated">
            <div className="header-live-dot" style={{ background: 'var(--accent-cyan)' }} />
            Updated {lastUpdated.toTimeString().slice(0, 8)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            id="staff-simulate-incident"
            className="action-btn"
            onClick={addSimulatedIncident}
            style={{ background: 'rgba(255,171,0,0.15)', border: '1px solid rgba(255,171,0,0.3)', color: 'var(--accent-amber)', padding: '8px 16px' }}
          >
            + Add Incident
          </button>
          <button
            id="staff-get-insights"
            className="action-btn btn-staff"
            onClick={handleGetInsights}
            disabled={insightsLoading}
          >
            {insightsLoading ? '⏳ Analyzing…' : '🧠 Get AI Insights'}
          </button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ color: '#00e676', fontWeight: 700 }}>● Live</span> — Real sensor / API data
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ color: '#bf80ff', fontWeight: 700 }}>◌ Sensor Req.</span> — Requires proprietary stadium hardware integration (SKIDATA / Nedap / EMS)
        </span>
      </div>

      {/* Tabs */}
      <div className="section-tabs">
        {['overview', 'weather', 'matches', 'gates', 'incidents', 'insights', 'sources'].map(tab => (
          <button
            key={tab}
            id={`staff-tab-${tab}`}
            className={`section-tab${activeTab === tab ? ' active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {{ overview: '📊 Overview', weather: '🌤️ Weather', matches: '⚽ Matches', gates: '🚪 Gates', incidents: '🚨 Incidents', insights: '🧠 AI', sources: '🔌 Sources' }[tab]}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div className="metrics-grid">
          {/* REAL weather card */}
          <div className={`metric-card glass severity-info`}>
            <div className="metric-card-icon">🌡️</div>
            <div className="metric-card-label">Weather · {STADIUMS[selectedStadium].city}</div>
            {weatherLoading ? (
              <div className="shimmer" style={{ height: 32, borderRadius: 6, marginTop: 4 }} />
            ) : weatherError ? (
              <div style={{ fontSize: '0.75rem', color: '#ff9999' }}>{weatherError}</div>
            ) : (
              <>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800 }}>
                  {weather.icon} {weather.tempC}°C
                </div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
                  {weather.condition} · Feels {weather.feelsLikeC}°C
                </div>
                {weather.heatAdvisory && (
                  <div style={{ fontSize: '0.7rem', color: '#ffcc44', marginTop: 4 }}>⚠️ Heat Advisory Active</div>
                )}
              </>
            )}
          </div>

          <MetricCard icon="👥" label="Fan Count" value={metrics.fanCount.toLocaleString()} unit="" trend="up" trendLabel="Hardware req." severity="info" isReal={false} sensorNote="Requires turnstile hardware (SKIDATA/Nedap)" />
          <MetricCard icon="🏟️" label="Occupancy" value={metrics.occupancy} unit="%" trend="up" trendLabel="Hardware req." severity="warning" isReal={false} sensorNote="Derived from turnstile count" />
          <MetricCard icon="🚪" label="Gate B Load" value={metrics.gateB} unit="%" trend="up" trendLabel="Hardware req." severity="critical" isReal={false} sensorNote="Requires CCTV crowd analytics or turnstile SDK" />
          <MetricCard icon="🍔" label="Concession Wait" value={metrics.concessionWait} unit="min" trend="up" trendLabel="Hardware req." severity="warning" isReal={false} sensorNote="Requires POS / queue management integration" />
          <MetricCard icon="🏥" label="Medical Active" value={metrics.medicalIncidents} unit="" trend="ok" trendLabel="Hardware req." severity="info" isReal={false} sensorNote="Requires EMS/CAD system integration" />
          <MetricCard icon="🅿️" label="Parking Avail" value={metrics.parkingAvail} unit="%" trend="down" trendLabel="Hardware req." severity="critical" isReal={false} sensorNote="Requires IoT parking sensors" />
          <MetricCard icon="⏱️" label="Halftime In" value={Math.max(0, metrics.minsToHalftime).toFixed(0)} unit="min" trend="down" trendLabel="Match schedule" severity="warning" isReal={false} />
        </div>
      )}

      {/* ── REAL WEATHER ── */}
      {activeTab === 'weather' && (
        <div className="panel glass" style={{ padding: 'var(--space-lg)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Live Weather — {STADIUMS[selectedStadium].city}</div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                Source: Open-Meteo API · GPS {STADIUMS[selectedStadium].lat}°N, {Math.abs(STADIUMS[selectedStadium].lon)}°W · Updates every 10 min
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00e676', animation: 'live-pulse 1.5s ease-in-out infinite' }} />
              <span style={{ fontSize: '0.7rem', color: 'var(--accent-green)', fontWeight: 600 }}>REAL DATA</span>
            </div>
          </div>

          {weatherLoading && <div className="shimmer" style={{ height: 180, borderRadius: 12 }} />}
          {weatherError && <div className="error-msg-box"><span>⚠️</span><span>{weatherError}</span></div>}

          {!weatherLoading && weather && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
              {[
                { icon: weather.icon, label: 'Condition', value: weather.condition },
                { icon: '🌡️', label: 'Temperature', value: `${weather.tempC}°C / ${weather.tempF}°F` },
                { icon: '🤔', label: 'Feels Like', value: `${weather.feelsLikeC}°C` },
                { icon: '💧', label: 'Humidity', value: `${weather.humidity}%` },
                { icon: '💨', label: 'Wind Speed', value: `${weather.windKmh} km/h` },
                { icon: weather.heatAdvisory ? '🔴' : '🟢', label: 'Heat Advisory', value: weather.heatAdvisory ? 'Active ⚠️' : 'None' },
              ].map(item => (
                <div key={item.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '14px 16px', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontSize: '1.4rem', marginBottom: 6 }}>{item.icon}</div>
                  <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700 }}>{item.value}</div>
                </div>
              ))}
            </div>
          )}

          {!weatherLoading && weather && weather.heatAdvisory && (
            <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(255,171,0,0.1)', border: '1px solid rgba(255,171,0,0.25)', borderRadius: 10, fontSize: '0.85rem', color: '#ffcc44' }}>
              ⚠️ <strong>Heat Advisory:</strong> Ambient temperature exceeds 35°C comfort threshold. Recommend deploying water stations, activating shade structures, and alerting First Aid to increase hydration patrols.
            </div>
          )}

          <button className="action-btn btn-staff" onClick={loadWeather} style={{ marginTop: 16, width: '100%' }}>
            🔄 Refresh Weather Now
          </button>
        </div>
      )}

      {/* ── REAL MATCHES ── */}
      {activeTab === 'matches' && (
        <div className="panel glass" style={{ padding: 'var(--space-lg)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Live FIFA 2026 Scores & Schedule</div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                Source: ESPN Public API · Auto-refreshes every 30 seconds
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00e676', animation: 'live-pulse 1.5s ease-in-out infinite' }} />
              <span style={{ fontSize: '0.7rem', color: 'var(--accent-green)', fontWeight: 600 }}>REAL DATA</span>
            </div>
          </div>
          <LiveMatches />
        </div>
      )}

      {/* ── GATES (hardware-pending) ── */}
      {activeTab === 'gates' && (
        <div className="panel glass" style={{ padding: 'var(--space-lg)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ padding: '10px 14px', background: 'rgba(123,47,255,0.08)', border: '1px solid rgba(123,47,255,0.2)', borderRadius: 10, fontSize: '0.8rem', color: '#bf80ff', marginBottom: 16 }}>
            ◌ <strong>Hardware Integration Required:</strong> Gate congestion data requires stadium turnstile hardware (e.g., SKIDATA, Nedap, Boon Edam). The values below are simulated. Connect your hardware SDK to replace with real counts.
          </div>
          <div className="gates-grid">
            {GATE_DATA.map(gate => (
              <div key={gate.id} className="gate-indicator">
                <span className="gate-label">Gate {gate.id}</span>
                <div className="gate-bar">
                  <div className="gate-fill" style={{
                    height: `${gate.id === 'B' ? metrics.gateB : gate.pct}%`,
                    background: gate.id === 'B'
                      ? (metrics.gateB >= 80 ? 'linear-gradient(180deg,#e8002d,#ff6b35)' : 'linear-gradient(180deg,#ffab00,#ffd700)')
                      : `linear-gradient(180deg,${gate.color},${gate.color}88)`,
                  }} />
                </div>
                <span className="gate-pct">{gate.id === 'B' ? metrics.gateB : gate.pct}%</span>
              </div>
            ))}
          </div>
          {metrics.gateB >= 80 && (
            <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(232,0,45,0.1)', border: '1px solid rgba(232,0,45,0.25)', borderRadius: 10, fontSize: '0.85rem', color: '#ff9999' }}>
              ⚠️ <strong>Gate B Threshold Exceeded ({metrics.gateB}%):</strong> Redirect arrivals to Gate A or C. Deploy 4 additional volunteers.
            </div>
          )}
        </div>
      )}

      {/* ── INCIDENTS ── */}
      {activeTab === 'incidents' && (
        <div className="panel glass" style={{ padding: 'var(--space-lg)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ padding: '10px 14px', background: 'rgba(123,47,255,0.08)', border: '1px solid rgba(123,47,255,0.2)', borderRadius: 10, fontSize: '0.8rem', color: '#bf80ff', marginBottom: 16 }}>
            ◌ <strong>Hardware Integration Required:</strong> In production, incidents feed from your EMS/CAD system (e.g., Motorola PremierOne) or security platform. Current entries are manually logged.
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>{incidents.length} active incidents</span>
            <span className="insight-badge badge-warning">🚨 {incidents.filter(i => i.severity === 'critical').length} Critical</span>
          </div>
          <div className="incident-feed">
            {incidents.map(inc => (
              <div key={inc.id} className="incident-item">
                <div className={`incident-dot ${dotClass[inc.severity]}`} />
                <div className="incident-content">
                  <div className="incident-title">{inc.title}</div>
                  <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.65)', marginBottom: 4 }}>{inc.desc}</div>
                  <div className="incident-meta">
                    <span>📍 {inc.location}</span>
                    <span>🕐 {inc.time}</span>
                    <span className={`insight-badge badge-${inc.severity === 'good' ? 'good' : inc.severity === 'critical' ? 'critical' : 'warning'}`} style={{ fontSize: '0.65rem', padding: '2px 8px' }}>{inc.severity}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── AI INSIGHTS ── */}
      {activeTab === 'insights' && (
        <div className="panel glass" style={{ padding: 'var(--space-lg)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>
            Click <strong style={{ color: 'var(--accent-cyan)' }}>"Get AI Insights"</strong> above. The AI uses <strong style={{ color: '#00e676' }}>real weather</strong> + available metrics to generate recommendations.
          </div>
          {insightsError && <div className="error-msg-box"><span>⚠️</span><span>{insightsError}</span></div>}
          {insightsLoading && <div className="insight-result shimmer" style={{ minHeight: 200 }} />}
          {!insightsLoading && insights && (
            <div className="insight-result">
              <div className="insight-result-header">
                <span>🧠</span>
                <span style={{ color: 'var(--accent-purple)' }}>AI Operational Intelligence</span>
                <span className="insight-badge badge-critical" style={{ marginLeft: 'auto' }}>LIVE ANALYSIS</span>
              </div>
              {insights}
            </div>
          )}
          {!insightsLoading && !insights && !insightsError && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🤖</div>
              <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)' }}>
                AI is ready — click "Get AI Insights" above.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── DATA SOURCES ── */}
      {activeTab === 'sources' && (
        <div className="panel glass" style={{ padding: 'var(--space-lg)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>🔌 Data Source Registry</div>
          <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>
            Full transparency on what data is real and what requires hardware integration.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {DATA_SOURCES.map(src => (
              <div key={src.field} style={{
                display: 'flex', gap: 14, alignItems: 'flex-start',
                padding: '14px 16px', borderRadius: 12,
                background: src.isReal ? 'rgba(0,230,118,0.05)' : 'rgba(123,47,255,0.05)',
                border: `1px solid ${src.isReal ? 'rgba(0,230,118,0.15)' : 'rgba(123,47,255,0.15)'}`,
              }}>
                <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{src.isReal ? '✅' : '⚙️'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{src.field}</div>
                  <div style={{ fontSize: '0.75rem', color: src.isReal ? '#00e676' : '#bf80ff', marginTop: 2, marginBottom: 4 }}>
                    {src.isReal ? '● Live API —' : '◌ Hardware Required —'} {src.source}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{src.note}</div>
                  {src.url && (
                    <a href={src.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', marginTop: 4, display: 'inline-block' }}>
                      {src.url} ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
