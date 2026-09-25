'use strict';
// Choplifter tribute. Rules follow the 1982 Apple II manual: 64 hostages in four barracks
// (one already blown open), 16 seats, three choppers, tanks + jets + drone air mines,
// and only the mines cross the fence to the post office. All art and sound are generated here.

const W = 384, H = 216, GROUND = 190, WORLD = 3000;
const FENCE = 2560, PAD_X = 2760, PO_X = 2880, PO_DOOR = 2855;
const BARRACKS_X = [2150, 1650, 1150, 650];
const TOTAL = 64, PER_BARRACKS = 16, CAP = 16, CHOPPERS = 3;
const MAXV = 150, MAXUP = 80, MAXDOWN = 95;
const FONT = '"Silkscreen", ui-monospace, monospace';

// Apple II hi-res colours plus a few shades.
const PAL = {
  W: '#ffffff', w: '#a9b3c9', g: '#5b6478', k: '#141824',
  B: '#14cffd', b: '#0b5f8e', O: '#ff6a3c', o: '#8f3516',
  G: '#14f53c', d: '#0b7a26', V: '#ff44fd', v: '#8e2296',
  Y: '#ffe14a', R: '#ff2f3f',
};
const hex = s => parseInt(s.slice(1), 16);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const toward = (v, goal, step) => (Math.abs(goal - v) <= step ? goal : v + Math.sign(goal - v) * step);
function sweep(list) { return list.filter(o => { if (o.gone) o.spr.destroy(); return !o.gone; }); }

const ART = {
  chopS: [
    '...............gg.............',
    '...........WWWWWWWWWW.........',
    'W.........WWWkkWWkkWWWBB......',
    'WW.......WWWWkkWWkkWWWBBBB....',
    'WWWWWWWWWWWWWWWWWWWWWWBBBBB...',
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWW..',
    'W.........wwwwwwwwwwwwwwwwww..',
    '...........wwwwwwwwwwwwwwww...',
    '............g..........g......',
    '..........gggggggggggggggggg..',
  ],
  chopF: [
    '..........gg..........',
    '......WWWWWWWWWW......',
    '.....WBBBBBBBBBBW.....',
    '....WWBBBBBBBBBBWW....',
    '....WWWWWWWWWWWWWW....',
    '....WWWWWWWWWWWWWW....',
    '.....wwwwwwwwwwww.....',
    '......wwwwwwwwww......',
    '......g........g......',
    '...gggg........gggg...',
  ],
  mini: [
    '..wwwwwww..',
    '.....W.....',
    'W...WWWWB..',
    'WWWWWWWWWB.',
    '....g..g...',
  ],
  tank: [
    '......oooo........',
    '.....OOOOOO.......',
    '..OOOOOOOOOOOOO...',
    '.OOOOOOOOOOOOOOOO.',
    'gggggggggggggggggg',
    'gkgkgkgkgkgkgkgkgg',
    '.gggggggggggggggg.',
  ],
  jet: [
    'VV......................',
    'VVV.........vvvv........',
    '.VVVVVVVVVVVVVVVVVWW....',
    '..VVVVVVVVVVVVVVVVVVVVV.',
    '.....vvvvvvvvvvvvvv.....',
    '........vvvvv...........',
  ],
  mine: [
    'V...V...V',
    '.V..V..V.',
    '..VVVVV..',
    '..VWWWV..',
    'VVVWWWVVV',
    '..VWWWV..',
    '..VVVVV..',
    '.V..V..V.',
    'V...V...V',
  ],
  hStand: ['..W..', '.WWW.', 'W.W.W', '..W..', '..W..', '.W.W.', '.W.W.'],
  hRun1: ['..W..', '.WWW.', 'W.W.W', '..W..', '..W..', '.W.W.', 'W...W'],
  hRun2: ['..W..', '.WWW.', '.WWW.', '..W..', '..W..', '..W..', '..W..'],
  hWave1: ['W.W.W', '.WWW.', '..W..', '..W..', '..W..', '.W.W.', '.W.W.'],
  hWave2: ['..W..', 'WWWWW', '..W..', '..W..', '..W..', '.W.W.', '.W.W.'],
  hDead: ['..O.O..', 'O.OOOOO'],
  lemon: ['.LLLLL.', 'LLLLLLL', 'LLLLLLL', 'LLLLLLL', '.LLLLL.'],
  missile: ['OWWWWW'],
  shell: ['YY', 'YY'],
  bomb: ['.W.', 'WWW', 'WWW', '.W.'],
  shot: ['WWW'],
  barrel: ['wwwwwwww'],
  px: ['W'],
};

function canvasTex(scene, key, w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'));
  scene.textures.addCanvas(key, c);
}

function pixTex(scene, key, rows, pal = PAL) {
  console.assert(rows.every(r => r.length === rows[0].length), 'ragged sprite ' + key);
  canvasTex(scene, key, rows[0].length, rows.length, ctx => rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (pal[ch]) { ctx.fillStyle = pal[ch]; ctx.fillRect(x, y, 1, 1); }
  })));
}

function drawBarracks(ctx, blown) {
  const f = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  for (let y = 0; y < 6; y++) f(PAL.O, 6 - y, y, 36 + 2 * y, 1);
  f(PAL.o, 2, 6, 44, 20);
  for (let x = 4; x < 46; x += 5) f('#b0482a', x, 7, 1, 19);
  for (const wx of [6, 34]) {
    f('#000', wx, 10, 8, 6);
    for (let b = 1; b < 8; b += 2) f(PAL.w, wx + b, 10, 1, 6);
  }
  f(PAL.g, 19, 12, 10, 14);
  if (!blown) return;
  ctx.clearRect(17, 0, 13, 3);
  ctx.clearRect(20, 3, 7, 2);
  f('#000', 16, 9, 16, 17);
  f('#000', 14, 13, 2, 8); f('#000', 32, 11, 2, 9); f('#000', 19, 7, 9, 2);
  f('#3a1508', 12, 7, 2, 3); f('#3a1508', 34, 8, 3, 2);
}

function makeTextures(s) {
  for (const key of Object.keys(ART)) if (key !== 'mine' && key !== 'lemon') pixTex(s, key, ART[key]);
  pixTex(s, 'mine0', ART.mine);
  pixTex(s, 'mine1', ART.mine, { ...PAL, V: PAL.W, W: PAL.V });
  pixTex(s, 'lemonR', ART.lemon, { L: PAL.R });
  pixTex(s, 'lemonB', ART.lemon, { L: PAL.B });
  pixTex(s, 'lemonG', ART.lemon, { L: PAL.G });
  [34, 24, 10, 24].forEach((w, i) => pixTex(s, 'rotor' + i, ['w'.repeat(w)]));
  canvasTex(s, 'barracks', 48, 26, ctx => drawBarracks(ctx, false));
  canvasTex(s, 'barracksOpen', 48, 26, ctx => drawBarracks(ctx, true));
  canvasTex(s, 'pad', 64, 2, ctx => {
    ctx.fillStyle = PAL.g; ctx.fillRect(0, 0, 64, 2);
    ctx.fillStyle = PAL.Y; ctx.fillRect(0, 0, 2, 1); ctx.fillRect(62, 0, 2, 1); ctx.fillRect(31, 0, 2, 1);
  });
  canvasTex(s, 'po', 80, 56, ctx => {
    const f = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
    f(PAL.w, 74, 0, 1, 18);                                              // flagpole
    for (let y = 1; y < 8; y++) f(y % 2 ? PAL.R : PAL.W, 62, y, 12, 1);  // stripes
    f(PAL.b, 68, 1, 6, 4);                                               // canton
    f(PAL.w, 0, 18, 80, 3);                                              // roof
    f(PAL.W, 2, 21, 76, 35);                                             // walls
    f(PAL.b, 2, 23, 76, 9);                                              // sign band
    f(PAL.B, 9, 35, 13, 21); f(PAL.k, 10, 36, 11, 20);                   // door
    for (let i = 0; i < 3; i++) { f(PAL.B, 32 + i * 15, 38, 9, 8); f(PAL.W, 36 + i * 15, 38, 1, 8); f(PAL.W, 32 + i * 15, 41, 9, 1); }
    f(PAL.w, 0, 54, 80, 2);
  });
}

// Tiny Web Audio synth: a chopped-noise rotor plus one-shot effects.
const Sfx = {
  ctx: null, on: true,
  init() {
    if (this.ctx) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.out = ctx.createGain(); this.out.gain.value = 0.4; this.out.connect(ctx.destination);
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // Rotor: looping noise through a band-pass, gated on and off by a square-wave LFO.
    const src = ctx.createBufferSource(); src.buffer = this.noise; src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 220; bp.Q.value = 0.8;
    const gate = ctx.createGain(); gate.gain.value = 0.5;
    const depth = ctx.createGain(); depth.gain.value = 0.5;
    this.lfo = ctx.createOscillator(); this.lfo.type = 'square'; this.lfo.frequency.value = 10;
    this.lfo.connect(depth).connect(gate.gain);
    this.rotorGain = ctx.createGain(); this.rotorGain.gain.value = 0;
    src.connect(bp).connect(gate).connect(this.rotorGain).connect(this.out);
    src.start(); this.lfo.start();
  },
  toggle() { this.on = !this.on; if (this.out) this.out.gain.value = this.on ? 0.4 : 0; },
  rotor(level, rate = 10) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.rotorGain.gain.setTargetAtTime(level, t, 0.08);
    this.lfo.frequency.setTargetAtTime(rate, t, 0.2);
  },
  env(node, vol, dur, at) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, at);
    g.gain.exponentialRampToValueAtTime(0.001, at + dur);
    node.connect(g).connect(this.out);
  },
  tone(type, f0, f1, dur, vol, delay = 0) {
    if (!this.ctx) return;
    const at = this.ctx.currentTime + delay, o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, at);
    o.frequency.exponentialRampToValueAtTime(f1, at + dur);
    this.env(o, vol, dur, at);
    o.start(at); o.stop(at + dur);
  },
  hiss(dur, vol, f0, f1, type = 'lowpass') {
    if (!this.ctx) return;
    const at = this.ctx.currentTime, s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter();
    s.buffer = this.noise; s.loop = true; f.type = type;
    f.frequency.setValueAtTime(f0, at);
    f.frequency.exponentialRampToValueAtTime(f1, at + dur);
    s.connect(f); this.env(f, vol, dur, at);
    s.start(at); s.stop(at + dur);
  },
  shoot() { this.tone('square', 1400, 280, 0.06, 0.05); },
  boom(big) { this.hiss(big ? 1.4 : 0.6, big ? 0.9 : 0.5, 1600, 50); },
  tank() { this.tone('triangle', 180, 60, 0.15, 0.25); this.hiss(0.12, 0.2, 900, 200); },
  missile() { this.tone('sawtooth', 280, 1100, 0.35, 0.04); },
  jet() { this.hiss(1.3, 0.3, 5000, 400, 'bandpass'); },
  board() { this.tone('square', 990, 990, 0.04, 0.04); },
  rescue() { this.tone('sine', 784, 784, 0.09, 0.12); this.tone('sine', 1175, 1175, 0.12, 0.12, 0.09); },
  die() { this.tone('square', 520, 80, 0.2, 0.05); },
};
// Browsers only allow audio after a user gesture, so start it from the first one.
['keydown', 'pointerdown'].forEach(e => addEventListener(e, () => Sfx.init()));

class Chop extends Phaser.Scene {
  constructor() { super('chop'); }

  get lvl() { return Math.min(this.trips, 5); }

  create(data) {
    if (!this.textures.exists('px')) makeTextures(this);
    this.drawWorld();
    this.fx = this.add.particles(0, 0, 'px', {
      emitting: false, speed: { min: 15, max: 110 }, angle: { min: 190, max: 350 }, lifespan: { min: 250, max: 850 },
      scale: { start: 3, end: 0 }, gravityY: 140, color: [0xffffff, 0xffe14a, 0xff6a3c, 0x5a1a08],
    }).setDepth(12);

    Object.assign(this, {
      hostages: [], tanks: [], jets: [], mines: [], shots: [], bullets: [],
      killed: 0, aboard: 0, rescued: 0, lives: CHOPPERS, trips: 0,
      tankT: 2, jetT: 6, mineT: 8, fireCd: 0, turnHeld: 0, turnLong: false,
      paused: false, ending: false, readyAt: 0, tapped: false, padHeld: true, overlay: null,
    });
    this.barracks = BARRACKS_X.map((x, i) => this.makeBarracks(x, i === 0));
    this.makeChopper();
    this.spawnChopper();
    this.makeHud();
    this.cameras.main.scrollX = FENCE - 12;

    this.keys = this.input.keyboard.addKeys('LEFT,RIGHT,UP,DOWN,W,A,S,D,Z,SPACE,X,SHIFT,ENTER');
    this.input.keyboard.on('keydown-M', () => Sfx.toggle());
    this.input.keyboard.on('keydown-P', () => this.togglePause());
    this.input.keyboard.on('keydown-ESC', () => this.togglePause());
    this.input.on('pointerdown', () => { this.tapped = true; });

    this.state = 'title';
    if (data && data.play) this.startPlay(); else this.showTitle();
  }

  // ---------- world ----------

  drawWorld() {
    const sky = this.add.graphics().setScrollFactor(0).setDepth(0);
    [0x06030c, 0x0b0516, 0x110720, 0x180a2a].forEach((c, i) => sky.fillStyle(c).fillRect(0, 100 + i * 22, W, H));
    const stars = this.add.graphics().setScrollFactor(0.04).setDepth(0);
    for (let i = 0; i < 110; i++) stars.fillStyle(Math.random() < 0.25 ? 0xffffff : 0x5b6478).fillRect(rand(0, 520) | 0, rand(16, 130) | 0, 1, 1);

    const ridge = (factor, width, step, lo, hi, fill, line) => {
      const pts = [{ x: 0, y: GROUND }];
      for (let x = 0; x < width; x += rand(step, step * 2)) pts.push({ x, y: GROUND - rand(lo, hi) });
      pts.push({ x: width, y: GROUND - lo }, { x: width, y: GROUND });
      this.add.graphics().setScrollFactor(factor).setDepth(1)
        .fillStyle(fill).fillPoints(pts, true)
        .lineStyle(1, line).strokePoints(pts.slice(1, -1));
    };
    ridge(0.2, W + (WORLD - W) * 0.2 + 40, 18, 30, 76, 0x0c1d38, 0x1d5a8a);
    ridge(0.5, W + (WORLD - W) * 0.5 + 40, 30, 6, 26, 0x0a2213, 0x16702f);

    const g = this.add.graphics().setDepth(3);
    g.fillStyle(0x1a1109).fillRect(0, GROUND, WORLD, H - GROUND);
    g.fillStyle(hex(PAL.d)).fillRect(0, GROUND, WORLD, 1);
    for (let i = 0; i < 1100; i++) g.fillStyle([0x3a2412, 0x2a1a0c, 0x0b4a1a][i % 3]).fillRect(rand(0, WORLD) | 0, rand(GROUND + 2, H) | 0, 1 + (i % 3), 1);

    // The border fence: tanks and jets stay on their side of it.
    const f = this.add.graphics().setDepth(4).lineStyle(1, hex(PAL.g));
    for (let x = FENCE - 16; x <= FENCE + 16; x += 8) f.lineBetween(x, GROUND - 20, x, GROUND);
    for (const y of [GROUND - 18, GROUND - 12, GROUND - 6]) f.lineBetween(FENCE - 16, y, FENCE + 16, y);
    f.fillStyle(hex(PAL.w));
    for (let x = FENCE - 16; x <= FENCE + 16; x += 3) f.fillRect(x, GROUND - 21 + (x % 2), 1, 1);

    this.add.image(PAD_X, GROUND, 'pad').setOrigin(0.5, 0).setDepth(4);
    this.add.image(PO_X, GROUND, 'po').setOrigin(0.5, 1).setDepth(4);
    this.add.text(PO_X, GROUND - 29, 'U.S. MAIL', { fontFamily: FONT, fontSize: '8px', color: PAL.W }).setOrigin(0.5).setDepth(4);
  }

  makeBarracks(x, open) {
    const b = { x, open, hp: 3, inside: PER_BARRACKS, releaseT: 1.5 };
    b.spr = this.add.image(x, GROUND, open ? 'barracksOpen' : 'barracks').setOrigin(0.5, 1).setDepth(4);
    if (open) this.addFlames(b);
    return b;
  }

  addFlames(b) {
    this.add.particles(b.x, GROUND - 22, 'px', {
      x: { min: -10, max: 10 }, speedY: { min: -30, max: -10 }, speedX: { min: -5, max: 5 },
      lifespan: { min: 500, max: 1200 }, scale: { start: 3, end: 0.5 }, frequency: 35,
      color: [0xffe14a, 0xff6a3c, 0x8f3516, 0x2a2a2a],
    }).setDepth(5);
  }

  hitBarracks(b) {
    this.puff(b.x, GROUND - 14);
    if (--b.hp > 0) return;
    b.open = true;
    b.spr.setTexture('barracksOpen');
    this.boom(b.x, GROUND - 12, 34);
    this.addFlames(b);
  }

  updateBarracks(dt) {
    for (const b of this.barracks) {
      if (!b.open || !b.inside) continue;
      b.releaseT -= dt;
      if (b.releaseT > 0) continue;
      b.releaseT = rand(0.35, 0.7);
      b.inside--;
      this.spawnHostage(b.x + rand(-3, 3), b.x, 'mill');
    }
  }

  // ---------- chopper ----------

  makeChopper() {
    this.rotor = this.add.image(0, -6, 'rotor0');
    this.chopBody = this.add.image(0, 0, 'chopS');
    this.chop = { spr: this.add.container(0, 0, [this.rotor, this.chopBody]).setDepth(8) };
  }

  spawnChopper() {
    Object.assign(this.chop, {
      x: PAD_X, y: GROUND - 5, vx: 0, vy: 0, rot: 0, landed: true, dead: false, falling: false,
      facing: -1, target: -1, lastSide: -1, turnT: 0, unloadT: 0.4, delivered: false,
    });
    this.chop.spr.setVisible(true).setPosition(this.chop.x, this.chop.y).setRotation(0);
    for (const o of [...this.mines, ...this.bullets]) o.gone = true;
    this.mineT = 10; this.jetT = 6;
  }

  readInput() {
    const k = this.keys, pad = this.input.gamepad && this.input.gamepad.pad1;
    let x = (k.RIGHT.isDown || k.D.isDown ? 1 : 0) - (k.LEFT.isDown || k.A.isDown ? 1 : 0);
    let y = (k.DOWN.isDown || k.S.isDown ? 1 : 0) - (k.UP.isDown || k.W.isDown ? 1 : 0);
    let fire = k.Z.isDown || k.SPACE.isDown, turn = k.X.isDown || k.SHIFT.isDown;
    if (pad) {
      x = x || (pad.right || pad.leftStick.x > 0.4 ? 1 : 0) - (pad.left || pad.leftStick.x < -0.4 ? 1 : 0);
      y = y || (pad.down || pad.leftStick.y > 0.4 ? 1 : 0) - (pad.up || pad.leftStick.y < -0.4 ? 1 : 0);
      fire = fire || pad.A;
      turn = turn || pad.B || pad.X;
    }
    return { x, y, fire, turn };
  }

  // Manual: "reverse direction with a sustained push; a short push puts the chopper into a
  // tank attack posture, facing you".
  handleTurn(turn, dt) {
    const c = this.chop;
    if (turn) {
      this.turnHeld += dt;
      if (this.turnHeld >= 0.25 && !this.turnLong) { this.turnLong = true; c.target = -c.lastSide; }
    } else if (this.turnHeld > 0) {
      if (!this.turnLong) c.target = c.target ? 0 : c.lastSide;
      this.turnHeld = 0; this.turnLong = false;
    }
  }

  updateChopper(dt, inp) {
    const c = this.chop;
    this.rotor.setTexture('rotor' + (Math.floor(this.time.now / 45) % 4));
    if (c.dead) {
      if (!c.falling) return;
      c.vy += 300 * dt; c.vx *= 0.98;
      c.x += c.vx * dt; c.y += c.vy * dt; c.rot += 6 * dt;
      c.spr.setPosition(c.x, c.y).setRotation(c.rot);
      if (c.y >= GROUND - 5) this.wreck();
      return;
    }

    // Turning steps side -> front -> other side.
    c.turnT -= dt;
    if (c.facing !== c.target && c.turnT <= 0) {
      c.facing += Math.sign(c.target - c.facing);
      c.turnT = 0.09;
      if (c.facing) c.lastSide = c.facing;
    }
    this.chopBody.setTexture(c.facing ? 'chopS' : 'chopF').setFlipX(c.facing < 0);

    if (c.landed) {
      if (inp.y < 0) { c.landed = false; c.vy = -40; }
    } else {
      c.vx = clamp(inp.x ? c.vx + inp.x * 260 * dt : toward(c.vx, 0, 110 * dt), -MAXV, MAXV);
      c.vy = clamp(inp.y ? c.vy + inp.y * 280 * dt : toward(c.vy, 0, 220 * dt), -MAXUP, MAXDOWN);
      c.x = clamp(c.x + c.vx * dt, 16, WORLD - 16);
      c.y += c.vy * dt;
      if (c.y < 26) { c.y = 26; c.vy = 0; }
      if (c.y >= GROUND - 5) this.touchdown();
    }
    c.rot += ((c.landed ? 0 : (c.vx / MAXV) * 0.28) - c.rot) * Math.min(1, dt * 8);
    c.spr.setPosition(c.x, c.y).setRotation(c.rot);
    Sfx.rotor(c.landed ? 0.07 : 0.14, c.landed ? 8 : 11 + Math.abs(c.vy) / 30);

    // Unload at the post office pad.
    if (c.landed && this.atBase() && this.aboard > 0) {
      c.unloadT -= dt;
      if (c.unloadT <= 0) {
        c.unloadT = 0.25;
        this.aboard--;
        c.delivered = true;
        this.spawnHostage(c.x + 4, PO_DOOR, 'base');
      }
    }
    if (c.delivered && this.aboard === 0) {
      c.delivered = false;
      this.trips++;
      this.say(['', 'THE BUNGELINGS ARE ON TO YOU. JETS INCOMING.', 'DRONE AIR MINES LAUNCHED. THEY FOLLOW YOU HOME.'][this.trips] || 'TRIP ' + this.trips + ' COMPLETE', 3000);
    }
  }

  atBase() { return this.chop.landed && Math.abs(this.chop.x - PAD_X) < 44; }

  touchdown() {
    const c = this.chop;
    Object.assign(c, { y: GROUND - 5, vx: 0, vy: 0, landed: true, unloadT: 0.4 });
    const foot = c.facing ? 12 : 9;
    for (const h of this.hostages) if (this.inField(h) && Math.abs(h.x - c.x) < foot) this.killHostage(h);
  }

  fire() {
    const c = this.chop;
    if (this.fireCd > 0 || this.shots.length >= 6 || c.dead) return;
    this.fireCd = 0.16;
    let a, x, y, speed;
    if (c.facing) { // straight out of the nose, following the tilt
      a = c.facing > 0 ? c.rot : Math.PI + c.rot;
      x = c.x + Math.cos(a) * 15; y = c.y + 1 + Math.sin(a) * 15; speed = 330;
    } else { // tank attack posture: fire down, angled toward the direction of travel
      a = Math.PI / 2 - clamp((c.vx / MAXV) * 1.6, -1, 1) * 0.8;
      x = c.x; y = c.y + 6; speed = 250;
    }
    const spr = this.add.image(x, y, 'shot').setRotation(a).setDepth(9);
    this.shots.push({ spr, x, y, vx: Math.cos(a) * speed + c.vx, vy: Math.sin(a) * speed, down: !c.facing });
    Sfx.shoot();
  }

  hitsChopper(x, y, pad = 0) {
    const c = this.chop;
    return !c.dead && Math.abs(x - c.x) < (c.facing ? 14 : 10) + pad && Math.abs(y - c.y) < 5 + pad;
  }

  killChopper() {
    const c = this.chop;
    if (c.dead) return;
    c.dead = true;
    c.delivered = false;
    this.killed += this.aboard;
    this.aboard = 0;
    this.lives--;
    Sfx.rotor(0);
    if (c.landed) this.wreck();
    else { c.falling = true; c.vy = Math.max(c.vy, 0); this.boom(c.x, c.y, 16); }
  }

  wreck() {
    const c = this.chop;
    c.falling = false;
    c.spr.setVisible(false);
    this.boom(c.x, GROUND - 6, 60);
    this.cameras.main.shake(300, 0.012);
    this.blast(c.x, 16);
    this.time.delayedCall(2600, () => {
      if (this.state !== 'play') return;
      if (this.lives > 0) { this.spawnChopper(); this.say('CHOPPER ' + (CHOPPERS - this.lives + 1) + ' OF ' + CHOPPERS); }
      else this.gameOver();
    });
  }

  // ---------- hostages ----------

  inField(h) { return h.state !== 'dead' && h.state !== 'base' && !h.gone; }

  spawnHostage(x, home, state) {
    const spr = this.add.image(x, GROUND, 'hStand').setOrigin(0.5, 1).setDepth(6);
    this.hostages.push({
      spr, x, home, state, goal: home, wait: 0, run: rand(26, 38), stand: rand(14, 30),
      rash: Math.random() < 0.15, phase: rand(0, 10),
      thankAt: state === 'base' && Math.random() < 0.3 ? x + rand(15, 60) : 0,
    });
  }

  killHostage(h) {
    if (h.state === 'dead' || h.gone) return;
    h.state = 'dead';
    this.killed++;
    h.spr.setTexture('hDead').setFlipX(false);
    this.tweens.add({ targets: h.spr, alpha: 0, delay: 1500, duration: 1500, onComplete: () => { h.gone = true; } });
    Sfx.die();
  }

  updateHostages(dt) {
    const c = this.chop, t = this.time.now / 1000;
    for (const h of this.hostages) {
      if (h.state === 'dead' || h.gone) continue;
      let anim = 'stand', goal = null, speed = 0;
      if (h.state === 'base') {
        // A few stop to turn and wave thanks before running inside.
        if (h.thankAt && h.x >= h.thankAt) { h.thankAt = 0; h.wait = 0.9; }
        if (h.wait > 0) { h.wait -= dt; anim = 'wave'; }
        else {
          goal = PO_DOOR; speed = h.run;
          if (h.x >= PO_DOOR - 1) { h.gone = true; this.rescued++; Sfx.rescue(); continue; }
        }
      } else {
        const dx = c.x - h.x, adx = Math.abs(dx);
        if (!c.dead && c.landed && adx < 170 && !this.atBase()) {
          if (this.aboard < CAP) {
            goal = c.x; speed = h.run;
            if (adx < 2.5) { h.gone = true; this.board(); continue; }
          } else anim = 'wave'; // full: they wave you off and wait
        } else if (!c.dead && !c.landed && adx < 110 && c.y > GROUND - 100) {
          // They rush toward a low chopper. Most stop short; the rash ones run right under it.
          goal = c.x - Math.sign(dx) * (h.rash ? 1 : h.stand); speed = h.run;
        } else if (!c.dead && adx < 200) anim = 'wave';
        else {
          h.wait -= dt;
          if (h.wait <= 0) { h.goal = h.home + rand(-40, 40); h.wait = rand(2, 5); }
          goal = h.goal; speed = 9;
        }
      }
      if (goal !== null) {
        const d = goal - h.x;
        if (Math.abs(d) > 1) {
          h.x += Math.sign(d) * Math.min(Math.abs(d), speed * dt);
          anim = 'run';
          h.spr.setFlipX(d < 0);
        } else if (speed > 20) anim = 'wave';
      }
      const f = Math.floor(t * (anim === 'run' ? speed / 3 : 6) + h.phase) % 2;
      h.spr.setTexture(anim === 'run' ? (f ? 'hRun1' : 'hRun2') : anim === 'wave' ? (f ? 'hWave1' : 'hWave2') : 'hStand');
      h.spr.x = h.x;
    }
    this.hostages = sweep(this.hostages);
  }

  board() {
    this.aboard++;
    Sfx.board();
    if (this.aboard === CAP) this.say('16 ABOARD. TAKE THEM HOME.');
  }

  // Kill hostages (and a grounded chopper) caught in a ground explosion.
  blast(x, r) {
    for (const h of this.hostages) if (h.state !== 'dead' && Math.abs(h.x - x) < r) this.killHostage(h);
    if (this.chop.landed && Math.abs(this.chop.x - x) < r + 6) this.killChopper();
  }

  // ---------- enemies ----------

  spawnTank() {
    const cam = this.cameras.main;
    let x = cam.scrollX - 24;
    if (x < 20) x = cam.scrollX + W + 24;
    if (x > FENCE - 40) return;
    const body = this.add.image(0, 0, 'tank');
    const barrel = this.add.image(-1.5, -2.5, 'barrel').setOrigin(0, 0.5).setRotation(-Math.PI / 2);
    const spr = this.add.container(x, GROUND - 3.5, [barrel, body]).setDepth(7);
    this.tanks.push({ spr, body, barrel, x, dir: 1, speed: rand(16, 24) + this.lvl * 2, fireT: rand(1, 2), keep: rand(20, 80) });
  }

  updateTanks(dt) {
    const c = this.chop;
    this.tankT -= dt;
    if (this.tankT <= 0 && this.tanks.length < [2, 3, 3, 4, 5, 6][this.lvl] && !c.dead && c.x < FENCE + 60) {
      this.spawnTank();
      this.tankT = rand(3, 6);
    }
    for (const t of this.tanks) {
      const dx = (!c.dead && c.x < FENCE ? c.x : t.x) - t.x;
      const moving = Math.abs(dx) > t.keep;
      if (moving) { t.dir = Math.sign(dx); t.x = Math.min(t.x + t.dir * t.speed * dt, FENCE - 30); }
      t.body.setFlipX(t.dir < 0);
      t.barrel.x = t.dir > 0 ? -1.5 : 1.5;
      const px = t.x + t.barrel.x, py = GROUND - 6;
      const a = clamp(Math.atan2(Math.min(c.y - py, -1), c.x - px), -Math.PI + 0.02, -0.02);
      t.barrel.rotation = a;
      t.fireT -= dt;
      if (!c.dead && t.fireT <= 0 && Math.abs(c.x - t.x) < 170 && c.y > GROUND - 120) {
        t.fireT = Math.max(0.9, rand(1.8, 2.8) - this.lvl * 0.25);
        const sp = 120 + this.lvl * 12;
        this.addBullet('shell', px + Math.cos(a) * 8, py + Math.sin(a) * 8, Math.cos(a) * sp, Math.sin(a) * sp);
        Sfx.tank();
      }
      // Tanks roll right over hostages.
      if (moving) for (const h of this.hostages) if (this.inField(h) && Math.abs(h.x - t.x) < 7) this.killHostage(h);
      t.spr.x = t.x;
    }
    this.tanks = sweep(this.tanks);
  }

  // Jets "scream out of the background": they grow in from a distance, then attack in the play plane.
  spawnJet() {
    const c = this.chop, dir = Math.random() < 0.5 ? 1 : -1;
    const y = c.landed ? GROUND - rand(70, 110) : clamp(c.y + rand(-6, 6), 30, GROUND - 25);
    const x = c.x - dir * rand(150, 185);
    const spr = this.add.image(x, y, 'jet').setFlipX(dir < 0).setScale(0.15).setAlpha(0.4).setDepth(5);
    this.jets.push({ spr, x, y, vy: 0, dir, t: 0, inPlane: false, shots: this.lvl >= 3 ? 2 : 1, fireT: 0.35, bombed: false });
    Sfx.jet();
  }

  updateJets(dt) {
    const c = this.chop, lvl = this.lvl;
    this.jetT -= dt;
    if (this.jetT <= 0 && this.jets.length < [0, 1, 1, 2, 2, 2][lvl] && !c.dead && c.x < FENCE - 40) {
      this.spawnJet();
      this.jetT = rand(5, 9) - lvl * 0.5;
    }
    for (const j of this.jets) {
      j.t += dt;
      j.fireT -= dt;
      if (!j.inPlane) {
        const k = Math.min(1, j.t / 1.2);
        j.x += j.dir * 40 * dt;
        j.spr.setScale(0.15 + 0.85 * k).setAlpha(0.4 + 0.6 * k);
        if (k === 1) { j.inPlane = true; j.fireT = 0.35; j.spr.setDepth(8); }
      } else {
        const speed = 200 + lvl * 12, ahead = (c.x - j.x) * j.dir;
        j.x += j.dir * speed * dt;
        if (ahead < 110) j.vy = Math.max(j.vy - 200 * dt, -90); // pull up after the pass
        j.y += j.vy * dt;
        if (!c.dead && !c.landed && j.shots > 0 && j.fireT <= 0 && ahead > 50 && ahead < 220 && Math.abs(c.y - j.y) < 40) {
          j.shots--; j.fireT = 0.45;
          const d = Math.hypot(c.x - j.x, c.y - j.y), sp = 180 + lvl * 12;
          this.addBullet('missile', j.x + j.dir * 12, j.y + 2, ((c.x - j.x) / d) * sp, ((c.y - j.y) / d) * sp);
          Sfx.missile();
        }
        if (!c.dead && c.landed && !j.bombed) { // bomb a grounded chopper
          const bvx = j.dir * speed * 0.5, lead = Math.abs(bvx) * Math.sqrt((2 * (GROUND - j.y)) / 220);
          if (Math.abs(ahead - lead) < 8) { j.bombed = true; this.addBullet('bomb', j.x, j.y + 3, bvx, 0); }
        }
        if (this.hitsChopper(j.x, j.y, 5)) { j.gone = true; this.boom(j.x, j.y, 26); this.killChopper(); }
        if (ahead < -W || j.y < -10) j.gone = true;
      }
      j.spr.setPosition(j.x, j.y);
    }
    this.jets = sweep(this.jets);
  }

  // Drone air mines home in on the chopper anywhere, even at the post office.
  updateMines(dt) {
    const c = this.chop, lvl = this.lvl;
    this.mineT -= dt;
    if (this.mineT <= 0 && this.mines.length < [0, 0, 1, 1, 2, 2][lvl] && !c.dead) {
      const x = c.x + rand(-160, 160);
      this.mines.push({ spr: this.add.image(x, -8, 'mine0').setDepth(8), x, y: -8, vx: 0, vy: 20, life: rand(18, 26) });
      this.mineT = rand(8, 13);
    }
    for (const m of this.mines) {
      m.life -= dt;
      if (!c.dead && m.life > 0) {
        const dx = c.x - m.x, dy = c.y - m.y, d = Math.hypot(dx, dy) || 1;
        m.vx += (dx / d) * 90 * dt; m.vy += (dy / d) * 90 * dt;
      } else m.vy -= 90 * dt;
      m.vx *= 1 - 0.5 * dt; m.vy *= 1 - 0.5 * dt;
      const sp = Math.hypot(m.vx, m.vy), max = 50 + lvl * 6;
      if (sp > max) { m.vx *= max / sp; m.vy *= max / sp; }
      m.x += m.vx * dt;
      m.y = Math.min(m.y + m.vy * dt, GROUND - 8);
      m.spr.setPosition(m.x, m.y).setTexture(Math.floor(this.time.now / 120) % 2 ? 'mine0' : 'mine1');
      if (this.hitsChopper(m.x, m.y, 3)) { m.gone = true; this.boom(m.x, m.y, 22); this.killChopper(); }
      if (m.life <= 0 && m.y < -12) m.gone = true;
    }
    this.mines = sweep(this.mines);
  }

  // ---------- projectiles ----------

  addBullet(kind, x, y, vx, vy) {
    const spr = this.add.image(x, y, kind).setDepth(9).setRotation(kind === 'missile' ? Math.atan2(vy, vx) : 0);
    this.bullets.push({ spr, kind, x, y, vx, vy });
  }

  updateBullets(dt) {
    const cam = this.cameras.main;
    for (const b of this.bullets) {
      if (b.gone) continue;
      if (b.kind === 'bomb') b.vy += 220 * dt;
      b.x += b.vx * dt; b.y += b.vy * dt;
      b.spr.setPosition(b.x, b.y);
      if (this.hitsChopper(b.x, b.y, 1)) { b.gone = true; this.boom(b.x, b.y, 12); this.killChopper(); }
      else if (b.y >= GROUND) {
        b.gone = true;
        if (b.kind === 'bomb') { this.boom(b.x, GROUND - 3, 24); this.blast(b.x, 14); } else this.puff(b.x, GROUND);
      } else if (b.y < 10 || b.x < cam.scrollX - 60 || b.x > cam.scrollX + W + 60) b.gone = true;
    }
    this.bullets = sweep(this.bullets);
  }

  updateShots(dt) {
    const cam = this.cameras.main;
    for (const s of this.shots) {
      for (let i = 0; i < 3 && !s.gone; i++) { // sub-steps so fast shots can't skip over a 5px hostage
        s.x += (s.vx * dt) / 3; s.y += (s.vy * dt) / 3;
        this.shotHits(s);
      }
      s.spr.setPosition(s.x, s.y);
      if (s.x < cam.scrollX - 20 || s.x > cam.scrollX + W + 20 || s.y < 10) s.gone = true;
    }
    this.shots = sweep(this.shots);
  }

  shotHits(s) {
    const hit = (o, x, y, rx, ry) => !o.gone && Math.abs(s.x - x) < rx && Math.abs(s.y - y) < ry;
    if (s.y >= GROUND) { s.gone = true; this.puff(s.x, GROUND); return; }
    for (const j of this.jets) if (j.inPlane && hit(j, j.x, j.y, 12, 4)) { s.gone = j.gone = true; this.boom(j.x, j.y, 28); return; }
    for (const m of this.mines) if (hit(m, m.x, m.y, 5, 5)) { s.gone = m.gone = true; this.boom(m.x, m.y, 20); return; }
    // Only the front-facing "tank attack" posture can hit tanks.
    if (s.down) for (const t of this.tanks) if (hit(t, t.x, GROUND - 4, 9, 4)) { s.gone = t.gone = true; this.boom(t.x, GROUND - 4, 30); return; }
    for (const b of this.barracks) if (!b.open && hit(b, b.x, GROUND - 11, 23, 11)) { s.gone = true; this.hitBarracks(b); return; }
    for (const h of this.hostages) if (h.state !== 'dead' && hit(h, h.x, GROUND - 3.5, 2.5, 3.5)) { s.gone = true; this.killHostage(h); return; }
  }

  boom(x, y, n) { this.fx.explode(n, x, y); Sfx.boom(n >= 40); }
  puff(x, y) { this.fx.explode(3, x, y); }

  // ---------- HUD, overlays, flow ----------

  text(x, y, s, size = 8, color = PAL.W, bold = false) {
    return this.add.text(x, y, s, { fontFamily: FONT, fontSize: size + 'px', fontStyle: bold ? 'bold' : '', color, align: 'center' })
      .setOrigin(0.5, 0).setScrollFactor(0).setDepth(30);
  }

  makeHud() {
    this.add.rectangle(0, 0, W, 14, 0x000000).setOrigin(0).setScrollFactor(0).setDepth(20);
    this.add.rectangle(0, 14, W, 1, 0x1d2a3d).setOrigin(0).setScrollFactor(0).setDepth(20);
    // The manual's "lemons": red = killed, blue = aboard, green = rescued.
    this.hud = {};
    [['lemonR', 'killed', PAL.R], ['lemonB', 'aboard', PAL.B], ['lemonG', 'rescued', PAL.G]].forEach(([key, stat, color], i) => {
      const x = W / 2 - 64 + i * 56;
      this.add.image(x, 7, key).setScrollFactor(0).setDepth(21);
      this.hud[stat] = this.text(x + 7, 2, '0', 8, color).setOrigin(0, 0).setDepth(21);
    });
    this.spares = Array.from({ length: CHOPPERS - 1 }, (_, i) => this.add.image(12 + i * 14, 7, 'mini').setScrollFactor(0).setDepth(21));
    this.msg = this.text(W / 2, 40, '', 8, PAL.Y).setWordWrapWidth(W - 40);
    this.pauseText = this.text(W / 2, 96, 'PAUSED', 16, PAL.W, true).setVisible(false);
  }

  updateHud() {
    for (const k of ['killed', 'aboard', 'rescued']) this.hud[k].setText(String(this[k]));
    this.spares.forEach((s, i) => s.setVisible(i < this.lives - 1));
  }

  say(s, ms = 2400) {
    this.tweens.killTweensOf(this.msg);
    this.msg.setText(s).setAlpha(1);
    this.tweens.add({ targets: this.msg, alpha: 0, delay: ms, duration: 500 });
  }

  showOverlay(lines) {
    this.overlay = this.add.container(0, 0).setScrollFactor(0).setDepth(30);
    this.overlay.add(this.add.rectangle(0, 0, W, H, 0x000000, 0.74).setOrigin(0));
    for (const [y, s, size, color, bold] of lines) this.overlay.add(this.text(W / 2, y, s, size, color, bold).setWordWrapWidth(W - 48));
    const go = this.overlay.list[this.overlay.list.length - 1];
    this.tweens.add({ targets: go, alpha: 0.25, yoyo: true, repeat: -1, duration: 500 });
  }

  showTitle() {
    this.showOverlay([
      [26, 'CHOPLIFTER', 24, PAL.W, true],
      [58, "A TRIBUTE TO DAN GORLIN'S 1982 APPLE II GAME", 8, PAL.g],
      [78, 'THE BUNGELING EMPIRE HOLDS 64 HOSTAGES IN FOUR BARRACKS. SHOOT A BARRACKS OPEN, LAND BESIDE THE HOSTAGES (NEVER ON THEM) AND FLY THEM TO THE POST OFFICE. 16 SEATS, 3 CHOPPERS.', 8, PAL.W],
      [128, 'ARROWS FLY  -  Z / SPACE FIRE  -  X / SHIFT TURN', 8, PAL.B],
      [140, 'TAP TURN TO FACE FRONT AND SHOOT TANKS. HOLD IT TO REVERSE.', 8, PAL.B],
      [164, 'P PAUSE  -  M SOUND', 8, PAL.g],
      [184, 'PRESS SPACE TO FLY', 8, PAL.G],
    ]);
    this.overlay.list[1].setShadow(2, 2, PAL.B, 0, false, true);
  }

  startPlay() {
    if (this.overlay) this.overlay.destroy();
    this.state = 'play';
    this.fireCd = 0.4;
    this.say('THE HOSTAGES ARE WEST OF THE FENCE. GO GET THEM.');
  }

  gameOver() {
    if (this.state !== 'play') return;
    this.state = 'over';
    this.readyAt = this.time.now + 1500;
    Sfx.rotor(0);
    const r = this.rescued;
    const verdict = r === TOTAL ? 'EVERY HOSTAGE HOME. A PERFECT RESCUE.'
      : r >= 48 ? "A HERO'S WELCOME AT THE POST OFFICE."
      : r >= 24 ? 'THE DELEGATES WILL REMEMBER YOU.'
      : "BEING A HERO ISN'T EASY, OR EVERYBODY WOULD DO IT.";
    this.showOverlay([
      [48, 'THE END', 24, PAL.W, true],
      [90, 'RESCUED ' + r + '    KILLED ' + this.killed + '    OF ' + TOTAL, 8, PAL.W],
      [110, verdict, 8, PAL.B],
      [160, 'PRESS SPACE TO FLY AGAIN', 8, PAL.G],
    ]);
  }

  togglePause() {
    if (this.state !== 'play') return;
    this.paused = !this.paused;
    this.pauseText.setVisible(this.paused);
    if (this.paused) Sfx.rotor(0);
  }

  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.05);
    const k = this.keys, pad = this.input.gamepad && this.input.gamepad.pad1;
    const padA = !!(pad && pad.A), padPress = padA && !this.padHeld;
    this.padHeld = padA;

    if (this.state !== 'play') {
      this.rotor.setTexture('rotor' + (Math.floor(time / 45) % 4));
      Sfx.rotor(0);
      const go = Phaser.Input.Keyboard.JustDown(k.SPACE) || Phaser.Input.Keyboard.JustDown(k.ENTER) || this.tapped || padPress;
      this.tapped = false;
      if (go && time >= this.readyAt) {
        if (this.state === 'title') this.startPlay(); else this.scene.restart({ play: true });
      }
      return;
    }
    this.tapped = false;
    if (this.paused) return;

    const inp = this.readInput();
    this.handleTurn(inp.turn, dt);
    this.fireCd -= dt;
    if (inp.fire) this.fire();
    this.updateChopper(dt, inp);
    this.updateBarracks(dt);
    this.updateHostages(dt);
    this.updateTanks(dt);
    this.updateJets(dt);
    this.updateMines(dt);
    this.updateShots(dt);
    this.updateBullets(dt);

    const cam = this.cameras.main, c = this.chop;
    const goal = clamp(c.x - W / 2 + c.vx * 0.7, 0, WORLD - W);
    cam.scrollX += (goal - cam.scrollX) * Math.min(1, dt * 3);

    this.updateHud();
    const inside = this.barracks.reduce((n, b) => n + b.inside, 0);
    const loose = this.hostages.filter(h => h.state !== 'dead' && !h.gone).length;
    console.assert(inside + loose + this.aboard + this.rescued + this.killed === TOTAL, 'hostage count drifted');
    if (!this.ending && this.rescued + this.killed === TOTAL) {
      this.ending = true;
      this.time.delayedCall(2000, () => this.gameOver());
    }
  }
}

// Wait (briefly) for the pixel font so canvas text doesn't render in the fallback face.
const fontsReady = Promise.all([document.fonts.load('8px Silkscreen'), document.fonts.load('bold 24px Silkscreen')]).catch(() => {});
Promise.race([fontsReady, new Promise(r => setTimeout(r, 1500))]).then(() => {
  window.game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: W,
    height: H,
    backgroundColor: '#000000',
    pixelArt: true,
    input: { gamepad: true },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: Chop,
  });
});
