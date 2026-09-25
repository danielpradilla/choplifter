import Phaser from 'phaser';
import { DEPTH, GROUND_Y } from '../config/constants';
import type { GameScene } from '../scenes/GameScene';
import type { Hostage } from './Hostage';

export class Barracks {
  readonly index: number;
  readonly x: number;
  readonly hostages: Hostage[] = [];
  open: boolean;
  readonly obj: Phaser.GameObjects.Image;
  private readonly gs: GameScene;
  private fire: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  constructor(gs: GameScene, index: number, x: number, open: boolean) {
    this.gs = gs;
    this.index = index;
    this.x = x;
    this.open = open;
    this.obj = gs.add
      .image(x, GROUND_Y, open ? 'barracks-broken' : 'barracks')
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.barrack);
    if (open) this.startFire();
  }

  private startFire(): void {
    if (this.fire) return;
    this.fire = this.gs.add
      .particles(this.x, GROUND_Y - 62, 'spark', {
        x: { min: -36, max: 36 },
        speedY: { min: -78, max: -22 },
        speedX: { min: -14, max: 14 },
        lifespan: { min: 420, max: 950 },
        scale: { start: 1.15, end: 0 },
        alpha: { start: 0.9, end: 0 },
        tint: [0xffe08a, 0xffb347, 0xff7a1a, 0xff3d1a],
        frequency: 55,
      })
      .setDepth(DEPTH.barrack + 1);
  }

  openUp(): void {
    if (this.open) return;
    this.open = true;
    this.obj.setTexture('barracks-broken');
    this.startFire();
    this.gs.releaseBarrack(this.index);
  }
}
