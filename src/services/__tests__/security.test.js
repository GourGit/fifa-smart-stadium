import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  sanitizeInput,
  sanitizeForDisplay,
  RateLimiter,
  hashPassword,
  recordFailedLogin,
  resetLoginAttempts,
  isLoginLocked,
  getLockoutRemaining
} from '../security.js';

describe('Security Utilities', () => {
  describe('Input Sanitization', () => {
    it('sanitizeInput strips dangerous tags and attributes (6+ cases)', () => {
      // 1. Script tag
      expect(sanitizeInput('<script>alert("xss")</script>hello')).toBe('hello');
      // 2. Iframe tag
      expect(sanitizeInput('<iframe src="javascript:alert()"></iframe>world')).toBe('world');
      // 3. Onclick attribute
      expect(sanitizeInput('<button onclick="steal()">click</button>')).toBe('&lt;button &gt;click&lt;/button&gt;');
      // 4. Javascript pseudo-protocol
      expect(sanitizeInput('javascript:alert(1)')).toBe('alert(1)');
      // 5. Data URI text/html
      expect(sanitizeInput('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTs8L3NjcmlwdD4=')).toBe(';base64,PHNjcmlwdD5hbGVydCgxKTs8L3NjcmlwdD4=');
      // 6. Normal string
      expect(sanitizeInput('Just a normal string')).toBe('Just a normal string');
      // 7. HTML entities escaped
      expect(sanitizeInput('A & B < C > D "E" \'F\'')).toBe('A &amp; B &lt; C &gt; D &quot;E&quot; &#x27;F&#x27;');
    });

    it('sanitizeForDisplay strips dangerous tags but leaves safe HTML', () => {
      expect(sanitizeForDisplay('<script>alert("xss")</script><b>Hello</b>')).toBe('<b>Hello</b>');
      expect(sanitizeForDisplay('<iframe src="x"></iframe><p>world</p>')).toBe('<p>world</p>');
      expect(sanitizeForDisplay('<div onclick="x()">Test</div>')).toBe('<div >Test</div>');
    });
  });

  describe('RateLimiter', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('canProceed returns true until limit, then false', () => {
      const limiter = new RateLimiter(3, 1000);
      expect(limiter.canProceed()).toBe(true);
      expect(limiter.canProceed()).toBe(true);
      expect(limiter.canProceed()).toBe(true);
      expect(limiter.canProceed()).toBe(false);
    });

    it('getWaitTime returns expected wait time', () => {
      const limiter = new RateLimiter(1, 1000);
      limiter.canProceed();
      expect(limiter.getWaitTime()).toBeGreaterThan(0);
      expect(limiter.getWaitTime()).toBeLessThanOrEqual(1000);
    });

    it('window expiry resets requests', () => {
      const limiter = new RateLimiter(1, 1000);
      expect(limiter.canProceed()).toBe(true);
      expect(limiter.canProceed()).toBe(false);

      vi.advanceTimersByTime(1001);

      expect(limiter.canProceed()).toBe(true);
    });
  });

  describe('Password Hashing', () => {
    it('returns consistent SHA-256 hex string, different passwords give different hashes', async () => {
      const hash1 = await hashPassword('password123');
      const hash2 = await hashPassword('password123');
      const hash3 = await hashPassword('different');
      
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 is 64 hex chars
      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
    });
  });

  describe('Brute Force Protection', () => {
    beforeEach(() => {
      resetLoginAttempts();
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('recordFailedLogin 5 times triggers lockout and gets remaining time', () => {
      expect(isLoginLocked()).toBe(false);
      
      for (let i = 0; i < 5; i++) {
        recordFailedLogin();
      }

      expect(isLoginLocked()).toBe(true);
      const remaining = getLockoutRemaining();
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(120); // 2 minutes
    });

    it('lockout expires correctly', () => {
      for (let i = 0; i < 5; i++) {
        recordFailedLogin();
      }
      expect(isLoginLocked()).toBe(true);

      vi.advanceTimersByTime(2 * 60 * 1000 + 1000); // 2 mins + 1s

      expect(isLoginLocked()).toBe(false);
      expect(getLockoutRemaining()).toBe(0);
    });
  });
});
