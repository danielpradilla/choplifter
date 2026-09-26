export const TOTAL_HOSTAGES = 64;
export const CAPACITY = 16;

export function tally(hostages) {
  const counts = { captive: 0, free: 0, aboard: 0, rescued: 0, lost: 0 };
  for (const hostage of hostages) counts[hostage.state]++;
  return counts;
}

export function missionComplete(hostages) {
  const { rescued, lost } = tally(hostages);
  return rescued + lost === TOTAL_HOSTAGES;
}

export function canBoard(hostages) {
  return tally(hostages).aboard < CAPACITY;
}
