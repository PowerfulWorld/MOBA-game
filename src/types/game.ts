export type Team = 'blue' | 'red';

export type Role = 'tank' | 'fighter' | 'mage' | 'marksman' | 'assassin' | 'support';

export type Lane = 'top' | 'mid' | 'bot' | 'jungle';

export type Difficulty = 'easy' | 'normal' | 'hard';

export type DamageType = 'physical' | 'magical' | 'true';

export type SkillTargetType = 'skillshot_line' | 'target_unit' | 'aoe_circle' | 'cone' | 'self' | 'dash';

export interface Vector2D {
  x: number;
  y: number;
}

export interface Stats {
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  hpRegen: number;
  manaRegen: number;
  attack: number;
  magicPower: number;
  armor: number;
  magicResist: number;
  moveSpeed: number;
  attackSpeed: number; // attacks per second
  attackRange: number;
  cooldownReduction: number; // 0 to 0.40 (max 40%)
  critChance: number; // 0 to 1
  lifesteal: number; // 0 to 1
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  cooldown: number; // in seconds
  currentCooldown: number;
  manaCost: number;
  range: number;
  radius?: number; // for AoE
  targetType: SkillTargetType;
  damageType: DamageType;
  baseDamage: number;
  damagePerLevel: number;
  scalingAD: number;
  scalingAP: number;
  level: number;
  maxLevel: number;
  icon: string;
  color: string;
}

export interface HeroConfig {
  id: string;
  name: string;
  title: string;
  role: Role;
  avatarColor: string;
  primaryColor: string;
  secondaryColor: string;
  lore: string;
  baseStats: Stats;
  growthStats: {
    hp: number;
    mana: number;
    attack: number;
    armor: number;
    magicResist: number;
  };
  passive: {
    name: string;
    description: string;
  };
  skills: Skill[];
}

export interface Item {
  id: string;
  name: string;
  category: 'attack' | 'magic' | 'defense' | 'movement' | 'jungle';
  cost: number;
  description: string;
  icon: string;
  stats: Partial<Stats>;
  passive?: string;
}

export interface Buff {
  id: string;
  name: string;
  type: 'red_buff' | 'blue_buff' | 'lord_buff' | 'speed_boost' | 'shield';
  duration: number;
  maxDuration: number;
  value?: number;
  color: string;
}

export interface StatusEffect {
  type: 'stun' | 'slow' | 'burn' | 'silence';
  duration: number;
  value?: number; // e.g. slow percentage or burn damage per sec
  color: string;
}

export interface KillFeedEvent {
  id: string;
  killerName: string;
  killerHero: string;
  killerTeam: Team;
  victimName: string;
  victimHero: string;
  victimTeam: Team;
  type: 'kill' | 'first_blood' | 'double' | 'triple' | 'ace' | 'tower' | 'lord';
  timestamp: number;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  fontSize: number;
  life: number;
  maxLife: number;
  vy: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}
