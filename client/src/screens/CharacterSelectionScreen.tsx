import React from 'react';
import { useGameStore } from '../store/gameStore';

const characters = [
  { id: '11', name: 'Eleven', thumb: '/characters/thumbnails/11 pic.png' },
  { id: 'dustin', name: 'Dustin', thumb: '/characters/thumbnails/dustin pic.png' },
  { id: 'lucas', name: 'Lucas', thumb: '/characters/thumbnails/lucas pic.png' },
  { id: 'max', name: 'Max', thumb: '/characters/thumbnails/max pic.png' },
  { id: 'mike', name: 'Mike', thumb: '/characters/thumbnails/mike pic.png' },
  { id: 'will', name: 'Will', thumb: '/characters/thumbnails/will pic.png' },
  { id: 'steve', name: 'Steve', thumb: '/characters/thumbnails/steve pic.png' },
  { id: 'demo', name: 'Demogorgon', thumb: '/characters/thumbnails/demo pic.png' },
];

const CharacterSelectionScreen: React.FC = () => {
  const { selectCharacter, players, playerId } = useGameStore();
  
  const currentPlayer = players.find(p => p.id === playerId);
  const selectedCharacter = currentPlayer?.character;

  const handleSelect = (id: string) => {
    // Check if someone else has already picked it
    const isTaken = players.some(p => p.id !== playerId && p.character === id);
    if (!isTaken) {
      selectCharacter(id);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center p-4 pt-12 overflow-y-auto">
      <video 
        autoPlay 
        loop 
        muted 
        playsInline 
        className="fixed inset-0 w-full h-full object-cover z-0 opacity-20 mix-blend-screen"
      >
        <source src="/bg.mp4" type="video/mp4" />
      </video>

      <div className="z-10 w-full max-w-4xl">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-display text-brand-red tracking-[0.2em] mb-2 animate-pulse">SELECT YOUR AVATAR</h1>
          <p className="text-brand-orange text-xs tracking-[0.4em] uppercase">Choose wisely for the mission ahead</p>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          {characters.map((char) => {
            const isTakenByOther = players.some(p => p.id !== playerId && p.character === char.id);
            const isSelectedByMe = selectedCharacter === char.id;
            const takenByPlayer = players.find(p => p.id !== playerId && p.character === char.id);

            return (
              <button
                key={char.id}
                onClick={() => handleSelect(char.id)}
                disabled={isTakenByOther}
                className={`relative group border-2 transition-all duration-300 transform hover:scale-105 ${
                  isSelectedByMe 
                    ? 'border-brand-red bg-brand-red/20 shadow-[0_0_20px_rgba(255,0,60,0.5)] scale-105' 
                    : isTakenByOther 
                      ? 'border-white/10 opacity-40 cursor-not-allowed' 
                      : 'border-brand-red/30 bg-black/40 hover:border-brand-red/60'
                }`}
              >
                <div className="aspect-square relative overflow-hidden">
                  <img 
                    src={char.thumb} 
                    alt={char.name}
                    className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${isSelectedByMe ? 'scale-110' : ''}`}
                  />
                  {isTakenByOther && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-[10px] text-brand-red font-bold tracking-widest rotate-[-12deg] border border-brand-red px-2 py-1">
                        TAKEN BY {takenByPlayer?.nickname.toUpperCase()}
                      </span>
                    </div>
                  )}
                  {isSelectedByMe && (
                    <div className="absolute top-2 right-2 w-4 h-4 bg-brand-red rounded-full flex items-center justify-center animate-bounce">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </div>
                <div className={`p-3 text-center border-t ${isSelectedByMe ? 'border-brand-red/50 bg-brand-red/10' : 'border-brand-red/10'}`}>
                  <p className={`font-display text-sm tracking-widest ${isSelectedByMe ? 'text-white' : 'text-brand-red/60'}`}>
                    {char.name.toUpperCase()}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="text-center">
          <p className="text-brand-orange/60 text-[10px] tracking-[0.3em] uppercase animate-pulse">
            Waiting for all agents to synchronize...
          </p>
          <div className="mt-4 flex justify-center space-x-2">
            {players.map((p) => (
              <div 
                key={p.id} 
                title={p.nickname}
                className={`w-2 h-2 rounded-full ${p.character ? 'bg-status-green shadow-[0_0_5px_#4ade80]' : 'bg-white/20'}`}
              ></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CharacterSelectionScreen;
