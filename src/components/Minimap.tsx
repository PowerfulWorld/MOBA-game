import React, { useRef, useEffect } from 'react';
import { GameEngine } from '../game/gameEngine';
import { GAME_CONFIG } from '../config/balance';

interface MinimapProps {
  engine: GameEngine | null;
}

export const Minimap: React.FC<MinimapProps> = ({ engine }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let animId: number;

    const renderMinimap = () => {
      if (!engine || !canvasRef.current) {
        animId = requestAnimationFrame(renderMinimap);
        return;
      }

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const size = canvas.width;
      const scale = size / GAME_CONFIG.MAP_WIDTH;

      // Background
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, size, size);

      // River diagonal line
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(size, size);
      ctx.stroke();

      // Lanes
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 3;
      // Top lane
      ctx.beginPath();
      ctx.moveTo(size * 0.12, size * 0.88);
      ctx.lineTo(size * 0.15, size * 0.15);
      ctx.lineTo(size * 0.88, size * 0.12);
      ctx.stroke();
      // Mid lane
      ctx.beginPath();
      ctx.moveTo(size * 0.12, size * 0.88);
      ctx.lineTo(size * 0.88, size * 0.12);
      ctx.stroke();
      // Bot lane
      ctx.beginPath();
      ctx.moveTo(size * 0.12, size * 0.88);
      ctx.lineTo(size * 0.85, size * 0.85);
      ctx.lineTo(size * 0.88, size * 0.12);
      ctx.stroke();

      // Structures
      for (const s of engine.structures) {
        if (s.isDead) continue;
        ctx.fillStyle = s.team === 'blue' ? '#3b82f6' : '#ef4444';
        const sx = s.x * scale;
        const sy = s.y * scale;
        if (s.type === 'core') {
          ctx.fillRect(sx - 4, sy - 4, 8, 8);
        } else {
          ctx.beginPath();
          ctx.arc(sx, sy, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Jungle boss / camps
      for (const m of engine.monsters) {
        if (m.isDead) continue;
        ctx.fillStyle = m.monsterType === 'lord' ? '#a855f7' : '#eab308';
        ctx.beginPath();
        ctx.arc(m.x * scale, m.y * scale, m.monsterType === 'lord' ? 4 : 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Minions
      for (const minion of engine.minions) {
        if (minion.isDead) continue;
        ctx.fillStyle = minion.team === 'blue' ? '#93c5fd' : '#fca5a5';
        ctx.fillRect(minion.x * scale - 1, minion.y * scale - 1, 2, 2);
      }

      // Heroes
      for (const hero of engine.heroes) {
        if (hero.isDead) continue;
        // Don't show enemy in bush if not visible
        if (hero.team !== 'blue' && hero.isInBush && !engine.playerHero.isInBush) continue;

        const hx = hero.x * scale;
        const hy = hero.y * scale;
        const isPlayer = hero.id === engine.playerHero.id;

        ctx.fillStyle = isPlayer ? '#22c55e' : hero.team === 'blue' ? '#3b82f6' : '#ef4444';
        ctx.beginPath();
        ctx.arc(hx, hy, isPlayer ? 4.5 : 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Camera Viewport
      if (engine.canvas) {
        const viewW = (engine.canvas.width / engine.zoom) * scale;
        const viewH = (engine.canvas.height / engine.zoom) * scale;
        const camX = engine.camera.x * scale - viewW / 2;
        const camY = engine.camera.y * scale - viewH / 2;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(camX, camY, viewW, viewH);
      }

      animId = requestAnimationFrame(renderMinimap);
    };

    animId = requestAnimationFrame(renderMinimap);
    return () => cancelAnimationFrame(animId);
  }, [engine]);

  const handleMinimapClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!engine || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const scale = GAME_CONFIG.MAP_WIDTH / canvasRef.current.width;

    const worldX = clickX * scale;
    const worldY = clickY * scale;

    // Ping location
    engine.addFloatingText(worldX, worldY, 'PING!', '#facc15', 20);
  };

  return (
    <div className="relative rounded-lg overflow-hidden border-2 border-slate-700 bg-slate-900/80 shadow-lg pointer-events-auto">
      <canvas
        ref={canvasRef}
        width={100}
        height={100}
        className="w-[90px] h-[90px] sm:w-[110px] sm:h-[110px] block cursor-crosshair"
        onClick={handleMinimapClick}
      />
    </div>
  );
};
