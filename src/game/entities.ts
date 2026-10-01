import { Team, Lane, Stats, Skill, Buff, StatusEffect, HeroConfig, Item, Vector2D } from '../types/game';
import { GAME_CONFIG } from '../config/balance';

export class BaseEntity {
  public id: string;
  public type: 'hero' | 'minion' | 'tower' | 'inhibitor' | 'core' | 'monster';
  public team: Team;
  public x: number;
  public y: number;
  public radius: number = 24;
  public hp: number;
  public maxHp: number;
  public isDead: boolean = false;
  public isTargetable: boolean = true;

  constructor(id: string, type: 'hero' | 'minion' | 'tower' | 'inhibitor' | 'core' | 'monster', team: Team, x: number, y: number, hp: number) {
    this.id = id;
    this.type = type;
    this.team = team;
    this.x = x;
    this.y = y;
    this.hp = hp;
    this.maxHp = hp;
  }

  public takeDamage(amount: number): number {
    if (this.isDead) return 0;
    const actualDamage = Math.min(this.hp, Math.max(1, Math.round(amount)));
    this.hp -= actualDamage;
    if (this.hp <= 0) {
      this.hp = 0;
      this.isDead = true;
    }
    return actualDamage;
  }

  public heal(amount: number) {
    if (this.isDead) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }
}

export class HeroEntity extends BaseEntity {
  public config: HeroConfig;
  public level: number = 1;
  public exp: number = 0;
  public maxExp: number = GAME_CONFIG.EXP_TABLE[1];
  public gold: number = GAME_CONFIG.STARTING_GOLD;
  public kills: number = 0;
  public deaths: number = 0;
  public assists: number = 0;
  public damageDealtTotal: number = 0;

  public mana: number;
  public maxMana: number;
  public baseStats: Stats;
  public currentStats: Stats;
  public items: Item[] = [];
  public skills: Skill[];
  public skillPoints: number = 1;

  public target: BaseEntity | null = null;
  public attackTimer: number = 0;
  public respawnTimer: number = 0;
  public recallTimer: number = 0;
  public isRecalling: boolean = false;
  public flashCooldown: number = 0;

  public buffs: Buff[] = [];
  public statusEffects: StatusEffect[] = [];
  public isHuman: boolean = false;
  public botLane: Lane = 'mid';
  public isInBush: boolean = false;
  public isVisibleToEnemy: boolean = true;
  public lastAttacker: { id: string; name: string; heroId: string; team: Team; time: number } | null = null;
  public facingAngle: number = 0;

  // Passive internal cooldowns
  public passiveCooldown: number = 0;
  public passiveStacks: number = 0;

  constructor(id: string, config: HeroConfig, team: Team, x: number, y: number, isHuman: boolean = false) {
    super(id, 'hero', team, x, y, config.baseStats.hp);
    this.config = config;
    this.radius = 26;
    this.isHuman = isHuman;
    this.baseStats = { ...config.baseStats };
    this.currentStats = { ...config.baseStats };
    this.mana = config.baseStats.mana;
    this.maxMana = config.baseStats.maxMana;
    this.skills = JSON.parse(JSON.stringify(config.skills)); // deep clone
    this.updateStats();
  }

  public addExp(amount: number): boolean {
    if (this.level >= GAME_CONFIG.MAX_HERO_LEVEL) return false;
    this.exp += amount;
    let leveledUp = false;

    while (this.level < GAME_CONFIG.MAX_HERO_LEVEL && this.exp >= GAME_CONFIG.EXP_TABLE[this.level]) {
      this.level++;
      this.skillPoints++;
      leveledUp = true;

      // Stats growth
      this.baseStats.hp += this.config.growthStats.hp;
      this.baseStats.maxHp += this.config.growthStats.hp;
      this.baseStats.mana += this.config.growthStats.mana;
      this.baseStats.maxMana += this.config.growthStats.mana;
      this.baseStats.attack += this.config.growthStats.attack;
      this.baseStats.armor += this.config.growthStats.armor;
      this.baseStats.magicResist += this.config.growthStats.magicResist;

      // Heal a bit on level up
      this.hp = Math.min(this.baseStats.maxHp, this.hp + this.config.growthStats.hp);
      this.mana = Math.min(this.baseStats.maxMana, this.mana + this.config.growthStats.mana);

      // Auto-level up first available skill for AI
      if (!this.isHuman) {
        this.autoUpgradeSkill();
      }
    }

    if (leveledUp) {
      this.updateStats();
    }
    return leveledUp;
  }

  public upgradeSkill(skillIndex: number): boolean {
    if (this.skillPoints <= 0) return false;
    const skill = this.skills[skillIndex];
    if (!skill || skill.level >= skill.maxLevel) return false;

    // Ult (index 3) requires level 4, 8, 12
    if (skillIndex === 3) {
      if (this.level < 4 && skill.level === 0) return false;
      if (this.level < 8 && skill.level === 1) return false;
      if (this.level < 12 && skill.level === 2) return false;
    }

    skill.level++;
    this.skillPoints--;
    return true;
  }

  public autoUpgradeSkill() {
    if (this.skillPoints <= 0) return;
    // Prioritize Ult if available
    if (this.upgradeSkill(3)) return;
    // Then skill 1, 2, 3
    if (this.upgradeSkill(0)) return;
    if (this.upgradeSkill(1)) return;
    if (this.upgradeSkill(2)) return;
  }

  public buyItem(item: Item): boolean {
    if (this.items.length >= 6) return false;
    if (this.gold < item.cost) return false;
    this.gold -= item.cost;
    this.items.push(item);
    this.updateStats();
    return true;
  }

  public sellItem(index: number): boolean {
    if (index < 0 || index >= this.items.length) return false;
    const item = this.items[index];
    this.gold += Math.round(item.cost * 0.7); // 70% refund
    this.items.splice(index, 1);
    this.updateStats();
    return true;
  }

  public updateStats() {
    // Start with base stats
    const stats: Stats = { ...this.baseStats };

    // Add item stats
    for (const item of this.items) {
      for (const [key, val] of Object.entries(item.stats)) {
        const statKey = key as keyof Stats;
        if (typeof val === 'number') {
          stats[statKey] += val;
        }
      }
    }

    // Apply Buffs
    for (const buff of this.buffs) {
      if (buff.type === 'red_buff') {
        stats.attack += 20;
      } else if (buff.type === 'blue_buff') {
        stats.cooldownReduction = Math.min(0.4, stats.cooldownReduction + 0.15);
        stats.manaRegen += 15;
      } else if (buff.type === 'lord_buff') {
        stats.attack += 35;
        stats.magicPower += 50;
        stats.moveSpeed += 25;
      }
    }

    // Cap CDR
    stats.cooldownReduction = Math.min(0.40, stats.cooldownReduction);

    this.maxHp = stats.maxHp;
    this.maxMana = stats.maxMana;
    this.currentStats = stats;
  }

  public addBuff(buff: Buff) {
    const existing = this.buffs.find((b) => b.type === buff.type);
    if (existing) {
      existing.duration = buff.maxDuration;
    } else {
      this.buffs.push(buff);
    }
    this.updateStats();
  }

  public addStatusEffect(effect: StatusEffect) {
    this.statusEffects.push(effect);
  }

  public isStunned(): boolean {
    return this.statusEffects.some((e) => e.type === 'stun');
  }

  public getMoveSpeed(): number {
    let speed = this.currentStats.moveSpeed;
    for (const effect of this.statusEffects) {
      if (effect.type === 'slow' && effect.value) {
        speed *= (1 - effect.value);
      }
    }
    return Math.max(120, speed);
  }

  public cancelRecall() {
    if (this.isRecalling) {
      this.isRecalling = false;
      this.recallTimer = 0;
    }
  }
}

export class MinionEntity extends BaseEntity {
  public minionType: 'melee' | 'ranged' | 'siege';
  public lane: Lane;
  public attackDamage: number;
  public attackRange: number;
  public attackCooldown: number = 0;
  public attackSpeed: number = 1.0;
  public moveSpeed: number = 150;
  public waypoints: Vector2D[];
  public currentWaypointIndex: number = 0;
  public target: BaseEntity | null = null;
  public goldValue: number;
  public expValue: number;

  constructor(
    id: string,
    team: Team,
    lane: Lane,
    minionType: 'melee' | 'ranged' | 'siege',
    waypoints: Vector2D[],
    x: number,
    y: number
  ) {
    const isMelee = minionType === 'melee';
    const isSiege = minionType === 'siege';
    const hp = isSiege ? 1200 : isMelee ? 650 : 420;
    super(id, 'minion', team, x, y, hp);
    
    this.minionType = minionType;
    this.lane = lane;
    this.waypoints = waypoints;
    this.radius = isSiege ? 18 : 14;

    this.attackDamage = isSiege ? 75 : isMelee ? 35 : 55;
    this.attackRange = isMelee ? 60 : isSiege ? 220 : 180;
    this.attackSpeed = isMelee ? 1.0 : isSiege ? 0.75 : 0.9;
    this.goldValue = isSiege
      ? GAME_CONFIG.GOLD_REWARDS.MINION_SIEGE
      : isMelee
      ? GAME_CONFIG.GOLD_REWARDS.MINION_MELEE
      : GAME_CONFIG.GOLD_REWARDS.MINION_RANGED;
    this.expValue = isSiege
      ? GAME_CONFIG.XP_REWARDS.MINION_SIEGE
      : isMelee
      ? GAME_CONFIG.XP_REWARDS.MINION_MELEE
      : GAME_CONFIG.XP_REWARDS.MINION_RANGED;
  }
}

export class StructureEntity extends BaseEntity {
  public lane: Lane;
  public tier: 1 | 2 | 3 | 4;
  public attackDamage: number;
  public attackRange: number;
  public attackCooldown: number = 0;
  public attackInterval: number = 1.2; // seconds
  public currentTarget: BaseEntity | null = null;
  public isInvulnerable: boolean = false;

  constructor(
    id: string,
    type: 'tower' | 'inhibitor' | 'core',
    team: Team,
    lane: Lane,
    tier: 1 | 2 | 3 | 4,
    x: number,
    y: number,
    hp: number,
    attackDamage: number,
    attackRange: number
  ) {
    super(id, type, team, x, y, hp);
    this.lane = lane;
    this.tier = tier;
    this.radius = type === 'core' ? 55 : 36;
    this.attackDamage = attackDamage;
    this.attackRange = attackRange;
  }
}

export class MonsterEntity extends BaseEntity {
  public monsterType: 'red_buff' | 'blue_buff' | 'neutral' | 'scuttler' | 'lord';
  public name: string;
  public spawnX: number;
  public spawnY: number;
  public attackDamage: number;
  public attackRange: number;
  public attackCooldown: number = 0;
  public goldValue: number;
  public expValue: number;
  public respawnSec: number;
  public respawnTimer: number = 0;
  public currentTarget: BaseEntity | null = null;
  public color: string;
  public leashDistance: number = 260;

  constructor(
    id: string,
    monsterType: 'red_buff' | 'blue_buff' | 'neutral' | 'scuttler' | 'lord',
    name: string,
    x: number,
    y: number,
    hp: number,
    attackDamage: number,
    attackRange: number,
    gold: number,
    xp: number,
    respawnSec: number,
    color: string
  ) {
    super(id, 'monster', 'red', x, y, hp); // team neutral/hostile
    this.monsterType = monsterType;
    this.name = name;
    this.spawnX = x;
    this.spawnY = y;
    this.radius = monsterType === 'lord' ? 50 : monsterType === 'scuttler' ? 18 : 30;
    this.attackDamage = attackDamage;
    this.attackRange = attackRange;
    this.goldValue = gold;
    this.expValue = xp;
    this.respawnSec = respawnSec;
    this.color = color;
  }
}

export class ProjectileEntity {
  public id: string;
  public sourceId: string;
  public sourceTeam: Team;
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public speed: number;
  public radius: number = 8;
  public damage: number;
  public damageType: 'physical' | 'magical' | 'true';
  public color: string;
  public target: BaseEntity | null = null;
  public isHoming: boolean = false;
  public maxRange: number;
  public distanceTraveled: number = 0;
  public isFinished: boolean = false;
  public onHitEffect?: string;

  constructor(
    id: string,
    sourceId: string,
    sourceTeam: Team,
    x: number,
    y: number,
    vx: number,
    vy: number,
    speed: number,
    damage: number,
    damageType: 'physical' | 'magical' | 'true',
    color: string,
    maxRange: number,
    target: BaseEntity | null = null,
    isHoming: boolean = false
  ) {
    this.id = id;
    this.sourceId = sourceId;
    this.sourceTeam = sourceTeam;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.speed = speed;
    this.damage = damage;
    this.damageType = damageType;
    this.color = color;
    this.maxRange = maxRange;
    this.target = target;
    this.isHoming = isHoming;
  }

  public update(dt: number) {
    if (this.isHoming && this.target && !this.target.isDead) {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.001) {
        this.vx = (dx / dist) * this.speed;
        this.vy = (dy / dist) * this.speed;
      }
    }

    const stepX = this.vx * dt;
    const stepY = this.vy * dt;
    this.x += stepX;
    this.y += stepY;
    this.distanceTraveled += Math.hypot(stepX, stepY);

    if (this.distanceTraveled >= this.maxRange) {
      this.isFinished = true;
    }
  }
}
