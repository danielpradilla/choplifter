import Phaser from 'phaser';
import {
  DEPTH,
  FACING_CYCLE,
  GROUND_Y,
  HELI,
  WORLD_W,
  type Facing,
} from '../config/constants';
import { input } from '../systems/input';
import { audio } from '../systems/audio';
import type { GameScene } from '../scenes/GameScene';

export class Helicopter {
  readonly obj: Phaser.GameObjects.Sprite;
  facing: Facing = 'right';
  rotStep = 0;
  vy = 0;
  landed = true;
  alive = true;
  justLanded = false;
  private fireCd = 0;
  private readonly gs: GameScene;

  constructor(gs: GameScene, x: number, y: number) {
    this.gs = gs;
    this.obj = gs.add
      .sprite(x, y, 'heli-side')
      .setOrigin(0.5, 0.5)
      .setDepth(DEPTH.heli);
  }

  reset(x: number, y: number): void {
    this.facing = 'right';
    this.rotStep = 0;
    this.vy = 0;
    this.landed = true;
    this.alive = true;
    this.justLanded = false;
    this.fireCd = 0;
    this.obj.setTexture('heli-side');
    this.obj.setFlipX(false);
    this.obj.setAngle(0);
    this.obj.setPosition(x, y);
    this.obj.setVisible(true);
  }

  update(dt: number): void {
    this.justLanded = false;

    if (input.consumeRotate()) {
      this.rotStep = (this.rotStep + 1) % FACING_CYCLE.length;
      this.facing = FACING_CYCLE[this.rotStep];
      if (this.facing === 'front') {
        this.obj.setTexture('heli-front');
        this.obj.setFlipX(false);
      } else {
        this.obj.setTexture('heli-side');
        this.obj.setFlipX(this.facing === 'left');
      }
      audio.board();
    }

    let vx = 0;
    if (input.isDown('left')) vx -= HELI.speedX;
    if (input.isDown('right')) vx += HELI.speedX;
    this.obj.x = Phaser.Math.Clamp(this.obj.x + vx * dt, HELI.halfW, WORLD_W - HELI.halfW);

    if (input.isDown('up')) this.vy -= HELI.thrust * dt;
    if (input.isDown('down')) this.vy += HELI.dive * dt;
    this.vy += HELI.gravity * dt;
    this.vy = Phaser.Math.Clamp(this.vy, -HELI.maxRise, HELI.maxFall);
    this.obj.y += this.vy * dt;
    if (this.obj.y < 40) {
      this.obj.y = 40;
      this.vy = Math.max(this.vy, 0);
    }

    const bottom = this.obj.y + HELI.halfH;
    if (bottom >= GROUND_Y) {
      const impact = this.vy;
      this.obj.y = GROUND_Y - HELI.halfH;
      if (impact > HELI.crashVy) {
        this.gs.destroyHeli('crash');
        return;
      }
      if (!this.landed) this.justLanded = true;
      this.landed = true;
      this.vy = 0;
    } else {
      this.landed = false;
    }

    const targetAngle = this.landed ? 0 : Phaser.Math.Clamp((vx / HELI.speedX) * 7, -8, 8);
    this.obj.angle = Phaser.Math.Linear(this.obj.angle, targetAngle, 0.15);

    this.fireCd -= dt * 1000;
    const wantsFire = input.consumeFire() || input.isDown('fire');
    if (wantsFire && this.fireCd <= 0) {
      this.fire();
      this.fireCd = HELI.fireCooldown;
    }

    const load = Phaser.Math.Clamp(Math.abs(this.vy) / HELI.maxFall + (input.isDown('up') ? 0.5 : 0), 0, 1);
    audio.setEngineLoad(load);
  }

  fire(): void {
    const x = this.obj.x;
    const y = this.obj.y;
    if (this.facing === 'front') {
      this.gs.spawnBomb(x, y + 18);
      audio.bomb();
    } else {
      const dir = this.facing === 'right' ? 1 : -1;
      this.gs.spawnMissile(x + dir * 46, y, this.facing);
      audio.fire();
    }
  }
}
