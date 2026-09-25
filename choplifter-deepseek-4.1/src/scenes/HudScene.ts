import Phaser from 'phaser';
import {
  CHOPPER_CAPACITY,
  GAME_H,
  GAME_W,
  REG,
  START_LIVES,
  TOTAL_HOSTAGES,
} from '../config/constants';
import { audio } from '../systems/audio';

const LABEL = { fontFamily: 'monospace', fontSize: '11px', color: '#7f97bd' };
const VALUE = { fontFamily: 'monospace', fontSize: '19px', color: '#eaf2ff', fontStyle: 'bold' };

export class HudScene extends Phaser.Scene {
  private killedValue!: Phaser.GameObjects.Text;
  private aboardValue!: Phaser.GameObjects.Text;
  private rescuedValue!: Phaser.GameObjects.Text;
  private muteText!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Text;
  private pauseGroup!: Phaser.GameObjects.Container;
  private livesIcons: Phaser.GameObjects.Image[] = [];
  private bannerT = 0;
  private last = { killed: -1, aboard: -1, rescued: -1, lives: -1, paused: false, muted: audio.muted };

  constructor() {
    super('Hud');
  }

  create(): void {
    this.livesIcons = [];

    const bar = this.add.graphics().setDepth(10);
    bar.fillStyle(0x04060c, 0.7);
    bar.fillRect(0, 0, GAME_W, 38);
    bar.lineStyle(1, 0x2f4a78, 0.9);
    bar.lineBetween(0, 38, GAME_W, 38);

    this.add.rectangle(26, 19, 13, 13, 0xd23b3b).setDepth(11);
    this.add.text(40, 5, 'LOST', LABEL).setDepth(11);
    this.killedValue = this.add.text(40, 17, '0', VALUE).setDepth(11);

    this.add.rectangle(176, 19, 13, 13, 0x3b7bd2).setDepth(11);
    this.add.text(190, 5, 'ABOARD', LABEL).setDepth(11);
    this.aboardValue = this.add
      .text(190, 17, `0/${CHOPPER_CAPACITY}`, VALUE)
      .setDepth(11);

    this.add.rectangle(354, 19, 13, 13, 0x3fd27a).setDepth(11);
    this.add.text(368, 5, 'RESCUED', LABEL).setDepth(11);
    this.rescuedValue = this.add
      .text(368, 17, `0/${TOTAL_HOSTAGES}`, VALUE)
      .setDepth(11);

    this.add.text(GAME_W - 296, 5, 'CHOPPERS', LABEL).setDepth(11);
    for (let i = 0; i < START_LIVES; i += 1) {
      const icon = this.add
        .image(GAME_W - 216 + i * 40, 21, 'heli-side')
        .setScale(0.46)
        .setDepth(11);
      this.livesIcons.push(icon);
    }

    this.muteText = this.add
      .text(GAME_W - 12, 5, audio.muted ? 'MUTED (M)' : 'SOUND (M)', LABEL)
      .setOrigin(1, 0)
      .setDepth(11);

    this.banner = this.add
      .text(GAME_W / 2, 86, '', {
        fontFamily: 'monospace',
        fontSize: '23px',
        color: '#ffe08a',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(12)
      .setAlpha(0);

    const dim = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x02040a, 0.62);
    const pausedText = this.add
      .text(GAME_W / 2, GAME_H / 2, 'PAUSED\n\nPRESS P TO RESUME', {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#eaf2ff',
        align: 'center',
      })
      .setOrigin(0.5);
    this.pauseGroup = this.add.container(0, 0, [dim, pausedText]).setVisible(false);

    const onBanner = (text: string) => {
      this.banner.setText(text).setAlpha(1);
      this.bannerT = 2.6;
    };
    this.game.events.on('banner', onBanner);
    this.events.once('shutdown', () => this.game.events.off('banner', onBanner));
  }

  update(_time: number, delta: number): void {
    const killed = (this.registry.get(REG.killed) as number) ?? 0;
    const aboard = (this.registry.get(REG.aboard) as number) ?? 0;
    const rescued = (this.registry.get(REG.rescued) as number) ?? 0;
    const lives = (this.registry.get(REG.lives) as number) ?? 0;
    const paused = Boolean(this.registry.get(REG.paused));

    if (killed !== this.last.killed) {
      this.killedValue.setText(String(killed));
      this.last.killed = killed;
    }
    if (aboard !== this.last.aboard) {
      this.aboardValue.setText(`${aboard}/${CHOPPER_CAPACITY}`);
      this.last.aboard = aboard;
    }
    if (rescued !== this.last.rescued) {
      this.rescuedValue.setText(`${rescued}/${TOTAL_HOSTAGES}`);
      this.last.rescued = rescued;
    }
    if (lives !== this.last.lives) {
      this.livesIcons.forEach((icon, i) => icon.setAlpha(i < lives ? 1 : 0.18));
      this.last.lives = lives;
    }
    if (paused !== this.last.paused) {
      this.pauseGroup.setVisible(paused);
      this.last.paused = paused;
    }
    if (audio.muted !== this.last.muted) {
      this.muteText.setText(audio.muted ? 'MUTED (M)' : 'SOUND (M)');
      this.last.muted = audio.muted;
    }

    if (this.bannerT > 0) {
      this.bannerT -= delta / 1000;
      this.banner.setAlpha(this.bannerT < 0.6 ? Math.max(0, this.bannerT / 0.6) : 1);
      if (this.bannerT <= 0) this.banner.setAlpha(0);
    }
  }
}
