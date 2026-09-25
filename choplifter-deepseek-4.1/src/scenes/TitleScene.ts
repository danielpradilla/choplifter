import Phaser from 'phaser';
import {
  BARRIER_X,
  DEPTH,
  GAME_H,
  GAME_W,
  GROUND_Y,
  HELIPAD_X,
  POST_X,
} from '../config/constants';
import { input } from '../systems/input';
import { audio } from '../systems/audio';

export class TitleScene extends Phaser.Scene {
  private started = false;

  constructor() {
    super('Title');
  }

  create(): void {
    this.started = false;

    this.add.image(0, 0, 'sky').setOrigin(0, 0).setDepth(DEPTH.sky);
    this.add
      .tileSprite(0, GROUND_Y - 150, GAME_W, 150, 'mountains-far')
      .setOrigin(0, 0)
      .setDepth(DEPTH.mountainsFar);
    this.add
      .tileSprite(0, GROUND_Y - 110, GAME_W, 110, 'mountains-near')
      .setOrigin(0, 0)
      .setDepth(DEPTH.mountainsNear);
    this.add
      .tileSprite(0, GROUND_Y, GAME_W, GAME_H - GROUND_Y, 'ground')
      .setOrigin(0, 0)
      .setDepth(DEPTH.ground);

    this.add.image(HELIPAD_X, GROUND_Y, 'helipad').setOrigin(0.5, 1).setDepth(DEPTH.decal);
    this.add.image(POST_X, GROUND_Y, 'postoffice').setOrigin(0.5, 1).setDepth(DEPTH.decal);

    const barrier = this.add.graphics().setDepth(DEPTH.decal);
    barrier.fillStyle(0x39506f, 0.55);
    for (let y = GROUND_Y - 132; y < GROUND_Y - 6; y += 14) barrier.fillRect(BARRIER_X - 1, y, 2, 8);

    for (let i = 0; i < 5; i += 1) {
      const wavers = this.add
        .sprite(180 + i * 34, GROUND_Y, 'hostage-0')
        .setOrigin(0.5, 1)
        .setDepth(DEPTH.hostage);
      wavers.play('hostage-wave');
      wavers.setFlipX(i % 2 === 0);
    }

    const heli = this.add.sprite(GAME_W * 0.5, 250, 'heli-side').setDepth(DEPTH.heli);
    this.tweens.add({
      targets: heli,
      y: 232,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    this.add
      .text(GAME_W / 2, 96, 'CHOPLIFTER', {
        fontFamily: 'monospace',
        fontSize: '64px',
        color: '#f2f6ff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setShadow(0, 4, '#0a1020', 8, true, true);

    this.add
      .text(GAME_W / 2, 140, 'WEB CLONE  ·  BRODERBUND 1982', {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#8fb4e6',
      })
      .setOrigin(0.5);

    const help = [
      'RESCUE 64 HOSTAGES AND RETURN THEM TO THE POST OFFICE',
      '',
      'ARROWS / WASD  MOVE + THRUST      SPACE / J  FIRE',
      'SHIFT / K  ROTATE  (SIDE = MISSILE, FRONT = BOMB)',
      'P / ESC  PAUSE      M  MUTE',
      '',
      'DO NOT LAND ON HOSTAGES — OR CRASH INTO THE GROUND',
    ].join('\n');

    this.add
      .text(GAME_W / 2, 380, help, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#cfe3ff',
        align: 'center',
        lineSpacing: 4,
      })
      .setOrigin(0.5);

    const prompt = this.add
      .text(GAME_W / 2, 486, 'PRESS ENTER OR TAP TO FLY', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#ffe08a',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.25, duration: 700, yoyo: true, repeat: -1 });

    this.add
      .text(GAME_W / 2, GAME_H - 10, 'original-art tribute · not affiliated with Broderbund', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#5f7a9e',
      })
      .setOrigin(0.5);

    this.input.keyboard?.on('keydown-ENTER', () => this.begin());
    this.input.keyboard?.on('keydown-SPACE', () => this.begin());
    this.input.once('pointerdown', () => this.begin());
  }

  private begin(): void {
    if (this.started) return;
    this.started = true;
    input.clear();
    audio.setupGestureUnlock();
    this.scene.start('Game');
  }
}
