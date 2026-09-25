import Phaser from 'phaser';
import { BARRIER_X, DEPTH, JET } from '../config/constants';
import type { GameScene } from '../scenes/GameScene';

export class Jet {
  readonly obj: Phaser.GameObjects.Image;
  alive = true;
  private vx: number;
  private missilesLeft = JET.missiles;
  private fireCd: number;
  private retreat = false;
  private retreatT = 0;
  private readonly gs: GameScene;

  constructor(gs: GameScene, fromLeft: boolean, y: number) {
    this.gs = gs;
    this.vx = fromLeft ? JET.speed : -JET.speed;
    this.fireCd = 600;
    const x = fromLeft ? 20 : BARRIER_X - 20;
    this.obj = gs.add.image(x, y, 'jet').setOrigin(0.5, 0.5).setDepth(DEPTH.jet);
    this.obj.setFlipX(this.vx < 0);
  }

  update(dt: number): void {
    if (!this.alive) return;
    this.obj.x += this.vx * dt;

    if (this.retreat) {
      this.retreatT -= dt;
      if (this.retreatT <= 0) {
        this.despawn();
        return;
      }
    } else {
      if (this.obj.x < 24) {
        this.obj.x = 24;
        this.vx = Math.abs(this.vx);
      } else if (this.obj.x > BARRIER_X - 24) {
        this.obj.x = BARRIER_X - 24;
        this.vx = -Math.abs(this.vx);
      }
    }
    this.obj.setFlipX(this.vx < 0);

    this.fireCd -= dt * 1000;
    const heli = this.gs.heli;
    // Faithful to the 1982 manual: jets cannot cross the frontier into home
    // territory, and they only strafe a grounded chopper in the later rounds.
    const strafesGround = this.gs.rescued >= 32;
    const targetable =
      heli.alive &&
      !this.gs.respawning &&
      heli.obj.x < BARRIER_X &&
      (!heli.landed || strafesGround);
    if (
      this.missilesLeft > 0 &&
      this.fireCd <= 0 &&
      targetable &&
      Math.abs(heli.obj.x - this.obj.x) < JET.range
    ) {
      this.gs.spawnJetMissile(this.obj.x, this.obj.y, heli.obj.x, heli.obj.y);
      this.missilesLeft -= 1;
      this.fireCd = JET.fireCooldown;
      if (this.missilesLeft <= 0) {
        this.retreat = true;
        this.retreatT = 1.4;
      }
    } else if (this.missilesLeft <= 0 && !this.retreat) {
      this.retreat = true;
      this.retreatT = 1.4;
    }
  }

  die(): void {
    if (!this.alive) return;
    this.alive = false;
    this.obj.destroy();
  }

  private despawn(): void {
    this.alive = false;
    this.obj.destroy();
  }
}
