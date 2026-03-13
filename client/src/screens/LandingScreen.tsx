import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { Hexagon } from 'lucide-react';

const LandingScreen: React.FC = () => {
  const navigate = useNavigate();
  const { connect, connectionStatus, setNickname, createRoom, joinRoom } = useGameStore();

  const [inputName, setInputName] = useState('');
  const [inputRoom, setInputRoom] = useState('');

  // Auto connect socket on mount
  useEffect(() => {
    connect();
  }, [connect]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputName.trim() && inputRoom.trim()) {
      setNickname(inputName.trim());
      joinRoom(inputRoom.trim());
      navigate('/lobby');
    }
  };

  const handleHost = () => {
    if (inputName.trim()) {
      setNickname(inputName.trim());
      createRoom();
      navigate('/lobby');
    } else {
      // Optional: show error message to enter name first
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4">
      {/* Video Background */}
      <video 
        autoPlay 
        loop 
        muted 
        playsInline 
        className="absolute inset-0 w-full h-full object-cover z-0 opacity-40 mix-blend-screen"
      >
        {/* We will need to place this file in public folder later */}
        <source src="/bg.mp4" type="video/mp4" />
      </video>

      {/* Main Content Container */}
      <div className="z-10 w-full max-w-md">
        {/* Header/Title Area */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center space-x-2 border border-status-green/50 bg-status-green/10 px-3 py-1 mb-6 rounded-sm">
            <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-status-green animate-pulse' : 'bg-brand-red animate-pulse'}`}></div>
            <span className={`font-mono text-xs tracking-widest ${connectionStatus === 'connected' ? 'text-status-green' : 'text-brand-red'}`}>
              {connectionStatus === 'connected' ? 'UPLINK ACTIVE' : 'SYSTEM OFFLINE'}
            </span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-2">
            <span className="glitch-text" data-text="DEMOGORGON">DEMOGORGON</span>
          </h1>
          <p className="text-brand-orange text-sm tracking-[0.3em] font-bold">HUNT PROTOCOL &middot; CLASSIFIED</p>
        </div>

        {/* Login Panel */}
        <div className="glass-card mb-8">
          <form onSubmit={handleJoin} className="space-y-6">
            <div>
              <label className="field-label">Agent Codename</label>
              <input 
                type="text" 
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
                placeholder="ENTER IDENTITY..." 
                className="input-field"
                required
              />
            </div>
            
            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-brand-red/20"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-black/80 px-2 text-brand-red/50">AUTHORIZATION REQUIRED</span>
              </div>
            </div>

            <div>
              <label className="field-label">Room Access Code</label>
              <input 
                type="text" 
                value={inputRoom}
                onChange={(e) => setInputRoom(e.target.value)}
                placeholder="---" 
                className="input-field text-2xl tracking-[0.5em]"
                maxLength={6}
              />
            </div>

            <button type="submit" className="btn btn-primary w-full group">
              <span className="mr-2">[</span> ENTER HAWKINS LAB <span className="ml-2">]</span>
            </button>
            
            <button 
              type="button" 
              onClick={handleHost}
              className="btn btn-secondary w-full group mt-4 flex justify-center items-center"
            >
              <Hexagon size={16} className="mr-2 text-brand-red group-hover:text-white transition-colors" />
              HOST A NEW SESSION
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center text-brand-red/40 text-xs tracking-[0.2em] font-mono">
          <p>DEPARTMENT OF ENERGY | HAWKINS, INDIANA</p>
        </div>
      </div>
    </div>
  );
};

export default LandingScreen;
