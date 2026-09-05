export const WORLD_WIDTH = 4200;
export const VIEW_WIDTH = 960;
export const VIEW_HEIGHT = 540;

export const HOSTAGES_PER_BARRACK = 16;
export const MAX_CARRY = 16;
export const MAX_LIVES = 3;

export const HELI_HALF_WIDTH = 18;
export const HELI_HALF_HEIGHT = 10;
export const HELI_GROUND_OFFSET = 14;

export const BASE_ZONE_X = 3460;
export const BASE_PAD = {
  x1: 3530,
  x2: 3780,
};

export const BASE_BUILDING = {
  x: 3670,
  yOffset: 52,
};

export const BARRACKS = [
  { x: 220, yOffset: 38, label: "A" },
  { x: 420, yOffset: 38, label: "B" },
  { x: 640, yOffset: 38, label: "C" },
  { x: 860, yOffset: 38, label: "D" },
];

export const FACING_ORDER = ["left", "forward", "right"];

const TERRAIN_POINTS = [
  [0, 456],
  [140, 446],
  [280, 458],
  [420, 434],
  [560, 452],
  [720, 424],
  [880, 448],
  [1040, 432],
  [1180, 468],
  [1360, 430],
  [1540, 454],
  [1720, 420],
  [1920, 452],
  [2140, 428],
  [2380, 450],
  [2640, 426],
  [2920, 444],
  [3200, 432],
  [3440, 438],
  [3660, 434],
  [3860, 438],
  [4020, 435],
  [4200, 435],
];

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function cycleFacing(facing) {
  const index = FACING_ORDER.indexOf(facing);
  return FACING_ORDER[(index + 1) % FACING_ORDER.length];
}

export function terrainYAt(x) {
  const clampedX = clamp(x, TERRAIN_POINTS[0][0], TERRAIN_POINTS[TERRAIN_POINTS.length - 1][0]);

  for (let i = 0; i < TERRAIN_POINTS.length - 1; i += 1) {
    const [x1, y1] = TERRAIN_POINTS[i];
    const [x2, y2] = TERRAIN_POINTS[i + 1];

    if (clampedX >= x1 && clampedX <= x2) {
      const span = x2 - x1 || 1;
      const t = (clampedX - x1) / span;
      return lerp(y1, y2, t);
    }
  }

  return TERRAIN_POINTS[TERRAIN_POINTS.length - 1][1];
}

export function rectsOverlap(a, b) {
  return !(
    a.right < b.left ||
    a.left > b.right ||
    a.bottom < b.top ||
    a.top > b.bottom
  );
}

export function circleHit(ax, ay, ar, bx, by, br) {
  const dx = ax - bx;
  const dy = ay - by;
  const range = ar + br;
  return dx * dx + dy * dy <= range * range;
}

export function pad2(value) {
  return String(Math.max(0, Math.floor(value))).padStart(2, "0");
}

export function isInBasePad(x) {
  return x >= BASE_PAD.x1 && x <= BASE_PAD.x2;
}

export function isInBattleZone(x) {
  return x < BASE_ZONE_X;
}

