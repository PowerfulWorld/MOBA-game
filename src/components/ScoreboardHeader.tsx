import React, { useState, useEffect } from 'react';
import { GameEngine } from '../game/gameEngine';
import { HeroEntity } from '../game/entities';
import { ITEMS_CONFIG } from '../config/balance';
import { Settings, ShoppingBag, Volume2, VolumeX } from 'lucide-react';
import { soundManager } from '../audio/soundManager';

interface ScoreboardHeaderProps {
  engine: GameEngine | null;
  playerHero: HeroEntity | null;
  onOpenShop: () => void;
  onOpenSettings: () => void;
}

export const ScoreboardHeader: React.FC<ScoreboardHeaderProps> = ({
  engine,
  playerHero,
  onOpenShop,
  onOpenSettings,
}) => {
  const [, setTick] = useState(0);
  const [isMuted, setIsMuted] = useState(soundManager.getMuted());

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => (t + 1) % 1000);
    }, 200);
    return () => clearInterval(interval);
  }, []);

  if (!engine || !playerHero) return null;

  // Format time MM:SS
  const totalSec = Math.floor(engine.matchTime);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  // Find a quick buy recommended item
  const recommendedItem = ITEMS_CONFIG.find(
    (item) =>
      playerHero.gold >= item.cost &&
      playerHero.items.length < 6 &&
      !playerHero.items.some((i) => i.id === item.id)
  );

  const toggleMute = () => {
    const nextMute = !isMuted;
    soundManager.setMute(nextMute);
    setIsMuted(nextMute);
  };

  return (
    <div className="w-full flex items-center justify-between pointer-events-none px-2 sm:px-4 py-1.5 z-30">
      {/* Top Left: Player Status Avatar & Level */}
      <div className="flex items-center gap-2 pointer-events-auto">
        <div
          onClick={onOpenShop}
          className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-cyan-400 bg-slate-900 overflow-hidden flex items-center justify-center cursor-pointer shadow-lg active:scale-95"
          style={{ backgroundColor: playerHero.config.avatarColor }}
        >
          <span className="font-heading font-bold text-xs sm:text-sm text-white drop-shadow">
            {playerHero.config.name.slice(0, 3).toUpperCase()}
          </span>
          {/* Level badge */}
          <div className="absolute -bottom-0.5 -right-0.5 bg-amber-400 text-slate-950 font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center border border-slate-950">
            {playerHero.level}
          </div>
        </div>

        {/* Quick stats & Gold */}
        <div className="flex flex-col text-xs font-mono drop-shadow">
          <div className="flex items-center gap-1.5 font-bold text-amber-300">
            <span>🪙</span>
            <span>{Math.floor(playerHero.gold)}</span>
          </div>
          <div className="text-[11px] text-slate-300">
            <span className="text-emerald-400">{playerHero.kills}</span> /{' '}
            <span className="text-rose-400">{playerHero.deaths}</span> /{' '}
            <span className="text-cyan-400">{playerHero.assists}</span>
          </div>
        </div>

        {/* Quick Buy Item Widget */}
        {recommendedItem && (
          <button
            onClick={() => {
              if (playerHero.buyItem(recommendedItem)) {
                soundManager.playBuyItem();
                engine.addFloatingText(playerHero.x, playerHero.y - 30, `+${recommendedItem.name}`, '#22c55e', 18);
              }
            }}
            className="hidden sm:flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-800 border border-amber-400/80 px-2 py-1 rounded-full text-xs shadow-md active:scale-95 animate-pulse-subtle"
          >
            <span>{recommendedItem.icon}</span>
            <span className="text-amber-300 font-bold">{recommendedItem.cost}G</span>
          </button>
        )}
      </div>

      {/* Top Center: Match Score & Time */}
      <div className="flex flex-col items-center pointer-events-auto">
        <div className="flex items-center gap-3 bg-slate-950/85 backdrop-blur-md px-4 py-1 rounded-full border border-slate-700/80 shadow-xl">
          <span className="text-cyan-400 font-heading font-extrabold text-base sm:text-lg">
            {engine.blueScore}
          </span>
          <span className="text-slate-400 font-mono text-xs sm:text-sm font-semibold tracking-wider">
            {timeFormatted}
          </span>
          <span className="text-rose-500 font-heading font-extrabold text-base sm:text-lg">
            {engine.redScore}
          </span>
        </div>

        {/* Active Kill Feed Announcement */}
        {engine.killFeed.length > 0 && (
          <div className="mt-1 flex flex-col items-center gap-1">
            <div className="bg-slate-900/90 border border-slate-700 px-3 py-0.5 rounded-full text-[11px] flex items-center gap-2 shadow-lg animate-fade-in">
              <span className={`font-bold ${engine.killFeed[0].killerTeam === 'blue' ? 'text-cyan-400' : 'text-rose-400'}`}>
                {engine.killFeed[0].killerName}
              </span>
              <span className="text-amber-400 text-xs">⚔️</span>
              <span className={`font-bold ${engine.killFeed[0].victimTeam === 'blue' ? 'text-cyan-400' : 'text-rose-400'}`}>
                {engine.killFeed[0].victimName}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Top Right: System info, Audio, Shop & Settings buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
        <div className="hidden md:flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
          <span>60 FPS</span>
          <span className="text-slate-500">|</span>
          <span>22ms</span>
        </div>

        {/* Audio Toggle */}
        <button
          onClick={toggleMute}
          className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors"
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX size={16} className="text-rose-400" /> : <Volume2 size={16} className="text-cyan-400" />}
        </button>

        {/* Shop Button */}
        <button
          onClick={onOpenShop}
          className="relative p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 border border-amber-400/70 text-white flex items-center gap-1 shadow-md active:scale-95 transition-all"
        >
          <ShoppingBag size={16} />
          <span className="hidden sm:inline text-xs font-bold font-mono">SHOP</span>
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors"
        >
          <Settings size={16} />
        </button>
      </div>
    </div>
  );
};
