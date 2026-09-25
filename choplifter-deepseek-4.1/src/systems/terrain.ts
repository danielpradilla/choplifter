import Phaser from 'phaser';
import {
  BARRIER_X,
  DEPTH,
  GAME_H,
  GAME_W,
  GROUND_Y,
  HELIPAD_X,
  POST_X,
  WORLD_W,
} from '../config/constants';

export type Terrain = {
  update(scrollX: number): void;
};

export function createTerrain(scene: Phaser.Scene): Terrain {
  scene.add
    .image(0, 0, 'sky')
    .setOrigin(0, 0)
    .setScrollFactor(0)
    .setDepth(DEPTH.sky);

  const far = scene.add
    .tileSprite(0, GROUND_Y - 150, GAME_W, 150, 'mountains-far')
    .setOrigin(0, 0)
    .setScrollFactor(0)
    .setDepth(DEPTH.mountainsFar);

  const near = scene.add
    .tileSprite(0, GROUND_Y - 110, GAME_W, 110, 'mountains-near')
    .setOrigin(0, 0)
    .setScrollFactor(0)
    .setDepth(DEPTH.mountainsNear);

  scene.add
    .tileSprite(0, GROUND_Y, WORLD_W, GAME_H - GROUND_Y, 'ground')
    .setOrigin(0, 0)
    .setDepth(DEPTH.ground);

  scene.add
    .image(HELIPAD_X, GROUND_Y, 'helipad')
    .setOrigin(0.5, 1)
    .setDepth(DEPTH.decal);

  scene.add
    .image(POST_X, GROUND_Y, 'postoffice')
    .setOrigin(0.5, 1)
    .setDepth(DEPTH.decal);

  scene.add
    .text(POST_X, GROUND_Y - 132, 'U.S. POST OFFICE', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#e8ddc0',
    })
    .setOrigin(0.5, 1)
    .setDepth(DEPTH.decal);

  const barrier = scene.add.graphics().setDepth(DEPTH.decal);
  barrier.fillStyle(0x39506f, 0.55);
  for (let y = GROUND_Y - 132; y < GROUND_Y - 6; y += 14) {
    barrier.fillRect(BARRIER_X - 1, y, 2, 8);
  }
  barrier.fillStyle(0x4a6a94, 0.8);
  barrier.fillRect(BARRIER_X - 2, GROUND_Y - 138, 4, 8);
  barrier.fillStyle(0x6f8fb8, 0.9);
  barrier.fillRect(BARRIER_X - 16, GROUND_Y - 140, 32, 3);

  scene.add
    .text(BARRIER_X, GROUND_Y - 146, 'FRONTIER', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#6f8fb8',
    })
    .setOrigin(0.5, 1)
    .setDepth(DEPTH.decal);

  return {
    update(scrollX: number) {
      far.tilePositionX = scrollX * 0.25;
      near.tilePositionX = scrollX * 0.45;
    },
  };
}
