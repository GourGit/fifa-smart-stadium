/**
 * @module ErrorBoundary
 * @description React Error Boundary component that catches rendering errors
 * and displays a user-friendly fallback UI instead of crashing the app.
 */
import { Component } from 'react';
import PropTypes from 'prop-types';

/**
 * @class ErrorBoundary
 * @extends Component
 *
 * @example
 * <ErrorBoundary>
 *   <ChatConcierge />
 * </ErrorBoundary>
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-container" role="alert">
          <div className="error-boundary-icon">⚠️</div>
          <h3 className="error-boundary-title">Something went wrong</h3>
          <p className="error-boundary-message">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            className="error-boundary-btn"
            onClick={this.handleRetry}
          >
            🔄 Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  /** Child components to wrap with error handling */
  children: PropTypes.node.isRequired,
};

export default ErrorBoundary;
