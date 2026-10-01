import React, { useRef, useState, useEffect } from 'react';
import { GameEngine } from '../game/gameEngine';

interface VirtualJoystickProps {
  engine: GameEngine | null;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({ engine }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState(false);
  const touchIdRef = useRef<number | null>(null);

  const radius = 55; // joystick outer radius

  const updateInput = (clientX: number, clientY: number) => {
    if (!containerRef.current || !engine) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);

    if (dist === 0) {
      setKnobPos({ x: 0, y: 0 });
      engine.moveInput = { x: 0, y: 0 };
      return;
    }

    const clampedDist = Math.min(radius, dist);
    const nx = dx / dist;
    const ny = dy / dist;

    setKnobPos({
      x: nx * clampedDist,
      y: ny * clampedDist,
    });

    // Deadzone
    if (dist < 8) {
      engine.moveInput = { x: 0, y: 0 };
    } else {
      const power = clampedDist / radius;
      engine.moveInput = {
        x: nx * power,
        y: ny * power,
      };
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (touchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    touchIdRef.current = touch.identifier;
    setIsActive(true);
    updateInput(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        updateInput(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
        break;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        touchIdRef.current = null;
        setIsActive(false);
        setKnobPos({ x: 0, y: 0 });
        if (engine) engine.moveInput = { x: 0, y: 0 };
        break;
      }
    }
  };

  // Keyboard desktop support (WASD or Arrow keys)
  useEffect(() => {
    const keysDown = new Set<string>();

    const updateKeyboardMove = () => {
      if (!engine) return;
      let kx = 0;
      let ky = 0;
      if (keysDown.has('KeyW') || keysDown.has('ArrowUp')) ky -= 1;
      if (keysDown.has('KeyS') || keysDown.has('ArrowDown')) ky += 1;
      if (keysDown.has('KeyA') || keysDown.has('ArrowLeft')) kx -= 1;
      if (keysDown.has('KeyD') || keysDown.has('ArrowRight')) kx += 1;

      const len = Math.hypot(kx, ky);
      if (len > 0) {
        engine.moveInput = { x: kx / len, y: ky / len };
        setKnobPos({ x: (kx / len) * (radius * 0.7), y: (ky / len) * (radius * 0.7) });
        setIsActive(true);
      } else if (touchIdRef.current === null) {
        engine.moveInput = { x: 0, y: 0 };
        setKnobPos({ x: 0, y: 0 });
        setIsActive(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].includes(e.code)) {
        keysDown.add(e.code);
        updateKeyboardMove();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (keysDown.has(e.code)) {
        keysDown.delete(e.code);
        updateKeyboardMove();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [engine]);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-slate-900/60 border-2 border-slate-700/80 backdrop-blur-sm flex items-center justify-center pointer-events-auto select-none touch-none shadow-2xl"
    >
      {/* Outer Ring Accent */}
      <div className="absolute inset-2 rounded-full border border-dashed border-cyan-500/30 animate-spin-slow pointer-events-none" />

      {/* Center Anchor Ring */}
      <div className="w-10 h-10 rounded-full border border-cyan-400/40 bg-slate-800/40 pointer-events-none flex items-center justify-center">
        <span className="text-[10px] text-cyan-300 font-bold opacity-60">WASD</span>
      </div>

      {/* Draggable Knob */}
      <div
        style={{
          transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
          transition: isActive ? 'none' : 'transform 0.15s ease-out',
        }}
        className={`absolute w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-colors pointer-events-none ${
          isActive
            ? 'bg-gradient-to-br from-cyan-400 to-blue-600 border-2 border-white shadow-cyan-500/50'
            : 'bg-gradient-to-br from-slate-700 to-slate-800 border-2 border-cyan-400/60'
        }`}
      >
        <div className="w-4 h-4 rounded-full bg-white/40" />
      </div>
    </div>
  );
};
