import { useState, useRef, useEffect } from 'react';
import { sendConciergeMessage, parseGeminiError } from '../services/gemini';
import { fetchLiveMatches, fetchRealWeather, STADIUMS } from '../services/realData';

const LANGUAGES = [
  { code: 'en', label: '🇺🇸 EN' },
  { code: 'es', label: '🇪🇸 ES' },
  { code: 'fr', label: '🇫🇷 FR' },
  { code: 'pt', label: '🇧🇷 PT' },
  { code: 'de', label: '🇩🇪 DE' },
  { code: 'ar', label: '🇸🇦 AR' },
  { code: 'ja', label: '🇯🇵 JA' },
  { code: 'zh', label: '🇨🇳 ZH' },
];

const QUICK_PROMPTS = [
  '⚽ Today\'s matches?',
  '🍔 Where can I eat?',
  '🚻 Nearest restroom?',
  '♿ Accessible routes?',
  '🌤️ What\'s the weather?',
  '📶 Wi-Fi password?',
];

const LANG_GREET = {
  en: "Hi! I'm your FIFA 2026 AI Concierge. I have live match scores and real weather data. Ask me anything!",
  es: "¡Hola! Soy tu Conserje IA del FIFA 2026 con datos de partidos en vivo. ¡Pregúntame lo que quieras!",
  fr: "Salut ! Je suis votre Concierge IA FIFA 2026 avec données en direct. Posez-moi vos questions !",
  pt: "Olá! Sou o seu Concierge IA da FIFA 2026 com dados ao vivo. Pergunte-me qualquer coisa!",
  de: "Hallo! Ich bin Ihr FIFA 2026 KI-Concierge mit Live-Spieldaten. Fragen Sie mich alles!",
  ar: "مرحباً! أنا مساعد الذكاء الاصطناعي لكأس العالم FIFA 2026 مع بيانات مباشرة. اسألني أي شيء!",
  ja: "こんにちは！FIFA 2026 AIコンシェルジュです。ライブ試合データあり。何でも聞いてください！",
  zh: "你好！我是FIFA 2026 AI礼宾员，提供实时比赛数据。请随时询问！",
};

// Build a plain-text live context string from real API data
function buildLiveContext(matches, weather, stadiumName) {
  const lines = [];
  const now = new Date();
  lines.push(`Current date/time: ${now.toUTCString()}`);

  if (weather) {
    lines.push(`\nWeather at ${stadiumName} (${weather.city}):`);
    lines.push(`  ${weather.summary}`);
  }

  if (matches && matches.length > 0) {
    lines.push(`\nFIFA World Cup 2026 — Today's matches (from ESPN live feed):`);
    matches.forEach((m, i) => {
      if (m.isLive) {
        lines.push(`  ${i + 1}. 🔴 LIVE: ${m.homeTeam} ${m.homeScore}–${m.awayScore} ${m.awayTeam} (${m.clock || 'in progress'}) — Venue: ${m.venue}`);
      } else if (m.isCompleted) {
        lines.push(`  ${i + 1}. ✅ FINAL: ${m.homeTeam} ${m.homeScore}–${m.awayScore} ${m.awayTeam} — Venue: ${m.venue}`);
      } else {
        lines.push(`  ${i + 1}. 📅 ${m.homeTeam} vs ${m.awayTeam} — ${m.statusText} — Venue: ${m.venue}`);
      }
    });
  } else {
    lines.push(`\nNo matches found for today from ESPN. The tournament may be between match days.`);
  }

  return lines.join('\n');
}

export default function ChatConcierge({ apiKeyOverride }) {
  const [selectedLang, setSelectedLang] = useState('en');
  const [selectedStadium, setSelectedStadium] = useState(Object.keys(STADIUMS)[0]);
  const [messages, setMessages] = useState([
    { role: 'model', text: LANG_GREET['en'] },
  ]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  // Live data state
  const [liveMatches, setLiveMatches]   = useState([]);
  const [liveWeather, setLiveWeather]   = useState(null);
  const [liveStatus, setLiveStatus]     = useState('loading'); // 'loading' | 'ok' | 'error'

  const messagesEndRef = useRef(null);

  // Fetch live matches + weather on mount and every 60 seconds
  useEffect(() => {
    const load = async () => {
      try {
        const [matches, weather] = await Promise.all([
          fetchLiveMatches(),
          fetchRealWeather(selectedStadium),
        ]);
        setLiveMatches(matches);
        setLiveWeather(weather);
        setLiveStatus('ok');
      } catch {
        setLiveStatus('error');
      }
    };
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [selectedStadium]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleLangChange = (code) => {
    setSelectedLang(code);
    setMessages([{ role: 'model', text: LANG_GREET[code] }]);
    setError('');
  };

  const handleSend = async (text) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;
    setError('');

    const newMessages = [...messages, { role: 'user', text: userText }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    // Build history in OpenAI format
    const history = newMessages.slice(0, -1).map((m) => ({
      role: m.role === 'model' ? 'assistant' : m.role,
      content: m.text,
    }));

    // Build live context from real API data
    const liveContext = buildLiveContext(liveMatches, liveWeather, selectedStadium);

    try {
      const reply = await sendConciergeMessage(apiKeyOverride, history, userText, liveContext);
      setMessages((prev) => [...prev, { role: 'model', text: reply }]);
    } catch (err) {
      setError(parseGeminiError(err));
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="panel glass" style={{ minHeight: 540 }}>
      <div className="panel-header">
        <div className="panel-icon panel-icon-fan">🤖</div>
        <div style={{ flex: 1 }}>
          <div className="panel-title">Your FIFA Stadium Companion</div>
          <div className="panel-subtitle">Multilingual · Live data · Ask me anything</div>
        </div>
        {/* Live data indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem' }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: liveStatus === 'ok' ? '#00e676' : liveStatus === 'error' ? '#ff6b8a' : '#ffab00',
            animation: liveStatus === 'ok' ? 'live-pulse 1.5s ease-in-out infinite' : 'none',
          }} />
          <span style={{ color: liveStatus === 'ok' ? '#00e676' : liveStatus === 'error' ? '#ff6b8a' : '#ffab00' }}>
            {liveStatus === 'ok' ? 'Live data active' : liveStatus === 'error' ? 'Data unavailable' : 'Loading…'}
          </span>
        </div>
      </div>

      <div className="panel-body">
        {/* Stadium + Language row */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--space-md)', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            id="concierge-stadium-select"
            className="nav-select"
            style={{ flex: 1, fontSize: '0.78rem', padding: '7px 10px' }}
            value={selectedStadium}
            onChange={(e) => setSelectedStadium(e.target.value)}
            aria-label="Select your stadium"
          >
            {Object.keys(STADIUMS).map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>

        {/* Language Selector */}
        <div className="lang-pills">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              className={`lang-pill${selectedLang === l.code ? ' active' : ''}`}
              onClick={() => handleLangChange(l.code)}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Live data chip */}
        {liveStatus === 'ok' && liveWeather && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 'var(--space-md)', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', flexWrap: 'wrap' }}>
            <span>🌡️ {liveWeather.tempC}°C {liveWeather.condition}</span>
            <span>·</span>
            <span>⚽ {liveMatches.length > 0 ? `${liveMatches.filter(m => m.isLive).length} live, ${liveMatches.length} total matches` : 'No matches today'}</span>
          </div>
        )}

        {/* Messages */}
        <div className="chat-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`chat-msg${msg.role === 'user' ? ' user' : ''}`}>
              <div className={`chat-avatar ${msg.role === 'user' ? 'chat-avatar-user' : 'chat-avatar-ai'}`}>
                {msg.role === 'user' ? '👤' : '⚽'}
              </div>
              <div className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}`}>
                {msg.text}
              </div>
            </div>
          ))}

          {loading && (
            <div className="chat-msg">
              <div className="chat-avatar chat-avatar-ai">⚽</div>
              <div className="chat-bubble chat-bubble-ai">
                <div className="chat-typing">
                  <div className="chat-typing-dot"></div>
                  <div className="chat-typing-dot"></div>
                  <div className="chat-typing-dot"></div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="error-msg-box">
              <span>⚠️</span><span>{error}</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts */}
        <div className="quick-prompts">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p}
              className="quick-prompt-btn"
              onClick={() => handleSend(p)}
              disabled={loading}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input Row */}
        <div className="chat-input-row">
          <input
            id="fan-chat-input"
            className="chat-input"
            type="text"
            placeholder="Ask about matches, weather, food, navigation… (any language!)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            aria-label="Chat message input"
          />
          <button
            id="fan-chat-send"
            className="chat-send-btn"
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            aria-label="Send message"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
