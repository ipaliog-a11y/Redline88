import React from 'react';
import { clearLocalSave } from '../services/storage';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error?.message || 'Unexpected application error.',
    };
  }

  componentDidCatch(error: Error): void {
    console.error('REDLINE 88 ErrorBoundary caught:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#0d0b14] text-[#f4f1e6] flex items-center justify-center p-6">
          <div className="arcade-panel max-w-lg w-full p-6 space-y-4">
            <h1 className="font-pixel text-base text-[#ff4d2e]">
              SYSTEM FAULT
            </h1>
            <p className="text-sm text-[#cbd5e1] leading-relaxed break-words">
              {this.state.message}
            </p>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="arcade-btn px-5 py-2.5 bg-[#ff4d2e] hover:bg-[#ff6247] text-white font-semibold text-sm whitespace-nowrap cursor-pointer"
              >
                Reload Game
              </button>
              <button
                type="button"
                onClick={() => {
                  clearLocalSave();
                  window.location.reload();
                }}
                className="arcade-btn px-4 py-2.5 bg-[#1b243b] hover:bg-[#253152] border border-[#495f8f]/70 text-[#cbd5e1] font-semibold text-sm whitespace-nowrap cursor-pointer"
              >
                Reset Local Cache &amp; Reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
