import assert from 'node:assert/strict';
import { Mission, GROUND, PAD } from './src/mission.js';

const tick = (m, seconds, input = {}) => {
  for (let i = 0; i < Math.ceil(seconds * 60); i++) {
    m.step(1 / 60, input);
    const c = m.counts();
    assert.equal(Object.values(c).reduce((a, b) => a + b, 0), 64, 'Every hostage must remain accounted for');
    assert.ok(c.aboard <= 16, 'Cabin capacity must never be exceeded');
    m.events = [];
  }
};
const quietMission = () => {
  const m = new Mission();
  m.cooldowns.tank = m.cooldowns.jet = m.cooldowns.mine = Infinity;
  return m;
};
const flyTo = (m, x, y) => {
  for (let i = 0; i < 2400; i++) {
    const h = m.heli, dx = x - h.x, dy = y - h.y;
    if (Math.abs(dx) < 9 && Math.abs(dy) < 9 && Math.abs(h.vx) < 12 && Math.abs(h.vy) < 12) return;
    tick(m, 1 / 60, {
      left: dx - h.vx / 5.8 < -8, right: dx - h.vx / 5.8 > 8,
      up: dy - h.vy / 6.8 < -8, down: dy - h.vy / 6.8 > 8,
    });
    assert.equal(m.lives, 3, 'Controlled flight must preserve the helicopter');
  }
  assert.fail('Flight never reached its destination');
};

// Complete four actual flights, bomb the closed camps, board, and return all 64.
const route = quietMission();
for (let i = 0; i < 4; i++) {
  const c = route.camps[i];
  flyTo(route, route.heli.x, 215);
  if (!c.open) {
    flyTo(route, c.x, 215);
    while (route.heli.face !== 0) route.turn();
    tick(route, 1, { fire: true });
    tick(route, 1);
    assert.ok(c.open, 'Downward fire must free a closed camp');
  }
  flyTo(route, c.x + 215, 215);
  tick(route, 2, { down: true });
  assert.ok(route.heli.grounded, 'A slow vertical approach must land');
  tick(route, 9);
  assert.equal(route.counts().aboard, 16, 'All 16 people must be able to board');
  tick(route, 1, { up: true });
  assert.equal(route.counts().aboard, 16, 'Passengers must remain aboard during flight');
  flyTo(route, PAD.x, 215);
  tick(route, 2, { down: true });
  tick(route, 6);
  assert.equal(route.counts().rescued, (i + 1) * 16, 'Every delivered passenger must count');
  assert.equal(route.counts().lost, 0, 'The safe route must not kill a hostage');
}
assert.equal(route.status, 'ended');
assert.equal(route.trips, 4);

const failure = quietMission();
failure.people[0].state = 'aboard';
failure.crash();
assert.equal(failure.counts().lost, 1, 'A crash must kill passengers');
assert.equal(failure.lives, 2);
tick(failure, 3);
assert.equal(failure.heli.x, PAD.x, 'Replacement helicopter must appear at home');
failure.crash(); tick(failure, 3); failure.crash();
assert.equal(failure.status, 'ended', 'Three losses must end the mission');

const landing = quietMission();
const victim = landing.people[0];
Object.assign(landing.heli, { x: victim.x, y: GROUND - 21, grounded: false, vy: 80, invincible: 0 });
tick(landing, 0.05, { down: true });
assert.equal(victim.state, 'lost', 'Landing on a person must cause a casualty');

const battle = quietMission();
battle.heli.x = 1800; battle.heli.y = 250; battle.heli.grounded = false; battle.heli.invincible = 0;
battle.enemies.push({ type: 'tank', x: 1800, y: GROUND - 12, vx: 0, hp: 2, cooldown: 99 });
battle.turn(); tick(battle, 0.5, { fire: true }); tick(battle, 0.6);
assert.equal(battle.enemies.length, 0, 'A forward-facing bomb must destroy a tank');
battle.trips = 2; battle.cooldowns.jet = battle.cooldowns.mine = 0;
tick(battle, 0.05);
assert.ok(battle.enemies.some(e => e.type === 'jet'));
assert.ok(battle.enemies.some(e => e.type === 'mine'));
const mine = battle.enemies.find(e => e.type === 'mine');
Object.assign(mine, { x: 3350, y: 250 });
battle.heli.x = 3450;
tick(battle, 0.1);
assert.ok(mine.x > 3350, 'Homing mines must cross into friendly territory');
battle.bullets.push({ x: battle.heli.x - 10, y: battle.heli.y, vx: 100, vy: 0, friendly: false, ttl: 1 });
tick(battle, 0.1);
assert.equal(battle.lives, 2, 'An enemy projectile must destroy a vulnerable helicopter');
console.log('PASS: four-sortie 64/64 rescue, flight, bombing, boarding, capacity, unloading, casualties, respawn, defeat, enemy escalation, homing, and projectile collision.');
