import assert from "node:assert/strict";
import {
  BARRACKS,
  HOSTAGES_PER_BARRACK,
  MAX_CARRY,
  MAX_LIVES,
  BASE_PAD,
  cycleFacing,
  terrainYAt,
} from "./logic.js";

assert.equal(BARRACKS.length, 4);
assert.equal(HOSTAGES_PER_BARRACK, 16);
assert.equal(MAX_CARRY, 16);
assert.equal(MAX_LIVES, 3);
assert.equal(cycleFacing("left"), "forward");
assert.equal(cycleFacing("forward"), "right");
assert.equal(cycleFacing("right"), "left");
assert(terrainYAt(0) > 400);
assert(terrainYAt(BASE_PAD.x1) > 400);

console.log("Choplifter rule checks passed.");
