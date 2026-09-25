import Phaser from 'phaser';
import { BOMB_GRAVITY, DEPTH, GROUND_Y, WORLD_W } from '../config/constants';

export type ProjectileKind = 'missile' | 'bomb' | 'shell' | 'jetMissile' | 'mineBomb';
export type ProjectileOwner = 'player' | 'enemy';

const TEXTURE: Record<ProjectileKind, string> = {
  missile: 'missile',
  bomb: 'bomb',
  shell: 'shell',
  jetMissile: 'missile',
  mineBomb: 'bomb',
};

export class Projectile {
  readonly kind: ProjectileKind;
  readonly owner: ProjectileOwner;
  readonly obj: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  life: number;
  dead = false;
  detonated = false;
  private readonly gravity: number;

  constructor(
    scene: Phaser.Scene,
    kind: ProjectileKind,
    owner: ProjectileOwner,
    x: number,
    y: number,
    vx: number,
    vy: number,
    life: number,
  ) {
    this.kind = kind;
    this.owner = owner;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.gravity = kind === 'bomb' || kind === 'mineBomb' ? BOMB_GRAVITY : 0;

    this.obj = scene.add
      .image(x, y, TEXTURE[kind])
      .setDepth(DEPTH.projectile)
      .setFlipX(vx < 0);

    if (kind === 'jetMissile') this.obj.setTint(0xff8a6a);
    if (kind === 'mineBomb') this.obj.setTint(0xffb0b0);
  }

  update(dt: number): void {
    if (this.dead) return;
    this.life -= dt;
    if (this.life <= 0) {
      this.destroy();
      return;
    }
    if (this.gravity > 0) this.vy += this.gravity * dt;
    this.obj.x += this.vx * dt;
    this.obj.y += this.vy * dt;

    if (this.kind === 'missile' || this.kind === 'shell' || this.kind === 'jetMissile') {
      if (this.obj.x < -30 || this.obj.x > WORLD_W + 30) this.destroy();
      else if (this.kind === 'shell' && this.obj.y > GROUND_Y - 2) this.destroy();
      else if (this.kind === 'jetMissile' && this.obj.y > GROUND_Y - 2) {
        this.detonated = true;
        this.destroy();
      }
    } else if (this.obj.y >= GROUND_Y - 3) {
      this.obj.y = GROUND_Y - 3;
      this.detonated = true;
      this.destroy();
    }
  }

  destroy(): void {
    if (this.dead) return;
    this.dead = true;
    this.obj.destroy();
  }
}
