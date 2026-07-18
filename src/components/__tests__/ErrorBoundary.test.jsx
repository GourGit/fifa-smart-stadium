import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from '../../components/ErrorBoundary';

// Component that always throws
function ThrowingComponent() {
  throw new Error('Test explosion');
}

// Component that renders fine
function SafeComponent() {
  return <div data-testid="safe">Safe content</div>;
}

describe('ErrorBoundary Component', () => {
  // Suppress React error boundary console output during tests
  const originalError = console.error;
  beforeEach(() => {
    console.error = (...args) => {
      if (typeof args[0] === 'string' && args[0].includes('React will try to recreate')) return;
      if (typeof args[0] === 'string' && args[0].includes('The above error occurred')) return;
      if (typeof args[0] === 'string' && args[0].includes('ErrorBoundary')) return;
      originalError.call(console, ...args);
    };
  });
  afterEach(() => {
    console.error = originalError;
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <SafeComponent />
      </ErrorBoundary>
    );
    expect(screen.getByTestId('safe')).toBeInTheDocument();
    expect(screen.getByText('Safe content')).toBeInTheDocument();
  });

  it('renders error fallback when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test explosion')).toBeInTheDocument();
  });

  it('shows a retry button in error state', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    const retryBtn = screen.getByText('🔄 Try Again');
    expect(retryBtn).toBeInTheDocument();
    expect(retryBtn.tagName).toBe('BUTTON');
  });

  it('has alert role for accessibility', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
