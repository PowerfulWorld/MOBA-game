import React, { useState, useEffect } from 'react';
import { HeroEntity } from '../game/entities';
import { GAME_CONFIG } from '../config/balance';

interface HeroStatusBarProps {
  playerHero: HeroEntity | null;
}

export const HeroStatusBar: React.FC<HeroStatusBarProps> = ({ playerHero }) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => (t + 1) % 1000);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  if (!playerHero) return null;

  const hpRatio = Math.max(0, Math.min(1, playerHero.hp / playerHero.maxHp));
  const manaRatio = Math.max(0, Math.min(1, playerHero.mana / playerHero.maxMana));

  const currentLevel = playerHero.level;
  const currentExp = playerHero.exp;
  const prevExp = currentLevel > 1 ? GAME_CONFIG.EXP_TABLE[currentLevel - 1] : 0;
  const nextExp = GAME_CONFIG.EXP_TABLE[currentLevel] || prevExp + 1000;
  const expProgress = Math.max(0, Math.min(1, (currentExp - prevExp) / (nextExp - prevExp)));

  return (
    <div className="flex flex-col items-center pointer-events-none select-none z-20 w-72 sm:w-80">
      {/* Active Buffs Row */}
      {playerHero.buffs.length > 0 && (
        <div className="flex items-center gap-1.5 mb-1">
          {playerHero.buffs.map((buff) => (
            <div
              key={buff.id}
              className="flex items-center gap-1 bg-slate-900/90 border border-slate-700 px-1.5 py-0.5 rounded-full text-[10px] font-mono shadow-sm"
              style={{ borderColor: buff.color }}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: buff.color }} />
              <span className="text-white font-bold">{Math.ceil(buff.duration)}s</span>
            </div>
          ))}
        </div>
      )}

      {/* Main Bars Container */}
      <div className="w-full bg-slate-950/85 backdrop-blur-md rounded-lg p-1.5 border border-slate-700/80 shadow-2xl">
        {/* HP Bar */}
        <div className="relative w-full h-4 sm:h-5 bg-slate-900 rounded overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-emerald-600 to-green-400 transition-all duration-75"
            style={{ width: `${hpRatio * 100}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-[10px] sm:text-xs font-mono font-bold text-white drop-shadow">
            {Math.ceil(playerHero.hp)} / {playerHero.maxHp}
          </div>
        </div>

        {/* Mana Bar */}
        <div className="relative w-full h-2.5 sm:h-3 bg-slate-900 rounded overflow-hidden mt-1 border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-cyan-600 to-blue-400 transition-all duration-75"
            style={{ width: `${manaRatio * 100}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-[8px] sm:text-[9px] font-mono font-bold text-white drop-shadow">
            {Math.ceil(playerHero.mana)} / {playerHero.maxMana}
          </div>
        </div>

        {/* EXP Bar & Level */}
        <div className="flex items-center gap-1.5 mt-1">
          <div className="bg-amber-400 text-slate-950 font-bold text-[10px] font-mono px-1 rounded">
            Lv.{playerHero.level}
          </div>
          <div className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-amber-400"
              style={{ width: `${expProgress * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Death Respawn Banner */}
      {playerHero.isDead && (
        <div className="absolute -top-16 bg-red-950/90 border-2 border-red-500 px-6 py-2 rounded-xl text-center shadow-2xl animate-pulse">
          <div className="text-red-400 text-xs font-bold tracking-wider">YOU HAVE BEEN SLAIN</div>
          <div className="text-2xl font-bold font-mono text-white">
            Respawn in {Math.ceil(playerHero.respawnTimer)}s
          </div>
        </div>
      )}

      {/* Recalling Channel Banner */}
      {playerHero.isRecalling && !playerHero.isDead && (
        <div className="absolute -top-12 bg-cyan-950/90 border border-cyan-400 px-4 py-1.5 rounded-lg text-center shadow-lg">
          <div className="text-cyan-300 text-xs font-bold font-mono">
            RECALLING... {Math.ceil(playerHero.recallTimer)}s
          </div>
        </div>
      )}
    </div>
  );
};
