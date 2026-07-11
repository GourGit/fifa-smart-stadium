import { useState, useEffect } from 'react';
import { fetchLiveMatches } from '../services/realData';

export default function LiveMatches() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [lastFetch, setLastFetch] = useState(null);

  const load = async () => {
    try {
      const data = await fetchLiveMatches();
      setMatches(data);
      setLastFetch(new Date());
      setError('');
    } catch (err) {
      setError('Could not reach ESPN API. Check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  // Initial load + refresh every 30 seconds
  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="shimmer" style={{ height: 64, borderRadius: 12 }} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-msg-box"><span>⚠️</span><span>{error}</span></div>
    );
  }

  if (matches.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '24px', color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem' }}>
        No matches scheduled today.<br />Check back on match days.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Source badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00e676', animation: 'live-pulse 1.5s ease-in-out infinite' }} />
          <span style={{ fontSize: '0.7rem', color: 'var(--accent-green)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            ESPN Live Feed
          </span>
        </div>
        {lastFetch && (
          <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)' }}>
            Updated {lastFetch.toTimeString().slice(0, 8)}
          </span>
        )}
      </div>

      {matches.map((m) => (
        <div
          key={m.id}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            gap: 12,
            padding: '12px 16px',
            background: m.isLive
              ? 'rgba(232, 0, 45, 0.08)'
              : 'rgba(255,255,255,0.04)',
            border: `1px solid ${m.isLive ? 'rgba(232,0,45,0.25)' : 'rgba(255,255,255,0.07)'}`,
            borderRadius: 12,
            transition: 'background 0.3s ease',
          }}
        >
          {/* Home */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{m.homeTeam}</div>
            <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Home</div>
          </div>

          {/* Score / Status */}
          <div style={{ textAlign: 'center', minWidth: 80 }}>
            {m.isLive ? (
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>
                  {m.homeScore} — {m.awayScore}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 2 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--brand-red)', animation: 'live-pulse 1s ease-in-out infinite' }} />
                  <span style={{ fontSize: '0.68rem', color: 'var(--brand-red)', fontWeight: 700 }}>{m.clock || 'LIVE'}</span>
                </div>
              </div>
            ) : m.isCompleted ? (
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800, color: 'rgba(255,255,255,0.5)' }}>
                  {m.homeScore} — {m.awayScore}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>Full Time</div>
              </div>
            ) : (
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>vs</div>
                <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                  {m.statusText}
                </div>
              </div>
            )}
          </div>

          {/* Away */}
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{m.awayTeam}</div>
            <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Away</div>
          </div>
        </div>
      ))}
    </div>
  );
}
