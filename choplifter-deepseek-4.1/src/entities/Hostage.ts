import Phaser from 'phaser';
import { CHOPPER_CAPACITY, DEPTH, GROUND_Y, HOSTAGE, POST_X } from '../config/constants';
import type { GameScene } from '../scenes/GameScene';

export type HostageState = 'inside' | 'free' | 'aboard' | 'delivered' | 'dead' | 'done';

export class Hostage {
  state: HostageState = 'inside';
  readonly obj: Phaser.GameObjects.Sprite;
  readonly barrackIndex: number;
  private readonly gs: GameScene;
  private readonly barrackX: number;
  private dir = 1;
  private targetX: number;
  private wanderTimer = 0;
  private resting = false;

  constructor(gs: GameScene, barrackIndex: number, barrackX: number, x: number) {
    this.gs = gs;
    this.barrackIndex = barrackIndex;
    this.barrackX = barrackX;
    this.targetX = x;
    this.obj = gs.add
      .sprite(x, GROUND_Y, 'hostage-0')
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.hostage)
      .setVisible(false);
    this.obj.play('hostage-wave');
  }

  get x(): number {
    return this.obj.x;
  }

  release(): void {
    if (this.state !== 'inside') return;
    this.state = 'free';
    this.obj.setVisible(true);
    this.obj.setAlpha(1);
    this.obj.play('hostage-wave');
    this.wanderTimer = Phaser.Math.FloatBetween(0, 1.2);
  }

  board(): void {
    if (this.state !== 'free') return;
    this.state = 'aboard';
    this.obj.setVisible(false);
  }

  deliver(): void {
    if (this.state !== 'aboard') return;
    this.state = 'delivered';
    this.obj.setPosition(this.gs.heli.obj.x, GROUND_Y);
    this.obj.setVisible(true);
    this.obj.setAlpha(1).setAngle(0).clearTint();
    this.obj.play('hostage-wave');
  }

  kill(): boolean {
    if (this.state === 'dead' || this.state === 'done' || this.state === 'inside') return false;
    const wasAboard = this.state === 'aboard';
    this.state = 'dead';
    if (wasAboard) {
      this.obj.setVisible(false);
      return true;
    }
    this.obj.setVisible(true);
    this.obj.setPosition(this.obj.x, GROUND_Y);
    this.obj.stop();
    this.obj.setTint(0x8a2b2b);
    this.gs.tweens.add({
      targets: this.obj,
      angle: 90,
      alpha: 0,
      duration: 500,
      delay: 120,
      onComplete: () => {
        this.obj.setVisible(false);
        this.obj.clearTint();
      },
    });
    return true;
  }

  update(dt: number): void {
    if (this.state === 'free') {
      this.updateFree(dt);
    } else if (this.state === 'delivered') {
      this.moveToward(POST_X, HOSTAGE.runSpeed, dt);
      if (this.obj.x >= POST_X - 8) {
        this.obj.setVisible(false);
        this.state = 'done';
        return;
      }
    }
    this.obj.setFlipX(this.dir < 0);
  }

  private updateFree(dt: number): void {
    const heli = this.gs.heli;
    const heliX = heli.obj.x;
    const canBoard =
      heli.alive &&
      !this.gs.respawning &&
      heli.landed &&
      this.gs.aboardCount < CHOPPER_CAPACITY &&
      Math.abs(heliX - this.obj.x) < HOSTAGE.attractRange;

    if (canBoard) {
      this.moveToward(heliX, HOSTAGE.runSpeed, dt);
      if (Math.abs(heliX - this.obj.x) < HOSTAGE.boardRange) this.gs.boardHostage(this);
      return;
    }

    this.wanderTimer -= dt;
    if (this.wanderTimer <= 0) {
      this.wanderTimer = Phaser.Math.FloatBetween(0.9, 2.4);
      this.targetX = Phaser.Math.Clamp(
        this.barrackX + Phaser.Math.Between(-115, 115),
        40,
        this.barrackX + 150,
      );
      this.resting = Math.random() < 0.35;
    }
    if (!this.resting && Math.abs(this.targetX - this.obj.x) > 3) {
      this.moveToward(this.targetX, HOSTAGE.walkSpeed, dt);
    }
  }

  private moveToward(targetX: number, speed: number, dt: number): void {
    const dx = targetX - this.obj.x;
    if (Math.abs(dx) < 1) return;
    this.dir = Math.sign(dx);
    this.obj.x += this.dir * speed * dt;
  }
}
