import Phaser from 'phaser';
import { GAME_H, GAME_W } from './config/constants';
import { audio } from './systems/audio';
import { input } from './systems/input';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { GameScene } from './scenes/GameScene';
import { HudScene } from './scenes/HudScene';
import { GameOverScene } from './scenes/GameOverScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W,
  height: GAME_H,
  backgroundColor: '#05070d',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, TitleScene, GameScene, HudScene, GameOverScene],
};

new Phaser.Game(config);

input.attachKeyboard();
input.attachTouch();
audio.setupGestureUnlock();

window.addEventListener('keydown', (event) => {
  if (event.key === 'm' || event.key === 'M') audio.toggleMute();
});
