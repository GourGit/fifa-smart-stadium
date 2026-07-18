// ─── OpenRouter Configuration ─────────────────────────────────────────────
// Reads VITE_OPENROUTER_API_KEY from your .env file.
// OpenRouter proxies Gemini (and many other models) via an OpenAI-compatible API.
// Docs: https://openrouter.ai/docs

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemini-3.5-flash';  // Gemini 3.5 Flash via OpenRouter

const ENV_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '';

import { aiRateLimiter } from './security.js';

// ─── Key helpers ──────────────────────────────────────────────────────────

export function resolveKey(overrideKey) {
  const key = (overrideKey && overrideKey.trim()) ? overrideKey.trim() : ENV_API_KEY;
  if (!key || key === 'your_openrouter_api_key_here') {
    throw new Error('NO_API_KEY');
  }
  return key;
}

/** Returns true if a usable API key is configured (env or override). */
export function hasApiKey(overrideKey) {
  const key = (overrideKey && overrideKey.trim()) ? overrideKey.trim() : ENV_API_KEY;
  return Boolean(key && key !== 'your_openrouter_api_key_here');
}

/** Converts raw API errors into short, human-readable strings. */
export function parseGeminiError(err) {
  const msg = err?.message || String(err);

  if (msg === 'NO_API_KEY') {
    return 'No API key configured. Add VITE_OPENROUTER_API_KEY to your .env file and restart the dev server.';
  }
  if (msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate limit')) {
    return '⚠️ Rate limit reached. Wait a moment and try again, or upgrade your OpenRouter plan at https://openrouter.ai.';
  }
  if (msg.includes('401') || msg.toLowerCase().includes('unauthorized')) {
    return '🔑 Invalid API key. Check that your VITE_OPENROUTER_API_KEY is correct in the .env file.';
  }
  if (msg.includes('403') || msg.toLowerCase().includes('forbidden')) {
    return '🔒 Access denied. Make sure your OpenRouter key has credits and the correct permissions.';
  }
  if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
    return '🔍 Model not found. The selected model may not be available on your OpenRouter plan.';
  }
  if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('failed')) {
    return '📡 Network error. Check your internet connection and try again.';
  }
  // Trim to first line to never dump raw JSON
  return msg.split('\n')[0].slice(0, 150);
}

// ─── Core fetch helper ────────────────────────────────────────────────────

async function callOpenRouter(apiKey, messages) {
  // Client-side rate limiting
  if (!aiRateLimiter.canProceed()) {
    const wait = Math.ceil(aiRateLimiter.getWaitTime() / 1000);
    throw new Error(`429 Rate limited — please wait ${wait}s before sending another message.`);
  }

  const response = await fetch(OPENROUTER_BASE, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:5173',
      'X-Title': 'FIFA 2026 Smart Stadium Hub',
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: 600,
      temperature: 0.75,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    // Extract a clean message from the JSON error body if possible
    try {
      const errJson = JSON.parse(errText);
      const detail = errJson?.error?.message || errJson?.message || errText;
      throw new Error(`${response.status} ${detail}`);
    } catch {
      throw new Error(`${response.status} ${errText.slice(0, 200)}`);
    }
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}

// ─── Stadium Knowledge Base (RAG Context) ─────────────────────────────────

const STADIUM_SYSTEM_PROMPT = `You are the FIFA World Cup 2026 Smart Stadium AI Concierge — a friendly, knowledgeable assistant for fans, volunteers, and staff.

## About FIFA World Cup 2026
- Hosted across 16 stadiums in the USA, Canada, and Mexico (June–July 2026)
- Key venues: MetLife Stadium (New York/New Jersey), AT&T Stadium (Dallas), SoFi Stadium (Los Angeles), Rose Bowl, Levi's Stadium, Arrowhead Stadium, Lincoln Financial Field, Hard Rock Stadium (Miami), Gillette Stadium (Boston), Mercedes-Benz Stadium (Atlanta), BC Place (Vancouver), BMO Field (Toronto), Estadio Azteca (Mexico City), Estadio BBVA, Estadio Akron.

## Stadium Amenities
- **Food & Beverage**: Multiple concourse levels with international cuisine. Halal and vegan options at all venues.
- **Medical**: First Aid stations at Sections 101, 215, 330. Defibrillators every 200 feet.
- **Accessibility**: Wheelchair-accessible routes throughout. Elevators at Sections A, C, and E entrances.
- **Restrooms**: Every concourse level, marked with blue signage.
- **Fan Zones**: Open 3 hours before kickoff on the south plaza.
- **Team Stores**: Gates 1, 4, and 7.
- **Lost & Found**: Gate 1, ground level.
- **Wi-Fi**: Free — network "FIFA2026_FAN", no password required.

## Accessibility (Wheelchair / Mobility)
- Enter via Gate 1 or Gate 6 (ramped access)
- Elevators near Gate 1 (Level 1→4) and Gate 6 (Level 1→3)
- Accessible seating: Sections 115, 220, 335
- Accessible restrooms: Ground floor at Gates 1, 3, 5, 6

## Emergency
- Follow illuminated green exit signs
- Fan Meeting Points marked with blue star signs

## Match Day Tips
- Gates open 2 hours before kickoff
- Arrive 90+ minutes early to avoid peak congestion

## Language
Respond in the same language the fan is using. Auto-detect and match their language.`;

// ─── Exported AI Functions ────────────────────────────────────────────────

/**
 * Multilingual Fan Concierge — maintains full conversation history.
 * @param {string} overrideKey  - Optional runtime API key override
 * @param {Array}  history      - [{role:'user'|'assistant', content:'...'}]
 * @param {string} newMessage   - Latest user message
 * @param {string} liveContext  - Real-time data injected into system prompt (matches, weather)
 */
export async function sendConciergeMessage(overrideKey, history, newMessage, liveContext = '') {
  const apiKey = resolveKey(overrideKey);

  const systemContent = liveContext
    ? `${STADIUM_SYSTEM_PROMPT}\n\n## LIVE DATA (fetched right now — use this to answer questions about today's matches, weather, scores)\n${liveContext}`
    : STADIUM_SYSTEM_PROMPT;

  const messages = [
    { role: 'system', content: systemContent },
    ...history,
    { role: 'user', content: newMessage },
  ];

  return callOpenRouter(apiKey, messages);
}


/**
 * Smart Navigation — generates step-by-step directions.
 */
export async function generateNavigationInstructions(overrideKey, { from, to, wheelchair, stadium }) {
  const apiKey = resolveKey(overrideKey);

  const messages = [
    {
      role: 'system',
      content: 'You are a stadium navigation assistant for FIFA World Cup 2026. Give concise, numbered step-by-step directions. Use directional cues (left, right, straight, elevator, ramp). Return only the numbered steps, no intro or headers.',
    },
    {
      role: 'user',
      content: `Stadium: ${stadium}
FROM: ${from}
TO: ${to}
Wheelchair/Accessible route required: ${wheelchair ? 'YES — no stairs, ramps and elevators only' : 'No'}

Provide 4–6 numbered steps.`,
    },
  ];

  return callOpenRouter(apiKey, messages);
}

/**
 * Staff Operational Intelligence — analyzes live metrics and returns recommendations.
 */
export async function generateStaffInsights(overrideKey, metrics) {
  const apiKey = resolveKey(overrideKey);

  const messages = [
    {
      role: 'system',
      content: 'You are an AI operations advisor for FIFA World Cup 2026 venue management. Give concise, actionable, bullet-point reports. Use emojis for scannability. Under 280 words.',
    },
    {
      role: 'user',
      content: `Current live stadium metrics:
- Fan Count: ${metrics.fanCount.toLocaleString()} / ${metrics.capacity.toLocaleString()} capacity (${metrics.occupancy}% full)
- Gate B: ${metrics.gateB}% (CRITICAL)
- Gate A: ${metrics.gateA}% | Gate C: ${metrics.gateC}%
- Medical Incidents: ${metrics.medicalIncidents} active
- Security Alerts: ${metrics.securityAlerts}
- Concession Wait: ${metrics.concessionWait} min avg
- Parking Available: ${metrics.parkingAvail}%
- Weather: ${metrics.weather}
- Minutes to Halftime: ${metrics.minsToHalftime.toFixed(0)}

Give me:
1. **Top Priority Alert**
2. **Crowd Management** (2-3 specific actions)
3. **Halftime Preparation**
4. **Sustainability Note**`,
    },
  ];

  return callOpenRouter(apiKey, messages);
}
