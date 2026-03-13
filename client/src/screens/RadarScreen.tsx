import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Shield, Timer, Radio, Map as MapIcon, Terminal, AlertTriangle } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import VirtualJoystick from '../components/VirtualJoystick';

const INITIAL_LAT = 40.7128; // NYC
const INITIAL_LNG = -74.0060;
const MAP_SCALE = 0.0001; // Scale factor: roughly 1 meter = 0.00001 degrees lat/lng

export default function RadarScreen() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<{ [id: string]: maplibregl.Marker }>({});

  const { role, socket, radarPlayers = [], players = [], updatePosition, alertLevel, isDead, catchTarget, accuseTarget } = useGameStore((state) => ({
    role: state.role,
    socket: state.socket,
    radarPlayers: state.radarPlayers,
    players: state.players,
    updatePosition: state.updatePosition,
    alertLevel: state.alertLevel,
    isDead: state.isDead,
    catchTarget: state.catchTarget,
    accuseTarget: state.accuseTarget,
  }));

  const [showAccuseModal, setShowAccuseModal] = useState(false);

  // Vibration effect when alert level changes
  useEffect(() => {
    if (alertLevel === 'HIGH') {
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    } else if (alertLevel === 'LOW') {
      if (navigator.vibrate) navigator.vibrate([50]);
    }
  }, [alertLevel]);

  // Local state for our true "logical" position (0-100)
  // Let's assume start position is (50, 50) map center
  const [, setLocalPos] = useState({ x: 50, y: 50 });

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [INITIAL_LNG, INITIAL_LAT],
      zoom: 17, // Closer zoom
      attributionControl: false,
      interactive: false, // In a real game, users shouldn't pan the radar independently of their movement
    });

    // Custom dark mode filter via CSS is applied in the main CSS or via styles here
  }, []);

  // Sync positions to MapLibre markers
  useEffect(() => {
    if (!map.current) return;

    // Remove stale markers
    const currentIds = radarPlayers.map(p => p.id);
    Object.keys(markersRef.current).forEach(id => {
      if (!currentIds.includes(id) && id !== socket?.id) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    radarPlayers.forEach(player => {
      const isMe = player.id === socket?.id;
      // Convert (x,y) from game coords (0-100) to lat/lng offsets
      // Treat center (50,50) as INITIAL
      const dX = player.position.x - 50;
      const dY = player.position.y - 50;

      const lng = INITIAL_LNG + (dX * MAP_SCALE);
      const lat = INITIAL_LAT + (dY * MAP_SCALE);

      if (!markersRef.current[player.id]) {
        // Create marker DOM element
        const el = document.createElement('div');
        el.className = 'flex flex-col items-center';
        
        const markerDot = document.createElement('div');
        const colorClass = isMe ? 'bg-blue-500' : 'bg-red-500';
        const shadowColor = isMe ? '#3b82f6' : '#ef4444';
        
        markerDot.className = `w-4 h-4 rounded-full border-2 border-white/50 ${colorClass} ${isMe ? 'animate-pulse' : ''}`;
        markerDot.style.boxShadow = `0 0 10px ${shadowColor}`;
        
        const label = document.createElement('div');
        label.className = 'mt-1 bg-black/80 border border-white/20 px-1 text-[9px] text-white whitespace-nowrap uppercase tracking-wider font-mono';
        label.innerText = isMe ? 'YOU' : (player.roleHint || player.nickname.substring(0, 4));
        
        el.appendChild(markerDot);
        el.appendChild(label);

        markersRef.current[player.id] = new maplibregl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(map.current!);
      } else {
        // Update position
        markersRef.current[player.id].setLngLat([lng, lat]);
      }

      // If it's me, center the map on me
      if (isMe && map.current) {
        map.current.panTo([lng, lat], { duration: 300 });
      }
    });

  }, [radarPlayers, socket?.id]);

  // Handle Joystick movement
  const handleJoystickMove = (dx: number, dy: number) => {
    if (!socket) return;
    
    // Scale movement vector
    const speed = role === 'DEMOGORGON' ? 0.6 : 0.4;
    setLocalPos(prev => {
      let newX = prev.x + dx * speed;
      let newY = prev.y - dy * speed; // Up on joystick is negative Y in coords? Actually standard y-up: dy is positive, y should increase. Let's make top = +Y.
      
      // Clamp to map bounds [0, 100]
      newX = Math.max(0, Math.min(100, newX));
      newY = Math.max(0, Math.min(100, newY));

      const newPos = { x: newX, y: newY };
      if (updatePosition) updatePosition(newPos);
      return newPos;
    });
  };

  return (
    <div className={`h-screen w-full flex flex-col justify-between p-4 relative select-none bg-[#0d0d0f] text-[#e2e8f0] font-mono overflow-hidden ${alertLevel === 'HIGH' ? 'animate-[shake_0.5s_infinite]' : ''}`}>
      
      {/* Background UI Grid & Noise */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-10" 
           style={{ backgroundImage: 'radial-gradient(circle, #3b82f6 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

      {/* Proximity Alert Overlay */}
      {alertLevel !== 'NONE' && (
        <div className={`absolute inset-0 z-20 pointer-events-none transition-opacity duration-300 ${alertLevel === 'HIGH' ? 'bg-red-500/30 animate-pulse' : 'bg-red-500/10'}`} />
      )}

      {/* Death Screen Overlay */}
      {isDead && (
        <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center text-red-600 font-bold uppercase tracking-[0.5em]">
          <h1 className="text-5xl mb-4 animate-pulse duration-1000">YOU DIED</h1>
          <p className="text-sm opacity-50">Signal Lost.</p>
        </div>
      )}

      {/* Accuse Modal */}
      {showAccuseModal && (
        <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#1a1c20] border border-blue-500/50 p-6 rounded max-w-sm w-full">
            <h2 className="text-xl text-blue-400 mb-4 font-bold border-b border-blue-500/30 pb-2">SELECT TARGET TO ACCUSE</h2>
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
              {players.filter(p => p.id !== socket?.id && p.status === 'alive').map(p => (
                <button 
                  key={p.id}
                  onClick={() => { accuseTarget(p.id); setShowAccuseModal(false); }}
                  className="p-3 bg-blue-900/20 hover:bg-blue-800/40 text-left border border-blue-500/20 text-white rounded transition-colors uppercase"
                >
                  {p.nickname}
                </button>
              ))}
              {players.filter(p => p.id !== socket?.id && p.status === 'alive').length === 0 && (
                <div className="text-gray-500 text-sm text-center py-4">No viable targets found...</div>
              )}
            </div>
            <button onClick={() => setShowAccuseModal(false)} className="mt-4 w-full p-2 text-gray-400 border border-gray-600 hover:bg-gray-800 transition-colors uppercase">CANCEL</button>
          </div>
        </div>
      )}

      {/* Top HUD */}
      <header className="z-40 flex justify-between items-start w-full relative">
        <div className="flex flex-col gap-1">
          <div className={`flex items-center gap-2 px-3 py-1 bg-black/80 border rounded-sm ${role === 'DEMOGORGON' ? 'border-red-500/40 shadow-[0_0_10px_rgba(239,68,68,0.1)]' : 'border-blue-500/40 shadow-[0_0_10px_rgba(59,130,246,0.1)]'}`}>
            <Shield className={`w-4 h-4 ${role === 'DEMOGORGON' ? 'text-red-400' : 'text-blue-400'}`} />
            <span className={`text-[12px] font-bold tracking-widest uppercase ${role === 'DEMOGORGON' ? 'text-red-400' : 'text-blue-400'}`}>
              ROLE: {role}
            </span>
          </div>
          <div className="text-[10px] text-gray-500 ml-1 tracking-tighter opacity-70">
            ID: {socket?.id?.substring(0, 8).toUpperCase()}
          </div>
        </div>
        
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-2 px-3 py-1 bg-black/80 border border-red-500/40 rounded-sm shadow-[0_0_10px_rgba(239,68,68,0.1)]">
            <Timer className="w-4 h-4 text-red-500 animate-pulse" />
            <span className="text-xl font-bold tracking-tighter text-red-500">
              --:--
            </span>
          </div>
          <div className="text-[9px] text-red-700 mt-1 uppercase tracking-[0.3em] font-black glitch-effect">
            SIGNAL UNSTABLE
          </div>
        </div>
      </header>

      {/* Main Radar Container */}
      <main className="flex-grow flex items-center justify-center relative z-10 my-4">
        {/* The Outer Circular Bezel */}
        <div className="relative w-80 h-80 md:w-96 md:h-96">
          <div className="absolute -inset-8 rounded-full border border-white/5 opacity-40"></div>
          <div className="absolute -inset-10 rounded-full border-2 border-dashed border-white/5 animate-[spin_60s_linear_infinite] opacity-20"></div>
          
          <div className="absolute inset-0 rounded-full shadow-2xl flex items-center justify-center" 
               style={{ background: 'radial-gradient(circle at 50% 50%, #1a1a1e 0%, #0a0a0c 100%)', border: '2px solid #2a2a2e' }}>
            
            {/* Tech Rings */}
            <div className="absolute inset-4 rounded-full border border-white/10 border-t-blue-500/40 animate-[spin_12s_linear_infinite]"></div>
            <div className="absolute inset-8 rounded-full border border-white/10 border-b-red-500/40 animate-[spin_20s_linear_infinite_reverse]"></div>
            
            {/* Radar Viewport */}
            <div className="relative w-[92%] h-[92%] rounded-full overflow-hidden border-[6px] border-[#0a0a0c] shadow-inner bg-[#1a1c20]">
              
              {/* MapLibre Container */}
              <div 
                ref={mapContainer} 
                className="absolute inset-0 w-full h-full" 
                style={{ filter: 'grayscale(0.8) contrast(1.2) brightness(0.6) sepia(0.2) hue-rotate(180deg)' }}
              />

              {/* Sweeping Radar Effect */}
              <div 
                className="absolute inset-0 pointer-events-none rounded-full"
                style={{
                  background: 'conic-gradient(from 0deg, transparent 0%, rgba(59, 130, 246, 0.15) 50%, transparent 50.1%)',
                  animation: 'spin 4s linear infinite'
                }}
              />

              {/* CRT Overlays */}
              <div className="absolute inset-0 w-full h-full bg-blue-900/10 mix-blend-color pointer-events-none"></div>
              <div className="absolute inset-0 w-full h-full bg-red-900/5 mix-blend-multiply pointer-events-none"></div>
            </div>
          </div>
        </div>
      </main>

      {/* Virtual Joystick */}
      <div className="absolute bottom-24 right-8 z-50">
        <VirtualJoystick onMove={handleJoystickMove} />
      </div>

      {/* Action Area */}
      <footer className="z-40 flex justify-between items-end w-full relative pb-2 uppercase text-[10px] text-gray-400">
        <div className="flex gap-6 items-end">
          <div className="flex flex-col items-center gap-1 opacity-60">
            <Radio className="w-5 h-5" />
            <span>Comms</span>
          </div>
          <div className="flex flex-col items-center gap-1 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.2)] rounded-full p-2 bg-blue-900/20">
            <MapIcon className="w-6 h-6" />
            <span className="font-bold">Map</span>
          </div>
          <div className="flex flex-col items-center gap-1 opacity-60">
            <Terminal className="w-5 h-5" />
            <span>Logs</span>
          </div>
        </div>

        {/* Action Button */}
        {role !== 'DEMOGORGON' ? (
          <button 
            onClick={() => setShowAccuseModal(true)}
            disabled={isDead}
            className="group relative px-6 py-3 bg-red-950/20 border-2 border-red-500/50 hover:bg-red-900/40 transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <AlertTriangle className="w-4 h-4 mb-1 text-red-500 mx-auto" />
            <span className="text-red-500 font-bold tracking-[0.2em] relative z-10">ACCUSE</span>
            <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-red-500"></div>
            <div className="absolute -top-1 -left-1 w-2 h-2 bg-red-500"></div>
          </button>
        ) : (
          <button 
            onClick={() => catchTarget()}
            disabled={isDead}
            className="group relative px-6 py-3 bg-purple-950/20 border-2 border-purple-500/50 hover:bg-purple-900/40 transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-purple-500 font-bold tracking-[0.2em] relative z-10 text-lg">HUNT</span>
            <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-purple-500"></div>
            <div className="absolute -top-1 -left-1 w-2 h-2 bg-purple-500"></div>
          </button>
        )}
      </footer>

    </div>
  );
}
