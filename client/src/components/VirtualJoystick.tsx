import React, { useRef, useState, useEffect } from 'react';

interface VirtualJoystickProps {
  onMove: (dx: number, dy: number) => void;
  size?: number;
}

export default function VirtualJoystick({ onMove, size = 120 }: VirtualJoystickProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });

  const maxRadius = size / 2;
  const knobSize = size * 0.4;

  const handlePointerDown = (e: React.PointerEvent) => {
    setActive(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    updateKnob(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!active || !containerRef.current) return;
    updateKnob(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setActive(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
    setKnobPos({ x: 0, y: 0 });
    onMove(0, 0); // Reset movement
  };

  const updateKnob = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + maxRadius;
    const centerY = rect.top + maxRadius;

    let dx = clientX - centerX;
    let dy = clientY - centerY;

    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Cap to max radius
    if (distance > maxRadius) {
      dx = (dx / distance) * maxRadius;
      dy = (dy / distance) * maxRadius;
    }

    setKnobPos({ x: dx, y: dy });

    // Normalize -1.0 to 1.0 based on maxRadius
    // Y is inverted so UP is positive
    onMove(dx / maxRadius, -dy / maxRadius);
  };

  // Continuous movement loop while active
  useEffect(() => {
    if (!active) return;
    
    let animationFrame: number;
    
    const loop = () => {
      // Keep sending the current knob pos as movement vector
      onMove(knobPos.x / maxRadius, -knobPos.y / maxRadius);
      animationFrame = requestAnimationFrame(loop);
    };
    
    // Wait a frame before starting loop so state is synced
    animationFrame = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(animationFrame);
  }, [active, knobPos, maxRadius, onMove]);

  return (
    <div 
      ref={containerRef}
      className="relative rounded-full border-2 border-[#1a1c20] bg-black/50 shadow-[0_0_20px_rgba(59,130,246,0.2)] touch-none select-none"
      style={{ width: size, height: size, backdropFilter: 'blur(4px)' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Visual ring markers */}
      <div className="absolute inset-4 rounded-full border border-white/5 pointer-events-none"></div>
      <div className="absolute inset-8 rounded-full border border-white/5 pointer-events-none"></div>

      {/* Crosshair */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
        <div className="w-full h-[1px] bg-white/30"></div>
        <div className="absolute h-full w-[1px] bg-white/30"></div>
      </div>

      {/* The Knob */}
      <div 
        className="absolute rounded-full bg-gradient-to-br from-blue-500/80 to-blue-800/80 border border-blue-400/50 shadow-[0_0_15px_rgba(59,130,246,0.6)]"
        style={{
          width: knobSize,
          height: knobSize,
          left: maxRadius - knobSize / 2 + knobPos.x,
          top: maxRadius - knobSize / 2 + knobPos.y,
          transition: active ? 'none' : 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      >
        <div className="absolute inset-1 rounded-full border border-white/20"></div>
      </div>
    </div>
  );
}
