import React, { useState } from 'react';
import { HeroConfig, Difficulty } from '../types/game';
import { HEROES_CONFIG } from '../config/balance';
import { Shield, Swords, Sparkles, Crosshair, Zap, Heart, Play } from 'lucide-react';
import { soundManager } from '../audio/soundManager';

interface HeroSelectScreenProps {
  onStartMatch: (selectedHeroId: string, difficulty: Difficulty) => void;
}

export const HeroSelectScreen: React.FC<HeroSelectScreenProps> = ({ onStartMatch }) => {
  const heroesList = Object.values(HEROES_CONFIG);
  const [selectedHeroId, setSelectedHeroId] = useState<string>('kaelen');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [activeSkillTab, setActiveSkillTab] = useState<number>(0);

  const selectedHero = HEROES_CONFIG[selectedHeroId] || heroesList[0];

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'tank': return <Shield size={16} className="text-blue-400" />;
      case 'fighter': return <Swords size={16} className="text-orange-400" />;
      case 'mage': return <Sparkles size={16} className="text-purple-400" />;
      case 'marksman': return <Crosshair size={16} className="text-yellow-400" />;
      case 'assassin': return <Zap size={16} className="text-fuchsia-400" />;
      case 'support': return <Heart size={16} className="text-cyan-400" />;
      default: return null;
    }
  };

  const handleStart = () => {
    soundManager.playLevelUp();
    onStartMatch(selectedHeroId, difficulty);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white overflow-y-auto select-none p-3 sm:p-6">
      {/* Title & Top Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center font-extrabold text-xl shadow-lg border border-amber-300">
            ⚔️
          </div>
          <div>
            <h1 className="font-heading font-extrabold text-xl sm:text-2xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-rose-300 to-cyan-300">
              APEX CHAMPIONS: LEGENDS ARENA
            </h1>
            <p className="text-xs text-slate-400">Mobile-First 5v5 Real-Time MOBA</p>
          </div>
        </div>

        {/* Difficulty Selector */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
          {(['easy', 'normal', 'hard'] as Difficulty[]).map((diff) => (
            <button
              key={diff}
              onClick={() => setDifficulty(diff)}
              className={`px-3 py-1 rounded-lg text-xs font-heading font-bold uppercase transition-colors ${
                difficulty === diff
                  ? diff === 'hard'
                    ? 'bg-rose-600 text-white shadow'
                    : diff === 'normal'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {diff}
            </button>
          ))}
        </div>
      </div>

      {/* Main Layout: Hero Roster + Selected Hero Details */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 mt-4">
        {/* Left: Hero Grid */}
        <div className="w-full lg:w-1/2 flex flex-col">
          <h2 className="font-heading text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">
            Select Your Champion (6 Heroes)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {heroesList.map((hero) => {
              const isSelected = hero.id === selectedHeroId;

              return (
                <div
                  key={hero.id}
                  onClick={() => {
                    setSelectedHeroId(hero.id);
                    soundManager.playAttack(hero.role);
                  }}
                  className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-amber-400 bg-slate-900/90 shadow-xl ring-2 ring-amber-400/50 scale-[1.02]'
                      : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold shadow-md border"
                      style={{
                        backgroundColor: hero.avatarColor,
                        borderColor: hero.secondaryColor,
                      }}
                    >
                      {hero.name.slice(0, 1)}
                    </div>
                    <span className="flex items-center gap-1 text-[11px] font-bold uppercase text-slate-300">
                      {getRoleIcon(hero.role)}
                      <span>{hero.role}</span>
                    </span>
                  </div>

                  <div>
                    <h3 className="font-heading font-bold text-base text-white">{hero.name}</h3>
                    <p className="text-[11px] text-amber-300 font-semibold">{hero.title}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Controls Guide */}
          <div className="mt-5 p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 text-xs">
            <h4 className="font-heading font-bold text-slate-300 mb-2 uppercase text-[11px] tracking-wider">
              🎮 Battle Controls Guide
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-400 text-[11px]">
              <div>
                <span className="text-cyan-400 font-bold">Mobile:</span> Left joystick to move. Right buttons to attack, aim skills, recall and flash.
              </div>
              <div>
                <span className="text-amber-400 font-bold">Desktop:</span> <kbd className="bg-slate-800 px-1 rounded text-white">WASD</kbd> Move, <kbd className="bg-slate-800 px-1 rounded text-white">Space</kbd> Attack, <kbd className="bg-slate-800 px-1 rounded text-white">Q/W/E/R</kbd> Skills, <kbd className="bg-slate-800 px-1 rounded text-white">B</kbd> Recall.
              </div>
            </div>
          </div>
        </div>

        {/* Right: Selected Hero Showcase */}
        <div className="w-full lg:w-1/2 flex flex-col justify-between bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl">
          <div>
            {/* Hero Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-slate-800 border border-slate-700 flex items-center gap-1">
                    {getRoleIcon(selectedHero.role)}
                    <span className="text-white">{selectedHero.role}</span>
                  </span>
                  <span className="text-xs text-amber-400 font-bold font-mono">5v5 ARENA</span>
                </div>
                <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-white">
                  {selectedHero.name}
                </h2>
                <p className="text-sm text-amber-300 font-semibold">{selectedHero.title}</p>
              </div>

              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-heading font-black shadow-2xl border-2"
                style={{
                  backgroundColor: selectedHero.avatarColor,
                  borderColor: selectedHero.secondaryColor,
                }}
              >
                {selectedHero.name.slice(0, 1)}
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 mb-5 leading-relaxed">
              {selectedHero.lore}
            </p>

            {/* Base Stats Preview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 uppercase">HP</span>
                <p className="font-heading font-bold text-sm text-emerald-400">{selectedHero.baseStats.hp}</p>
              </div>
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 uppercase">ATTACK</span>
                <p className="font-heading font-bold text-sm text-amber-400">{selectedHero.baseStats.attack}</p>
              </div>
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 uppercase">ARMOR</span>
                <p className="font-heading font-bold text-sm text-blue-400">{selectedHero.baseStats.armor}</p>
              </div>
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 uppercase">SPEED</span>
                <p className="font-heading font-bold text-sm text-cyan-400">{selectedHero.baseStats.moveSpeed}</p>
              </div>
            </div>

            {/* Passive Trait */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 mb-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs bg-amber-500/20 text-amber-400 font-bold px-1.5 py-0.5 rounded border border-amber-500/30">
                  PASSIVE
                </span>
                <h4 className="font-heading font-bold text-sm text-white">
                  {selectedHero.passive.name}
                </h4>
              </div>
              <p className="text-xs text-slate-400">{selectedHero.passive.description}</p>
            </div>

            {/* Skills Tabs */}
            <div>
              <h4 className="font-heading text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Active Abilities (1 to 4)
              </h4>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {selectedHero.skills.map((skill, idx) => (
                  <button
                    key={skill.id}
                    onClick={() => setActiveSkillTab(idx)}
                    className={`p-2 rounded-lg border flex flex-col items-center gap-1 transition-all ${
                      activeSkillTab === idx
                        ? 'border-amber-400 bg-amber-950/40 text-white'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-xl">{skill.icon}</span>
                    <span className="text-[10px] font-bold uppercase truncate max-w-full">
                      {idx === 3 ? 'ULT' : `S${idx + 1}`}
                    </span>
                  </button>
                ))}
              </div>

              {/* Active Skill Info */}
              {selectedHero.skills[activeSkillTab] && (
                <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <h5 className="font-heading font-bold text-sm text-amber-300">
                      {selectedHero.skills[activeSkillTab].name}
                    </h5>
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="text-slate-400">CD: {selectedHero.skills[activeSkillTab].cooldown}s</span>
                      <span className="text-cyan-400">MP: {selectedHero.skills[activeSkillTab].manaCost}</span>
                    </div>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    {selectedHero.skills[activeSkillTab].description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Launch Button */}
          <button
            onClick={handleStart}
            className="w-full mt-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-rose-600 to-amber-600 hover:from-amber-400 hover:to-rose-500 text-slate-950 font-heading font-black text-lg tracking-wider shadow-2xl flex items-center justify-center gap-2 active:scale-98 transition-all border border-amber-300 neon-border-gold"
          >
            <Play size={20} className="fill-slate-950" />
            <span>ENTER THE ARENA (5v5)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
