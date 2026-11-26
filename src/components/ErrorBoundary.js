import React from 'react';
import '../pages/PageStyles.css';

/**
 * The last line of defence against a white page.
 *
 * Without a boundary, any render error anywhere unmounted the whole app — PokéWorld did
 * exactly that whenever its session lapsed and a list endpoint answered 401. This keeps
 * the failure to a styled page with a way out, and resets when the route changes so one
 * broken page does not poison the rest of the visit.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Genuinely useful in production too: this is the only trace of what broke.
    console.error('Page crashed:', error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="lx-state" role="alert" style={{ minHeight: '100vh', background: '#0a0a0f' }}>
        <h1>Something went wrong</h1>
        <p>This page hit an error it could not recover from. Reloading usually fixes it.</p>
        <div className="lx-state__actions">
          <button type="button" className="lx-btn lx-btn--primary" onClick={() => window.location.reload()}>
            Reload
          </button>
          <a className="lx-btn lx-btn--secondary" href="/">Go to the home page</a>
        </div>
      </main>
    );
  }
}

export default ErrorBoundary;
