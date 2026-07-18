/**
 * @module useRealTimeData
 * @description Custom hook for fetching and managing real-time data feeds.
 * Centralizes Open-Meteo weather and ESPN match data fetching logic
 * with automatic refresh intervals and error handling.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchRealWeather, fetchLiveMatches, STADIUMS } from '../services/realData';

/** @constant {number} Weather refresh interval in milliseconds (10 minutes) */
const WEATHER_INTERVAL_MS = 10 * 60 * 1000;

/** @constant {number} Match refresh interval in milliseconds (60 seconds) */
const MATCH_INTERVAL_MS = 60 * 1000;

/**
 * @typedef {'loading'|'ok'|'error'} FeedStatus
 */

/**
 * @typedef {Object} RealTimeData
 * @property {Object|null} weather - Current weather data from Open-Meteo
 * @property {Array} matches - Live match data from ESPN
 * @property {FeedStatus} status - Current feed status
 * @property {Function} refreshWeather - Manually trigger weather refresh
 * @property {Function} refreshMatches - Manually trigger match refresh
 */

/**
 * Hook that fetches real-time weather and match data with automatic polling.
 *
 * @param {string} stadiumName - Key from STADIUMS registry
 * @returns {RealTimeData}
 *
 * @example
 * const { weather, matches, status } = useRealTimeData('MetLife Stadium, New Jersey');
 */
export function useRealTimeData(stadiumName) {
  const [weather, setWeather]   = useState(null);
  const [matches, setMatches]   = useState([]);
  const [status, setStatus]     = useState(/** @type {FeedStatus} */ ('loading'));
  const mountedRef              = useRef(true);

  const refreshWeather = useCallback(async () => {
    if (!STADIUMS[stadiumName]) return;
    try {
      const data = await fetchRealWeather(stadiumName);
      if (mountedRef.current) {
        setWeather(data);
        setStatus((prev) => prev === 'loading' ? 'ok' : prev);
      }
    } catch {
      if (mountedRef.current) setStatus('error');
    }
  }, [stadiumName]);

  const refreshMatches = useCallback(async () => {
    try {
      const data = await fetchLiveMatches();
      if (mountedRef.current) {
        setMatches(data);
        setStatus('ok');
      }
    } catch {
      if (mountedRef.current) setStatus('error');
    }
  }, []);

  // Initial fetch + polling
  useEffect(() => {
    mountedRef.current = true;
    setStatus('loading');

    const loadAll = async () => {
      await Promise.allSettled([refreshWeather(), refreshMatches()]);
    };
    loadAll();

    const weatherTimer = setInterval(refreshWeather, WEATHER_INTERVAL_MS);
    const matchTimer   = setInterval(refreshMatches, MATCH_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      clearInterval(weatherTimer);
      clearInterval(matchTimer);
    };
  }, [refreshWeather, refreshMatches]);

  return { weather, matches, status, refreshWeather, refreshMatches };
}
