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
        <div className="min-h-screen w-full bg-[#141218] text-[#f4ecd8] flex items-center justify-center p-6">
          <div className="ng-plate-gold max-w-lg w-full overflow-hidden">
            <div className="ng-hazard-bar h-2.5 w-full" />
            <div className="p-6 space-y-4">
              <h1 className="font-pixel text-base text-[#e83b24] pixel-text-shadow">
                SYSTEM FAULT
              </h1>
              <p className="text-sm font-mono-num text-[#b8c0cc] leading-relaxed break-words ng-vfd p-3">
                {this.state.message}
              </p>
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="ng-keycap px-5 py-2.5 bg-[#e83b24] hover:bg-[#ff563f] border-2 border-[#141218] text-white font-pixel text-[10px] whitespace-nowrap cursor-pointer"
                >
                  RELOAD GAME
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearLocalSave();
                    window.location.reload();
                  }}
                  className="ng-keycap px-4 py-2.5 bg-[#2c2935] hover:bg-[#3a3647] border-2 border-[#525866] text-[#f4ecd8] font-mono-num font-bold text-xs whitespace-nowrap cursor-pointer"
                >
                  RESET LOCAL CACHE &amp; RELOAD
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
