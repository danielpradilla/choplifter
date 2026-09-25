import Phaser from 'phaser';
import {
  BARRACK_CENTERS,
  BARRIER_X,
  BATTLE_LEFT,
  CHOPPER_CAPACITY,
  DEPTH,
  GAME_H,
  GAME_W,
  GROUND_Y,
  HELI,
  HELIPAD_X,
  HOSTAGES_PER_BARRACK,
  JET,
  REG,
  START_LIVES,
  TANK,
  TOTAL_HOSTAGES,
  WORLD_W,
  type Facing,
} from '../config/constants';
import { input } from '../systems/input';
import { audio } from '../systems/audio';
import { createTerrain, type Terrain } from '../systems/terrain';
import { Barracks } from '../entities/Barracks';
import { Helicopter } from '../entities/Helicopter';
import { Hostage } from '../entities/Hostage';
import { Jet } from '../entities/Jet';
import { Mine } from '../entities/Mine';
import { Projectile } from '../entities/Projectile';
import { Tank } from '../entities/Tank';

export class GameScene extends Phaser.Scene {
  heli!: Helicopter;
  hostages: Hostage[] = [];
  barracks: Barracks[] = [];
  tanks: Tank[] = [];
  jets: Jet[] = [];
  mines: Mine[] = [];
  projectiles: Projectile[] = [];

  rescued = 0;
  killed = 0;
  lives = START_LIVES;
  trips = 0;
  aboardCount = 0;
  respawning = false;
  paused = false;
  finished = false;

  private terrain!: Terrain;
  private jetTimer = 5;
  private mineTimer = 9;
  private tankTimer = 8;

  constructor() {
    super('Game');
  }

  get aggressive(): boolean {
    return this.rescued >= 40;
  }

  create(): void {
    this.hostages = [];
    this.barracks = [];
    this.tanks = [];
    this.jets = [];
    this.mines = [];
    this.projectiles = [];
    this.rescued = 0;
    this.killed = 0;
    this.lives = START_LIVES;
    this.trips = 0;
    this.aboardCount = 0;
    this.respawning = false;
    this.paused = false;
    this.finished = false;
    this.jetTimer = 5;
    this.mineTimer = 9;
    this.tankTimer = 8;
    input.clear();

    this.terrain = createTerrain(this);

    this.barracks = BARRACK_CENTERS.map((x, i) => new Barracks(this, i, x, i === 0));

    this.barracks.forEach((barrack, bi) => {
      for (let i = 0; i < HOSTAGES_PER_BARRACK; i += 1) {
        const hx = barrack.x + Phaser.Math.Between(-42, 42);
        const hostage = new Hostage(this, bi, barrack.x, hx);
        barrack.hostages.push(hostage);
        this.hostages.push(hostage);
      }
    });

    this.heli = new Helicopter(this, HELIPAD_X, GROUND_Y - HELI.halfH);

    [1200, 1500, 1780, 2040].forEach((x) => this.tanks.push(new Tank(this, x)));

    this.cameras.main.setBounds(0, 0, WORLD_W, GAME_H);
    this.cameras.main.setDeadzone(200, GAME_H);
    this.cameras.main.centerOn(this.heli.obj.x, GAME_H / 2);
    this.cameras.main.startFollow(this.heli.obj, true, 0.12, 0.12);

    this.setReg(REG.killed, 0);
    this.setReg(REG.aboard, 0);
    this.setReg(REG.rescued, 0);
    this.setReg(REG.lives, this.lives);
    this.setReg(REG.paused, false);

    this.scene.launch('Hud');
    this.scene.bringToTop('Hud');

    this.input.keyboard?.on('keydown-P', () => this.togglePause());
    this.input.keyboard?.on('keydown-ESC', () => this.togglePause());

    this.releaseBarrack(0);
    this.showBanner('RESCUE THE HOSTAGES');
    audio.startEngine();

    if (import.meta.env.DEV) {
      // Dev-only handle for automated playtesting; stripped from production builds.
      (window as unknown as { __choplifter?: GameScene }).__choplifter = this;
    }
  }

  update(_time: number, delta: number): void {
    if (this.paused || this.finished) return;
    const dt = Math.min(delta / 1000, 0.05);

    this.terrain.update(this.cameras.main.scrollX);

    if (this.heli.alive) this.heli.update(dt);

    for (const hostage of this.hostages) hostage.update(dt);
    for (const tank of this.tanks) tank.update(dt);
    for (const jet of this.jets) jet.update(dt);
    for (const mine of this.mines) mine.update(dt);

    for (const projectile of this.projectiles) projectile.update(dt);
    this.resolvePlayerProjectiles();
    this.resolveEnemyProjectiles();
    this.resolveDetonations();
    this.projectiles = this.projectiles.filter((p) => !p.dead);

    this.jets = this.jets.filter((j) => j.alive);
    this.mines = this.mines.filter((m) => m.alive);
    this.tanks = this.tanks.filter((t) => t.alive);

    this.handleLandingCrush();
    this.handleDelivery();
    this.handleMineCollisions();
    this.spawnEnemies(dt);

    this.setReg(REG.killed, this.killed);
    this.setReg(REG.aboard, this.aboardCount);
    this.setReg(REG.rescued, this.rescued);

    if (this.rescued + this.killed >= TOTAL_HOSTAGES) this.finishGame(this.rescued > 0);
  }

  // ----- world actions used by entities -----

  spawnMissile(x: number, y: number, facing: Facing): void {
    const vx = facing === 'right' ? HELI.missileSpeed : -HELI.missileSpeed;
    this.projectiles.push(new Projectile(this, 'missile', 'player', x, y, vx, 0, 1.4));
  }

  spawnBomb(x: number, y: number): void {
    this.projectiles.push(new Projectile(this, 'bomb', 'player', x, y, 0, 60, 3));
  }

  spawnShell(x: number, y: number, dir: number): void {
    this.projectiles.push(new Projectile(this, 'shell', 'enemy', x, y, dir * TANK.shellSpeed, 0, TANK.shellLife));
  }

  spawnJetMissile(x: number, y: number, targetX: number, targetY: number): void {
    const dx = targetX - x;
    const dy = targetY - y;
    const dist = Math.hypot(dx, dy) || 1;
    this.projectiles.push(
      new Projectile(
        this,
        'jetMissile',
        'enemy',
        x,
        y,
        (dx / dist) * JET.missileSpeed,
        (dy / dist) * JET.missileSpeed,
        3,
      ),
    );
  }

  spawnMineBomb(x: number, y: number): void {
    this.projectiles.push(new Projectile(this, 'mineBomb', 'enemy', x, y, 0, 60, 4));
  }

  nearestFreeHostage(x: number, maxDist: number): Hostage | null {
    let best: Hostage | null = null;
    let bestDist = maxDist;
    for (const hostage of this.hostages) {
      if (hostage.state !== 'free') continue;
      const dist = Math.abs(hostage.x - x);
      if (dist < bestDist) {
        bestDist = dist;
        best = hostage;
      }
    }
    return best;
  }

  nearestIntactBarrack(x: number, maxDist: number): Barracks | null {
    let best: Barracks | null = null;
    let bestDist = maxDist;
    for (const barrack of this.barracks) {
      if (barrack.open) continue;
      const dist = Math.abs(barrack.x - x);
      if (dist < bestDist) {
        bestDist = dist;
        best = barrack;
      }
    }
    return best;
  }

  releaseBarrack(index: number): void {
    const barrack = this.barracks[index];
    if (!barrack) return;
    let delay = 0;
    for (const hostage of barrack.hostages) {
      if (hostage.state !== 'inside') continue;
      this.time.delayedCall(delay, () => {
        if (!this.finished) hostage.release();
      });
      delay += 65;
    }
  }

  boardHostage(hostage: Hostage): void {
    if (hostage.state !== 'free' || this.aboardCount >= CHOPPER_CAPACITY) return;
    hostage.board();
    this.aboardCount += 1;
    audio.board();
  }

  killHostage(hostage: Hostage): void {
    if (hostage.kill()) this.killed += 1;
  }

  explode(x: number, y: number, big = false): void {
    const count = big ? 26 : 14;
    const emitter = this.add
      .particles(x, y, 'spark', {
        speed: { min: big ? 60 : 40, max: big ? 250 : 150 },
        angle: { min: 0, max: 360 },
        lifespan: { min: 260, max: big ? 720 : 460 },
        scale: { start: big ? 1.4 : 1, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: [0xffe08a, 0xffb347, 0xff7a1a, 0xff3d1a],
        emitting: false,
      })
      .setDepth(DEPTH.explosion);
    emitter.explode(count);
    this.time.delayedCall(820, () => emitter.destroy());

    const ring = this.add.circle(x, y, big ? 10 : 6, 0xfff2c0, 0.9).setDepth(DEPTH.explosion);
    this.tweens.add({
      targets: ring,
      radius: big ? 58 : 30,
      alpha: 0,
      duration: big ? 430 : 280,
      onComplete: () => ring.destroy(),
    });

    audio.explosion(big);
  }

  destroyHeli(reason: 'crash' | 'shell' | 'missile' | 'bomb' | 'mine'): void {
    if (!this.heli.alive || this.respawning || this.finished) return;
    const hx = this.heli.obj.x;
    const hy = this.heli.obj.y;
    this.heli.alive = false;
    this.heli.obj.setVisible(false);
    this.explode(hx, hy, true);
    this.cameras.main.shake(280, 0.013);
    this.cameras.main.flash(170, 255, 210, 140);

    for (const hostage of this.hostages) {
      if (hostage.state === 'aboard') {
        hostage.kill();
        this.killed += 1;
      }
    }
    this.aboardCount = 0;
    this.lives -= 1;
    this.setReg(REG.lives, this.lives);

    if (this.lives <= 0) {
      this.finishGame(false);
      return;
    }

    this.respawning = true;
    this.showBanner(reason === 'crash' ? 'CRASHED — CHOPPER LOST' : 'CHOPPER DOWN');
    this.time.delayedCall(1500, () => {
      if (this.finished) return;
      this.heli.reset(HELIPAD_X, GROUND_Y - HELI.halfH);
      this.respawning = false;
      this.showBanner('CHOPPER READY');
    });
  }

  showBanner(text: string): void {
    this.game.events.emit('banner', text);
  }

  togglePause(): void {
    if (this.finished) return;
    this.paused = !this.paused;
    this.setReg(REG.paused, this.paused);
    if (this.paused) audio.stopEngine();
    else audio.startEngine();
  }

  // ----- internal systems -----

  private setReg(key: string, value: number | boolean): void {
    if (this.registry.get(key) !== value) this.registry.set(key, value);
  }

  private handleLandingCrush(): void {
    if (!this.heli.justLanded || !this.heli.alive) return;
    for (const hostage of this.hostages) {
      if (hostage.state !== 'free') continue;
      if (Math.abs(hostage.x - this.heli.obj.x) < HELI.halfW + 2) this.killHostage(hostage);
    }
  }

  private handleDelivery(): void {
    if (!this.heli.alive || !this.heli.landed || this.aboardCount === 0) return;
    if (Math.abs(this.heli.obj.x - HELIPAD_X) > 74) return;

    let delivered = 0;
    for (const hostage of this.hostages) {
      if (hostage.state !== 'aboard') continue;
      hostage.deliver();
      delivered += 1;
    }
    if (delivered === 0) return;

    this.aboardCount = 0;
    this.rescued += delivered;
    this.trips += 1;
    audio.rescue();

    if (this.trips === 1) this.showBanner('JETS INBOUND — DROP ALTITUDE TO EVADE');
    if (this.trips === 2) this.showBanner('DRONE MINES DEPLOYED');
  }

  private resolvePlayerProjectiles(): void {
    for (const projectile of this.projectiles) {
      if (projectile.dead || projectile.owner !== 'player' || projectile.kind !== 'missile') continue;
      const px = projectile.obj.x;
      const py = projectile.obj.y;

      for (const jet of this.jets) {
        if (!jet.alive || projectile.dead) continue;
        if (Phaser.Math.Distance.Between(px, py, jet.obj.x, jet.obj.y) < 26) {
          jet.die();
          this.explode(jet.obj.x, jet.obj.y, false);
          projectile.destroy();
        }
      }
      for (const mine of this.mines) {
        if (!mine.alive || projectile.dead) continue;
        if (Phaser.Math.Distance.Between(px, py, mine.obj.x, mine.obj.y) < 24) {
          mine.die();
          this.explode(mine.obj.x, mine.obj.y, false);
          projectile.destroy();
        }
      }
      for (const tank of this.tanks) {
        if (!tank.alive || projectile.dead) continue;
        if (Math.abs(tank.obj.x - px) < 26 && Math.abs(GROUND_Y - 10 - py) < 26) {
          tank.die();
          this.explode(tank.obj.x, GROUND_Y - 10, false);
          projectile.destroy();
        }
      }
    }
  }

  private resolveEnemyProjectiles(): void {
    for (const projectile of this.projectiles) {
      if (projectile.dead || projectile.owner !== 'enemy') continue;
      const px = projectile.obj.x;
      const py = projectile.obj.y;

      if (projectile.kind === 'shell') {
        for (const barrack of this.barracks) {
          if (barrack.open || projectile.dead) continue;
          if (Math.abs(barrack.x - px) < 52) {
            barrack.openUp();
            projectile.destroy();
          }
        }
        for (const hostage of this.hostages) {
          if (hostage.state !== 'free' || projectile.dead) continue;
          if (Math.abs(hostage.x - px) < 13) {
            this.killHostage(hostage);
            this.explode(px, py, false);
            projectile.destroy();
          }
        }
        if (
          !projectile.dead &&
          this.heli.alive &&
          this.heli.landed &&
          py > GROUND_Y - 30 &&
          Math.abs(this.heli.obj.x - px) < HELI.halfW + 6
        ) {
          projectile.destroy();
          this.destroyHeli('shell');
        }
      } else if (projectile.kind === 'jetMissile' || projectile.kind === 'mineBomb') {
        if (
          this.heli.alive &&
          Phaser.Math.Distance.Between(px, py, this.heli.obj.x, this.heli.obj.y) < 22
        ) {
          projectile.destroy();
          this.destroyHeli(projectile.kind === 'jetMissile' ? 'missile' : 'bomb');
        }
      }
    }
  }

  private resolveDetonations(): void {
    for (const projectile of this.projectiles) {
      if (!projectile.detonated) continue;
      const x = projectile.obj.x;
      const y = Math.max(projectile.obj.y, GROUND_Y - 6);

      if (projectile.kind === 'bomb') {
        for (const barrack of this.barracks) {
          if (!barrack.open && Math.abs(barrack.x - x) < 54) barrack.openUp();
        }
        for (const tank of this.tanks) {
          if (tank.alive && Math.abs(tank.obj.x - x) < 44) {
            tank.die();
            this.explode(tank.obj.x, GROUND_Y - 10, false);
          }
        }
        for (const hostage of this.hostages) {
          if (hostage.state === 'free' && Math.abs(hostage.x - x) < 34) this.killHostage(hostage);
        }
      } else {
        for (const hostage of this.hostages) {
          if (hostage.state === 'free' && Math.abs(hostage.x - x) < 40) this.killHostage(hostage);
        }
        if (this.heli.alive && this.heli.landed && Math.abs(this.heli.obj.x - x) < 40) {
          this.destroyHeli('bomb');
        }
      }

      this.explode(x, y, false);
    }
  }

  private handleMineCollisions(): void {
    if (!this.heli.alive) return;
    for (const mine of this.mines) {
      if (!mine.alive) continue;
      if (Phaser.Math.Distance.Between(mine.obj.x, mine.obj.y, this.heli.obj.x, this.heli.obj.y) < 24) {
        mine.die();
        this.destroyHeli('mine');
        return;
      }
    }
  }

  private spawnEnemies(dt: number): void {
    if (this.rescued >= 1 && this.jets.length < 3) {
      this.jetTimer -= dt;
      if (this.jetTimer <= 0) {
        const fromLeft = Math.random() < 0.5;
        const y = Phaser.Math.Clamp(this.heli.obj.y, 70, GROUND_Y - 110);
        this.jets.push(new Jet(this, fromLeft, y));
        this.jetTimer = Math.max(2.4, 8 - this.rescued * 0.09);
      }
    }

    if (this.trips >= 2 && this.mines.length < 4) {
      this.mineTimer -= dt;
      if (this.mineTimer <= 0) {
        const left = Phaser.Math.Clamp(this.cameras.main.scrollX - 60, BATTLE_LEFT, BARRIER_X - 120);
        const x = Phaser.Math.Between(left, Math.min(left + GAME_W + 120, BARRIER_X - 40));
        const y = Phaser.Math.Between(110, 250);
        this.mines.push(new Mine(this, x, y));
        this.mineTimer = Math.max(3, 10 - this.rescued * 0.11);
      }
    }

    const aliveTanks = this.tanks.filter((t) => t.alive).length;
    const desiredTanks = Math.min(6, 4 + Math.floor(this.rescued / 16));
    if (aliveTanks < desiredTanks) {
      this.tankTimer -= dt;
      if (this.tankTimer <= 0) {
        this.tanks.push(new Tank(this, BARRIER_X - 50));
        this.tankTimer = 8;
      }
    }
  }

  private finishGame(win: boolean): void {
    if (this.finished) return;
    this.finished = true;
    audio.stopEngine();
    this.time.delayedCall(1100, () => {
      this.scene.stop('Hud');
      this.scene.start('GameOver', { rescued: this.rescued, killed: this.killed, win });
    });
  }
}
