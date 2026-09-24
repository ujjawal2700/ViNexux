import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('RootErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', fontFamily: 'sans-serif', textAlign: 'center', background: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h2 style={{ color: '#800020', marginBottom: '8px' }}>Something went wrong</h2>
          <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '500px' }}>
            {this.state.error?.message || 'An unexpected error occurred during rendering.'}
          </p>
          <button
            onClick={() => {
              localStorage.clear();
              sessionStorage.clear();
              window.location.href = '/';
            }}
            style={{ marginTop: '20px', padding: '10px 24px', background: '#800020', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
          >
            Clear Cache &amp; Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </RootErrorBoundary>
  </React.StrictMode>
);
