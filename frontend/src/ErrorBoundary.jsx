import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || 'Unknown frontend error',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <main style={{ padding: '2rem', fontFamily: 'monospace', color: '#ff6f61', background: '#090c11', minHeight: '100vh' }}>
          <h2 style={{ marginTop: 0 }}>UroFlow UI failed to render</h2>
          <p>{this.state.message}</p>
          <p>Open DevTools to inspect the stack and restart the app after fixes.</p>
        </main>
      );
    }
    return this.props.children;
  }
}
