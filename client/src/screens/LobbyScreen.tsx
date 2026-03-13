import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';

const LobbyScreen: React.FC = () => {
  const navigate = useNavigate();
  const { roomId, nickname, isHost, players, leaveRoom, startGame } = useGameStore();

  // Redirect to home if no room or nickname
  React.useEffect(() => {
    if (!nickname || (!roomId && !isHost)) {
      navigate('/');
    }
  }, [nickname, roomId, isHost, navigate]);

  const handleDisconnect = () => {
    leaveRoom();
    navigate('/');
  };

  const handleStart = () => {
    if (isHost) {
      startGame();
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center p-4 pt-12">
      {/* Video Background (Reused) */}
      <video 
        autoPlay 
        loop 
        muted 
        playsInline 
        className="absolute inset-0 w-full h-full object-cover z-0 opacity-20 mix-blend-screen"
      >
        <source src="/bg.mp4" type="video/mp4" />
      </video>

      <div className="z-10 w-full max-w-2xl">
        <header className="flex justify-between items-end border-b border-brand-red/30 pb-4 mb-8">
          <div>
            <h1 className="text-3xl font-display text-brand-red tracking-widest leading-none">OPERATION RUN</h1>
            <p className="text-brand-orange text-xs tracking-[0.2em]">ACCESS LEVEL: {isHost ? 'COMMANDER' : 'FIELD AGENT'}</p>
          </div>
          <div className="text-right">
            <p className="text-brand-red/60 text-xs tracking-[0.2em] mb-1">ROOM CODE</p>
            <div className="bg-brand-red/10 border border-brand-red px-4 py-2 text-2xl tracking-[0.3em] font-bold text-white shadow-[0_0_10px_rgba(255,0,60,0.2)]">
              {roomId || '----'}
            </div>
          </div>
        </header>

        <div className="glass-card mb-8">
          <h2 className="text-brand-red/80 text-sm tracking-[0.2em] uppercase mb-4 flex justify-between">
            <span>Active Agents</span>
            <span>{players.length || 1} / 6</span>
          </h2>
          
          <div className="space-y-3">
            {/* Self Player */}
            <div className="border border-brand-red/40 bg-brand-red/5 p-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-brand-red/20 border border-brand-red flex items-center justify-center font-display font-bold text-xl">
                  {nickname.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold tracking-wider">{nickname} <span className="text-brand-red/70 text-xs ml-2">(YOU)</span></p>
                  <p className="text-xs text-brand-red/60 tracking-widest">{isHost ? 'HOST' : 'GUEST'}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-status-green animate-pulse rounded-full"></div>
                <span className="text-xs text-status-green tracking-wider">READY</span>
              </div>
            </div>

            {/* Other Mock Players (Will be populated by state in Block 1.4) */}
            {players.length === 0 && (
              <div className="border border-brand-red/20 bg-black/40 p-4 text-center text-brand-red/40 text-sm tracking-widest py-8 border-dashed">
                AWAITING ADDITIONAL AGENTS...
              </div>
            )}
            
            {players.map(p => (
              <div key={p.id} className="border border-brand-red/20 bg-black/40 p-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-brand-red/10 border border-brand-red/30 flex items-center justify-center font-display font-bold text-xl text-brand-red/50">
                    {p.nickname.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold tracking-wider text-white/70">{p.nickname}</p>
                    <p className="text-xs text-brand-red/40 tracking-widest">{p.isHost ? 'HOST' : 'GUEST'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 ${p.status === 'READY' ? 'bg-status-green' : 'bg-brand-orange'} animate-pulse rounded-full`}></div>
                  <span className={`text-xs ${p.status === 'READY' ? 'text-status-green' : 'text-brand-orange'} tracking-wider`}>{p.status || 'STANDBY'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex space-x-4 justify-between">
          <button onClick={handleDisconnect} className="btn btn-secondary w-1/3 text-sm">
            ABORT MISSION
          </button>
          {isHost ? (
            <button 
              onClick={handleStart}
              className="btn btn-primary w-2/3 shadow-[0_0_15px_rgba(255,0,60,0.5)]"
            >
              INITIATE PROTOCOL
            </button>
          ) : (
            <div className="w-2/3 border border-brand-red/20 bg-black/50 p-3 text-center text-brand-red/60 text-sm tracking-widest flex items-center justify-center">
              AWAITING HOST...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LobbyScreen;
