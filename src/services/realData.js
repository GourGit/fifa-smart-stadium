/**
 * Real Data Service — FIFA 2026 Smart Stadium Hub
 *
 * Integrates publicly available, real-time data feeds:
 *  1. Open-Meteo  — Real weather at stadium GPS coordinates (no API key needed)
 *  2. ESPN API    — Live FIFA World Cup 2026 match scores & schedule (no API key needed)
 *
 * ⚠️  Crowd density, gate counters, medical dispatch, and concession wait times
 *     require proprietary stadium hardware (SKIDATA, Nedap, Genetec, etc.) and
 *     are NOT available via any public API. Those fields are clearly labelled
 *     as "Sensor Required" in the UI.
 */

// ─── Stadium Registry ─────────────────────────────────────────────────────
// Real GPS coordinates for every FIFA 2026 host stadium.
export const STADIUMS = {
  'MetLife Stadium, New Jersey': {
    lat: 40.8135, lon: -74.0745, city: 'East Rutherford, NJ', capacity: 82500, timezone: 'America/New_York',
  },
  'AT&T Stadium, Dallas': {
    lat: 32.7473, lon: -97.0945, city: 'Arlington, TX', capacity: 80000, timezone: 'America/Chicago',
  },
  'SoFi Stadium, Los Angeles': {
    lat: 33.9535, lon: -118.3392, city: 'Inglewood, CA', capacity: 70240, timezone: 'America/Los_Angeles',
  },
  'Rose Bowl, Pasadena': {
    lat: 34.1613, lon: -118.1676, city: 'Pasadena, CA', capacity: 88565, timezone: 'America/Los_Angeles',
  },
  "Levi's Stadium, San Francisco": {
    lat: 37.4033, lon: -121.9694, city: 'Santa Clara, CA', capacity: 68500, timezone: 'America/Los_Angeles',
  },
  'Arrowhead Stadium, Kansas City': {
    lat: 39.0489, lon: -94.4839, city: 'Kansas City, MO', capacity: 76416, timezone: 'America/Chicago',
  },
  'Hard Rock Stadium, Miami': {
    lat: 25.9580, lon: -80.2389, city: 'Miami Gardens, FL', capacity: 64767, timezone: 'America/New_York',
  },
  'Gillette Stadium, Boston': {
    lat: 42.0909, lon: -71.2643, city: 'Foxborough, MA', capacity: 65878, timezone: 'America/New_York',
  },
  'Mercedes-Benz Stadium, Atlanta': {
    lat: 33.7553, lon: -84.4006, city: 'Atlanta, GA', capacity: 71000, timezone: 'America/New_York',
  },
  'BC Place, Vancouver': {
    lat: 49.2766, lon: -123.1118, city: 'Vancouver, BC', capacity: 54500, timezone: 'America/Vancouver',
  },
  'BMO Field, Toronto': {
    lat: 43.6333, lon: -79.4167, city: 'Toronto, ON', capacity: 30000, timezone: 'America/Toronto',
  },
  'Estadio Azteca, Mexico City': {
    lat: 19.3029, lon: -99.1505, city: 'Mexico City, MX', capacity: 87523, timezone: 'America/Mexico_City',
  },
  'Estadio BBVA, Monterrey': {
    lat: 25.6694, lon: -100.2436, city: 'Monterrey, MX', capacity: 53500, timezone: 'America/Monterrey',
  },
};

// ─── 1. REAL WEATHER (Open-Meteo) ─────────────────────────────────────────
// Open-Meteo is a free, open-source weather API — no API key required.
// Docs: https://open-meteo.com/en/docs

const WMO_CODES = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Foggy', 48: 'Icy fog', 51: 'Light drizzle', 53: 'Moderate drizzle',
  55: 'Dense drizzle', 61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
  71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow', 80: 'Slight showers',
  81: 'Moderate showers', 82: 'Violent showers', 95: 'Thunderstorm',
  96: 'Thunderstorm w/ hail', 99: 'Thunderstorm w/ heavy hail',
};

const WMO_ICONS = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌧️', 61: '🌧️', 63: '🌧️', 65: '🌧️',
  71: '❄️', 73: '❄️', 75: '❄️', 80: '🌦️', 81: '🌧️', 82: '⛈️',
  95: '⛈️', 96: '⛈️', 99: '⛈️',
};

export async function fetchRealWeather(stadiumName) {
  const stadium = STADIUMS[stadiumName];
  if (!stadium) throw new Error(`Unknown stadium: ${stadiumName}`);

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${stadium.lat}&longitude=${stadium.lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weathercode&temperature_unit=celsius&wind_speed_unit=kmh&timezone=${encodeURIComponent(stadium.timezone)}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
  const data = await res.json();

  const c = data.current;
  const code = c.weathercode;
  const tempC = Math.round(c.temperature_2m);
  const tempF = Math.round(tempC * 9 / 5 + 32);
  const feels = Math.round(c.apparent_temperature);
  const humidity = c.relative_humidity_2m;
  const wind = Math.round(c.wind_speed_10m);
  const icon = WMO_ICONS[code] ?? '🌡️';
  const desc = WMO_CODES[code] ?? 'Unknown';

  // Heat advisory threshold: feels > 35°C
  const heatAdvisory = feels > 35;

  return {
    tempC,
    tempF,
    feelsLikeC: feels,
    humidity,
    windKmh: wind,
    condition: desc,
    icon,
    heatAdvisory,
    summary: `${icon} ${desc}, ${tempC}°C / ${tempF}°F (Feels ${feels}°C) · Humidity ${humidity}% · Wind ${wind} km/h${heatAdvisory ? ' ⚠️ Heat Advisory' : ''}`,
    source: 'Open-Meteo (Real)',
    city: stadium.city,
  };
}

// ─── 2. REAL MATCH DATA (ESPN Public API) ─────────────────────────────────
// ESPN's public scoreboard endpoint — no API key required.

export async function fetchLiveMatches() {
  // ESPN public API for FIFA World Cup scoreboard
  const url = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Match API error: ${res.status}`);
  const data = await res.json();

  const events = data.events || [];

  return events.slice(0, 6).map((event) => {
    const comp = event.competitions?.[0];
    const home = comp?.competitors?.find(c => c.homeAway === 'home');
    const away = comp?.competitors?.find(c => c.homeAway === 'away');
    const status = comp?.status?.type;

    return {
      id: event.id,
      name: event.name || event.shortName,
      homeTeam: home?.team?.displayName || home?.team?.name || '?',
      homeFlag: home?.team?.flag ?? '',
      homeScore: home?.score ?? '-',
      awayTeam: away?.team?.displayName || away?.team?.name || '?',
      awayFlag: away?.team?.flag ?? '',
      awayScore: away?.score ?? '-',
      venue: event.competitions?.[0]?.venue?.fullName || 'Unknown Venue',
      statusText: status?.shortDetail || status?.description || 'Scheduled',
      isLive: status?.state === 'in',
      isCompleted: status?.state === 'post',
      clock: comp?.status?.displayClock || '',
      date: event.date,
    };
  });
}

// ─── 3. DATA SOURCE MANIFEST ───────────────────────────────────────────────
// Clearly documents what is real vs. what requires hardware for transparency.
export const DATA_SOURCES = [
  {
    field: 'Weather',
    source: 'Open-Meteo API',
    isReal: true,
    url: 'https://open-meteo.com',
    note: 'Real-time sensor data from meteorological stations near each stadium.',
  },
  {
    field: 'Live Match Scores & Schedule',
    source: 'ESPN Public API',
    isReal: true,
    url: 'https://www.espn.com',
    note: 'Real FIFA 2026 match data updated every 30 seconds.',
  },
  {
    field: 'Fan Count / Gate Congestion',
    source: 'SKIDATA / Nedap Turnstile Hardware',
    isReal: false,
    url: 'https://www.skidata.com',
    note: 'Requires proprietary stadium turnstile hardware SDK integration. Not publicly available.',
  },
  {
    field: 'Medical Incidents',
    source: 'Stadium EMS Dispatch System',
    isReal: false,
    url: null,
    note: 'Requires direct integration with venue\'s internal EMS/CAD system. Private API.',
  },
  {
    field: 'Concession Wait Times',
    source: 'POS / Queue Management System',
    isReal: false,
    url: null,
    note: 'Requires integration with vendor POS systems (e.g., Oracle Hospitality, SpotOn). Private API.',
  },
  {
    field: 'Parking Availability',
    source: 'Parking IoT Sensors',
    isReal: false,
    url: null,
    note: 'Requires integration with parking lot sensors or permit management system.',
  },
];
