import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { STADIUMS, DATA_SOURCES, fetchRealWeather } from '../realData.js';

describe('Real Data Utilities', () => {
  describe('STADIUMS registry', () => {
    it('has at least 10 entries with lat/lon/capacity/timezone/city', () => {
      const keys = Object.keys(STADIUMS);
      expect(keys.length).toBeGreaterThanOrEqual(10);
      
      for (const key of keys) {
        const stadium = STADIUMS[key];
        expect(stadium).toHaveProperty('lat');
        expect(stadium).toHaveProperty('lon');
        expect(stadium).toHaveProperty('capacity');
        expect(stadium).toHaveProperty('timezone');
        expect(stadium).toHaveProperty('city');
        expect(typeof stadium.lat).toBe('number');
        expect(typeof stadium.lon).toBe('number');
      }
    });
  });

  describe('DATA_SOURCES', () => {
    it('has both real and non-real entries', () => {
      expect(DATA_SOURCES.length).toBeGreaterThan(0);
      const hasReal = DATA_SOURCES.some(src => src.isReal === true);
      const hasNonReal = DATA_SOURCES.some(src => src.isReal === false);
      expect(hasReal).toBe(true);
      expect(hasNonReal).toBe(true);
    });
  });

  describe('fetchRealWeather', () => {
    let originalFetch;

    beforeEach(() => {
      originalFetch = global.fetch;
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('throws on unknown stadium name', async () => {
      await expect(fetchRealWeather('Unknown Stadium')).rejects.toThrow('Unknown stadium: Unknown Stadium');
    });

    it('fetches real weather successfully and maps WMO codes', async () => {
      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          current: {
            temperature_2m: 25.5,
            apparent_temperature: 28,
            relative_humidity_2m: 60,
            wind_speed_10m: 15,
            weathercode: 0 // Clear sky
          }
        })
      });

      const weather = await fetchRealWeather('MetLife Stadium, New Jersey');
      
      expect(global.fetch).toHaveBeenCalled();
      expect(weather.tempC).toBe(26); // Math.round(25.5)
      expect(weather.condition).toBe('Clear sky');
      expect(weather.icon).toBe('☀️');
      expect(weather.city).toBe('East Rutherford, NJ');
    });
  });
});
