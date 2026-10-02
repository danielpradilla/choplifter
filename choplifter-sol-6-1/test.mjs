import assert from 'node:assert/strict';
import { Mission, CAPACITY } from './mission.js';

const mission = new Mission();
assert.deepEqual(mission.counts, { captive: 48, waiting: 16, aboard: 0, rescued: 0, lost: 0 });
assert.equal(mission.board(mission.hostages[16]), false, 'Locked hostages cannot board');
mission.open(1);
for (let i = 0; i < CAPACITY; i++) assert.equal(mission.board(mission.hostages[i]), true);
assert.equal(mission.board(mission.hostages[16]), false, 'The seventeenth passenger cannot board');
assert.equal(mission.board(mission.hostages[0]), false, 'Passengers cannot board twice');
while (mission.unload()) {}
assert.equal(mission.counts.rescued, 16);
assert.equal(mission.lose(mission.hostages[0]), false, 'Rescued people stay safe');
mission.board(mission.hostages[16]);
mission.crash();
assert.equal(mission.counts.lost, 1, 'A crash loses passengers');
assert.equal(mission.counts.aboard, 0);
assert.equal(mission.lives, 2);
mission.crash();
mission.crash();
assert.equal(mission.finished, true);
mission.crash();
assert.equal(mission.lives, 0, 'Lives cannot fall below zero');
assert.equal(mission.board(mission.hostages[17]), false, 'Finished missions cannot load passengers');

const perfect = new Mission();
for (let barracks = 0; barracks < 4; barracks++) {
  perfect.open(barracks);
  for (const hostage of perfect.hostages.filter(h => h.barracks === barracks)) perfect.board(hostage);
  while (perfect.unload()) {}
}
assert.equal(perfect.finished, true);
assert.equal(perfect.counts.rescued, 64);
assert.equal(Object.values(perfect.counts).reduce((a, b) => a + b), 64, 'Every hostage is accounted for');
console.log('Mission checks passed: capacity, rescue, casualties, three sorties, and completion.');

if (process.argv.includes('--browser')) {
  const { execFileSync } = await import('node:child_process');
  const session = `choplifter-check-${process.pid}`;
  const browser = (...args) => execFileSync('agent-browser', ['--session', session, ...args], { encoding: 'utf8', timeout: 30000 });
  try {
    browser('open', process.env.CHOPLIFTER_URL || 'http://127.0.0.1:8090/dev/choplifter-sol-6-1/');
    browser('click', '#launch-button');
    const result = execFileSync('agent-browser', ['--session', session, 'eval', '--stdin'], {
      encoding: 'utf8', timeout: 30000, input: `
      (async () => {
        const s = choplifter.scene.getScene('rescue');
        const check = (condition, message) => { if (!condition) throw new Error(message); };
        const key = type => document.getElementById('game').dispatchEvent(new KeyboardEvent(type, {
          key: 'ArrowUp', code: 'ArrowUp', keyCode: 38, which: 38, bubbles: true
        }));
        key('keydown');
        const deadline = performance.now() + 3000;
        while (s.player.y >= 375 && performance.now() < deadline) await new Promise(r => setTimeout(r, 40));
        key('keyup');
        check(s.player.y < 375, 'Keyboard thrust must lift the helicopter');
        document.getElementById('pause-button').click();
        check(s.phase === 'paused' && !document.getElementById('overlay').hidden, 'Pause overlay');
        document.getElementById('launch-button').click();
        check(s.phase === 'playing', 'Resume button');
        document.getElementById('help-button').click();
        check(document.getElementById('manual').open && s.phase === 'paused', 'Manual pauses flight');
        document.getElementById('close-manual').click();
        await new Promise(r => setTimeout(r, 50));
        check(s.phase === 'playing', 'Closing the manual resumes flight');

        // Run fixed simulation steps to check the whole rescue loop without real-time waits.
        choplifter.loop.stop();
        let time = 0;
        const step = () => s.update(time += 1000 / 60, 1000 / 60);
        const advance = seconds => { for (let i = 0; i < seconds * 60; i++) step(); };
        const reset = () => { s.begin(); s.nextTank = s.nextJet = s.nextMine = Infinity; };
        reset();
        s.keys.UP.isDown = true; advance(.75); s.keys.UP.isDown = false; advance(.5);
        s.keys.LEFT.isDown = true;
        for (let i = 0; i < 300 && s.player.x - 3720 > Math.abs(s.vx) / 5 + 1; i++) step();
        s.keys.LEFT.isDown = false; advance(1.4);
        check(Math.abs(s.player.x - 3720) < 6, 'Horizontal flight and braking');
        s.keys.DOWN.isDown = true; advance(2); s.keys.DOWN.isDown = false; advance(6);
        check(s.phase === 'playing' && s.mission.counts.aboard === 16, 'Land and board a full cabin');
        check(s.mission.counts.rescued === 0, 'Passengers are not rescued before delivery');
        s.keys.UP.isDown = true; advance(.7); s.keys.UP.isDown = false; advance(.5);
        s.keys.RIGHT.isDown = true;
        for (let i = 0; i < 300 && 4080 - s.player.x > Math.abs(s.vx) / 5 + 1; i++) step();
        s.keys.RIGHT.isDown = false; advance(1.4);
        s.keys.DOWN.isDown = true; advance(2); s.keys.DOWN.isDown = false; advance(4);
        check(s.mission.counts.rescued === 16 && s.mission.counts.aboard === 0, 'Deliver every passenger');
        check(document.getElementById('rescued').textContent === '16', 'HUD reflects rescue');

        s.player.setPosition(2820, 405); s.vx = s.vy = 0; s.facing = -1;
        s.keys.SPACE.isDown = true; advance(.9); s.keys.SPACE.isDown = false; advance(.5);
        check(s.buildings[1].health === 0 && s.mission.counts.waiting === 16, 'Gunfire opens locked barracks');
        s.player.y = 260; s.facing = 0; s.spawnEnemy('tank');
        const tank = s.enemies.at(-1); tank.x = s.player.x; tank.cooldown = Infinity;
        s.keys.SPACE.isDown = true; advance(1.4); s.keys.SPACE.isDown = false;
        check(!s.enemies.includes(tank), 'Ground attack destroys tanks');

        s.player.setPosition(2790, 417); s.vx = s.vy = 0; advance(6);
        check(s.mission.counts.aboard === 16, 'Second group boards');
        s.invulnerable = 0; s.shoot(s.player.x - 50, s.player.y, 200, 0, false); advance(.4);
        check(s.phase === 'crashed' && s.mission.lives === 2 && s.mission.counts.lost === 16, 'A hit loses the helicopter and its passengers');
        document.getElementById('help-button').click();
        advance(2.1); check(s.phase === 'paused' && s.player.x === 4080, 'Respawn waits while the manual is open');
        document.getElementById('close-manual').click();
        await new Promise(r => setTimeout(r, 50));
        check(s.phase === 'playing', 'Respawn resumes after closing the manual');
        s.spawnEnemy('mine'); const mine = s.enemies.at(-1); mine.x = 3930; mine.y = 300;
        advance(.2); check(mine.x > 3930, 'Homing mines cross the friendly border');
        s.removeEnemy(mine);
        for (let i = 0; i < 2; i++) {
          s.invulnerable = 0; s.shoot(s.player.x - 50, s.player.y, 200, 0, false); advance(.4); advance(2.1);
        }
        check(s.phase === 'ended' && s.mission.lives === 0, 'Game over after three helicopters');
        reset();
        for (const b of s.buildings) {
          while (b.health > 0) s.damageBuilding(b);
          s.player.setPosition(b.x + 260, 417); s.vx = s.vy = 0; advance(7);
          check(s.mission.counts.aboard === 16, 'Every barracks can be collected');
          s.player.setPosition(4080, 417); advance(4);
        }
        check(s.phase === 'ended' && s.mission.counts.rescued === 64, 'Perfect 64-person rescue is winnable');
        check(document.getElementById('overlay-title').textContent === 'Everyone home.', 'Victory screen');
        document.getElementById('launch-button').click();
        check(s.phase === 'playing' && s.mission.counts.rescued === 0 && s.mission.lives === 3, 'Restart resets the mission');
        return 'Browser checks passed: real keyboard input, pause, manual, flight, landing, boarding, delivery, weapons, mines, crashes, victory, and restart.';
      })()
    ` });
    console.log(result.trim());
  } finally { browser('close'); }
}
