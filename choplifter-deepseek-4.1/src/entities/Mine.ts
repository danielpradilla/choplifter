import Phaser from 'phaser';
import { DEPTH, GROUND_Y, MINE, WORLD_W } from '../config/constants';
import type { GameScene } from '../scenes/GameScene';

export class Mine {
  readonly obj: Phaser.GameObjects.Image;
  alive = true;
  private vx = 0;
  private vy = 0;
  private bombCd: number;
  private bob = 0;
  private readonly gs: GameScene;

  constructor(gs: GameScene, x: number, y: number) {
    this.gs = gs;
    this.bombCd = MINE.bombCooldown;
    this.obj = gs.add.image(x, y, 'mine').setOrigin(0.5, 0.5).setDepth(DEPTH.mine);
  }

  update(dt: number): void {
    if (!this.alive) return;
    const heli = this.gs.heli;
    const aggressive = this.gs.aggressive;
    this.bob += dt;

    if (heli.alive && !this.gs.respawning) {
      const dx = heli.obj.x - this.obj.x;
      const dy = heli.obj.y - this.obj.y;
      const dist = Math.hypot(dx, dy) || 1;
      const accel = MINE.accel * (aggressive ? 1.3 : 1);
      this.vx += (dx / dist) * accel * dt;
      this.vy += (dy / dist) * accel * dt;
      const maxSpeed = aggressive ? MINE.aggressiveMaxSpeed : MINE.maxSpeed;
      const speed = Math.hypot(this.vx, this.vy);
      if (speed > maxSpeed) {
        this.vx = (this.vx / speed) * maxSpeed;
        this.vy = (this.vy / speed) * maxSpeed;
      }
    } else {
      this.vx *= 0.97;
      this.vy *= 0.97;
    }

    this.obj.x = Phaser.Math.Clamp(this.obj.x + this.vx * dt, 20, WORLD_W - 40);
    this.obj.y = Phaser.Math.Clamp(
      this.obj.y + this.vy * dt + Math.sin(this.bob * 3) * 0.2,
      40,
      GROUND_Y - 30,
    );

    this.bombCd -= dt * 1000;
    if (aggressive && this.bombCd <= 0) {
      const target = this.gs.nearestFreeHostage(this.obj.x, MINE.bombRange);
      if (target) {
        this.gs.spawnMineBomb(this.obj.x, this.obj.y + 14);
        this.bombCd = MINE.bombCooldown;
      } else {
        this.bombCd = 700;
      }
    }
  }

  die(): void {
    if (!this.alive) return;
    this.alive = false;
    this.obj.destroy();
  }
}
