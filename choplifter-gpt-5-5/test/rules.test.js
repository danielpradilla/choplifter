import assert from "node:assert/strict";
import { clamp, gameResult, isOnBasePad, nextFacing } from "../src/rules.js";

assert.equal(nextFacing("left"), "front");
assert.equal(nextFacing("front"), "right");
assert.equal(nextFacing("right"), "left");
assert.equal(clamp(12, 0, 10), 10);
assert.equal(isOnBasePad(110, 100, 20), true);
assert.equal(isOnBasePad(121, 100, 20), false);
assert.equal(gameResult({ rescued: 64, lost: 0, total: 64, lives: 2 }), "won");
assert.equal(gameResult({ rescued: 4, lost: 60, total: 64, lives: 2 }), "lost");
assert.equal(gameResult({ rescued: 4, lost: 4, total: 64, lives: 0 }), "lost");
assert.equal(gameResult({ rescued: 4, lost: 4, total: 64, lives: 2 }), "playing");
