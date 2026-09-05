import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the complete Lifeline mission shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Lifeline ’82 — Browser Rescue Game<\/title>/i);
  assert.match(html, /Bring every/);
  assert.match(html, /64 lives are waiting/);
  assert.match(html, /LOST/);
  assert.match(html, /ABOARD/);
  assert.match(html, /SAVED/);
  assert.match(html, /aria-label="Fly up"/);
  assert.match(html, /aria-label="Fire"/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("ships the researched rescue rules and removes starter artifacts", async () => {
  const [game, packageJson] = await Promise.all([
    readFile(new URL("../game/createGame.ts", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(packageJson, /"phaser":/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.match(game, /const BARRACK_X = \[1580, 2780, 3980, 5180\]/);
  assert.match(game, /this\.lives = 3/);
  assert.match(game, /this\.aboard >= 16/);
  assert.match(game, /this\.saved === 64/);
  assert.match(game, /type Facing = "left" \| "right" \| "front"/);
  assert.match(game, /beginDirectionalTurn\(requestedFacing, time\)/);
  assert.match(game, /this\.setFacing\("front"\)/);
  assert.match(game, /let justLiftedOff = false/);
  assert.match(game, /if \(!justLiftedOff && this\.player\.y >= landingY\)/);
  assert.match(game, /const HOME_PAD_MARGIN = 96/);
  assert.match(game, /this\.player\.x \+ body\.width \/ 2 >= PAD_LEFT - HOME_PAD_MARGIN/);
  assert.match(game, /const onPad = settledOnGround && overlapsHomePad/);
  assert.match(game, /if \(distance < 52 && this\.isLanded\)/);
  assert.match(game, /hostage\.getData\("state"\) !== "boarding" && Math\.abs\(playerBody\.velocity\.x\) > 70/);
  assert.match(game, /targetTilt = horizontal \* 11/);
  assert.match(game, /targetTilt = -Math\.sign\(body\.velocity\.x\) \* 5/);
  assert.match(game, /this\.player\.setAngle\(this\.flightTilt\)/);
  assert.match(game, /const firingAngle = this\.flightTilt \+ \(this\.facing === "right" \? 0 : 180\)/);
  assert.match(game, /body\.setVelocity\(Math\.cos\(firingRadians\) \* 760, Math\.sin\(firingRadians\) \* 760\)/);
  assert.match(game, /homing drone detected/);
  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
  await assert.rejects(access(new URL("../public/favicon.svg", import.meta.url)));
});
