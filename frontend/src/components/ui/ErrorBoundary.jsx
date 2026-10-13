import React from 'react';

export default class ErrorBoundary extends React.Component {
  state = { error: null, componentStack: '' };

  static getDerivedStateFromError(error) { return { error }; }

  componentDidCatch(error, info) {
    this.setState({ componentStack: info.componentStack || '' });
    console.error('Page rendering failed', {
      page: this.props.pathname || window.location.pathname,
      message: error.message, stack: error.stack, componentStack: info.componentStack,
    });
  }

  goBack = () => {
    if (this.props.onBack) { this.props.onBack(); return; }
    if (window.history.length > 1) {
      window.addEventListener('popstate', () => window.location.reload(), { once: true });
      window.history.back();
    } else window.location.assign(window.location.pathname.startsWith('/admin') ? '/admin/dashboard' : '/');
  };

  render() {
    if (!this.state.error) return this.props.children;
    const pathname = this.props.pathname || window.location.pathname;
    return <section role="alert" className={`flex flex-col items-center justify-center bg-white px-6 py-12 text-center ${this.props.embedded ? 'min-h-96 rounded-xl border border-slate-200' : 'min-h-screen'}`}>
      <h1 className="text-2xl font-semibold text-slate-900">This page ran into a problem</h1>
      <p className="mt-3 max-w-lg text-sm text-slate-500">Refresh to try this page again, or go back to the previous page.</p>
      <p className="mt-3 text-xs text-slate-500">Page: <span className="font-mono text-slate-700">{pathname}</span></p>
      <div className="mt-6 flex gap-3">
        <button onClick={() => window.location.reload()} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white">Refresh</button>
        <button onClick={this.goBack} className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700">Go back</button>
      </div>
      <details className="mt-6 w-full max-w-xl rounded-lg border border-slate-200 p-4 text-left text-xs text-slate-600">
        <summary className="cursor-pointer font-semibold">Error details</summary>
        <p className="mt-3 break-words">{this.state.error.message || 'An unexpected rendering error occurred.'}</p>
        {this.state.componentStack && <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap break-words text-[11px]">{this.state.componentStack}</pre>}
      </details>
    </section>;
  }
}
