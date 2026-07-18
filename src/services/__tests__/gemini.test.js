import { describe, it, expect } from 'vitest';
import { hasApiKey, parseGeminiError, resolveKey } from '../gemini.js';

describe('Gemini API Utilities', () => {
  describe('resolveKey', () => {
    it('returns override key when provided', () => {
      expect(resolveKey('my-override-key')).toBe('my-override-key');
    });

    it('falls back to env key if no override provided', () => {
      // Assuming ENV_API_KEY is empty or not set in tests, it will throw NO_API_KEY
      expect(() => resolveKey('')).toThrow('NO_API_KEY');
    });
  });

  describe('hasApiKey', () => {
    it('returns true if override key is provided', () => {
      expect(hasApiKey('test-key-override')).toBe(true);
    });

    it('returns false for dummy keys and empty strings', () => {
      expect(hasApiKey('')).toBe(false);
      expect(hasApiKey('your_openrouter_api_key_here')).toBe(false);
    });
  });

  describe('parseGeminiError', () => {
    it('extracts message from Error objects and strings', () => {
      expect(parseGeminiError(new Error('NO_API_KEY'))).toContain('No API key configured');
      expect(parseGeminiError(new Error('429 Rate limit exceeded'))).toContain('Rate limit reached');
      expect(parseGeminiError(new Error('401 Unauthorized'))).toContain('Invalid API key');
      expect(parseGeminiError('403 Forbidden')).toContain('Access denied');
      expect(parseGeminiError('404 Not Found')).toContain('Model not found');
      expect(parseGeminiError(new Error('network connection failed'))).toContain('Network error');
      
      // generic error
      expect(parseGeminiError(new Error('Some generic error\nsecond line'))).toBe('Some generic error');
    });
  });
});
