import React, { useEffect } from 'react';
import { GameEngine } from '../game/gameEngine';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, Skull, Swords, Award } from 'lucide-react';

interface GameOverModalProps {
  engine: GameEngine;
  result: 'victory' | 'defeat';
  onPlayAgain: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ engine, result, onPlayAgain }) => {
  const isVictory = result === 'victory';

  useEffect(() => {
    if (isVictory) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });
    }
  }, [isVictory]);

  // Determine MVP
  let mvpId = '';
  let highestScore = -1;

  for (const hero of engine.heroes) {
    const kdaScore = hero.kills * 3 + hero.assists * 1.5 - hero.deaths * 1.5;
    const dmgScore = hero.damageDealtTotal / 500;
    const totalScore = kdaScore + dmgScore;
    if (totalScore > highestScore) {
      highestScore = totalScore;
      mvpId = hero.id;
    }
  }

  const blueHeroes = engine.heroes.filter((h) => h.team === 'blue');
  const redHeroes = engine.heroes.filter((h) => h.team === 'red');

  const totalSec = Math.floor(engine.matchTime);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 select-none pointer-events-auto overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border-2 border-slate-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Banner */}
        <div
          className={`py-6 px-4 text-center border-b ${
            isVictory
              ? 'bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 border-amber-400 text-slate-950'
              : 'bg-gradient-to-r from-red-800 via-rose-700 to-red-900 border-red-500 text-white'
          }`}
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            {isVictory ? <Trophy size={32} className="animate-bounce" /> : <Skull size={32} />}
          </div>
          <h1 className="font-heading font-black text-3xl sm:text-4xl tracking-widest drop-shadow">
            {isVictory ? 'VICTORY' : 'DEFEAT'}
          </h1>
          <p className="font-mono text-xs sm:text-sm font-bold opacity-90">
            MATCH DURATION: {timeFormatted} | BLUE {engine.blueScore} - {engine.redScore} RED
          </p>
        </div>

        {/* Scoreboard Tables */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
          {/* Blue Team */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-heading font-bold text-sm text-cyan-400 flex items-center gap-1.5 uppercase">
                <Swords size={16} />
                <span>Blue Team (Allies)</span>
              </h3>
              <span className="font-mono text-xs font-bold text-cyan-300">{engine.blueScore} Kills</span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/70">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="py-2 px-3">Hero</th>
                    <th className="py-2 px-2 text-center">K / D / A</th>
                    <th className="py-2 px-2 text-center">Gold</th>
                    <th className="py-2 px-2 text-center">Damage</th>
                    <th className="py-2 px-3">Items</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {blueHeroes.map((hero) => {
                    const isMvp = hero.id === mvpId;
                    const isUser = hero.id === engine.playerHero.id;

                    return (
                      <tr key={hero.id} className={isUser ? 'bg-cyan-950/30' : ''}>
                        <td className="py-2 px-3 flex items-center gap-2 font-bold text-white">
                          <span
                            className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-heading font-bold text-white shadow"
                            style={{ backgroundColor: hero.config.avatarColor }}
                          >
                            {hero.config.name.slice(0, 1)}
                          </span>
                          <span className={isUser ? 'text-cyan-300' : ''}>{hero.config.name}</span>
                          {isMvp && (
                            <span className="flex items-center gap-0.5 bg-amber-400 text-slate-950 font-bold px-1.5 py-0.2 rounded text-[9px]">
                              <Award size={10} /> MVP
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-slate-300">
                          <span className="text-emerald-400">{hero.kills}</span>/
                          <span className="text-rose-400">{hero.deaths}</span>/
                          <span className="text-cyan-400">{hero.assists}</span>
                        </td>
                        <td className="py-2 px-2 text-center text-amber-300 font-bold">
                          {Math.floor(hero.gold)}G
                        </td>
                        <td className="py-2 px-2 text-center text-slate-300">
                          {Math.round(hero.damageDealtTotal)}
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex gap-1">
                            {hero.items.map((item, idx) => (
                              <span key={idx} className="text-sm" title={item.name}>
                                {item.icon}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Red Team */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-heading font-bold text-sm text-rose-400 flex items-center gap-1.5 uppercase">
                <Swords size={16} />
                <span>Red Team (Enemies)</span>
              </h3>
              <span className="font-mono text-xs font-bold text-rose-300">{engine.redScore} Kills</span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/70">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="py-2 px-3">Hero</th>
                    <th className="py-2 px-2 text-center">K / D / A</th>
                    <th className="py-2 px-2 text-center">Gold</th>
                    <th className="py-2 px-2 text-center">Damage</th>
                    <th className="py-2 px-3">Items</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {redHeroes.map((hero) => {
                    const isMvp = hero.id === mvpId;

                    return (
                      <tr key={hero.id}>
                        <td className="py-2 px-3 flex items-center gap-2 font-bold text-white">
                          <span
                            className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-heading font-bold text-white shadow"
                            style={{ backgroundColor: hero.config.avatarColor }}
                          >
                            {hero.config.name.slice(0, 1)}
                          </span>
                          <span>{hero.config.name}</span>
                          {isMvp && (
                            <span className="flex items-center gap-0.5 bg-amber-400 text-slate-950 font-bold px-1.5 py-0.2 rounded text-[9px]">
                              <Award size={10} /> MVP
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-slate-300">
                          <span className="text-emerald-400">{hero.kills}</span>/
                          <span className="text-rose-400">{hero.deaths}</span>/
                          <span className="text-cyan-400">{hero.assists}</span>
                        </td>
                        <td className="py-2 px-2 text-center text-amber-300 font-bold">
                          {Math.floor(hero.gold)}G
                        </td>
                        <td className="py-2 px-2 text-center text-slate-300">
                          {Math.round(hero.damageDealtTotal)}
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex gap-1">
                            {hero.items.map((item, idx) => (
                              <span key={idx} className="text-sm" title={item.name}>
                                {item.icon}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-center">
          <button
            onClick={onPlayAgain}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-heading font-black text-base shadow-xl flex items-center gap-2 active:scale-95 transition-all"
          >
            <RotateCcw size={18} />
            <span>PLAY AGAIN</span>
          </button>
        </div>
      </div>
    </div>
  );
};
