import React, { useState } from 'react';
import { HeroEntity } from '../game/entities';
import { Item } from '../types/game';
import { ITEMS_CONFIG } from '../config/balance';
import { soundManager } from '../audio/soundManager';
import { X, Shield, Swords, Sparkles, Footprints, Trees, ShoppingBag } from 'lucide-react';

interface ShopModalProps {
  playerHero: HeroEntity | null;
  onClose: () => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({ playerHero, onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'attack' | 'magic' | 'defense' | 'movement' | 'jungle'>('all');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [selectedEquippedIndex, setSelectedEquippedIndex] = useState<number | null>(null);

  if (!playerHero) return null;

  const filteredItems = ITEMS_CONFIG.filter((item) => {
    if (selectedCategory === 'all') return true;
    return item.category === selectedCategory;
  });

  const handleBuy = (item: Item) => {
    if (playerHero.buyItem(item)) {
      soundManager.playBuyItem();
      setSelectedItem(null);
    }
  };

  const handleSell = (index: number) => {
    playerHero.sellItem(index);
    soundManager.playBuyItem();
    setSelectedEquippedIndex(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-2 sm:p-4 select-none pointer-events-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border-2 border-slate-700 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
              <ShoppingBag size={20} />
            </div>
            <div>
              <h2 className="font-heading font-bold text-lg text-white">EQUIPMENT ARMORY</h2>
              <p className="text-xs text-slate-400">Purchase battle gear to empower your hero</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-full border border-amber-500/40 font-mono font-bold text-amber-300">
              <span>🪙</span>
              <span>{Math.floor(playerHero.gold)} GOLD</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Column: Categories & Items */}
          <div className="flex-1 flex flex-col border-r border-slate-800 overflow-hidden">
            {/* Category Tabs */}
            <div className="flex items-center gap-1 p-2 bg-slate-950/60 overflow-x-auto border-b border-slate-800/80">
              {[
                { id: 'all', label: 'All', icon: <ShoppingBag size={14} /> },
                { id: 'attack', label: 'Attack', icon: <Swords size={14} /> },
                { id: 'magic', label: 'Magic', icon: <Sparkles size={14} /> },
                { id: 'defense', label: 'Defense', icon: <Shield size={14} /> },
                { id: 'movement', label: 'Movement', icon: <Footprints size={14} /> },
                { id: 'jungle', label: 'Jungle', icon: <Trees size={14} /> },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id as typeof selectedCategory)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {cat.icon}
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            {/* Item Grid */}
            <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {filteredItems.map((item) => {
                const isOwned = playerHero.items.some((i) => i.id === item.id);
                const canAfford = playerHero.gold >= item.cost;
                const isSelected = selectedItem?.id === item.id;

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedItem(item);
                      setSelectedEquippedIndex(null);
                    }}
                    className={`relative p-2.5 rounded-lg border flex flex-col justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'border-amber-400 bg-amber-950/30 ring-1 ring-amber-400'
                        : isOwned
                        ? 'border-slate-700 bg-slate-900/40 opacity-75'
                        : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="text-2xl p-1.5 rounded bg-slate-800/80 border border-slate-700">
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-heading font-semibold text-xs text-white truncate">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-amber-300 font-mono font-bold">
                          {item.cost} G
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 text-[10px] text-slate-400 line-clamp-2">
                      {item.description}
                    </div>

                    {isOwned && (
                      <span className="mt-1.5 text-[9px] font-bold text-emerald-400 uppercase tracking-wider">
                        EQUIPPED
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Selected Item Detail & Hero Inventory */}
          <div className="w-full md:w-80 flex flex-col bg-slate-950/90 p-3 sm:p-4 overflow-y-auto">
            {/* 6 Inventory Slots */}
            <div className="mb-4">
              <h3 className="font-heading text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                Hero Inventory ({playerHero.items.length}/6)
              </h3>
              <div className="grid grid-cols-6 gap-1.5">
                {Array.from({ length: 6 }).map((_, idx) => {
                  const item = playerHero.items[idx];
                  const isSelected = selectedEquippedIndex === idx;

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        if (item) {
                          setSelectedEquippedIndex(idx);
                          setSelectedItem(null);
                        }
                      }}
                      className={`h-11 rounded-lg border flex items-center justify-center text-xl cursor-pointer transition-all ${
                        item
                          ? isSelected
                            ? 'border-amber-400 bg-amber-950/40 ring-1 ring-amber-400'
                            : 'border-slate-700 bg-slate-900 hover:border-slate-600'
                          : 'border-dashed border-slate-800 bg-slate-950/40 text-slate-600'
                      }`}
                    >
                      {item ? item.icon : ''}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Item / Equipped Item Actions */}
            <div className="flex-1 border-t border-slate-800 pt-3 flex flex-col justify-between">
              {selectedItem ? (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-3xl">{selectedItem.icon}</span>
                    <div>
                      <h4 className="font-heading font-bold text-white text-sm">{selectedItem.name}</h4>
                      <span className="text-xs font-mono font-bold text-amber-300">
                        {selectedItem.cost} Gold
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 mb-3">{selectedItem.description}</p>
                  {selectedItem.passive && (
                    <div className="p-2 rounded bg-slate-900 border border-slate-800 text-[11px] text-amber-200 mb-3">
                      <span className="font-bold text-amber-400">Passive: </span>
                      {selectedItem.passive}
                    </div>
                  )}

                  <button
                    onClick={() => handleBuy(selectedItem)}
                    disabled={
                      playerHero.gold < selectedItem.cost ||
                      playerHero.items.length >= 6 ||
                      playerHero.items.some((i) => i.id === selectedItem.id)
                    }
                    className="w-full py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-heading font-bold text-sm shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    {playerHero.items.some((i) => i.id === selectedItem.id)
                      ? 'Already Owned'
                      : playerHero.items.length >= 6
                      ? 'Inventory Full'
                      : playerHero.gold < selectedItem.cost
                      ? 'Not Enough Gold'
                      : 'Purchase Item'}
                  </button>
                </div>
              ) : selectedEquippedIndex !== null && playerHero.items[selectedEquippedIndex] ? (
                <div>
                  {(() => {
                    const item = playerHero.items[selectedEquippedIndex];
                    const refund = Math.round(item.cost * 0.7);
                    return (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-3xl">{item.icon}</span>
                          <div>
                            <h4 className="font-heading font-bold text-white text-sm">{item.name}</h4>
                            <span className="text-xs font-mono font-bold text-emerald-400">
                              Resale Value: {refund} Gold
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-300 mb-3">{item.description}</p>

                        <button
                          onClick={() => handleSell(selectedEquippedIndex)}
                          className="w-full py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-heading font-bold text-sm shadow-lg transition-all"
                        >
                          Sell Item (+{refund}G)
                        </button>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="text-center text-xs text-slate-500 py-6">
                  Select an item to view details and purchase or select an equipped item to sell.
                </div>
              )}

              {/* Total Stats Summary */}
              <div className="mt-4 pt-3 border-t border-slate-800">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Total Hero Stats
                </h4>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] font-mono">
                  <div className="text-slate-300">
                    Attack: <span className="text-amber-400 font-bold">{Math.round(playerHero.currentStats.attack)}</span>
                  </div>
                  <div className="text-slate-300">
                    Magic: <span className="text-purple-400 font-bold">{Math.round(playerHero.currentStats.magicPower)}</span>
                  </div>
                  <div className="text-slate-300">
                    Armor: <span className="text-blue-400 font-bold">{Math.round(playerHero.currentStats.armor)}</span>
                  </div>
                  <div className="text-slate-300">
                    Magic Res: <span className="text-cyan-400 font-bold">{Math.round(playerHero.currentStats.magicResist)}</span>
                  </div>
                  <div className="text-slate-300">
                    Move Speed: <span className="text-emerald-400 font-bold">{Math.round(playerHero.currentStats.moveSpeed)}</span>
                  </div>
                  <div className="text-slate-300">
                    CDR: <span className="text-indigo-400 font-bold">{Math.round(playerHero.currentStats.cooldownReduction * 100)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
