import { useState, useRef, useEffect } from 'react';
import { sendConciergeMessage, parseGeminiError } from '../services/gemini';

const STAFF_PROMPTS = [
  '📊 Crowd status summary',
  '🚪 Gate B recommendations',
  '🏥 Medical team deployment',
  '🅿️ Parking overflow plan',
  '⏱️ Halftime prep checklist',
  '🌡️ Heat advisory protocol',
];

export default function StaffChat({ apiKeyOverride }) {
  const [messages, setMessages] = useState([
    { role: 'model', text: "Staff Command AI ready. Ask about crowd management, incident response, resource deployment, or operational procedures." },
  ]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (text) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;
    setError('');

    const newMessages = [...messages, { role: 'user', text: userText }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    const history = newMessages.slice(0, -1).map((m) => ({
      role: m.role === 'model' ? 'assistant' : m.role,
      content: m.text,
    }));

    const staffContext = `You are an AI Operations Advisor for FIFA World Cup 2026 venue staff. 
You help with: crowd management, gate congestion, medical deployment, security protocols, 
concession logistics, parking management, halftime preparations, and emergency response. 
Be concise, use bullet points, and give actionable recommendations. 
Current time: ${new Date().toLocaleString()}.`;

    try {
      const reply = await sendConciergeMessage(apiKeyOverride, history, userText, staffContext);
      setMessages((prev) => [...prev, { role: 'model', text: reply }]);
    } catch (err) {
      setError(parseGeminiError(err));
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="panel glass" style={{ minHeight: 400 }}>
      <div className="panel-header">
        <div className="panel-icon panel-icon-staff">🧠</div>
        <div>
          <div className="panel-title">Staff Command AI</div>
          <div className="panel-subtitle">Operations advisor · Incident support · Resource planning</div>
        </div>
      </div>
      <div className="panel-body">
        {/* Messages */}
        <div className="chat-messages staff-chat-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`chat-msg${msg.role === 'user' ? ' user' : ''}`}>
              <div className={`chat-avatar ${msg.role === 'user' ? 'chat-avatar-user' : 'chat-avatar-staff'}`}>
                {msg.role === 'user' ? '👤' : '🧠'}
              </div>
              <div className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-staff'}`}>
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="chat-msg">
              <div className="chat-avatar chat-avatar-staff">🧠</div>
              <div className="chat-bubble chat-bubble-staff">
                <div className="chat-typing">
                  <div className="chat-typing-dot"></div>
                  <div className="chat-typing-dot"></div>
                  <div className="chat-typing-dot"></div>
                </div>
              </div>
            </div>
          )}
          {error && <div className="error-msg-box"><span>⚠️</span><span>{error}</span></div>}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts */}
        <div className="quick-prompts">
          {STAFF_PROMPTS.map((p) => (
            <button key={p} className="quick-prompt-btn staff-prompt-btn" onClick={() => handleSend(p)} disabled={loading}>{p}</button>
          ))}
        </div>

        {/* Input */}
        <div className="chat-input-row">
          <input
            id="staff-chat-input"
            className="chat-input staff-chat-input"
            type="text"
            placeholder="Ask about operations, incidents, crowd management…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <button id="staff-chat-send" className="chat-send-btn staff-send-btn" onClick={() => handleSend()} disabled={loading || !input.trim()}>➤</button>
        </div>
      </div>
    </div>
  );
}
