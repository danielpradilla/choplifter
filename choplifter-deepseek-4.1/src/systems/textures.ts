import Phaser from 'phaser';
import { GAME_H, GAME_W, GROUND_Y } from '../config/constants';

const C = {
  heliWhite: 0xf2f6ff,
  heliMid: 0xa9b8d4,
  heliDark: 0x39435c,
  glass: 0x2a4a7a,
  metal: 0x2b3346,
  stripe: 0xd23b3b,

  skin: 0xffd9a0,
  shirt: 0xe2574f,
  pants: 0x2f4a7a,

  tankBody: 0x6f7c4a,
  tankLight: 0x7d8a55,
  tankDark: 0x39432a,
  tread: 0x2b3320,
  wheel: 0x1e2415,

  jet: 0xc8d3e6,
  jetDark: 0xa9b8d4,
  flame: 0xffb347,

  mine: 0xb03a3a,
  mineDark: 0x6d2222,

  wall: 0x8a8f7a,
  wallDark: 0x6b705c,
  roof: 0x5e6350,
  door: 0x2b2f24,
  window: 0x3a4a63,

  postWall: 0xc9b28a,
  postWallDark: 0xac9571,
  postRoof: 0x8a5a3a,

  fire1: 0xff7a1a,
  fire2: 0xffc24d,
  fire3: 0xff3d1a,

  grass: 0x2f6b32,
  grassLight: 0x3f8a3f,
  grassTuft: 0x4da14a,
  dirt: 0x5a3d22,
  dirtDark: 0x412a15,

  mtnFar: 0x0e1930,
  mtnNear: 0x16263f,

  white: 0xffffff,
};

type DrawFn = (g: Phaser.GameObjects.Graphics) => void;

function tex(scene: Phaser.Scene, key: string, w: number, h: number, draw: DrawFn): void {
  if (scene.textures.exists(key)) return;
  const g = scene.add.graphics();
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

function heliSide(g: Phaser.GameObjects.Graphics): void {
  // landing skids
  g.fillStyle(C.metal, 1);
  g.fillRect(19, 34, 49, 3);
  g.fillRect(24, 28, 3, 7);
  g.fillRect(59, 28, 3, 7);
  // tail boom and fin
  g.fillStyle(C.heliMid, 1);
  g.fillRect(1, 15, 27, 5);
  g.fillRect(0, 8, 4, 14);
  // tail rotor
  g.fillStyle(C.heliDark, 1);
  g.fillRect(0, 14, 9, 3);
  // fuselage
  g.fillStyle(C.heliWhite, 1);
  g.fillRect(23, 11, 36, 18);
  g.fillRect(54, 15, 9, 11);
  // stripe
  g.fillStyle(C.stripe, 1);
  g.fillRect(23, 23, 36, 3);
  // canopy
  g.fillStyle(C.glass, 1);
  g.fillRect(50, 12, 12, 9);
  // nose light
  g.fillStyle(C.fire2, 1);
  g.fillRect(62, 18, 3, 3);
  // rotor mast and blade
  g.fillStyle(C.heliDark, 1);
  g.fillRect(39, 5, 4, 7);
  g.fillStyle(C.heliMid, 0.95);
  g.fillRect(4, 1, 78, 3);
  g.fillStyle(C.white, 0.5);
  g.fillRect(4, 1, 78, 1);
}

function heliFront(g: Phaser.GameObjects.Graphics): void {
  // rotor
  g.fillStyle(C.heliMid, 0.95);
  g.fillRect(0, 7, 54, 4);
  g.fillStyle(C.white, 0.5);
  g.fillRect(0, 7, 54, 1);
  // hub
  g.fillStyle(C.heliDark, 1);
  g.fillRect(24, 4, 5, 9);
  // stub wings
  g.fillStyle(C.heliMid, 1);
  g.fillRect(4, 23, 15, 5);
  g.fillRect(35, 23, 15, 5);
  // fuselage
  g.fillStyle(C.heliWhite, 1);
  g.fillRect(16, 15, 22, 23);
  // canopy
  g.fillStyle(C.glass, 1);
  g.fillRect(19, 16, 16, 12);
  // stripe
  g.fillStyle(C.stripe, 1);
  g.fillRect(16, 30, 22, 3);
  // chin guns
  g.fillStyle(C.heliDark, 1);
  g.fillRect(22, 38, 3, 5);
  g.fillRect(30, 38, 3, 5);
  // skids
  g.fillStyle(C.metal, 1);
  g.fillRect(7, 42, 15, 3);
  g.fillRect(32, 42, 15, 3);
}

function hostageBase(g: Phaser.GameObjects.Graphics, armsUp: boolean): void {
  g.fillStyle(C.skin, 1);
  g.fillCircle(5, 3.5, 2.5);
  g.fillStyle(C.shirt, 1);
  g.fillRect(3, 6, 4, 6);
  g.fillStyle(C.pants, 1);
  g.fillRect(3, 12, 4, 4);
  g.fillStyle(C.skin, 1);
  if (armsUp) {
    g.fillRect(1, 3, 2, 5);
    g.fillRect(7, 3, 2, 5);
  } else {
    g.fillRect(1, 7, 2, 5);
    g.fillRect(7, 7, 2, 5);
  }
}

function tank(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(C.tread, 1);
  g.fillRect(1, 13, 38, 7);
  g.fillStyle(C.tankDark, 1);
  g.fillRect(2, 14, 36, 2);
  g.fillStyle(C.wheel, 1);
  [6, 15, 24, 33].forEach((x) => g.fillCircle(x, 17, 3));
  g.fillStyle(C.tankBody, 1);
  g.fillRect(4, 6, 32, 8);
  g.fillStyle(C.tankDark, 1);
  g.fillRect(4, 12, 32, 2);
  g.fillStyle(C.tankLight, 1);
  g.fillRect(13, 1, 15, 7);
  g.fillStyle(C.tankDark, 1);
  g.fillRect(26, 3, 14, 3);
  g.fillStyle(C.metal, 1);
  g.fillRect(13, 0, 2, 3);
}

function jet(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(C.flame, 1);
  g.fillRect(0, 6, 6, 4);
  g.fillRect(2, 5, 4, 6);
  g.fillStyle(C.jet, 1);
  g.fillRect(4, 6, 30, 5);
  g.fillStyle(C.white, 1);
  g.fillRect(33, 7, 9, 3);
  g.fillStyle(C.jetDark, 1);
  g.fillRect(11, 1, 13, 4);
  g.fillRect(11, 12, 13, 4);
  g.fillRect(2, 1, 5, 9);
  g.fillStyle(C.glass, 1);
  g.fillRect(27, 5, 6, 3);
}

function mine(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(C.mineDark, 1);
  g.fillRect(9, 0, 4, 5);
  g.fillRect(9, 17, 4, 5);
  g.fillRect(0, 9, 5, 4);
  g.fillRect(17, 9, 5, 4);
  g.fillRect(3, 3, 4, 4);
  g.fillRect(15, 3, 4, 4);
  g.fillRect(3, 15, 4, 4);
  g.fillRect(15, 15, 4, 4);
  g.fillStyle(C.mine, 1);
  g.fillCircle(11, 11, 8);
  g.fillStyle(0xffe08a, 1);
  g.fillCircle(11, 11, 3.5);
  g.fillStyle(0x3a1010, 1);
  g.fillCircle(11, 11, 1.6);
}

function barracks(g: Phaser.GameObjects.Graphics, broken: boolean): void {
  g.fillStyle(C.roof, 1);
  g.fillTriangle(2, 26, 102, 26, 52, 2);
  g.fillRect(0, 24, 104, 7);
  g.fillStyle(C.wall, 1);
  g.fillRect(6, 31, 92, 53);
  g.fillStyle(C.wallDark, 1);
  g.fillRect(6, 31, 6, 53);
  g.fillStyle(C.window, 1);
  g.fillRect(14, 40, 14, 12);
  g.fillRect(76, 40, 14, 12);
  g.fillStyle(C.door, 1);
  g.fillRect(44, 56, 18, 28);

  if (broken) {
    g.fillStyle(0x14140f, 1);
    g.fillRect(26, 48, 52, 36);
    g.fillStyle(C.fire3, 1);
    g.fillRect(26, 48, 52, 5);
    g.fillStyle(C.fire1, 1);
    g.fillRect(30, 46, 44, 6);
    g.fillStyle(C.fire2, 1);
    g.fillRect(38, 44, 12, 5);
    g.fillRect(58, 45, 10, 4);
    g.fillStyle(C.wallDark, 1);
    g.fillRect(24, 46, 4, 6);
    g.fillRect(76, 47, 4, 5);
  } else {
    g.fillStyle(C.wallDark, 1);
    g.fillRect(44, 53, 18, 3);
  }
}

function postOffice(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(C.postRoof, 1);
  g.fillTriangle(4, 34, 96, 34, 50, 4);
  g.fillRect(0, 32, 100, 7);
  g.fillStyle(C.postWall, 1);
  g.fillRect(8, 39, 84, 77);
  g.fillStyle(C.postWallDark, 1);
  g.fillRect(8, 39, 7, 77);
  g.fillStyle(C.window, 1);
  g.fillRect(16, 60, 15, 15);
  g.fillRect(69, 60, 15, 15);
  g.fillStyle(C.door, 1);
  g.fillRect(40, 80, 20, 36);
  g.fillStyle(C.fire2, 1);
  g.fillRect(58, 96, 2, 2);
  g.fillStyle(0xe8ddc0, 1);
  g.fillRect(14, 46, 72, 12);
  g.fillStyle(0x8a5a3a, 1);
  g.fillRect(14, 46, 72, 2);
  g.fillRect(14, 56, 72, 2);
}

function helipad(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(0x2a3040, 1);
  g.fillRect(0, 8, 140, 12);
  g.fillStyle(0x39435c, 1);
  g.fillRect(0, 8, 140, 3);
  g.fillStyle(0xdfe9ff, 1);
  for (let x = 4; x < 136; x += 16) g.fillRect(x, 16, 8, 3);
  g.fillRect(62, 10, 4, 9);
  g.fillRect(74, 10, 4, 9);
  g.fillRect(66, 13, 8, 3);
}

function missile(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(C.fire1, 0.95);
  g.fillRect(0, 1, 4, 3);
  g.fillStyle(0xd9e2f2, 1);
  g.fillRect(3, 1, 9, 3);
  g.fillStyle(0x9fb0cc, 1);
  g.fillRect(3, 2, 9, 1);
  g.fillStyle(0xffeeaa, 1);
  g.fillTriangle(11, 0, 11, 5, 16, 2.5);
}

function bomb(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(0x2f3a2a, 1);
  g.fillCircle(3.5, 7, 3.5);
  g.fillStyle(0x4a5a40, 1);
  g.fillRect(2, 1, 3, 4);
  g.fillRect(0, 3, 7, 2);
  g.fillStyle(0xffc24d, 1);
  g.fillRect(2, 9, 3, 2);
}

function shell(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(0xffd24d, 1);
  g.fillRect(0, 2, 8, 2);
  g.fillStyle(C.fire1, 1);
  g.fillRect(8, 1, 3, 4);
}

function spark(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(C.white, 1);
  g.fillCircle(4, 4, 4);
}

function mountains(color: number, height: number): DrawFn {
  return (g) => {
    const points: Phaser.Geom.Point[] = [new Phaser.Geom.Point(0, height)];
    const peaks = [
      [40, height * 0.45],
      [96, height * 0.78],
      [150, height * 0.28],
      [214, height * 0.66],
      [268, height * 0.4],
      [330, height * 0.82],
      [392, height * 0.34],
      [452, height * 0.7],
      [512, height],
    ];
    peaks.forEach(([x, y]) => points.push(new Phaser.Geom.Point(x, y)));
    g.fillStyle(color, 1);
    g.fillPoints(points, true);
    g.fillRect(0, height - 4, 512, 4);
  };
}

function ground(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(C.grass, 1);
  g.fillRect(0, 0, 64, 70);
  g.fillStyle(C.grassLight, 1);
  g.fillRect(0, 0, 64, 5);
  g.fillStyle(C.grassTuft, 1);
  for (let x = 0; x < 64; x += 7) {
    g.fillRect(x, 0, 3, 3);
    g.fillRect(x + 3, 3, 2, 2);
  }
  g.fillStyle(C.dirt, 1);
  g.fillRect(0, 16, 64, 54);
  g.fillStyle(C.dirtDark, 1);
  g.fillRect(0, 16, 64, 3);
  g.fillStyle(C.dirtDark, 1);
  for (let x = 4; x < 64; x += 11) {
    g.fillRect(x, 26 + ((x * 7) % 5), 3, 2);
  }
  g.fillStyle(0x4a3018, 1);
  for (let x = 9; x < 64; x += 13) {
    g.fillRect(x, 40 + ((x * 5) % 7), 2, 2);
  }
}

function sky(scene: Phaser.Scene): void {
  if (scene.textures.exists('sky')) return;
  const canvas = scene.textures.createCanvas('sky', GAME_W, GAME_H);
  if (!canvas) return;
  const ctx = canvas.getContext();
  const gradient = ctx.createLinearGradient(0, 0, 0, GAME_H);
  gradient.addColorStop(0, '#05070f');
  gradient.addColorStop(0.45, '#0c1830');
  gradient.addColorStop(1, '#27547f');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, GAME_W, GAME_H);

  let seed = 1337;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = 0; i < 130; i += 1) {
    const x = Math.floor(rand() * GAME_W);
    const y = Math.floor(rand() * (GROUND_Y - 40));
    const a = 0.25 + rand() * 0.7;
    ctx.fillStyle = `rgba(223, 233, 255, ${a.toFixed(2)})`;
    ctx.fillRect(x, y, rand() > 0.85 ? 2 : 1, 1);
  }
  canvas.refresh();
}

export function generateTextures(scene: Phaser.Scene): void {
  sky(scene);
  tex(scene, 'mountains-far', 512, 150, mountains(C.mtnFar, 150));
  tex(scene, 'mountains-near', 512, 110, mountains(C.mtnNear, 110));
  tex(scene, 'ground', 64, 70, ground);
  tex(scene, 'heli-side', 86, 38, heliSide);
  tex(scene, 'heli-front', 54, 46, heliFront);
  tex(scene, 'hostage-0', 10, 16, (g) => hostageBase(g, false));
  tex(scene, 'hostage-1', 10, 16, (g) => hostageBase(g, true));
  tex(scene, 'tank', 40, 20, tank);
  tex(scene, 'jet', 44, 16, jet);
  tex(scene, 'mine', 22, 22, mine);
  tex(scene, 'barracks', 104, 84, (g) => barracks(g, false));
  tex(scene, 'barracks-broken', 104, 84, (g) => barracks(g, true));
  tex(scene, 'postoffice', 100, 116, postOffice);
  tex(scene, 'helipad', 140, 20, helipad);
  tex(scene, 'missile', 16, 5, missile);
  tex(scene, 'bomb', 7, 12, bomb);
  tex(scene, 'shell', 11, 5, shell);
  tex(scene, 'spark', 8, 8, spark);
}
