/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import { GameEngine } from './game/gameEngine';
import { HeroEntity } from './game/entities';
import { Difficulty } from './types/game';
import { HeroSelectScreen } from './components/HeroSelectScreen';
import { Minimap } from './components/Minimap';
import { VirtualJoystick } from './components/VirtualJoystick';
import { SkillControls } from './components/SkillControls';
import { ScoreboardHeader } from './components/ScoreboardHeader';
import { HeroStatusBar } from './components/HeroStatusBar';
import { ShopModal } from './components/ShopModal';
import { SettingsModal } from './components/SettingsModal';
import { GameOverModal } from './components/GameOverModal';

export default function App() {
  const [gameState, setGameState] = useState<'hero_select' | 'in_game' | 'game_over'>('hero_select');
  const [selectedHeroId, setSelectedHeroId] = useState<string>('kaelen');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [matchResult, setMatchResult] = useState<'victory' | 'defeat'>('victory');

  // Modals
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Engine & Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [playerHero, setPlayerHero] = useState<HeroEntity | null>(null);

  // Start new match
  const handleStartMatch = (heroId: string, diff: Difficulty) => {
    setSelectedHeroId(heroId);
    setDifficulty(diff);
    setGameState('in_game');
    setIsShopOpen(false);
    setIsSettingsOpen(false);
  };

  // Setup canvas & engine when transitioning to 'in_game'
  useEffect(() => {
    if (gameState !== 'in_game' || !canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);

    const engine = new GameEngine(
      canvas,
      selectedHeroId,
      difficulty,
      (eng) => {
        // Periodic sync to React state for HUD
        setPlayerHero(eng.playerHero);
      },
      (result) => {
        setMatchResult(result);
        setGameState('game_over');
      }
    );

    engineRef.current = engine;
    setPlayerHero(engine.playerHero);
    engine.start();

    return () => {
      window.removeEventListener('resize', handleResize);
      engine.stop();
      engineRef.current = null;
    };
  }, [gameState, selectedHeroId, difficulty]);

  const handlePlayAgain = () => {
    setGameState('hero_select');
  };

  const handleSurrender = () => {
    setIsSettingsOpen(false);
    setMatchResult('defeat');
    setGameState('game_over');
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none touch-none">
      {/* 1. HERO SELECTION SCREEN */}
      {gameState === 'hero_select' && (
        <HeroSelectScreen onStartMatch={handleStartMatch} />
      )}

      {/* 2. MAIN BATTLE ARENA (CANVAS & HUD) */}
      <div className={`relative w-full h-full ${gameState === 'hero_select' ? 'hidden' : 'block'}`}>
        {/* Fullscreen HTML5 Game Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full block cursor-crosshair z-0"
        />

        {/* HUD OVERLAY CONTAINER */}
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-2 sm:p-4 z-10">
          {/* Top Bar: Scoreboard, Timer, KDA, Gold, Shop Trigger */}
          <ScoreboardHeader
            engine={engineRef.current}
            playerHero={playerHero}
            onOpenShop={() => setIsShopOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />

          {/* Minimap positioned at Top-Left */}
          <div className="absolute top-14 left-3 pointer-events-auto z-20">
            <Minimap engine={engineRef.current} />
          </div>

          {/* Bottom Area: Virtual Joystick (Left), Hero Health & Mana (Center), Skills Pad (Right) */}
          <div className="w-full flex items-end justify-between pointer-events-none px-1 pb-1">
            {/* Left: Virtual Joystick */}
            <div className="pointer-events-auto mb-2 ml-1">
              <VirtualJoystick engine={engineRef.current} />
            </div>

            {/* Center: HP/Mana Bars & Buffs */}
            <div className="mb-2">
              <HeroStatusBar playerHero={playerHero} />
            </div>

            {/* Right: Attack & Skills Pad */}
            <div className="pointer-events-auto mb-1 mr-1">
              <SkillControls engine={engineRef.current} playerHero={playerHero} />
            </div>
          </div>
        </div>

        {/* 3. SHOP MODAL */}
        {isShopOpen && (
          <ShopModal
            playerHero={playerHero}
            onClose={() => setIsShopOpen(false)}
          />
        )}

        {/* 4. SETTINGS MODAL */}
        {isSettingsOpen && (
          <SettingsModal
            onClose={() => setIsSettingsOpen(false)}
            onSurrender={handleSurrender}
          />
        )}

        {/* 5. GAME OVER MODAL (VICTORY / DEFEAT) */}
        {gameState === 'game_over' && engineRef.current && (
          <GameOverModal
            engine={engineRef.current}
            result={matchResult}
            onPlayAgain={handlePlayAgain}
          />
        )}
      </div>
    </div>
  );
}
