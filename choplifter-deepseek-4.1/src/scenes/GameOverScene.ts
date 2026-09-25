import Phaser from 'phaser';
import { DEPTH, GAME_H, GAME_W, GROUND_Y, POST_X, TOTAL_HOSTAGES } from '../config/constants';
import { input } from '../systems/input';

const RATINGS: [number, string][] = [
  [64, 'PERFECT MISSION — EVERY DELEGATE SAVED'],
  [48, 'OUTSTANDING — A TRUE HERO OF THE REPUBLIC'],
  [33, 'GOOD — MOST OF THE HOSTAGES MADE IT HOME'],
  [17, 'FAIR — HALF THE DELEGATION RECOVERED'],
  [1, 'POOR — TOO MANY LIVES LOST'],
  [0, 'TOTAL FAILURE'],
];

export class GameOverScene extends Phaser.Scene {
  private rescued = 0;
  private killed = 0;
  private win = false;
  private restarted = false;

  constructor() {
    super('GameOver');
  }

  init(data: { rescued?: number; killed?: number; win?: boolean }): void {
    this.rescued = data.rescued ?? 0;
    this.killed = data.killed ?? 0;
    this.win = Boolean(data.win);
    this.restarted = false;
  }

  create(): void {
    this.scene.stop('Hud');

    this.add.image(0, 0, 'sky').setOrigin(0, 0).setDepth(DEPTH.sky);
    this.add
      .tileSprite(0, GROUND_Y, GAME_W, GAME_H - GROUND_Y, 'ground')
      .setOrigin(0, 0)
      .setDepth(DEPTH.ground);
    this.add.image(POST_X, GROUND_Y, 'postoffice').setOrigin(0.5, 1).setDepth(DEPTH.decal);

    this.add
      .text(GAME_W / 2, 96, this.win ? 'MISSION ACCOMPLISHED' : 'MISSION FAILED', {
        fontFamily: 'monospace',
        fontSize: '40px',
        color: this.win ? '#8ff0b0' : '#ff8f8f',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setShadow(0, 4, '#0a1020', 8, true, true);

    const rating = RATINGS.find(([threshold]) => this.rescued >= threshold)?.[1] ?? RATINGS[RATINGS.length - 1][1];

    const summary = [
      `HOSTAGES RESCUED   ${this.rescued} / ${TOTAL_HOSTAGES}`,
      `HOSTAGES LOST      ${this.killed}`,
      '',
      rating,
    ].join('\n');

    this.add
      .text(GAME_W / 2, 240, summary, {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#cfe3ff',
        align: 'center',
        lineSpacing: 6,
      })
      .setOrigin(0.5);

    const prompt = this.add
      .text(GAME_W / 2, 430, 'PRESS ENTER OR TAP TO FLY AGAIN', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#ffe08a',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.25, duration: 700, yoyo: true, repeat: -1 });

    this.input.keyboard?.on('keydown-ENTER', () => this.restart());
    this.input.keyboard?.on('keydown-SPACE', () => this.restart());
    this.input.once('pointerdown', () => this.restart());
  }

  private restart(): void {
    if (this.restarted) return;
    this.restarted = true;
    input.clear();
    this.scene.start('Game');
  }
}
