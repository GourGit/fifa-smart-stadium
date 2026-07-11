import { useState } from 'react';
import { generateNavigationInstructions, parseGeminiError } from '../services/gemini';

const STADIUMS = [
  'MetLife Stadium, New Jersey',
  'AT&T Stadium, Dallas',
  'SoFi Stadium, Los Angeles',
  'Rose Bowl, Pasadena',
  "Levi's Stadium, San Francisco",
  'Arrowhead Stadium, Kansas City',
  'Hard Rock Stadium, Miami',
  "Gillette Stadium, Boston",
  'Mercedes-Benz Stadium, Atlanta',
  'BC Place, Vancouver',
  'BMO Field, Toronto',
  'Estadio Azteca, Mexico City',
  'Estadio BBVA, Monterrey',
];

const LOCATIONS = [
  'Main Entrance / Gate 1',
  'Gate 2 (East)',
  'Gate 3 (North)',
  'Gate 4 (West)',
  'Gate 5 (South)',
  'Gate 6 (Accessible Entrance)',
  'Parking Lot A',
  'Parking Lot B (Overflow)',
  'Fan Zone (South Plaza)',
  'Section 115',
  'Section 220',
  'Section 335 (Upper)',
];

const DESTINATIONS = [
  'My Seat — Section 115, Row G, Seat 12',
  'My Seat — Section 220, Row C, Seat 7',
  'My Seat — Section 335, Row A, Seat 4',
  'Nearest Restroom',
  'Nearest Food Concession',
  'First Aid Station',
  'Team Merchandise Store',
  'Accessible Seating Area',
  'Fan Meeting Point',
  'Lost & Found (Gate 1)',
  'VIP Lounge Level 3',
  'Media Center',
];

export default function NavigationAssistant({ apiKeyOverride }) {
  const [stadium, setStadium] = useState(STADIUMS[0]);
  const [from, setFrom] = useState(LOCATIONS[0]);
  const [to, setTo] = useState(DESTINATIONS[0]);
  const [wheelchair, setWheelchair] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [steps, setSteps] = useState([]);

  const parseSteps = (text) => {
    return text
      .split('\n')
      .filter((line) => line.trim().match(/^\d+[\.\)]/))
      .map((line) => line.replace(/^\d+[\.\)]\s*/, '').trim())
      .filter(Boolean);
  };

  const handleNavigate = async () => {
    setError('');
    setSteps([]);
    setLoading(true);
    try {
      const text = await generateNavigationInstructions(apiKeyOverride, {
        from, to, wheelchair, stadium,
      });
      const parsed = parseSteps(text);
      setSteps(parsed.length > 0 ? parsed : [text]);
    } catch (err) {
      setError(parseGeminiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel glass" style={{ minHeight: 540 }}>
      <div className="panel-header">
        <div className="panel-icon panel-icon-nav">🗺️</div>
        <div>
          <div className="panel-title">Smart Navigation</div>
          <div className="panel-subtitle">AI-powered · Accessibility-first · Step-by-step</div>
        </div>
      </div>
      <div className="panel-body">
        <div className="nav-form">
          <div>
            <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>
              🏟️ Stadium
            </label>
            <select
              id="nav-stadium-select"
              className="nav-select"
              value={stadium}
              onChange={(e) => setStadium(e.target.value)}
              aria-label="Select stadium"
            >
              {STADIUMS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>
                📍 From
              </label>
              <select
                id="nav-from-select"
                className="nav-select"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                aria-label="Navigate from"
              >
                {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>
                🎯 To
              </label>
              <select
                id="nav-to-select"
                className="nav-select"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                aria-label="Navigate to"
              >
                {DESTINATIONS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <label className="nav-checkbox-row">
            <input
              id="nav-wheelchair-check"
              type="checkbox"
              className="nav-checkbox"
              checked={wheelchair}
              onChange={(e) => setWheelchair(e.target.checked)}
              aria-label="Wheelchair accessible route"
            />
            ♿ Wheelchair / Mobility-accessible route only
          </label>

          <button
            id="nav-generate-btn"
            className="action-btn btn-fan"
            onClick={handleNavigate}
            disabled={loading}
          >
            {loading ? '⏳ Generating route…' : '🗺️ Get AI Navigation'}
          </button>
        </div>

        {error && (
          <div className="error-msg-box" style={{ marginTop: 12 }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {loading && !steps.length && (
          <div className="nav-result shimmer" style={{ marginTop: 16, minHeight: 120 }} />
        )}

        {steps.length > 0 && (
          <div className="nav-result" style={{ marginTop: 16 }}>
            <div className="nav-result-header">
              🧭 Route {wheelchair ? '(Accessible)' : ''}: {from.split('—')[0].trim()} → {to.split('—')[0].trim()}
            </div>
            {steps.map((step, i) => (
              <div key={i} className="nav-step">
                <div className="nav-step-num">{i + 1}</div>
                <div>{step}</div>
              </div>
            ))}
            {wheelchair && (
              <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(0,230,118,0.08)', borderRadius: 8, border: '1px solid rgba(0,230,118,0.2)', fontSize: '0.78rem', color: 'var(--accent-green)' }}>
                ♿ This route uses ramps and elevators only — no stairs.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
