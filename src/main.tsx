

import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errorMessage: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: any) {
    return {
      hasError: true,
      errorMessage: error?.message || String(error || 'Unknown error'),
    };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('LiViA RootErrorBoundary caught error:', error, errorInfo);
  }

  handleForceRefresh = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {
      // ignore
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#0D0F12] text-zinc-100 flex items-center justify-center p-4 font-sans">
          <div className="max-w-md w-full bg-[#16181D] border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h1 className="text-lg font-bold text-emerald-400">
              LiViA Editor™ — Ripristino Avvio
            </h1>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Si è verificato un errore durante il caricamento dell&apos;interfaccia (spesso dovuto a una cache PWA non aggiornata).
            </p>
            {this.state.errorMessage && (
              <pre className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-red-300 overflow-x-auto">
                {this.state.errorMessage}
              </pre>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleForceRefresh}
                className="flex-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Aggiorna Cache e Ricarica
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>,
);
