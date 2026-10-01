import { Team, Lane, Difficulty, HeroConfig, Vector2D, KillFeedEvent, FloatingText, Particle } from '../types/game';
import { HeroEntity, MinionEntity, StructureEntity, MonsterEntity, ProjectileEntity, BaseEntity } from './entities';
import { HEROES_CONFIG, GAME_CONFIG, ITEMS_CONFIG } from '../config/balance';
import { STRUCTURE_SPAWNS, JUNGLE_CAMPS, BUSH_ZONES, OBSTACLES, LANE_WAYPOINTS } from './mapData';
import { AIController } from './aiController';
import { soundManager } from '../audio/soundManager';

export class GameEngine {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  private animationFrameId: number | null = null;
  private lastTime: number = 0;

  // Camera
  public camera: Vector2D = { x: 300, y: 2100 };
  public zoom: number = 1.0;

  // Entities
  public heroes: HeroEntity[] = [];
  public playerHero: HeroEntity;
  public minions: MinionEntity[] = [];
  public structures: StructureEntity[] = [];
  public monsters: MonsterEntity[] = [];
  public projectiles: ProjectileEntity[] = [];
  public particles: Particle[] = [];
  public floatingTexts: FloatingText[] = [];

  // Controllers & State
  private aiControllers: AIController[] = [];
  public difficulty: Difficulty;
  public matchTime: number = 0;
  public blueScore: number = 0;
  public redScore: number = 0;
  public matchResult: 'ongoing' | 'victory' | 'defeat' = 'ongoing';
  public killFeed: KillFeedEvent[] = [];
  public firstBloodClaimed: boolean = false;
  public streakCount: Record<string, number> = {};

  // Minion waves
  private nextMinionWaveTime: number = GAME_CONFIG.FIRST_MINION_SPAWN_SEC;
  private waveCount: number = 0;

  // Input & Aiming
  public moveInput: Vector2D = { x: 0, y: 0 };
  public lockedTarget: BaseEntity | null = null;
  public aimingSkillIndex: number | null = null;
  public aimVector: Vector2D = { x: 0, y: 0 };
  public attackPriority: 'hero' | 'minion' | 'tower' = 'hero';

  // Callbacks for React HUD
  public onStateUpdate?: (engine: GameEngine) => void;
  public onMatchEnd?: (result: 'victory' | 'defeat') => void;
  public onKillEvent?: (event: KillFeedEvent) => void;

  constructor(
    canvas: HTMLCanvasElement,
    playerHeroId: string,
    difficulty: Difficulty,
    onStateUpdate?: (engine: GameEngine) => void,
    onMatchEnd?: (result: 'victory' | 'defeat') => void,
    onKillEvent?: (event: KillFeedEvent) => void
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.difficulty = difficulty;
    this.onStateUpdate = onStateUpdate;
    this.onMatchEnd = onMatchEnd;
    this.onKillEvent = onKillEvent;

    // Initialize Map and Entities
    this.initMap();
    this.playerHero = this.initHeroes(playerHeroId);

    // Initial camera placement
    this.camera.x = this.playerHero.x;
    this.camera.y = this.playerHero.y;

    soundManager.announce("Welcome to the Arena! 30 seconds until minion spawn!");
  }

  private initMap() {
    // Spawn structures
    this.structures = STRUCTURE_SPAWNS.map(
      (s) =>
        new StructureEntity(
          s.id,
          s.type,
          s.team,
          s.lane,
          s.tier,
          s.x,
          s.y,
          s.maxHp,
          s.attackDamage,
          s.attackRange
        )
    );

    // Spawn jungle camps
    this.monsters = JUNGLE_CAMPS.map(
      (c) =>
        new MonsterEntity(
          c.id,
          c.type,
          c.name,
          c.x,
          c.y,
          c.maxHp,
          c.attackDamage,
          c.attackRange,
          c.gold,
          c.xp,
          c.respawnSec,
          c.color
        )
    );
  }

  private initHeroes(playerHeroId: string): HeroEntity {
    const heroKeys = Object.keys(HEROES_CONFIG);
    const availableKeys = heroKeys.filter((k) => k !== playerHeroId);

    // Human player hero (Blue Team, Mid lane by default)
    const playerConfig = HEROES_CONFIG[playerHeroId] || HEROES_CONFIG.kaelen;
    const playerHero = new HeroEntity('player_1', playerConfig, 'blue', 300, 2100, true);
    playerHero.botLane = 'mid';
    this.heroes.push(playerHero);

    // 4 Blue Bots (Allies)
    const allyRoles: { role: Lane; keyIndex: number }[] = [
      { role: 'top', keyIndex: 0 },
      { role: 'bot', keyIndex: 1 },
      { role: 'bot', keyIndex: 2 },
      { role: 'jungle', keyIndex: 3 },
    ];

    allyRoles.forEach((item, index) => {
      const heroKey = availableKeys[item.keyIndex % availableKeys.length];
      const botConfig = HEROES_CONFIG[heroKey];
      const bot = new HeroEntity(`blue_bot_${index + 1}`, botConfig, 'blue', 280 + index * 30, 2120 + index * 20, false);
      bot.botLane = item.role;
      this.heroes.push(bot);
      this.aiControllers.push(new AIController(bot, this.difficulty));
    });

    // 5 Red Bots (Enemies)
    const redLanes: Lane[] = ['top', 'mid', 'bot', 'bot', 'jungle'];
    for (let i = 0; i < 5; i++) {
      const heroKey = heroKeys[i % heroKeys.length];
      const botConfig = HEROES_CONFIG[heroKey];
      const bot = new HeroEntity(`red_bot_${i + 1}`, botConfig, 'red', 2100 - i * 30, 300 - i * 20, false);
      bot.botLane = redLanes[i];
      this.heroes.push(bot);
      this.aiControllers.push(new AIController(bot, this.difficulty));
    }

    return playerHero;
  }

  public start() {
    this.lastTime = performance.now();
    soundManager.startMusic();
    this.loop(this.lastTime);
  }

  public stop() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    soundManager.stopMusic();
  }

  private loop = (currentTime: number) => {
    const rawDt = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    const dt = Math.min(0.1, rawDt); // clamp delta time

    if (this.matchResult === 'ongoing') {
      this.update(dt);
    }
    this.render();

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  public update(dt: number) {
    this.matchTime += dt;

    // Passive gold income
    for (const hero of this.heroes) {
      if (!hero.isDead) {
        hero.gold += GAME_CONFIG.PASSIVE_GOLD_PER_SEC * dt;
        // HP / Mana regen
        hero.hp = Math.min(hero.maxHp, hero.hp + (hero.currentStats.hpRegen) * dt);
        hero.mana = Math.min(hero.maxMana, hero.mana + (hero.currentStats.manaRegen) * dt);

        // Fountain regen in base
        const fountainPos = hero.team === 'blue' ? { x: 280, y: 2120 } : { x: 2120, y: 280 };
        const distToFountain = Math.hypot(hero.x - fountainPos.x, hero.y - fountainPos.y);
        if (distToFountain < 180) {
          hero.hp = Math.min(hero.maxHp, hero.hp + GAME_CONFIG.FOUNTAIN_HEAL_PER_SEC * dt);
          hero.mana = Math.min(hero.maxMana, hero.mana + GAME_CONFIG.FOUNTAIN_MANA_PER_SEC * dt);
        }

        // Skill cooldown countdown
        for (const skill of hero.skills) {
          if (skill.currentCooldown > 0) {
            skill.currentCooldown = Math.max(0, skill.currentCooldown - dt);
          }
        }

        // Attack cooldown
        if (hero.attackTimer > 0) {
          hero.attackTimer = Math.max(0, hero.attackTimer - dt);
        }

        // Flash summoner cooldown
        if (hero.flashCooldown > 0) {
          hero.flashCooldown = Math.max(0, hero.flashCooldown - dt);
        }

        // Recall channel
        if (hero.isRecalling) {
          hero.recallTimer -= dt;
          if (hero.recallTimer <= 0) {
            hero.isRecalling = false;
            hero.x = fountainPos.x;
            hero.y = fountainPos.y;
            hero.hp = hero.maxHp;
            hero.mana = hero.maxMana;
            this.addFloatingText(hero.x, hero.y - 40, 'RECALLED', '#38bdf8', 18);
          }
        }

        // Buffs duration
        for (let i = hero.buffs.length - 1; i >= 0; i--) {
          const buff = hero.buffs[i];
          buff.duration -= dt;
          if (buff.duration <= 0) {
            hero.buffs.splice(i, 1);
            hero.updateStats();
          }
        }

        // Status effects (Stun, Slow, Burn)
        for (let i = hero.statusEffects.length - 1; i >= 0; i--) {
          const effect = hero.statusEffects[i];
          effect.duration -= dt;
          if (effect.type === 'burn' && effect.value) {
            hero.takeDamage(effect.value * dt);
          }
          if (effect.duration <= 0) {
            hero.statusEffects.splice(i, 1);
          }
        }

        // Bush check
        hero.isInBush = BUSH_ZONES.some((b) => Math.hypot(hero.x - b.x, hero.y - b.y) <= b.radius);
      } else {
        // Respawn timer
        hero.respawnTimer -= dt;
        if (hero.respawnTimer <= 0) {
          this.respawnHero(hero);
        }
      }
    }

    // Minion Wave Spawning
    if (this.matchTime >= this.nextMinionWaveTime) {
      this.spawnMinionWave();
      this.nextMinionWaveTime = this.matchTime + GAME_CONFIG.MINION_WAVE_INTERVAL_SEC;
    }

    // Update Minions
    this.updateMinions(dt);

    // Update Towers / Structures
    this.updateStructures(dt);

    // Update Jungle Monsters
    this.updateMonsters(dt);

    // Update Projectiles
    this.updateProjectiles(dt);

    // Update Particles
    this.updateParticles(dt);

    // Update Floating Text
    this.updateFloatingTexts(dt);

    // Human player movement
    if (!this.playerHero.isDead && !this.playerHero.isStunned()) {
      if (Math.hypot(this.moveInput.x, this.moveInput.y) > 0.05) {
        this.playerHero.cancelRecall();
        const speed = this.playerHero.getMoveSpeed();
        const moveStepX = this.moveInput.x * speed * dt;
        const moveStepY = this.moveInput.y * speed * dt;
        this.moveHeroWithCollision(this.playerHero, moveStepX, moveStepY);
        this.playerHero.facingAngle = Math.atan2(this.moveInput.y, this.moveInput.x);
      }
    }

    // Update AI Bots
    for (const controller of this.aiControllers) {
      controller.update(
        dt,
        this.heroes,
        this.structures,
        this.minions,
        this.monsters,
        (bot, skillIdx, tx, ty) => this.castSkill(bot, skillIdx, tx, ty),
        (bot, dir) => {
          if (!bot.isDead && !bot.isStunned()) {
            if (dir.x !== 0 || dir.y !== 0) {
              bot.cancelRecall();
              const speed = bot.getMoveSpeed();
              this.moveHeroWithCollision(bot, dir.x * speed * dt, dir.y * speed * dt);
              bot.facingAngle = Math.atan2(dir.y, dir.x);
            }
          }
        },
        (bot, target) => this.heroBasicAttack(bot, target)
      );
    }

    // Camera follow player
    const targetCamX = this.playerHero.x;
    const targetCamY = this.playerHero.y;
    this.camera.x += (targetCamX - this.camera.x) * 0.12;
    this.camera.y += (targetCamY - this.camera.y) * 0.12;

    // Notify React HUD
    if (this.onStateUpdate) {
      this.onStateUpdate(this);
    }
  }

  private moveHeroWithCollision(hero: HeroEntity, dx: number, dy: number) {
    let nextX = hero.x + dx;
    let nextY = hero.y + dy;

    // Map bounds
    nextX = Math.max(hero.radius + 20, Math.min(GAME_CONFIG.MAP_WIDTH - hero.radius - 20, nextX));
    nextY = Math.max(hero.radius + 20, Math.min(GAME_CONFIG.MAP_HEIGHT - hero.radius - 20, nextY));

    // Obstacle collision
    for (const obs of OBSTACLES) {
      const dist = Math.hypot(nextX - obs.x, nextY - obs.y);
      const minDist = obs.radius + hero.radius;
      if (dist < minDist) {
        const angle = Math.atan2(nextY - obs.y, nextX - obs.x);
        nextX = obs.x + Math.cos(angle) * minDist;
        nextY = obs.y + Math.sin(angle) * minDist;
      }
    }

    hero.x = nextX;
    hero.y = nextY;
  }

  private respawnHero(hero: HeroEntity) {
    hero.isDead = false;
    const fountainPos = hero.team === 'blue' ? { x: 280, y: 2120 } : { x: 2120, y: 280 };
    hero.x = fountainPos.x;
    hero.y = fountainPos.y;
    hero.hp = hero.maxHp;
    hero.mana = hero.maxMana;
    hero.isRecalling = false;
    hero.statusEffects = [];
    this.addFloatingText(hero.x, hero.y - 40, 'RESPAWNED', '#22c55e', 20);
  }

  private spawnMinionWave() {
    this.waveCount++;
    const lanes: ('top' | 'mid' | 'bot')[] = ['top', 'mid', 'bot'];
    const teams: Team[] = ['blue', 'red'];

    for (const team of teams) {
      for (const lane of lanes) {
        const waypoints = LANE_WAYPOINTS[team][lane];
        const startPoint = waypoints[0];

        // 2 Melee Minions
        this.minions.push(
          new MinionEntity(
            `minion_${team}_${lane}_m1_${this.waveCount}`,
            team,
            lane,
            'melee',
            waypoints,
            startPoint.x + (Math.random() - 0.5) * 30,
            startPoint.y + (Math.random() - 0.5) * 30
          )
        );
        this.minions.push(
          new MinionEntity(
            `minion_${team}_${lane}_m2_${this.waveCount}`,
            team,
            lane,
            'melee',
            waypoints,
            startPoint.x + (Math.random() - 0.5) * 30,
            startPoint.y + (Math.random() - 0.5) * 30
          )
        );

        // 1 Ranged Minion
        this.minions.push(
          new MinionEntity(
            `minion_${team}_${lane}_r1_${this.waveCount}`,
            team,
            lane,
            'ranged',
            waypoints,
            startPoint.x - 30,
            startPoint.y - 30
          )
        );

        // Every 3rd wave has a Siege / Cannon minion
        if (this.waveCount % 3 === 0) {
          this.minions.push(
            new MinionEntity(
              `minion_${team}_${lane}_s_${this.waveCount}`,
              team,
              lane,
              'siege',
              waypoints,
              startPoint.x - 50,
              startPoint.y - 50
            )
          );
        }
      }
    }
  }

  private updateMinions(dt: number) {
    for (let i = this.minions.length - 1; i >= 0; i--) {
      const minion = this.minions[i];
      if (minion.isDead) {
        this.minions.splice(i, 1);
        continue;
      }

      minion.attackCooldown = Math.max(0, minion.attackCooldown - dt);

      // Find targets: enemy heroes, enemy minions, or enemy structures in range
      const enemyMinions = this.minions.filter((m) => m.team !== minion.team && !m.isDead);
      const enemyHeroes = this.heroes.filter((h) => h.team !== minion.team && !h.isDead);
      const enemyStructures = this.structures.filter((s) => s.team !== minion.team && !s.isDead);

      // Priority 1: Enemy minions in attack range
      let target: BaseEntity | null = null;
      let closestDist = minion.attackRange + 20;

      for (const em of enemyMinions) {
        const d = Math.hypot(em.x - minion.x, em.y - minion.y);
        if (d < closestDist) {
          closestDist = d;
          target = em;
        }
      }

      // Priority 2: Enemy structures
      if (!target) {
        for (const es of enemyStructures) {
          const d = Math.hypot(es.x - minion.x, es.y - minion.y);
          if (d < minion.attackRange + es.radius) {
            target = es;
            break;
          }
        }
      }

      // Priority 3: Enemy heroes
      if (!target) {
        for (const eh of enemyHeroes) {
          const d = Math.hypot(eh.x - minion.x, eh.y - minion.y);
          if (d < minion.attackRange + 20) {
            target = eh;
            break;
          }
        }
      }

      if (target) {
        // Attack target
        if (minion.attackCooldown <= 0) {
          minion.attackCooldown = 1 / minion.attackSpeed;
          this.executeMinionAttack(minion, target);
        }
      } else {
        // Move along waypoints
        const wp = minion.waypoints[minion.currentWaypointIndex];
        if (wp) {
          const dx = wp.x - minion.x;
          const dy = wp.y - minion.y;
          const dist = Math.hypot(dx, dy);

          if (dist < 40) {
            minion.currentWaypointIndex = Math.min(minion.waypoints.length - 1, minion.currentWaypointIndex + 1);
          } else {
            const step = minion.moveSpeed * dt;
            minion.x += (dx / dist) * step;
            minion.y += (dy / dist) * step;
          }
        }
      }
    }
  }

  private executeMinionAttack(minion: MinionEntity, target: BaseEntity) {
    if (minion.minionType === 'melee') {
      // Direct melee hit
      const dmg = target.takeDamage(minion.attackDamage);
      this.addDamageText(target.x, target.y, dmg, 'physical', false);
      if (target.isDead) this.handleEntityDeath(target, minion);
    } else {
      // Fire projectile
      const dx = target.x - minion.x;
      const dy = target.y - minion.y;
      const len = Math.hypot(dx, dy);
      const speed = 400;
      this.projectiles.push(
        new ProjectileEntity(
          `proj_minion_${Math.random()}`,
          minion.id,
          minion.team,
          minion.x,
          minion.y,
          (dx / len) * speed,
          (dy / len) * speed,
          speed,
          minion.attackDamage,
          'physical',
          minion.team === 'blue' ? '#60a5fa' : '#f87171',
          450,
          target,
          true
        )
      );
    }
  }

  private updateStructures(dt: number) {
    for (const struct of this.structures) {
      if (struct.isDead) continue;

      struct.attackCooldown = Math.max(0, struct.attackCooldown - dt);

      // Check if current target is still alive and in range
      if (
        struct.currentTarget &&
        (struct.currentTarget.isDead ||
          Math.hypot(struct.currentTarget.x - struct.x, struct.currentTarget.y - struct.y) > struct.attackRange)
      ) {
        struct.currentTarget = null;
      }

      // Priority 1: Target enemy heroes that attacked an allied hero under this tower!
      const enemyHeroes = this.heroes.filter(
        (h) => h.team !== struct.team && !h.isDead && Math.hypot(h.x - struct.x, h.y - struct.y) <= struct.attackRange
      );

      // If an enemy hero just hit an ally under tower, target them immediately!
      const aggroHero = enemyHeroes.find((h) => {
        if (h.lastAttacker && h.lastAttacker.team === struct.team && this.matchTime - h.lastAttacker.time < 2.0) {
          return true;
        }
        return false;
      });

      if (aggroHero) {
        struct.currentTarget = aggroHero;
      }

      // Priority 2: Target enemy minions first if no aggro hero
      if (!struct.currentTarget) {
        const enemyMinions = this.minions.filter(
          (m) => m.team !== struct.team && !m.isDead && Math.hypot(m.x - struct.x, m.y - struct.y) <= struct.attackRange
        );
        if (enemyMinions.length > 0) {
          struct.currentTarget = enemyMinions[0];
        } else if (enemyHeroes.length > 0) {
          struct.currentTarget = enemyHeroes[0];
        }
      }

      // Tower Fire
      if (struct.currentTarget && struct.attackCooldown <= 0) {
        struct.attackCooldown = struct.attackInterval;
        soundManager.playTowerShoot();

        const dx = struct.currentTarget.x - struct.x;
        const dy = struct.currentTarget.y - struct.y;
        const len = Math.hypot(dx, dy);
        const speed = 480;

        this.projectiles.push(
          new ProjectileEntity(
            `proj_tower_${Math.random()}`,
            struct.id,
            struct.team,
            struct.x,
            struct.y - 20,
            (dx / len) * speed,
            (dy / len) * speed,
            speed,
            struct.attackDamage,
            'physical',
            struct.team === 'blue' ? '#38bdf8' : '#ef4444',
            500,
            struct.currentTarget,
            true
          )
        );
      }
    }
  }

  private updateMonsters(dt: number) {
    for (const monster of this.monsters) {
      if (monster.isDead) {
        monster.respawnTimer -= dt;
        if (monster.respawnTimer <= 0) {
          monster.isDead = false;
          monster.hp = monster.maxHp;
          monster.x = monster.spawnX;
          monster.y = monster.spawnY;
        }
        continue;
      }

      monster.attackCooldown = Math.max(0, monster.attackCooldown - dt);

      // Check current target
      if (monster.currentTarget) {
        const distFromSpawn = Math.hypot(monster.x - monster.spawnX, monster.y - monster.spawnY);
        const distToTarget = Math.hypot(monster.currentTarget.x - monster.x, monster.currentTarget.y - monster.y);

        // Leash reset if too far
        if (distFromSpawn > monster.leashDistance || monster.currentTarget.isDead || distToTarget > 350) {
          monster.currentTarget = null;
          monster.hp = monster.maxHp; // regen to full on reset
          monster.x = monster.spawnX;
          monster.y = monster.spawnY;
          continue;
        }

        // Attack target
        if (distToTarget <= monster.attackRange + 20) {
          if (monster.attackCooldown <= 0) {
            monster.attackCooldown = 1.3;
            soundManager.playHit();
            const dmg = monster.currentTarget.takeDamage(monster.attackDamage);
            this.addDamageText(monster.currentTarget.x, monster.currentTarget.y, dmg, 'physical', false);
            if (monster.currentTarget.isDead) {
              monster.currentTarget = null;
            }
          }
        } else {
          // Chase target
          const dx = monster.currentTarget.x - monster.x;
          const dy = monster.currentTarget.y - monster.y;
          const len = Math.hypot(dx, dy);
          const step = 140 * dt;
          monster.x += (dx / len) * step;
          monster.y += (dy / len) * step;
        }
      }
    }
  }

  private updateProjectiles(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.update(dt);

      // Check hit
      if (proj.isHoming && proj.target) {
        const dist = Math.hypot(proj.target.x - proj.x, proj.target.y - proj.y);
        if (dist < proj.target.radius + proj.radius) {
          this.applyProjectileHit(proj, proj.target);
          proj.isFinished = true;
        }
      } else {
        // Skillshot line collision check with enemy units
        const enemies = [
          ...this.heroes.filter((h) => h.team !== proj.sourceTeam && !h.isDead),
          ...this.minions.filter((m) => m.team !== proj.sourceTeam && !m.isDead),
          ...this.monsters.filter((m) => !m.isDead),
        ];

        for (const enemy of enemies) {
          const dist = Math.hypot(enemy.x - proj.x, enemy.y - proj.y);
          if (dist < enemy.radius + proj.radius) {
            this.applyProjectileHit(proj, enemy);
            proj.isFinished = true;
            break;
          }
        }
      }

      if (proj.isFinished) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  private applyProjectileHit(proj: ProjectileEntity, target: BaseEntity) {
    soundManager.playHit();
    const sourceHero = this.heroes.find((h) => h.id === proj.sourceId);

    // Calculate damage mitigation (Armor or Magic Resist)
    let finalDmg = proj.damage;
    if (target instanceof HeroEntity) {
      if (proj.damageType === 'physical') {
        finalDmg *= 100 / (100 + target.currentStats.armor);
      } else if (proj.damageType === 'magical') {
        finalDmg *= 100 / (100 + target.currentStats.magicResist);
      }
      if (sourceHero) {
        target.lastAttacker = {
          id: sourceHero.id,
          name: sourceHero.config.name,
          heroId: sourceHero.config.id,
          team: sourceHero.team,
          time: this.matchTime,
        };
      }
    }

    const actualDmg = target.takeDamage(finalDmg);
    this.addDamageText(target.x, target.y, actualDmg, proj.damageType, false);
    this.addHitSparks(target.x, target.y, proj.color);

    if (sourceHero) {
      sourceHero.damageDealtTotal += actualDmg;
    }

    if (target.isDead) {
      this.handleEntityDeath(target, sourceHero || null);
    }
  }

  // BASIC ATTACK
  public heroBasicAttack(hero: HeroEntity, target: BaseEntity) {
    if (hero.isDead || hero.isStunned() || hero.attackTimer > 0) return;
    const dist = Math.hypot(target.x - hero.x, target.y - hero.y);
    if (dist > hero.currentStats.attackRange + target.radius + 15) return;

    hero.cancelRecall();
    hero.attackTimer = 1 / hero.currentStats.attackSpeed;
    hero.facingAngle = Math.atan2(target.y - hero.y, target.x - hero.x);
    soundManager.playAttack(hero.config.role);

    // Aggro neutral monster
    if (target instanceof MonsterEntity && !target.currentTarget) {
      target.currentTarget = hero;
    }

    // Is ranged or melee
    const isRanged = hero.currentStats.attackRange > 180;
    let damage = hero.currentStats.attack;
    let isCrit = false;

    if (Math.random() < hero.currentStats.critChance) {
      isCrit = true;
      damage *= 2.0;
    }

    if (isRanged) {
      const speed = 600;
      const dx = target.x - hero.x;
      const dy = target.y - hero.y;
      const len = Math.hypot(dx, dy);

      this.projectiles.push(
        new ProjectileEntity(
          `proj_hero_${Math.random()}`,
          hero.id,
          hero.team,
          hero.x,
          hero.y,
          (dx / len) * speed,
          (dy / len) * speed,
          speed,
          damage,
          'physical',
          hero.config.primaryColor,
          hero.currentStats.attackRange + 100,
          target,
          true
        )
      );
    } else {
      // Melee strike
      this.addHitSparks(target.x, target.y, hero.config.primaryColor);
      let finalDmg = damage;
      if (target instanceof HeroEntity) {
        finalDmg *= 100 / (100 + target.currentStats.armor);
        target.lastAttacker = {
          id: hero.id,
          name: hero.config.name,
          heroId: hero.config.id,
          team: hero.team,
          time: this.matchTime,
        };
      }

      const actualDmg = target.takeDamage(finalDmg);
      this.addDamageText(target.x, target.y, actualDmg, 'physical', isCrit);
      hero.damageDealtTotal += actualDmg;

      // Lifesteal
      if (hero.currentStats.lifesteal > 0) {
        hero.heal(actualDmg * hero.currentStats.lifesteal);
      }

      if (target.isDead) {
        this.handleEntityDeath(target, hero);
      }
    }
  }

  // CAST SKILL
  public castSkill(hero: HeroEntity, skillIndex: number, targetX: number, targetY: number) {
    if (hero.isDead || hero.isStunned()) return;
    const skill = hero.skills[skillIndex];
    if (!skill || skill.level === 0 || skill.currentCooldown > 0 || hero.mana < skill.manaCost) return;

    hero.cancelRecall();
    hero.mana -= skill.manaCost;
    // Apply Cooldown Reduction
    skill.currentCooldown = skill.cooldown * (1 - hero.currentStats.cooldownReduction);
    soundManager.playSkill(skillIndex + 1);

    const baseDmg = skill.baseDamage + skill.damagePerLevel * (skill.level - 1);
    const scaledDmg = baseDmg + hero.currentStats.attack * skill.scalingAD + hero.currentStats.magicPower * skill.scalingAP;

    const dx = targetX - hero.x;
    const dy = targetY - hero.y;
    const dist = Math.hypot(dx, dy);
    const dirX = dist > 0.001 ? dx / dist : Math.cos(hero.facingAngle);
    const dirY = dist > 0.001 ? dy / dist : Math.sin(hero.facingAngle);
    hero.facingAngle = Math.atan2(dirY, dirX);

    // Execute skill by type
    if (skill.targetType === 'dash') {
      const dashDist = Math.min(skill.range, dist);
      this.moveHeroWithCollision(hero, dirX * dashDist, dirY * dashDist);
      this.addHitSparks(hero.x, hero.y, skill.color);

      // Damage enemies passed through
      const enemies = this.getEnemiesInRange(hero.x, hero.y, 140, hero.team);
      for (const enemy of enemies) {
        this.damageEnemy(hero, enemy, scaledDmg, skill.damageType);
      }
    } else if (skill.targetType === 'skillshot_line') {
      const speed = 700;
      this.projectiles.push(
        new ProjectileEntity(
          `proj_skill_${Math.random()}`,
          hero.id,
          hero.team,
          hero.x,
          hero.y,
          dirX * speed,
          dirY * speed,
          speed,
          scaledDmg,
          skill.damageType,
          skill.color,
          skill.range,
          null,
          false
        )
      );
    } else if (skill.targetType === 'aoe_circle') {
      const centerPos = {
        x: skill.range === 0 ? hero.x : hero.x + dirX * Math.min(dist, skill.range),
        y: skill.range === 0 ? hero.y : hero.y + dirY * Math.min(dist, skill.range),
      };
      const radius = skill.radius || 200;

      // Visual ground explosion particle
      this.addAoeBlast(centerPos.x, centerPos.y, radius, skill.color);

      const enemies = this.getEnemiesInRange(centerPos.x, centerPos.y, radius, hero.team);
      for (const enemy of enemies) {
        this.damageEnemy(hero, enemy, scaledDmg, skill.damageType);
        // CC effects
        if (skill.id === 'vanguard_ult' || skill.id === 'pyra_s2') {
          if (enemy instanceof HeroEntity) {
            enemy.addStatusEffect({ type: 'stun', duration: 1.3, color: '#facc15' });
            this.addFloatingText(enemy.x, enemy.y - 30, 'STUNNED', '#facc15', 18);
          }
        }
      }
    } else if (skill.targetType === 'cone') {
      const coneAngle = Math.PI / 3; // 60 degrees
      const centerAngle = Math.atan2(dirY, dirX);
      const enemies = this.getEnemiesInRange(hero.x, hero.y, skill.range, hero.team);

      this.addConeEffect(hero.x, hero.y, centerAngle, skill.range, skill.color);

      for (const enemy of enemies) {
        const enemyAngle = Math.atan2(enemy.y - hero.y, enemy.x - hero.x);
        let diff = Math.abs(enemyAngle - centerAngle);
        if (diff > Math.PI) diff = 2 * Math.PI - diff;

        if (diff <= coneAngle / 2) {
          this.damageEnemy(hero, enemy, scaledDmg, skill.damageType);
          if (enemy instanceof HeroEntity) {
            enemy.addStatusEffect({ type: 'slow', duration: 2.0, value: 0.35, color: '#38bdf8' });
          }
        }
      }
    } else if (skill.targetType === 'target_unit') {
      // Leap / strike to target
      if (this.lockedTarget && !this.lockedTarget.isDead) {
        this.moveHeroWithCollision(hero, this.lockedTarget.x - hero.x, this.lockedTarget.y - hero.y);
        this.damageEnemy(hero, this.lockedTarget, scaledDmg, skill.damageType);
        this.addHitSparks(this.lockedTarget.x, this.lockedTarget.y, skill.color);
      }
    } else if (skill.targetType === 'self') {
      // Buff / Heal
      if (skill.id === 'lumina_s1') {
        // Heal
        const healAmt = 300 + hero.currentStats.magicPower * 0.8;
        hero.heal(healAmt);
        this.addFloatingText(hero.x, hero.y - 30, `+${Math.round(healAmt)}`, '#22c55e', 20);
      } else if (skill.id === 'lumina_ult') {
        const healAmt = 650 + hero.currentStats.magicPower * 1.2;
        const allies = this.heroes.filter((h) => h.team === hero.team && !h.isDead && Math.hypot(h.x - hero.x, h.y - hero.y) < 450);
        for (const ally of allies) {
          ally.heal(healAmt);
          this.addFloatingText(ally.x, ally.y - 30, `+${Math.round(healAmt)}`, '#22c55e', 22);
        }
      } else {
        // Shield
        hero.heal(250);
        this.addFloatingText(hero.x, hero.y - 30, 'SHIELD', '#60a5fa', 18);
      }
    }
  }

  // FLASH SUMMONER SPELL
  public useFlash(hero: HeroEntity) {
    if (hero.isDead || hero.flashCooldown > 0) return;
    hero.cancelRecall();
    hero.flashCooldown = 90; // 90s CD
    const blinkDist = 280;
    const angle = hero.facingAngle;
    this.moveHeroWithCollision(hero, Math.cos(angle) * blinkDist, Math.sin(angle) * blinkDist);
    this.addHitSparks(hero.x, hero.y, '#eab308');
    soundManager.playSkill(1);
    this.addFloatingText(hero.x, hero.y - 35, 'FLICKER', '#fde047', 18);
  }

  private damageEnemy(attacker: HeroEntity, target: BaseEntity, amount: number, damageType: 'physical' | 'magical' | 'true') {
    let finalDmg = amount;
    if (target instanceof HeroEntity) {
      if (damageType === 'physical') {
        finalDmg *= 100 / (100 + target.currentStats.armor);
      } else if (damageType === 'magical') {
        finalDmg *= 100 / (100 + target.currentStats.magicResist);
      }
      target.lastAttacker = {
        id: attacker.id,
        name: attacker.config.name,
        heroId: attacker.config.id,
        team: attacker.team,
        time: this.matchTime,
      };
    }

    const actualDmg = target.takeDamage(finalDmg);
    this.addDamageText(target.x, target.y, actualDmg, damageType, false);
    attacker.damageDealtTotal += actualDmg;

    // Trigger monster aggro
    if (target instanceof MonsterEntity && !target.currentTarget) {
      target.currentTarget = attacker;
    }

    if (target.isDead) {
      this.handleEntityDeath(target, attacker);
    }
  }

  private getEnemiesInRange(x: number, y: number, radius: number, myTeam: Team): BaseEntity[] {
    const list: BaseEntity[] = [];
    for (const h of this.heroes) {
      if (h.team !== myTeam && !h.isDead && Math.hypot(h.x - x, h.y - y) <= radius + h.radius) {
        list.push(h);
      }
    }
    for (const m of this.minions) {
      if (m.team !== myTeam && !m.isDead && Math.hypot(m.x - x, m.y - y) <= radius + m.radius) {
        list.push(m);
      }
    }
    for (const s of this.structures) {
      if (s.team !== myTeam && !s.isDead && Math.hypot(s.x - x, s.y - y) <= radius + s.radius) {
        list.push(s);
      }
    }
    for (const mon of this.monsters) {
      if (!mon.isDead && Math.hypot(mon.x - x, mon.y - y) <= radius + mon.radius) {
        list.push(mon);
      }
    }
    return list;
  }

  private handleEntityDeath(victim: BaseEntity, killer: BaseEntity | null) {
    const killerHero = killer instanceof HeroEntity ? killer : null;

    if (victim instanceof HeroEntity) {
      victim.deaths++;
      const killerName = killerHero ? killerHero.config.name : 'Turret';
      const killerHeroId = killerHero ? killerHero.config.id : 'tower';
      const killerTeam = killerHero ? killerHero.team : (victim.team === 'blue' ? 'red' : 'blue');

      // Update team score
      if (victim.team === 'blue') {
        this.redScore++;
      } else {
        this.blueScore++;
      }

      // Respawn timer scales with level
      victim.respawnTimer = GAME_CONFIG.BASE_RESPAWN_SEC + victim.level * GAME_CONFIG.RESPAWN_PER_LEVEL_SEC;

      if (killerHero) {
        killerHero.kills++;
        killerHero.gold += GAME_CONFIG.GOLD_REWARDS.HERO_KILL;
        killerHero.addExp(GAME_CONFIG.XP_REWARDS.HERO_KILL);

        // Assist gold to nearby teammates
        const allies = this.heroes.filter(
          (h) => h.team === killerHero.team && h.id !== killerHero.id && !h.isDead && Math.hypot(h.x - victim.x, h.y - victim.y) < 700
        );
        for (const ally of allies) {
          ally.assists++;
          ally.gold += GAME_CONFIG.GOLD_REWARDS.HERO_ASSIST;
        }

        // Streak check
        this.streakCount[killerHero.id] = (this.streakCount[killerHero.id] || 0) + 1;
        const streak = this.streakCount[killerHero.id];

        let eventType: KillFeedEvent['type'] = 'kill';
        if (!this.firstBloodClaimed) {
          this.firstBloodClaimed = true;
          eventType = 'first_blood';
          killerHero.gold += GAME_CONFIG.GOLD_REWARDS.FIRST_BLOOD_BONUS;
          soundManager.announce('First Blood!');
        } else if (streak === 2) {
          eventType = 'double';
          soundManager.announce('Double Kill!');
        } else if (streak >= 3) {
          eventType = 'triple';
          soundManager.announce('Triple Kill! Rampage!');
        } else {
          soundManager.announce(killerHero.team === 'blue' ? 'Enemy Slain!' : 'An Ally has been slain!');
        }

        this.addKillFeedEvent({
          id: `kf_${Math.random()}`,
          killerName,
          killerHero: killerHeroId,
          killerTeam,
          victimName: victim.config.name,
          victimHero: victim.config.id,
          victimTeam: victim.team,
          type: eventType,
          timestamp: this.matchTime,
        });
      }
    } else if (victim instanceof MinionEntity) {
      if (killerHero) {
        killerHero.gold += Math.round(victim.goldValue * GAME_CONFIG.GOLD_REWARDS.LAST_HIT_BONUS_MULT);
        killerHero.addExp(victim.expValue);
        this.addFloatingText(victim.x, victim.y - 20, `+${Math.round(victim.goldValue * 1.4)}G`, '#eab308', 16);
      }
    } else if (victim instanceof StructureEntity) {
      soundManager.announce(victim.team === 'blue' ? 'Your turret has been destroyed!' : 'Enemy turret destroyed!');
      const rewardTeam = victim.team === 'blue' ? 'red' : 'blue';
      const allies = this.heroes.filter((h) => h.team === rewardTeam);
      for (const ally of allies) {
        ally.gold += GAME_CONFIG.GOLD_REWARDS.TOWER_KILL;
        ally.addExp(GAME_CONFIG.XP_REWARDS.TOWER_KILL);
      }

      this.addKillFeedEvent({
        id: `kf_tower_${Math.random()}`,
        killerName: killerHero ? killerHero.config.name : 'Minions',
        killerHero: killerHero ? killerHero.config.id : 'minion',
        killerTeam: rewardTeam,
        victimName: victim.type === 'core' ? 'Core' : 'Turret',
        victimHero: 'structure',
        victimTeam: victim.team,
        type: 'tower',
        timestamp: this.matchTime,
      });

      // Core destroyed -> Game Over!
      if (victim.type === 'core') {
        if (victim.team === 'red') {
          this.matchResult = 'victory';
          soundManager.playVictory();
          if (this.onMatchEnd) this.onMatchEnd('victory');
        } else {
          this.matchResult = 'defeat';
          soundManager.playDefeat();
          if (this.onMatchEnd) this.onMatchEnd('defeat');
        }
      }
    } else if (victim instanceof MonsterEntity) {
      victim.respawnTimer = victim.respawnSec;
      if (killerHero) {
        killerHero.gold += victim.goldValue;
        killerHero.addExp(victim.expValue);
        this.addFloatingText(victim.x, victim.y - 20, `+${victim.goldValue}G`, '#eab308', 18);

        // Buff grant
        if (victim.monsterType === 'red_buff') {
          killerHero.addBuff({ id: 'buff_red', name: 'Infernal Fiend', type: 'red_buff', duration: 70, maxDuration: 70, color: '#ef4444' });
          soundManager.announce('Red Buff acquired!');
        } else if (victim.monsterType === 'blue_buff') {
          killerHero.addBuff({ id: 'buff_blue', name: 'Azure Golem', type: 'blue_buff', duration: 70, maxDuration: 70, color: '#3b82f6' });
          soundManager.announce('Blue Buff acquired!');
        } else if (victim.monsterType === 'lord') {
          soundManager.announce('The Titan Lord has been slain!');
          const teamAllies = this.heroes.filter((h) => h.team === killerHero.team);
          for (const ally of teamAllies) {
            ally.gold += GAME_CONFIG.GOLD_REWARDS.LORD_KILL_TEAM;
            ally.addBuff({ id: 'buff_lord', name: 'Lord Blessing', type: 'lord_buff', duration: 90, maxDuration: 90, color: '#8b5cf6' });
          }
        }
      }
    }
  }

  private addKillFeedEvent(event: KillFeedEvent) {
    this.killFeed.unshift(event);
    if (this.killFeed.length > 5) {
      this.killFeed.pop();
    }
    if (this.onKillEvent) {
      this.onKillEvent(event);
    }
  }

  // VISUAL EFFECTS & TEXT HELPERS
  private addDamageText(x: number, y: number, amount: number, type: 'physical' | 'magical' | 'true', isCrit: boolean) {
    const color = isCrit ? '#facc15' : type === 'magical' ? '#c084fc' : type === 'true' ? '#ffffff' : '#f97316';
    const text = isCrit ? `${Math.round(amount)}!` : `${Math.round(amount)}`;
    this.addFloatingText(x, y - 25, text, color, isCrit ? 22 : 16);
  }

  public addFloatingText(x: number, y: number, text: string, color: string, fontSize: number = 16) {
    this.floatingTexts.push({
      id: `ft_${Math.random()}`,
      x: x + (Math.random() - 0.5) * 20,
      y,
      text,
      color,
      fontSize,
      life: 0.9,
      maxLife: 0.9,
      vy: -55,
    });
  }

  private addHitSparks(x: number, y: number, color: string) {
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 70 + Math.random() * 120;
      this.particles.push({
        id: `p_${Math.random()}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 3 + Math.random() * 3,
        color,
        alpha: 1.0,
        life: 0.25,
        maxLife: 0.25,
      });
    }
  }

  private addAoeBlast(x: number, y: number, radius: number, color: string) {
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const speed = (radius * 2) * (0.6 + Math.random() * 0.4);
      this.particles.push({
        id: `p_blast_${Math.random()}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 5,
        color,
        alpha: 0.8,
        life: 0.4,
        maxLife: 0.4,
      });
    }
  }

  private addConeEffect(x: number, y: number, centerAngle: number, range: number, color: string) {
    for (let i = 0; i < 12; i++) {
      const spread = (Math.random() - 0.5) * (Math.PI / 3);
      const angle = centerAngle + spread;
      const speed = range * 2.2;
      this.particles.push({
        id: `p_cone_${Math.random()}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 4,
        color,
        alpha: 0.9,
        life: 0.25,
        maxLife: 0.25,
      });
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha = Math.max(0, p.life / p.maxLife);
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private updateFloatingTexts(dt: number) {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      ft.y += ft.vy * dt;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  // ===================== RENDERING PIPELINE =====================
  public render() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const ctx = this.ctx;

    // Clear background
    ctx.fillStyle = '#06101e';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    // Center camera on screen
    ctx.translate(width / 2, height / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.camera.x, -this.camera.y);

    // 1. Render Map Environment (Ground, Lanes, River, Bushes)
    this.renderMap(ctx);

    // 2. Render Structures
    this.renderStructures(ctx);

    // 3. Render Monsters
    this.renderMonsters(ctx);

    // 4. Render Minions
    this.renderMinions(ctx);

    // 5. Render Heroes
    this.renderHeroes(ctx);

    // 6. Render Projectiles
    this.renderProjectiles(ctx);

    // 7. Render Particles
    this.renderParticles(ctx);

    // 8. Render Aiming Reticle (for user drag skill)
    this.renderAimingReticle(ctx);

    // 9. Render Floating Combat Text
    this.renderFloatingText(ctx);

    ctx.restore();
  }

  private renderMap(ctx: CanvasRenderingContext2D) {
    // Map base grass
    ctx.fillStyle = '#112217';
    ctx.fillRect(0, 0, GAME_CONFIG.MAP_WIDTH, GAME_CONFIG.MAP_HEIGHT);

    // Symmetrical River running diagonally
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 200);
    ctx.lineTo(200, 0);
    ctx.lineTo(GAME_CONFIG.MAP_WIDTH, GAME_CONFIG.MAP_HEIGHT - 200);
    ctx.lineTo(GAME_CONFIG.MAP_WIDTH - 200, GAME_CONFIG.MAP_HEIGHT);
    ctx.closePath();
    ctx.fillStyle = '#0c4a6e';
    ctx.fill();

    // River inner flow
    ctx.lineWidth = 140;
    ctx.strokeStyle = '#0284c7';
    ctx.beginPath();
    ctx.moveTo(100, 100);
    ctx.lineTo(GAME_CONFIG.MAP_WIDTH - 100, GAME_CONFIG.MAP_HEIGHT - 100);
    ctx.stroke();
    ctx.restore();

    // Lanes (Stone cobblestone pathways)
    ctx.lineWidth = 110;
    ctx.strokeStyle = '#334155';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Top Lane
    ctx.beginPath();
    const topWp = LANE_WAYPOINTS.blue.top;
    ctx.moveTo(topWp[0].x, topWp[0].y);
    for (let i = 1; i < topWp.length; i++) ctx.lineTo(topWp[i].x, topWp[i].y);
    ctx.stroke();

    // Mid Lane
    ctx.beginPath();
    const midWp = LANE_WAYPOINTS.blue.mid;
    ctx.moveTo(midWp[0].x, midWp[0].y);
    for (let i = 1; i < midWp.length; i++) ctx.lineTo(midWp[i].x, midWp[i].y);
    ctx.stroke();

    // Bot Lane
    ctx.beginPath();
    const botWp = LANE_WAYPOINTS.blue.bot;
    ctx.moveTo(botWp[0].x, botWp[0].y);
    for (let i = 1; i < botWp.length; i++) ctx.lineTo(botWp[i].x, botWp[i].y);
    ctx.stroke();

    // Cobblestone lane center stripes
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#64748b';
    ctx.setLineDash([15, 20]);
    ctx.beginPath();
    ctx.moveTo(midWp[0].x, midWp[0].y);
    for (let i = 1; i < midWp.length; i++) ctx.lineTo(midWp[i].x, midWp[i].y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Base summoning fountains
    // Blue Base
    ctx.fillStyle = 'rgba(37, 99, 235, 0.25)';
    ctx.beginPath();
    ctx.arc(280, 2120, 170, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Red Base
    ctx.fillStyle = 'rgba(220, 38, 38, 0.25)';
    ctx.beginPath();
    ctx.arc(2120, 280, 170, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Obstacles / Rock walls
    for (const obs of OBSTACLES) {
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Bushes
    for (const bush of BUSH_ZONES) {
      ctx.fillStyle = 'rgba(34, 197, 94, 0.4)';
      ctx.beginPath();
      ctx.arc(bush.x, bush.y, bush.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  private renderStructures(ctx: CanvasRenderingContext2D) {
    for (const s of this.structures) {
      if (s.isDead) {
        // Destroyed ruin
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius * 0.7, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }

      const isBlue = s.team === 'blue';
      const mainColor = isBlue ? '#3b82f6' : '#ef4444';

      // Tower attack range indicator if player is near
      const distToPlayer = Math.hypot(s.x - this.playerHero.x, s.y - this.playerHero.y);
      if (distToPlayer <= s.attackRange + 120) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.attackRange, 0, Math.PI * 2);
        ctx.strokeStyle = isBlue ? 'rgba(59, 130, 246, 0.25)' : 'rgba(239, 68, 68, 0.35)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }

      // Tower base structure
      ctx.save();
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = mainColor;
      ctx.lineWidth = 4;
      ctx.stroke();

      // Glowing crystal at center
      ctx.fillStyle = mainColor;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius * 0.45, 0, Math.PI * 2);
      ctx.fill();

      // Health bar above structure
      this.renderHealthBar(ctx, s.x, s.y - s.radius - 14, s.radius * 2, 7, s.hp, s.maxHp, mainColor);
      ctx.restore();
    }
  }

  private renderMonsters(ctx: CanvasRenderingContext2D) {
    for (const m of this.monsters) {
      if (m.isDead) continue;
      ctx.save();

      // Monster body
      ctx.fillStyle = m.color;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(m.name, m.x, m.y - m.radius - 12);

      // Health bar
      this.renderHealthBar(ctx, m.x, m.y - m.radius - 6, m.radius * 2, 6, m.hp, m.maxHp, '#eab308');
      ctx.restore();
    }
  }

  private renderMinions(ctx: CanvasRenderingContext2D) {
    for (const m of this.minions) {
      if (m.isDead) continue;
      const isBlue = m.team === 'blue';
      const color = isBlue ? '#3b82f6' : '#ef4444';

      ctx.save();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Minion health bar
      this.renderHealthBar(ctx, m.x, m.y - m.radius - 6, 26, 4, m.hp, m.maxHp, color);
      ctx.restore();
    }
  }

  private renderHeroes(ctx: CanvasRenderingContext2D) {
    for (const hero of this.heroes) {
      if (hero.isDead) continue;

      // Vision check for bush
      if (hero.team !== 'blue' && hero.isInBush && !this.playerHero.isInBush) {
        // Invisible in bush to player
        continue;
      }

      ctx.save();
      const isBlue = hero.team === 'blue';
      const isPlayer = hero.id === this.playerHero.id;

      // Target lock ring if locked
      if (this.lockedTarget && this.lockedTarget.id === hero.id) {
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.arc(hero.x, hero.y, hero.radius + 12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Buff aura rings under feet
      for (const buff of hero.buffs) {
        ctx.strokeStyle = buff.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(hero.x, hero.y, hero.radius + 6, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Recall circle aura
      if (hero.isRecalling) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(hero.x, hero.y, hero.radius + 10, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Hero body
      ctx.fillStyle = hero.config.avatarColor;
      ctx.beginPath();
      ctx.arc(hero.x, hero.y, hero.radius, 0, Math.PI * 2);
      ctx.fill();

      // Direction facing pointer
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(hero.x, hero.y);
      ctx.lineTo(hero.x + Math.cos(hero.facingAngle) * (hero.radius + 6), hero.y + Math.sin(hero.facingAngle) * (hero.radius + 6));
      ctx.stroke();

      // Hero border (Green for player, Blue for ally, Red for enemy)
      ctx.strokeStyle = isPlayer ? '#22c55e' : isBlue ? '#3b82f6' : '#ef4444';
      ctx.lineWidth = isPlayer ? 4 : 2.5;
      ctx.beginPath();
      ctx.arc(hero.x, hero.y, hero.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Hero Name & Level Badge
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Rajdhani, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${hero.config.name} (Lv ${hero.level})`, hero.x, hero.y - hero.radius - 16);

      // Health bar & Mana bar
      this.renderHealthBar(ctx, hero.x, hero.y - hero.radius - 8, 48, 6, hero.hp, hero.maxHp, isBlue ? '#22c55e' : '#ef4444');
      this.renderManaBar(ctx, hero.x, hero.y - hero.radius - 2, 48, 3, hero.mana, hero.maxMana);

      ctx.restore();
    }
  }

  private renderHealthBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    hp: number,
    maxHp: number,
    color: string
  ) {
    const rx = x - w / 2;
    // Background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(rx, y, w, h);

    // Fill
    const ratio = Math.max(0, Math.min(1, hp / maxHp));
    ctx.fillStyle = color;
    ctx.fillRect(rx, y, w * ratio, h);

    // Border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(rx, y, w, h);
  }

  private renderManaBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    mana: number,
    maxMana: number
  ) {
    const rx = x - w / 2;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(rx, y, w, h);

    const ratio = Math.max(0, Math.min(1, mana / maxMana));
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(rx, y, w * ratio, h);
  }

  private renderProjectiles(ctx: CanvasRenderingContext2D) {
    for (const proj of this.projectiles) {
      ctx.save();
      ctx.fillStyle = proj.color;
      ctx.shadowColor = proj.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private renderParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private renderAimingReticle(ctx: CanvasRenderingContext2D) {
    if (this.aimingSkillIndex === null) return;
    const skill = this.playerHero.skills[this.aimingSkillIndex];
    if (!skill) return;

    ctx.save();
    const px = this.playerHero.x;
    const py = this.playerHero.y;
    const len = Math.hypot(this.aimVector.x, this.aimVector.y);
    const angle = len > 0.01 ? Math.atan2(this.aimVector.y, this.aimVector.x) : this.playerHero.facingAngle;

    if (skill.targetType === 'skillshot_line' || skill.targetType === 'dash') {
      // Aiming trajectory line
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.7)';
      ctx.lineWidth = 8;
      ctx.setLineDash([12, 8]);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(angle) * skill.range, py + Math.sin(angle) * skill.range);
      ctx.stroke();
    } else if (skill.targetType === 'aoe_circle') {
      // Range outer circle
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, skill.range || 200, 0, Math.PI * 2);
      ctx.stroke();

      // AoE reticle circle
      const targetDist = Math.min(skill.range || 200, len > 0 ? skill.range : 150);
      const retX = px + Math.cos(angle) * targetDist;
      const retY = py + Math.sin(angle) * targetDist;

      ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
      ctx.beginPath();
      ctx.arc(retX, retY, skill.radius || 150, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.restore();
  }

  private renderFloatingText(ctx: CanvasRenderingContext2D) {
    for (const ft of this.floatingTexts) {
      ctx.save();
      ctx.font = `bold ${ft.fontSize}px Chakra Petch, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = ft.color;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }

  // TARGET SELECTION LOGIC
  public selectAutoTarget(): BaseEntity | null {
    const enemies = [
      ...this.heroes.filter((h) => h.team !== 'blue' && !h.isDead),
      ...this.minions.filter((m) => m.team !== 'blue' && !m.isDead),
      ...this.structures.filter((s) => s.team !== 'blue' && !s.isDead),
      ...this.monsters.filter((m) => !m.isDead),
    ];

    let closest: BaseEntity | null = null;
    let minDist = 480;

    for (const e of enemies) {
      if (this.attackPriority === 'hero' && !(e instanceof HeroEntity)) {
        // prioritize hero
        continue;
      }
      if (this.attackPriority === 'minion' && !(e instanceof MinionEntity)) {
        continue;
      }
      if (this.attackPriority === 'tower' && !(e instanceof StructureEntity)) {
        continue;
      }

      const d = Math.hypot(e.x - this.playerHero.x, e.y - this.playerHero.y);
      if (d < minDist) {
        minDist = d;
        closest = e;
      }
    }

    // Fallback to closest of any type
    if (!closest) {
      for (const e of enemies) {
        const d = Math.hypot(e.x - this.playerHero.x, e.y - this.playerHero.y);
        if (d < minDist) {
          minDist = d;
          closest = e;
        }
      }
    }

    this.lockedTarget = closest;
    return closest;
  }
}
