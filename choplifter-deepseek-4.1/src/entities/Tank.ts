import Phaser from 'phaser';
import { BATTLE_LEFT, BARRIER_X, DEPTH, GROUND_Y, TANK } from '../config/constants';
import type { GameScene } from '../scenes/GameScene';

export class Tank {
  readonly obj: Phaser.GameObjects.Image;
  alive = true;
  private dir = 1;
  private fireCd: number;
  private readonly gs: GameScene;

  constructor(gs: GameScene, x: number) {
    this.gs = gs;
    this.fireCd = Phaser.Math.Between(700, TANK.fireCooldown);
    this.obj = gs.add.image(x, GROUND_Y, 'tank').setOrigin(0.5, 1).setDepth(DEPTH.tank);
  }

  update(dt: number): void {
    if (!this.alive) return;
    const heli = this.gs.heli;
    this.fireCd -= dt * 1000;

    const freeHostage = this.gs.nearestFreeHostage(this.obj.x, 340);
    // Tanks cannot cross the frontier, and they cannot reach into the post
    // office area either: the base stays safe from ground fire.
    const heliInBattle = heli.alive && !this.gs.respawning && heli.obj.x < BARRIER_X;
    const heliGrounded =
      heliInBattle && heli.landed && Math.abs(heli.obj.x - this.obj.x) <= TANK.range + 40;

    let targetX = this.obj.x;
    let mode: 'heli' | 'hostage' | 'barrack' = 'barrack';

    if (heliGrounded) {
      targetX = heli.obj.x;
      mode = 'heli';
    } else if (freeHostage) {
      targetX = freeHostage.x;
      mode = 'hostage';
    } else if (heliInBattle) {
      // Airborne and out of reach: shadow the chopper and wait for a landing.
      targetX = heli.obj.x;
      mode = 'heli';
    } else {
      // Chopper is at home and nothing is loose: drive to a sealed barrack and
      // blast it open to flush the hostages out.
      const barrack = this.gs.nearestIntactBarrack(this.obj.x, Number.POSITIVE_INFINITY);
      targetX = barrack ? barrack.x : this.gs.heli.obj.x;
      mode = 'barrack';
    }

    const dx = targetX - this.obj.x;
    if (Math.abs(dx) > 6) {
      this.dir = Math.sign(dx);
      this.obj.x += this.dir * TANK.speed * dt;
    }
    this.obj.x = Phaser.Math.Clamp(this.obj.x, BATTLE_LEFT, BARRIER_X - 26);
    this.obj.setFlipX(this.dir < 0);

    if (this.fireCd > 0) return;

    if (mode === 'heli' && heliGrounded && Math.abs(heli.obj.x - this.obj.x) < TANK.range) {
      const dir = Math.sign(heli.obj.x - this.obj.x) || this.dir;
      this.gs.spawnShell(this.obj.x + dir * 22, GROUND_Y - 9, dir);
      this.fireCd = TANK.fireCooldown;
    } else if (mode === 'hostage' && freeHostage && Math.abs(freeHostage.x - this.obj.x) < TANK.range) {
      const dir = Math.sign(freeHostage.x - this.obj.x) || this.dir;
      this.gs.spawnShell(this.obj.x + dir * 22, GROUND_Y - 9, dir);
      this.fireCd = TANK.fireCooldown;
    } else if (mode === 'barrack') {
      const barrack = this.gs.nearestIntactBarrack(this.obj.x, 200);
      if (barrack) {
        barrack.openUp();
        this.fireCd = TANK.fireCooldown * 1.6;
      }
    }
  }

  die(): void {
    if (!this.alive) return;
    this.alive = false;
    this.obj.destroy();
  }
}
