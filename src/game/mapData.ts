import { Team, Lane, Vector2D } from '../types/game';

export interface StructureSpawn {
  id: string;
  type: 'tower' | 'inhibitor' | 'core';
  team: Team;
  lane: Lane;
  tier: 1 | 2 | 3 | 4; // 1: Outer, 2: Inner, 3: Inhibitor, 4: Core
  x: number;
  y: number;
  maxHp: number;
  attackRange: number;
  attackDamage: number;
}

export interface JungleCampSpawn {
  id: string;
  type: 'red_buff' | 'blue_buff' | 'neutral' | 'scuttler' | 'lord';
  name: string;
  x: number;
  y: number;
  maxHp: number;
  attackDamage: number;
  attackRange: number;
  gold: number;
  xp: number;
  respawnSec: number;
  color: string;
}

export interface BushZone {
  x: number;
  y: number;
  radius: number;
}

export interface Obstacle {
  x: number;
  y: number;
  radius: number;
}

// Symmetrical 3-lane Waypoints
export const LANE_WAYPOINTS: Record<Team, Record<'top' | 'mid' | 'bot', Vector2D[]>> = {
  blue: {
    top: [
      { x: 300, y: 2100 },
      { x: 360, y: 1750 },
      { x: 360, y: 1250 },
      { x: 360, y: 550 },
      { x: 550, y: 360 },
      { x: 1250, y: 360 },
      { x: 1750, y: 360 },
      { x: 2100, y: 300 },
    ],
    mid: [
      { x: 300, y: 2100 },
      { x: 600, y: 1800 },
      { x: 950, y: 1450 },
      { x: 1200, y: 1200 },
      { x: 1450, y: 950 },
      { x: 1800, y: 600 },
      { x: 2100, y: 300 },
    ],
    bot: [
      { x: 300, y: 2100 },
      { x: 650, y: 2040 },
      { x: 1250, y: 2040 },
      { x: 1850, y: 2040 },
      { x: 2040, y: 1850 },
      { x: 2040, y: 1250 },
      { x: 2040, y: 650 },
      { x: 2100, y: 300 },
    ],
  },
  red: {
    top: [
      { x: 2100, y: 300 },
      { x: 1750, y: 360 },
      { x: 1250, y: 360 },
      { x: 550, y: 360 },
      { x: 360, y: 550 },
      { x: 360, y: 1250 },
      { x: 360, y: 1750 },
      { x: 300, y: 2100 },
    ],
    mid: [
      { x: 2100, y: 300 },
      { x: 1800, y: 600 },
      { x: 1450, y: 950 },
      { x: 1200, y: 1200 },
      { x: 950, y: 1450 },
      { x: 600, y: 1800 },
      { x: 300, y: 2100 },
    ],
    bot: [
      { x: 2100, y: 300 },
      { x: 2040, y: 650 },
      { x: 2040, y: 1250 },
      { x: 2040, y: 1850 },
      { x: 1850, y: 2040 },
      { x: 1250, y: 2040 },
      { x: 650, y: 2040 },
      { x: 300, y: 2100 },
    ],
  },
};

export const STRUCTURE_SPAWNS: StructureSpawn[] = [
  // BLUE CORE
  {
    id: 'blue_core',
    type: 'core',
    team: 'blue',
    lane: 'mid',
    tier: 4,
    x: 280,
    y: 2120,
    maxHp: 7500,
    attackRange: 270,
    attackDamage: 280,
  },
  // BLUE TOP LANE
  {
    id: 'blue_top_t1',
    type: 'tower',
    team: 'blue',
    lane: 'top',
    tier: 1,
    x: 360,
    y: 750,
    maxHp: 4000,
    attackRange: 250,
    attackDamage: 220,
  },
  {
    id: 'blue_top_t2',
    type: 'tower',
    team: 'blue',
    lane: 'top',
    tier: 2,
    x: 360,
    y: 1250,
    maxHp: 4500,
    attackRange: 250,
    attackDamage: 240,
  },
  {
    id: 'blue_top_t3',
    type: 'inhibitor',
    team: 'blue',
    lane: 'top',
    tier: 3,
    x: 360,
    y: 1750,
    maxHp: 3500,
    attackRange: 220,
    attackDamage: 200,
  },
  // BLUE MID LANE
  {
    id: 'blue_mid_t1',
    type: 'tower',
    team: 'blue',
    lane: 'mid',
    tier: 1,
    x: 1020,
    y: 1380,
    maxHp: 4000,
    attackRange: 250,
    attackDamage: 220,
  },
  {
    id: 'blue_mid_t2',
    type: 'tower',
    team: 'blue',
    lane: 'mid',
    tier: 2,
    x: 800,
    y: 1600,
    maxHp: 4500,
    attackRange: 250,
    attackDamage: 240,
  },
  {
    id: 'blue_mid_t3',
    type: 'inhibitor',
    team: 'blue',
    lane: 'mid',
    tier: 3,
    x: 550,
    y: 1850,
    maxHp: 3500,
    attackRange: 220,
    attackDamage: 200,
  },
  // BLUE BOT LANE
  {
    id: 'blue_bot_t1',
    type: 'tower',
    team: 'blue',
    lane: 'bot',
    tier: 1,
    x: 1650,
    y: 2040,
    maxHp: 4000,
    attackRange: 250,
    attackDamage: 220,
  },
  {
    id: 'blue_bot_t2',
    type: 'tower',
    team: 'blue',
    lane: 'bot',
    tier: 2,
    x: 1250,
    y: 2040,
    maxHp: 4500,
    attackRange: 250,
    attackDamage: 240,
  },
  {
    id: 'blue_bot_t3',
    type: 'inhibitor',
    team: 'blue',
    lane: 'bot',
    tier: 3,
    x: 750,
    y: 2040,
    maxHp: 3500,
    attackRange: 220,
    attackDamage: 200,
  },

  // RED CORE
  {
    id: 'red_core',
    type: 'core',
    team: 'red',
    lane: 'mid',
    tier: 4,
    x: 2120,
    y: 280,
    maxHp: 7500,
    attackRange: 270,
    attackDamage: 280,
  },
  // RED TOP LANE
  {
    id: 'red_top_t1',
    type: 'tower',
    team: 'red',
    lane: 'top',
    tier: 1,
    x: 750,
    y: 360,
    maxHp: 4000,
    attackRange: 250,
    attackDamage: 220,
  },
  {
    id: 'red_top_t2',
    type: 'tower',
    team: 'red',
    lane: 'top',
    tier: 2,
    x: 1150,
    y: 360,
    maxHp: 4500,
    attackRange: 250,
    attackDamage: 240,
  },
  {
    id: 'red_top_t3',
    type: 'inhibitor',
    team: 'red',
    lane: 'top',
    tier: 3,
    x: 1650,
    y: 360,
    maxHp: 3500,
    attackRange: 220,
    attackDamage: 200,
  },
  // RED MID LANE
  {
    id: 'red_mid_t1',
    type: 'tower',
    team: 'red',
    lane: 'mid',
    tier: 1,
    x: 1380,
    y: 1020,
    maxHp: 4000,
    attackRange: 250,
    attackDamage: 220,
  },
  {
    id: 'red_mid_t2',
    type: 'tower',
    team: 'red',
    lane: 'mid',
    tier: 2,
    x: 1600,
    y: 800,
    maxHp: 4500,
    attackRange: 250,
    attackDamage: 240,
  },
  {
    id: 'red_mid_t3',
    type: 'inhibitor',
    team: 'red',
    lane: 'mid',
    tier: 3,
    x: 1850,
    y: 550,
    maxHp: 3500,
    attackRange: 220,
    attackDamage: 200,
  },
  // RED BOT LANE
  {
    id: 'red_bot_t1',
    type: 'tower',
    team: 'red',
    lane: 'bot',
    tier: 1,
    x: 2040,
    y: 1650,
    maxHp: 4000,
    attackRange: 250,
    attackDamage: 220,
  },
  {
    id: 'red_bot_t2',
    type: 'tower',
    team: 'red',
    lane: 'bot',
    tier: 2,
    x: 2040,
    y: 1250,
    maxHp: 4500,
    attackRange: 250,
    attackDamage: 240,
  },
  {
    id: 'red_bot_t3',
    type: 'inhibitor',
    team: 'red',
    lane: 'bot',
    tier: 3,
    x: 2040,
    y: 750,
    maxHp: 3500,
    attackRange: 220,
    attackDamage: 200,
  },
];

export const JUNGLE_CAMPS: JungleCampSpawn[] = [
  // BLUE JUNGLE
  {
    id: 'blue_red_buff',
    type: 'red_buff',
    name: 'Infernal Fiend (Red Buff)',
    x: 1050,
    y: 1750,
    maxHp: 3200,
    attackDamage: 110,
    attackRange: 100,
    gold: 70,
    xp: 120,
    respawnSec: 75,
    color: '#ef4444',
  },
  {
    id: 'blue_blue_buff',
    type: 'blue_buff',
    name: 'Azure Golem (Blue Buff)',
    x: 650,
    y: 1350,
    maxHp: 3200,
    attackDamage: 95,
    attackRange: 100,
    gold: 70,
    xp: 120,
    respawnSec: 75,
    color: '#3b82f6',
  },
  {
    id: 'blue_neutral_1',
    type: 'neutral',
    name: 'Rockling',
    x: 820,
    y: 1150,
    maxHp: 2000,
    attackDamage: 80,
    attackRange: 90,
    gold: 50,
    xp: 85,
    respawnSec: 60,
    color: '#a1a1aa',
  },

  // RED JUNGLE
  {
    id: 'red_red_buff',
    type: 'red_buff',
    name: 'Infernal Fiend (Red Buff)',
    x: 1350,
    y: 650,
    maxHp: 3200,
    attackDamage: 110,
    attackRange: 100,
    gold: 70,
    xp: 120,
    respawnSec: 75,
    color: '#ef4444',
  },
  {
    id: 'red_blue_buff',
    type: 'blue_buff',
    name: 'Azure Golem (Blue Buff)',
    x: 1750,
    y: 1050,
    maxHp: 3200,
    attackDamage: 95,
    attackRange: 100,
    gold: 70,
    xp: 120,
    respawnSec: 75,
    color: '#3b82f6',
  },
  {
    id: 'red_neutral_1',
    type: 'neutral',
    name: 'Rockling',
    x: 1580,
    y: 1250,
    maxHp: 2000,
    attackDamage: 80,
    attackRange: 90,
    gold: 50,
    xp: 85,
    respawnSec: 60,
    color: '#a1a1aa',
  },

  // RIVER OBJECTIVES
  {
    id: 'river_scuttler_top',
    type: 'scuttler',
    name: 'River Wanderer',
    x: 950,
    y: 1050,
    maxHp: 1600,
    attackDamage: 30,
    attackRange: 60,
    gold: 60,
    xp: 90,
    respawnSec: 80,
    color: '#10b981',
  },
  {
    id: 'river_scuttler_bot',
    type: 'scuttler',
    name: 'River Wanderer',
    x: 1450,
    y: 1350,
    maxHp: 1600,
    attackDamage: 30,
    attackRange: 60,
    gold: 60,
    xp: 90,
    respawnSec: 80,
    color: '#10b981',
  },

  // BOSS (ANCIENT LORD)
  {
    id: 'boss_lord',
    type: 'lord',
    name: 'Titan Behemoth (Lord)',
    x: 750,
    y: 750,
    maxHp: 12000,
    attackDamage: 220,
    attackRange: 180,
    gold: 300,
    xp: 600,
    respawnSec: 150,
    color: '#8b5cf6',
  },
];

export const BUSH_ZONES: BushZone[] = [
  // River bushes
  { x: 1080, y: 1300, radius: 65 },
  { x: 1320, y: 1100, radius: 65 },
  { x: 900, y: 880, radius: 75 },
  { x: 1520, y: 1520, radius: 75 },
  // Lane side bushes
  { x: 420, y: 1000, radius: 60 },
  { x: 1000, y: 420, radius: 60 },
  { x: 1400, y: 1980, radius: 60 },
  { x: 1980, y: 1400, radius: 60 },
  // Jungle entry bushes
  { x: 800, y: 1700, radius: 70 },
  { x: 1600, y: 700, radius: 70 },
];

export const OBSTACLES: Obstacle[] = [
  // Lord Pit wall
  { x: 700, y: 700, radius: 90 },
  { x: 800, y: 650, radius: 70 },
  { x: 650, y: 800, radius: 70 },
  // Top jungle rocks
  { x: 550, y: 850, radius: 60 },
  { x: 750, y: 950, radius: 65 },
  { x: 950, y: 550, radius: 60 },
  // Bottom jungle rocks
  { x: 1450, y: 1850, radius: 60 },
  { x: 1650, y: 1450, radius: 65 },
  { x: 1850, y: 1550, radius: 60 },
  // Center river pillars
  { x: 1050, y: 1100, radius: 55 },
  { x: 1350, y: 1300, radius: 55 },
];
