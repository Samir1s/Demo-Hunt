import React from 'react';
import { useGameStore } from '../store/gameStore';

const ErrorToast: React.FC = () => {
  const { error, setError } = useGameStore();

  if (!error) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-bounce">
      <div className="bg-bg-dark border border-brand-red px-6 py-3 shadow-[0_0_15px_rgba(255,0,60,0.5)] flex items-center justify-between min-w-[300px]">
        <div className="flex items-center space-x-3">
          <div className="w-2 h-2 bg-brand-red animate-pulse-slow"></div>
          <span className="text-brand-red font-mono text-sm tracking-wider uppercase">{error}</span>
        </div>
        <button 
          onClick={() => setError(null)}
          className="text-brand-red/70 hover:text-brand-red ml-4 font-bold text-xl leading-none"
        >
          &times;
        </button>
      </div>
    </div>
  );
};

export default ErrorToast;
