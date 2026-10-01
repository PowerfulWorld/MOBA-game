import React, { useState } from 'react';
import { soundManager } from '../audio/soundManager';
import { X, Volume2, VolumeX, Monitor, HelpCircle, Flag } from 'lucide-react';

interface SettingsModalProps {
  onClose: () => void;
  onSurrender: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, onSurrender }) => {
  const [isMuted, setIsMuted] = useState(soundManager.getMuted());
  const [sfxVol, setSfxVol] = useState(70);
  const [musicVol, setMusicVol] = useState(25);
  const [graphicsQuality, setGraphicsQuality] = useState<'high' | 'medium'>('high');

  const handleMuteToggle = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundManager.setMute(next);
  };

  const handleSfxChange = (val: number) => {
    setSfxVol(val);
    soundManager.setVolume(val / 100, musicVol / 100);
  };

  const handleMusicChange = (val: number) => {
    setMusicVol(val);
    soundManager.setVolume(sfxVol / 100, val / 100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none pointer-events-auto">
      <div className="relative w-full max-w-md bg-slate-900 border-2 border-slate-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950 border-b border-slate-800">
          <h2 className="font-heading font-bold text-lg text-white">GAME SETTINGS</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4 text-xs">
          {/* Audio Section */}
          <div className="flex flex-col gap-3 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="font-heading font-bold text-slate-300 flex items-center gap-1.5 uppercase">
                <Volume2 size={16} /> Audio Controls
              </span>
              <button
                onClick={handleMuteToggle}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${
                  isMuted ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                {isMuted ? 'MUTED' : 'UNMUTED'}
              </button>
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Sound Effects (SFX)</span>
                <span>{sfxVol}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={sfxVol}
                onChange={(e) => handleSfxChange(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Battle BGM (Music)</span>
                <span>{musicVol}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={musicVol}
                onChange={(e) => handleMusicChange(Number(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Graphics Quality */}
          <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="font-heading font-bold text-slate-300 flex items-center gap-1.5 uppercase">
              <Monitor size={16} /> Graphics Quality
            </span>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                onClick={() => setGraphicsQuality('high')}
                className={`py-1.5 rounded-lg font-heading font-bold transition-all ${
                  graphicsQuality === 'high'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                HIGH (60 FPS)
              </button>
              <button
                onClick={() => setGraphicsQuality('medium')}
                className={`py-1.5 rounded-lg font-heading font-bold transition-all ${
                  graphicsQuality === 'medium'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                MEDIUM
              </button>
            </div>
          </div>

          {/* Controls Quick Ref */}
          <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400">
            <span className="font-heading font-bold text-slate-300 flex items-center gap-1.5 uppercase">
              <HelpCircle size={15} /> Keyboard Shortcuts
            </span>
            <div className="grid grid-cols-2 gap-1 font-mono text-[10px]">
              <div>WASD / Arrows: Move</div>
              <div>Space / A: Basic Attack</div>
              <div>Q / W / E: Skills 1, 2, 3</div>
              <div>R: Ultimate Ability</div>
              <div>B: Recall to Fountain</div>
              <div>F / D: Flash Summoner</div>
            </div>
          </div>

          {/* Surrender / Quit */}
          <button
            onClick={onSurrender}
            className="w-full py-2.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-700 text-rose-300 font-heading font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <Flag size={16} />
            <span>SURRENDER & EXIT MATCH</span>
          </button>
        </div>
      </div>
    </div>
  );
};
