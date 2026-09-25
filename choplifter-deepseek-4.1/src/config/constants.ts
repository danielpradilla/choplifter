export const GAME_W = 960;
export const GAME_H = 540;

export const WORLD_W = 2560;
export const GROUND_Y = 470;

export const BARRIER_X = 2230;
export const HELIPAD_X = 2360;
export const POST_X = 2480;

export const BATTLE_LEFT = 64;
export const BATTLE_RIGHT = BARRIER_X;

export const BARRACK_CENTERS = [178, 326, 474, 622];
export const HOSTAGES_PER_BARRACK = 16;
export const TOTAL_HOSTAGES = 64;
export const CHOPPER_CAPACITY = 16;
export const START_LIVES = 3;

export const HELI = {
  speedX: 300,
  thrust: 660,
  gravity: 150,
  dive: 540,
  maxRise: 240,
  maxFall: 300,
  crashVy: 250,
  fireCooldown: 150,
  missileSpeed: 680,
  halfW: 43,
  halfH: 19,
};

export const BOMB_GRAVITY = 470;

export const HOSTAGE = {
  walkSpeed: 30,
  runSpeed: 96,
  boardRange: 20,
  attractRange: 240,
};

export const TANK = {
  speed: 44,
  fireCooldown: 2000,
  shellSpeed: 285,
  shellLife: 1.9,
  range: 300,
};

export const JET = {
  speed: 300,
  missileSpeed: 340,
  missiles: 2,
  fireCooldown: 1100,
  range: 430,
};

export const MINE = {
  accel: 170,
  maxSpeed: 92,
  aggressiveMaxSpeed: 145,
  bombCooldown: 2600,
  bombRange: 260,
};

export const DEPTH = {
  sky: -100,
  mountainsFar: -80,
  mountainsNear: -70,
  ground: -60,
  decal: -50,
  barrack: -20,
  delivered: -5,
  hostage: 0,
  tank: 2,
  jet: 4,
  mine: 4,
  heli: 6,
  projectile: 8,
  explosion: 10,
  hud: 200,
  banner: 220,
};

export type Facing = 'left' | 'right' | 'front';

export const FACING_CYCLE: Facing[] = ['right', 'front', 'left', 'front'];

export const REG = {
  killed: 'killed',
  aboard: 'aboard',
  rescued: 'rescued',
  lives: 'lives',
  paused: 'paused',
  muted: 'muted',
} as const;
