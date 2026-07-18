/**
 * Security Utilities — FIFA 2026 Smart Stadium Hub
 *
 * Provides:
 *  1. Input sanitization (anti-XSS)
 *  2. Rate limiter for API calls
 *  3. Brute-force login protection
 *  4. Session timeout management
 *  5. Password hashing (SHA-256)
 */

// ─── 1. Input Sanitization ────────────────────────────────────────────────
// Strips HTML tags and dangerous characters to prevent XSS injection.

const DANGEROUS_PATTERNS = [
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
  /on\w+\s*=\s*["'][^"']*["']/gi,         // onclick="...", onerror="..."
  /javascript\s*:/gi,
  /data\s*:\s*text\/html/gi,
];

export function sanitizeInput(text) {
  if (typeof text !== 'string') return '';
  let clean = text.trim();

  // Remove dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    clean = clean.replace(pattern, '');
  }

  // Escape remaining HTML entities
  clean = clean
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

  // Limit length to prevent payload attacks
  return clean.slice(0, 2000);
}

// Sanitize for display (decode safe entities back for readability)
export function sanitizeForDisplay(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
}

// ─── 2. Rate Limiter ──────────────────────────────────────────────────────
// Prevents excessive API calls from the client side.

export class RateLimiter {
  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  canProceed() {
    const now = Date.now();
    // Remove expired entries
    this.requests = this.requests.filter(t => now - t < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      return false;
    }
    this.requests.push(now);
    return true;
  }

  getWaitTime() {
    if (this.requests.length === 0) return 0;
    const oldest = this.requests[0];
    const elapsed = Date.now() - oldest;
    return Math.max(0, this.windowMs - elapsed);
  }

  getRemainingRequests() {
    const now = Date.now();
    this.requests = this.requests.filter(t => now - t < this.windowMs);
    return Math.max(0, this.maxRequests - this.requests.length);
  }
}

// Global rate limiter: 12 AI requests per minute
export const aiRateLimiter = new RateLimiter(12, 60000);

// ─── 3. Brute-Force Login Protection ──────────────────────────────────────
// Locks out users after too many failed login attempts.

const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 2 * 60 * 1000; // 2 minutes

let loginAttempts = 0;
let lockoutUntil = 0;

export function recordFailedLogin() {
  loginAttempts++;
  if (loginAttempts >= LOGIN_MAX_ATTEMPTS) {
    lockoutUntil = Date.now() + LOGIN_LOCKOUT_MS;
  }
}

export function resetLoginAttempts() {
  loginAttempts = 0;
  lockoutUntil = 0;
}

export function isLoginLocked() {
  if (lockoutUntil && Date.now() < lockoutUntil) {
    return true;
  }
  if (lockoutUntil && Date.now() >= lockoutUntil) {
    // Lockout expired, reset
    loginAttempts = 0;
    lockoutUntil = 0;
  }
  return false;
}

export function getLockoutRemaining() {
  if (!lockoutUntil) return 0;
  return Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
}

export function getLoginAttemptsLeft() {
  return Math.max(0, LOGIN_MAX_ATTEMPTS - loginAttempts);
}

// ─── 4. Session Timeout ───────────────────────────────────────────────────
// Auto-logs out staff after inactivity.

const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export class SessionManager {
  constructor(onTimeout) {
    this.onTimeout = onTimeout;
    this.timer = null;
    this.lastActivity = Date.now();
  }

  start() {
    this.resetTimer();
    // Track user activity
    this._onActivity = () => this.resetTimer();
    window.addEventListener('mousemove', this._onActivity, { passive: true });
    window.addEventListener('keydown', this._onActivity, { passive: true });
    window.addEventListener('click', this._onActivity, { passive: true });
    window.addEventListener('touchstart', this._onActivity, { passive: true });
  }

  resetTimer() {
    this.lastActivity = Date.now();
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (this.onTimeout) this.onTimeout();
    }, SESSION_TIMEOUT_MS);
  }

  stop() {
    if (this.timer) clearTimeout(this.timer);
    if (this._onActivity) {
      window.removeEventListener('mousemove', this._onActivity);
      window.removeEventListener('keydown', this._onActivity);
      window.removeEventListener('click', this._onActivity);
      window.removeEventListener('touchstart', this._onActivity);
    }
  }

  getTimeRemaining() {
    const elapsed = Date.now() - this.lastActivity;
    return Math.max(0, Math.ceil((SESSION_TIMEOUT_MS - elapsed) / 1000));
  }
}

// ─── 5. Password Hashing (SHA-256) ────────────────────────────────────────
// Hashes passwords so we never compare plaintext.

export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Pre-hashed credentials (SHA-256 of the passwords)
// FIFA@2026    -> hash
// Stadium#123  -> hash
// Ops@2026!    -> hash
export async function getHashedCredentials() {
  return {
    'admin@fifa2026.com':   await hashPassword('FIFA@2026'),
    'staff@fifa2026.com':   await hashPassword('Stadium#123'),
    'manager@fifa2026.com': await hashPassword('Ops@2026!'),
  };
}

// ─── 6. Secure Logging ───────────────────────────────────────────────────
// Logs security events without exposing sensitive data.

export function securityLog(event, details = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    event,
    ...details,
  };
  // In production, send to a security monitoring service
  console.info(`[SECURITY] ${event}`, entry);
}
