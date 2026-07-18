import { describe, it, expect, vi } from 'vitest';
import { hasApiKey, parseGeminiError, resolveKey } from '../gemini.js';

describe('Gemini API Utilities', () => {
  describe('resolveKey', () => {
    it('returns override key when provided', () => {
      expect(resolveKey('my-override-key')).toBe('my-override-key');
    });

    it('trims whitespace from override key', () => {
      expect(resolveKey('  key-with-spaces  ')).toBe('key-with-spaces');
    });

    it('returns a string for valid keys', () => {
      const result = resolveKey('test-key');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('hasApiKey', () => {
    it('returns true if override key is provided', () => {
      expect(hasApiKey('test-key-override')).toBe(true);
    });

    it('returns true for any non-empty, non-placeholder key', () => {
      expect(hasApiKey('sk-or-v1-realkey123')).toBe(true);
      expect(hasApiKey('abc')).toBe(true);
    });

    it('returns false for placeholder key', () => {
      expect(hasApiKey('your_openrouter_api_key_here')).toBe(false);
    });

    it('returns a boolean', () => {
      expect(typeof hasApiKey('key')).toBe('boolean');
      expect(typeof hasApiKey('')).toBe('boolean');
    });
  });

  describe('parseGeminiError', () => {
    it('handles NO_API_KEY error', () => {
      const result = parseGeminiError(new Error('NO_API_KEY'));
      expect(result).toContain('No API key configured');
    });

    it('handles rate limit errors (429)', () => {
      expect(parseGeminiError(new Error('429 Rate limit exceeded'))).toContain('Rate limit reached');
      expect(parseGeminiError(new Error('quota exceeded'))).toContain('Rate limit reached');
    });

    it('handles unauthorized errors (401)', () => {
      expect(parseGeminiError(new Error('401 Unauthorized'))).toContain('Invalid API key');
    });

    it('handles forbidden errors (403)', () => {
      expect(parseGeminiError('403 Forbidden')).toContain('Access denied');
    });

    it('handles not found errors (404)', () => {
      expect(parseGeminiError('404 Not Found')).toContain('Model not found');
    });

    it('handles network errors', () => {
      expect(parseGeminiError(new Error('network connection failed'))).toContain('Network error');
      expect(parseGeminiError(new Error('fetch failed'))).toContain('Network error');
    });

    it('truncates generic errors to first line', () => {
      const result = parseGeminiError(new Error('Some generic error\nsecond line'));
      expect(result).toBe('Some generic error');
      expect(result).not.toContain('\n');
    });

    it('handles non-Error inputs gracefully', () => {
      expect(typeof parseGeminiError('string error')).toBe('string');
      expect(typeof parseGeminiError(null)).toBe('string');
      expect(typeof parseGeminiError(undefined)).toBe('string');
      expect(typeof parseGeminiError(42)).toBe('string');
    });

    it('limits output length for very long errors', () => {
      const longError = new Error('x'.repeat(500));
      const result = parseGeminiError(longError);
      expect(result.length).toBeLessThanOrEqual(150);
    });
  });
});
