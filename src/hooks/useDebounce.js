/**
 * @module useDebounce
 * @description Custom hook that debounces a value by a specified delay.
 * Useful for preventing excessive API calls on rapid user input.
 */
import { useState, useEffect } from 'react';

/**
 * Returns a debounced version of the provided value.
 *
 * @template T
 * @param {T} value - The value to debounce
 * @param {number} [delay=300] - Debounce delay in milliseconds
 * @returns {T} The debounced value
 *
 * @example
 * const debouncedSearch = useDebounce(searchTerm, 400);
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
