import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useDebounce } from '../../hooks/useDebounce';
import { renderHook, act } from '@testing-library/react';

describe('useDebounce Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 300));
    expect(result.current).toBe('hello');
  });

  it('does not update value before delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 300 } }
    );

    rerender({ value: 'updated', delay: 300 });
    act(() => vi.advanceTimersByTime(100));
    expect(result.current).toBe('initial');
  });

  it('updates value after delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 300 } }
    );

    rerender({ value: 'updated', delay: 300 });
    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe('updated');
  });

  it('resets timer on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'a', delay: 300 } }
    );

    rerender({ value: 'b', delay: 300 });
    act(() => vi.advanceTimersByTime(100));
    rerender({ value: 'c', delay: 300 });
    act(() => vi.advanceTimersByTime(100));
    rerender({ value: 'd', delay: 300 });
    act(() => vi.advanceTimersByTime(300));

    // Only final value should appear
    expect(result.current).toBe('d');
  });

  it('uses default delay of 300ms', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value),
      { initialProps: { value: 'start' } }
    );

    rerender({ value: 'end' });
    act(() => vi.advanceTimersByTime(299));
    expect(result.current).toBe('start');
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe('end');
  });

  it('works with numeric values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 0, delay: 200 } }
    );

    rerender({ value: 42, delay: 200 });
    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe(42);
  });
});
