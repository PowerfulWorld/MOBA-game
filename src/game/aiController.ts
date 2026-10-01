import { Difficulty, Lane, Vector2D } from '../types/game';
import { HeroEntity, BaseEntity, StructureEntity, MonsterEntity } from './entities';
import { LANE_WAYPOINTS } from './mapData';
import { ITEMS_CONFIG } from '../config/balance';

export class AIController {
  private bot: HeroEntity;
  private difficulty: Difficulty;
  private reactionTimer: number = 0;
  private thinkInterval: number = 0.2; // seconds between major AI decisions
  private assignedLane: Lane;
  private baseSpawnPos: Vector2D;

  constructor(bot: HeroEntity, difficulty: Difficulty) {
    this.bot = bot;
    this.difficulty = difficulty;
    this.assignedLane = bot.botLane;
    this.baseSpawnPos = bot.team === 'blue' ? { x: 300, y: 2100 } : { x: 2100, y: 300 };

    if (difficulty === 'easy') {
      this.thinkInterval = 0.35;
    } else if (difficulty === 'hard') {
      this.thinkInterval = 0.12;
    }
  }

  public update(
    dt: number,
    allHeroes: HeroEntity[],
    allStructures: StructureEntity[],
    allMinions: BaseEntity[],
    allMonsters: MonsterEntity[],
    onCastSkill: (hero: HeroEntity, skillIndex: number, targetX: number, targetY: number) => void,
    onMoveHero: (hero: HeroEntity, moveDir: Vector2D) => void,
    onAttackTarget: (hero: HeroEntity, target: BaseEntity) => void
  ) {
    if (this.bot.isDead) return;

    this.reactionTimer -= dt;
    if (this.reactionTimer > 0) return;
    this.reactionTimer = this.thinkInterval;

    // AI Item Auto-buy
    this.checkBuyItems();

    // Health ratio
    const hpRatio = this.bot.hp / this.bot.maxHp;
    const retreatThreshold = this.difficulty === 'hard' ? 0.35 : this.difficulty === 'normal' ? 0.28 : 0.20;

    // 1. Check if we should RETREAT
    if (hpRatio < retreatThreshold) {
      this.handleRetreat(allStructures, onMoveHero);
      return;
    }

    // 2. Find nearby targets
    const enemyHeroes = allHeroes.filter((h) => h.team !== this.bot.team && !h.isDead);
    const allyHeroes = allHeroes.filter((h) => h.team === this.bot.team && !h.isDead);
    const enemyStructures = allStructures.filter((s) => s.team !== this.bot.team && !s.isDead);
    const friendlyStructures = allStructures.filter((s) => s.team === this.bot.team && !s.isDead);
    const enemyMinions = allMinions.filter((m) => m.team !== this.bot.team && !m.isDead);

    // Find closest enemy hero within vision / reaction range
    const searchRange = this.difficulty === 'hard' ? 650 : 550;
    let closestEnemyHero: HeroEntity | null = null;
    let minHeroDist = searchRange;

    for (const enemy of enemyHeroes) {
      const dist = Math.hypot(enemy.x - this.bot.x, enemy.y - this.bot.y);
      if (dist < minHeroDist) {
        minHeroDist = dist;
        closestEnemyHero = enemy;
      }
    }

    // Check danger: inside enemy tower range?
    const towerDanger = enemyStructures.find((s) => Math.hypot(s.x - this.bot.x, s.y - this.bot.y) < s.attackRange + 30);
    if (towerDanger && closestEnemyHero && minHeroDist > 150) {
      // Step back from enemy tower unless enemy is 1 shot
      if (closestEnemyHero.hp > 250) {
        this.stepAwayFrom(towerDanger.x, towerDanger.y, onMoveHero);
        return;
      }
    }

    // 3. COMBAT ENGAGEMENT: enemy hero in range
    if (closestEnemyHero) {
      const dist = minHeroDist;
      const enemyHpRatio = closestEnemyHero.hp / closestEnemyHero.maxHp;

      // Aim position with slight lead
      let aimX = closestEnemyHero.x;
      let aimY = closestEnemyHero.y;
      if (this.difficulty === 'hard') {
        const leadDist = 30;
        const angle = closestEnemyHero.facingAngle;
        aimX += Math.cos(angle) * leadDist;
        aimY += Math.sin(angle) * leadDist;
      }

      // Check Ultimate (Index 3)
      const ult = this.bot.skills[3];
      if (ult && ult.level > 0 && ult.currentCooldown <= 0 && this.bot.mana >= ult.manaCost) {
        if (enemyHpRatio < 0.6 || dist < ult.range) {
          onCastSkill(this.bot, 3, aimX, aimY);
          return;
        }
      }

      // Check Skill 1
      const s1 = this.bot.skills[0];
      if (s1 && s1.currentCooldown <= 0 && this.bot.mana >= s1.manaCost && dist <= s1.range + 50) {
        onCastSkill(this.bot, 0, aimX, aimY);
        return;
      }

      // Check Skill 2
      const s2 = this.bot.skills[1];
      if (s2 && s2.currentCooldown <= 0 && this.bot.mana >= s2.manaCost && (dist <= (s2.radius || s2.range) + 30)) {
        onCastSkill(this.bot, 1, aimX, aimY);
        return;
      }

      // Check Skill 3 (Self-buff / shield)
      const s3 = this.bot.skills[2];
      if (s3 && s3.currentCooldown <= 0 && this.bot.mana >= s3.manaCost && dist < 300) {
        onCastSkill(this.bot, 2, this.bot.x, this.bot.y);
        return;
      }

      // Basic Attack enemy hero
      if (dist <= this.bot.currentStats.attackRange + 20) {
        onAttackTarget(this.bot, closestEnemyHero);
        // If ranged hero, kite back slightly if melee enemy gets too close
        if (this.bot.currentStats.attackRange > 200 && dist < 120) {
          this.stepAwayFrom(closestEnemyHero.x, closestEnemyHero.y, onMoveHero);
        } else {
          onMoveHero(this.bot, { x: 0, y: 0 });
        }
        return;
      } else {
        // Move towards enemy hero to close distance
        this.stepTowards(closestEnemyHero.x, closestEnemyHero.y, onMoveHero);
        return;
      }
    }

    // 4. OBJECTIVE PUSH: Enemy minions nearby
    let closestMinion: BaseEntity | null = null;
    let minMinionDist = 420;

    for (const minion of enemyMinions) {
      const dist = Math.hypot(minion.x - this.bot.x, minion.y - this.bot.y);
      if (dist < minMinionDist) {
        minMinionDist = dist;
        closestMinion = minion;
      }
    }

    if (closestMinion) {
      if (minMinionDist <= this.bot.currentStats.attackRange + 15) {
        onAttackTarget(this.bot, closestMinion);
        onMoveHero(this.bot, { x: 0, y: 0 });
      } else {
        this.stepTowards(closestMinion.x, closestMinion.y, onMoveHero);
      }
      return;
    }

    // 5. ATTACK ENEMY TOWER
    const pushableTower = enemyStructures.find((s) => Math.hypot(s.x - this.bot.x, s.y - this.bot.y) < 320);
    if (pushableTower) {
      // Check if friendly minions are tanking the tower
      const friendlyMinionsTanking = allMinions.some(
        (m) => m.team === this.bot.team && !m.isDead && Math.hypot(m.x - pushableTower.x, m.y - pushableTower.y) < pushableTower.attackRange
      );
      if (friendlyMinionsTanking) {
        onAttackTarget(this.bot, pushableTower);
        onMoveHero(this.bot, { x: 0, y: 0 });
        return;
      }
    }

    // 6. DEFAULT: MARCH DOWN ASSIGNED LANE
    this.followLane(onMoveHero);
  }

  private handleRetreat(friendlyStructures: StructureEntity[], onMoveHero: (hero: HeroEntity, moveDir: Vector2D) => void) {
    // Find closest alive friendly structure or fountain
    let retreatTarget: Vector2D = this.baseSpawnPos;
    let minDist = Math.hypot(this.baseSpawnPos.x - this.bot.x, this.baseSpawnPos.y - this.bot.y);

    for (const struct of friendlyStructures) {
      const dist = Math.hypot(struct.x - this.bot.x, struct.y - this.bot.y);
      if (dist < minDist) {
        minDist = dist;
        retreatTarget = { x: struct.x, y: struct.y };
      }
    }

    // If already under tower or safe in fountain, channel recall if far from fountain
    const distToFountain = Math.hypot(this.baseSpawnPos.x - this.bot.x, this.baseSpawnPos.y - this.bot.y);
    if (minDist < 120 && distToFountain > 400 && !this.bot.isRecalling) {
      this.bot.isRecalling = true;
      this.bot.recallTimer = 5.0;
      onMoveHero(this.bot, { x: 0, y: 0 });
      return;
    }

    if (this.bot.isRecalling) {
      onMoveHero(this.bot, { x: 0, y: 0 });
      return;
    }

    this.stepTowards(retreatTarget.x, retreatTarget.y, onMoveHero);
  }

  private followLane(onMoveHero: (hero: HeroEntity, moveDir: Vector2D) => void) {
    const lane = this.assignedLane === 'jungle' ? 'mid' : this.assignedLane;
    const waypoints = LANE_WAYPOINTS[this.bot.team][lane];

    // Find nearest waypoint ahead
    let closestIndex = 0;
    let minDist = Infinity;

    for (let i = 0; i < waypoints.length; i++) {
      const wp = waypoints[i];
      const dist = Math.hypot(wp.x - this.bot.x, wp.y - this.bot.y);
      if (dist < minDist) {
        minDist = dist;
        closestIndex = i;
      }
    }

    const nextIndex = Math.min(waypoints.length - 1, closestIndex + 1);
    const targetWp = waypoints[nextIndex];
    this.stepTowards(targetWp.x, targetWp.y, onMoveHero);
  }

  private stepTowards(tx: number, ty: number, onMoveHero: (hero: HeroEntity, moveDir: Vector2D) => void) {
    const dx = tx - this.bot.x;
    const dy = ty - this.bot.y;
    const len = Math.hypot(dx, dy);
    if (len > 5) {
      onMoveHero(this.bot, { x: dx / len, y: dy / len });
    } else {
      onMoveHero(this.bot, { x: 0, y: 0 });
    }
  }

  private stepAwayFrom(ox: number, oy: number, onMoveHero: (hero: HeroEntity, moveDir: Vector2D) => void) {
    const dx = this.bot.x - ox;
    const dy = this.bot.y - oy;
    const len = Math.hypot(dx, dy);
    if (len > 0.01) {
      onMoveHero(this.bot, { x: dx / len, y: dy / len });
    }
  }

  private checkBuyItems() {
    if (this.bot.items.length >= 6) return;
    // Pick role-appropriate items
    const role = this.bot.config.role;
    const preferredCategory = role === 'mage' ? 'magic' : role === 'tank' ? 'defense' : 'attack';

    // Find an item we don't have yet that we can afford
    const candidate = ITEMS_CONFIG.find(
      (item) =>
        (item.category === preferredCategory || item.category === 'movement') &&
        this.bot.gold >= item.cost &&
        !this.bot.items.some((i) => i.id === item.id)
    );

    if (candidate) {
      this.bot.buyItem(candidate);
    }
  }
}
