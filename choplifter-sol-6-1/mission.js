export const CAPACITY = 16;
export const BARRACKS = [3460, 2530, 1600, 670];

export class Mission {
  constructor() {
    this.lives = 3;
    this.hostages = BARRACKS.flatMap((x, barracks) =>
      Array.from({ length: CAPACITY }, (_, seat) => ({
        barracks, x: x + 76 + seat * 8,
        state: barracks === 0 ? 'waiting' : 'captive',
      })),
    );
  }

  get counts() {
    const result = { captive: 0, waiting: 0, aboard: 0, rescued: 0, lost: 0 };
    for (const hostage of this.hostages) result[hostage.state]++;
    return result;
  }

  get finished() {
    const { rescued, lost } = this.counts;
    return this.lives === 0 || rescued + lost === 64;
  }

  open(barracks) {
    for (const h of this.hostages) {
      if (h.barracks === barracks && h.state === 'captive') h.state = 'waiting';
    }
  }

  board(hostage) {
    if (this.finished || hostage?.state !== 'waiting' || this.counts.aboard >= CAPACITY) return false;
    hostage.state = 'aboard';
    return true;
  }

  unload() {
    const hostage = this.hostages.find(h => h.state === 'aboard');
    if (!hostage) return false;
    hostage.state = 'rescued';
    return true;
  }

  lose(hostage) {
    if (!hostage || !['waiting', 'aboard'].includes(hostage.state)) return false;
    hostage.state = 'lost';
    return true;
  }

  crash() {
    if (this.finished) return;
    this.lives--;
    for (const h of this.hostages) if (h.state === 'aboard') this.lose(h);
  }
}
