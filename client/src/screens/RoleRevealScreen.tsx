import React from 'react';
import { useGameStore } from '../store/gameStore';

const characterVideos: Record<string, string> = {
  '11': '/characters/video/11 vid.mp4',
  'dustin': '/characters/video/dustin vid.mp4',
  'lucas': '/characters/video/lucas vid.mp4',
  'max': '/characters/video/max vid.mp4',
  'mike': '/characters/video/mike vid.mp4',
  'will': '/characters/video/will vid.mp4',
  'demo': '/characters/video/demo vid.mp4',
  'steve': '/bg.mp4', // Fallback since steve video is missing
};

const RoleRevealScreen: React.FC = () => {
  const { role, players, playerId, enterMainGame } = useGameStore();
  const currentPlayer = players.find(p => p.id === playerId);
  const characterId = currentPlayer?.character || '11';
  const videoSrc = characterVideos[characterId] || characterVideos['11'];

  const isDemogorgon = role === 'DEMOGORGON';

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 bg-black overflow-hidden">
      {/* Role-specific Video Background */}
      <video 
        autoPlay 
        loop 
        muted 
        playsInline 
        className="absolute inset-0 w-full h-full object-cover z-0 opacity-60"
      >
        <source src={videoSrc} type="video/mp4" />
      </video>

      {/* Glitch Overlays */}
      <div className="absolute inset-0 z-10 pointer-events-none bg-scan-lines opacity-20"></div>
      <div className={`absolute inset-0 z-10 pointer-events-none opacity-30 mix-blend-color-dodge ${isDemogorgon ? 'bg-brand-red' : 'bg-status-blue'}`}></div>

      {/* Reveal Content */}
      <div className="z-20 text-center space-y-8 max-w-lg">
        <div className="space-y-2">
          <p className="text-brand-orange text-xs tracking-[0.5em] uppercase">Identity Confirmed</p>
          <h1 className={`text-6xl font-display tracking-[0.3em] leading-none ${isDemogorgon ? 'text-brand-red animate-glitch' : 'text-white'}`}>
            {role?.toUpperCase()}
          </h1>
        </div>

        <div className="glass-card p-6 bg-black/60 border-brand-red/30 backdrop-blur-md">
          <p className="text-brand-orange/80 text-[10px] tracking-[0.3em] uppercase mb-4 text-left border-b border-brand-red/20 pb-2">
            Mission Directives
          </p>
          <p className="text-xl tracking-wider font-bold leading-relaxed">
            {isDemogorgon 
              ? "Catch everyone. Stay hidden in the Upside Down radar until you strike." 
              : "Identify the Demogorgon. Stay together and use your radar to track movement."}
          </p>
        </div>

        <button 
          onClick={enterMainGame}
          className="btn btn-primary px-12 py-4 text-xl tracking-[0.2em] shadow-[0_0_30px_rgba(255,0,60,0.6)] animate-pulse"
        >
          ENTER HAWKINS LAB
        </button>
      </div>

      {/* Corner UI Elements */}
      <div className="absolute bottom-8 left-8 text-left border-l-2 border-brand-red pl-4 py-1 z-20">
        <p className="text-[10px] text-brand-red/60 tracking-widest uppercase">Subject</p>
        <p className="font-display text-white tracking-widest">{currentPlayer?.nickname.toUpperCase()}</p>
      </div>
      <div className="absolute bottom-8 right-8 text-right border-r-2 border-brand-red pr-4 py-1 z-20">
        <p className="text-[10px] text-brand-red/60 tracking-widest uppercase">Avatar</p>
        <p className="font-display text-white tracking-widest">{characterId.toUpperCase()}</p>
      </div>
    </div>
  );
};

export default RoleRevealScreen;
