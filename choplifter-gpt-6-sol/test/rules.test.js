import test from 'node:test';
import assert from 'node:assert/strict';
import { CAPACITY, TOTAL_HOSTAGES, canBoard, missionComplete, tally } from '../src/rules.js';

test('a sortie never seats more than 16 and a mission accounts for all 64', () => {
  const people = Array.from({ length: TOTAL_HOSTAGES }, () => ({ state: 'captive' }));
  people.slice(0, CAPACITY).forEach(person => { person.state = 'aboard'; });
  assert.equal(canBoard(people), false);
  people.slice(0, CAPACITY).forEach(person => { person.state = 'rescued'; });
  assert.equal(canBoard(people), true);
  assert.equal(missionComplete(people), false);
  people.slice(CAPACITY).forEach(person => { person.state = 'lost'; });
  assert.deepEqual(tally(people), { captive: 0, free: 0, aboard: 0, rescued: 16, lost: 48 });
  assert.equal(missionComplete(people), true);
});
