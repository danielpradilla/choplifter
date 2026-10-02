export const FACING = ["left", "front", "right"];

export function nextFacing(current) {
  const index = FACING.indexOf(current);
  return FACING[(index + 1) % FACING.length];
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function isOnBasePad(x, padX, padWidth) {
  return x >= padX && x <= padX + padWidth;
}

export function gameResult({ rescued, lost, total, lives }) {
  if (rescued >= total) return "won";
  if (lost + rescued >= total || lives <= 0) return "lost";
  return "playing";
}
