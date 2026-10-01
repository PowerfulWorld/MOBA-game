import React, { useRef, useEffect, useState } from 'react';
import { GameEngine } from '../game/gameEngine';
import { HeroEntity } from '../game/entities';

interface SkillControlsProps {
  engine: GameEngine | null;
  playerHero: HeroEntity | null;
}

export const SkillControls: React.FC<SkillControlsProps> = ({ engine, playerHero }) => {
  const [, setTick] = useState(0);

  // Re-render UI at ~20fps to update cooldown timers smoothly
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => (t + 1) % 1000);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!engine || !engine.playerHero || engine.playerHero.isDead) return;

      if (e.code === 'Space' || e.code === 'KeyA') {
        e.preventDefault();
        handleAttackClick();
      } else if (e.code === 'KeyQ') {
        handleSkillTrigger(0);
      } else if (e.code === 'KeyW') {
        handleSkillTrigger(1);
      } else if (e.code === 'KeyE') {
        handleSkillTrigger(2);
      } else if (e.code === 'KeyR') {
        handleSkillTrigger(3);
      } else if (e.code === 'KeyB') {
        handleRecallClick();
      } else if (e.code === 'KeyF' || e.code === 'KeyD') {
        handleFlashClick();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [engine, playerHero]);

  if (!engine || !playerHero) return null;

  const handleAttackClick = () => {
    const target = engine.selectAutoTarget();
    if (target) {
      engine.heroBasicAttack(playerHero, target);
    }
  };

  const handleSkillTrigger = (skillIndex: number, aimVec?: { x: number; y: number }) => {
    const skill = playerHero.skills[skillIndex];
    if (!skill || skill.level === 0 || skill.currentCooldown > 0 || playerHero.mana < skill.manaCost) return;

    let targetX = playerHero.x;
    let targetY = playerHero.y;

    if (aimVec && Math.hypot(aimVec.x, aimVec.y) > 0.05) {
      targetX = playerHero.x + aimVec.x * (skill.range || 200);
      targetY = playerHero.y + aimVec.y * (skill.range || 200);
    } else {
      // Auto-target closest enemy in range or direction faced
      const autoTarget = engine.selectAutoTarget();
      if (autoTarget) {
        targetX = autoTarget.x;
        targetY = autoTarget.y;
      } else {
        targetX = playerHero.x + Math.cos(playerHero.facingAngle) * (skill.range || 200);
        targetY = playerHero.y + Math.sin(playerHero.facingAngle) * (skill.range || 200);
      }
    }

    engine.castSkill(playerHero, skillIndex, targetX, targetY);
  };

  const handleRecallClick = () => {
    if (playerHero.isDead || playerHero.isRecalling) return;
    playerHero.isRecalling = true;
    playerHero.recallTimer = 5.0;
  };

  const handleFlashClick = () => {
    engine.useFlash(playerHero);
  };

  return (
    <div className="relative pointer-events-auto select-none touch-none w-72 h-72 sm:w-80 sm:h-80 flex items-end justify-end">
      {/* Mini Target Switch Buttons (Minion & Turret priority) */}
      <div className="absolute right-36 bottom-2 flex flex-col gap-2">
        <button
          onClick={() => {
            engine.attackPriority = engine.attackPriority === 'minion' ? 'hero' : 'minion';
          }}
          className={`w-9 h-9 rounded-full border flex items-center justify-center text-xs shadow-md transition-all ${
            engine.attackPriority === 'minion'
              ? 'bg-amber-500 border-yellow-200 text-slate-950 font-bold scale-110 ring-2 ring-amber-400'
              : 'bg-slate-800/80 border-slate-600 text-slate-300'
          }`}
          title="Focus Minions"
        >
          ⚔️
        </button>
        <button
          onClick={() => {
            engine.attackPriority = engine.attackPriority === 'tower' ? 'hero' : 'tower';
          }}
          className={`w-9 h-9 rounded-full border flex items-center justify-center text-xs shadow-md transition-all ${
            engine.attackPriority === 'tower'
              ? 'bg-red-500 border-red-200 text-white font-bold scale-110 ring-2 ring-red-400'
              : 'bg-slate-800/80 border-slate-600 text-slate-300'
          }`}
          title="Focus Turret"
        >
          🏰
        </button>
      </div>

      {/* Auxiliary Buttons: Recall (B) & Flash */}
      <div className="absolute left-0 bottom-4 flex flex-col gap-3">
        {/* Flash (Summoner Spell) */}
        <button
          onClick={handleFlashClick}
          disabled={playerHero.flashCooldown > 0}
          className="relative w-12 h-12 rounded-full border-2 border-amber-400/80 bg-slate-900/90 shadow-lg flex flex-col items-center justify-center active:scale-95 disabled:opacity-50"
        >
          <span className="text-sm">⚡</span>
          <span className="text-[9px] font-bold text-amber-300">FLASH</span>
          {playerHero.flashCooldown > 0 && (
            <div className="absolute inset-0 rounded-full bg-black/70 flex items-center justify-center font-bold text-xs text-white">
              {Math.ceil(playerHero.flashCooldown)}s
            </div>
          )}
          <span className="absolute -bottom-1 -right-1 bg-slate-950 px-1 rounded text-[8px] text-slate-400 font-mono">F</span>
        </button>

        {/* Recall (B) */}
        <button
          onClick={handleRecallClick}
          disabled={playerHero.isRecalling}
          className="relative w-12 h-12 rounded-full border-2 border-cyan-400/80 bg-slate-900/90 shadow-lg flex flex-col items-center justify-center active:scale-95 disabled:border-cyan-300"
        >
          <span className="text-sm">🌀</span>
          <span className="text-[9px] font-bold text-cyan-300">RECALL</span>
          {playerHero.isRecalling && (
            <div className="absolute inset-0 rounded-full bg-cyan-950/80 flex items-center justify-center font-bold text-xs text-cyan-300 animate-pulse">
              {Math.ceil(playerHero.recallTimer)}s
            </div>
          )}
          <span className="absolute -bottom-1 -right-1 bg-slate-950 px-1 rounded text-[8px] text-slate-400 font-mono">B</span>
        </button>
      </div>

      {/* SKILL BUTTONS ARC */}
      {/* Skill 1 (Bottom-left of arc) */}
      <SkillButton
        engine={engine}
        playerHero={playerHero}
        skillIndex={0}
        shortcut="Q"
        className="absolute bottom-16 right-36"
        onTrigger={(aim) => handleSkillTrigger(0, aim)}
      />

      {/* Skill 2 (Mid-left of arc) */}
      <SkillButton
        engine={engine}
        playerHero={playerHero}
        skillIndex={1}
        shortcut="W"
        className="absolute bottom-36 right-32"
        onTrigger={(aim) => handleSkillTrigger(1, aim)}
      />

      {/* Skill 3 (Top-center of arc) */}
      <SkillButton
        engine={engine}
        playerHero={playerHero}
        skillIndex={2}
        shortcut="E"
        className="absolute bottom-48 right-16"
        onTrigger={(aim) => handleSkillTrigger(2, aim)}
      />

      {/* Skill 4 / ULTIMATE (Top-right with gold border) */}
      <SkillButton
        engine={engine}
        playerHero={playerHero}
        skillIndex={3}
        isUlt={true}
        shortcut="R"
        className="absolute bottom-40 right-0"
        onTrigger={(aim) => handleSkillTrigger(3, aim)}
      />

      {/* MAIN ATTACK BUTTON (Large center-bottom) */}
      <button
        onClick={handleAttackClick}
        className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-red-500 via-rose-600 to-amber-600 border-4 border-amber-300/80 shadow-2xl flex flex-col items-center justify-center active:scale-95 active:brightness-125 transition-transform"
      >
        <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full border border-white/40 flex flex-col items-center justify-center bg-black/20">
          <span className="text-2xl sm:text-3xl">⚔️</span>
          <span className="text-[10px] font-extrabold tracking-wider text-amber-200">ATTACK</span>
        </div>
        <span className="absolute bottom-1 bg-slate-950/80 px-1.5 py-0.2 rounded text-[9px] text-amber-300 font-mono font-bold">
          SPACE
        </span>
      </button>
    </div>
  );
};

interface SkillButtonProps {
  engine: GameEngine;
  playerHero: HeroEntity;
  skillIndex: number;
  shortcut: string;
  isUlt?: boolean;
  className?: string;
  onTrigger: (aimVec?: { x: number; y: number }) => void;
}

const SkillButton: React.FC<SkillButtonProps> = ({
  engine,
  playerHero,
  skillIndex,
  shortcut,
  isUlt = false,
  className = '',
  onTrigger,
}) => {
  const btnRef = useRef<HTMLDivElement | null>(null);
  const touchIdRef = useRef<number | null>(null);
  const aimVectorRef = useRef({ x: 0, y: 0 });

  const skill = playerHero.skills[skillIndex];
  if (!skill) return null;

  const isLocked = skill.level === 0;
  const onCooldown = skill.currentCooldown > 0;
  const noMana = playerHero.mana < skill.manaCost;
  const canUpgrade = playerHero.skillPoints > 0 && skill.level < skill.maxLevel;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isLocked || onCooldown || noMana || touchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    touchIdRef.current = touch.identifier;
    engine.aimingSkillIndex = skillIndex;
    aimVectorRef.current = { x: 0, y: 0 };
    engine.aimVector = { x: 0, y: 0 };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchIdRef.current === null || !btnRef.current) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        const rect = btnRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = touch.clientX - centerX;
        const dy = touch.clientY - centerY;
        const dist = Math.hypot(dx, dy);

        if (dist > 15) {
          const aim = { x: dx / dist, y: dy / dist };
          aimVectorRef.current = aim;
          engine.aimVector = aim;
        }
        break;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        touchIdRef.current = null;
        engine.aimingSkillIndex = null;
        onTrigger(aimVectorRef.current);
        break;
      }
    }
  };

  const handleClick = () => {
    if (isLocked || onCooldown || noMana) return;
    onTrigger();
  };

  const handleUpgradeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    playerHero.upgradeSkill(skillIndex);
  };

  const sizeClass = isUlt ? 'w-16 h-16 sm:w-18 sm:h-18' : 'w-14 h-14 sm:w-16 sm:h-16';

  return (
    <div className={`relative ${className}`}>
      {/* "+" Level up button if points available */}
      {canUpgrade && (
        <button
          onClick={handleUpgradeClick}
          className="absolute -top-3 -right-2 z-20 w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-extrabold text-sm flex items-center justify-center shadow-lg border border-white animate-bounce pointer-events-auto"
          title="Level Up Skill"
        >
          +
        </button>
      )}

      {/* Button */}
      <div
        ref={btnRef}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className={`relative ${sizeClass} rounded-full flex flex-col items-center justify-center shadow-xl border-2 transition-all cursor-pointer ${
          isUlt
            ? 'bg-gradient-to-br from-amber-600 via-yellow-500 to-amber-700 border-amber-300 ring-2 ring-yellow-400/50'
            : 'bg-gradient-to-br from-slate-800 to-slate-900 border-cyan-400/70 hover:border-cyan-300'
        } ${isLocked ? 'opacity-40 grayscale' : noMana ? 'opacity-60' : 'active:scale-95'}`}
      >
        <span className="text-lg sm:text-xl">{skill.icon}</span>

        {/* Skill level pips */}
        <div className="absolute top-1 flex gap-0.5">
          {Array.from({ length: skill.maxLevel }).map((_, idx) => (
            <div
              key={idx}
              className={`w-1.5 h-1.5 rounded-full ${idx < skill.level ? 'bg-amber-400' : 'bg-slate-600'}`}
            />
          ))}
        </div>

        {/* Mana cost badge */}
        {!isLocked && (
          <span className="absolute bottom-1 text-[9px] font-bold text-cyan-300 font-mono">
            {skill.manaCost}
          </span>
        )}

        {/* Cooldown Overlay */}
        {onCooldown && (
          <div className="absolute inset-0 rounded-full bg-black/75 flex items-center justify-center font-bold text-sm text-white">
            {skill.currentCooldown >= 1 ? Math.ceil(skill.currentCooldown) : skill.currentCooldown.toFixed(1)}
          </div>
        )}

        {/* Desktop shortcut hint */}
        <span className="absolute -bottom-1 -left-1 bg-slate-950/90 px-1 py-0.2 rounded text-[8px] text-slate-300 font-mono font-bold border border-slate-700">
          {shortcut}
        </span>
      </div>
    </div>
  );
};
