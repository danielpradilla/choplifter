import Phaser from 'phaser';
import { generateTextures } from '../systems/textures';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    generateTextures(this);

    if (!this.anims.exists('hostage-wave')) {
      this.anims.create({
        key: 'hostage-wave',
        frames: [{ key: 'hostage-0' }, { key: 'hostage-1' }],
        frameRate: 5,
        repeat: -1,
      });
    }

    this.scene.start('Title');
  }
}
