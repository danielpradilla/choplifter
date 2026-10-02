import { Mission, BARRACKS, CAPACITY } from './mission.js';

const $ = id => document.getElementById(id);
const WIDTH = 1200, HEIGHT = 570, WORLD = 4400, GROUND = 440, LAND = 417;
const BASE = 4080, BORDER = 3830;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const pad = n => String(n).padStart(2, '0');
const touch = {};
let scene, muted = false, best = 0, resumeAfterManual = false;
try { best = Number(localStorage.getItem('choplifter-best')) || 0; } catch {}
$('best').textContent = pad(best);

class Audio {
  start() {
    if (!this.context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.connect(this.context.destination);
      this.master.gain.value = muted ? 0 : .22;
      const buffer = this.context.createBuffer(1, this.context.sampleRate * 2, this.context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.noise = buffer;
      const rotor = this.context.createBufferSource();
      rotor.buffer = buffer;
      rotor.loop = true;
      const filter = this.context.createBiquadFilter();
      filter.type = 'lowpass'; filter.frequency.value = 230;
      this.rotorGain = this.context.createGain(); this.rotorGain.gain.value = .12;
      this.rotorGate = this.context.createGain(); this.rotorGate.gain.value = 0;
      rotor.connect(filter).connect(this.rotorGain).connect(this.rotorGate).connect(this.master);
      const pulse = this.context.createOscillator();
      const pulseGain = this.context.createGain();
      pulse.frequency.value = 24; pulseGain.gain.value = .045;
      pulse.connect(pulseGain).connect(this.rotorGain.gain);
      pulse.start(); rotor.start();
    }
    this.context.resume().catch(() => {});
  }
  rotor(active) {
    if (this.context) this.rotorGate.gain.setTargetAtTime(active ? 1 : 0, this.context.currentTime, .1);
  }
  tone(frequency, duration = .08, type = 'square', end = frequency) {
    if (!this.context || muted) return;
    const now = this.context.currentTime;
    const source = this.context.createOscillator(), gain = this.context.createGain();
    source.type = type; source.frequency.setValueAtTime(frequency, now);
    source.frequency.exponentialRampToValueAtTime(Math.max(1, end), now + duration);
    gain.gain.setValueAtTime(.15, now); gain.gain.exponentialRampToValueAtTime(.001, now + duration);
    source.connect(gain).connect(this.master); source.start(); source.stop(now + duration);
  }
  boom() {
    if (!this.context || muted) return;
    const now = this.context.currentTime, source = this.context.createBufferSource();
    const gain = this.context.createGain(); source.buffer = this.noise;
    gain.gain.setValueAtTime(.6, now); gain.gain.exponentialRampToValueAtTime(.001, now + .5);
    source.connect(gain).connect(this.master); source.start(); source.stop(now + .5);
  }
  mute() { if (this.context) this.master.gain.value = muted ? 0 : .22; }
}
const audio = new Audio();

function makeTextures(s) {
  const rect = (g, x, y, w, h, color) => g.fillStyle(color).fillRect(x, y, w, h);
  const texture = (key, w, h, draw) => {
    const g = s.make.graphics({ x: 0, y: 0, add: false });
    draw(g); g.generateTexture(key, w, h); g.destroy();
  };
  texture('heli', 100, 48, g => {
    rect(g, 4, 19, 44, 6, 0xc9d6cf); rect(g, 4, 9, 6, 15, 0xc9d6cf);
    rect(g, 9, 14, 8, 3, 0xe7ece1); rect(g, 38, 12, 44, 22, 0xe7ece1);
    rect(g, 80, 17, 12, 13, 0xe7ece1); rect(g, 48, 6, 18, 8, 0xa9b9b3);
    rect(g, 60, 14, 18, 11, 0x69b8ba); rect(g, 82, 18, 7, 9, 0x438791);
    rect(g, 42, 17, 12, 12, 0x92aaa4); rect(g, 46, 18, 6, 9, 0x233a45);
    rect(g, 55, 27, 34, 3, 0xe39559); rect(g, 49, 33, 3, 7, 0x9baba4);
    rect(g, 79, 32, 3, 8, 0x9baba4); rect(g, 36, 40, 55, 3, 0xd7ded3);
    rect(g, 89, 29, 9, 3, 0x667d78); rect(g, 26, 21, 5, 2, 0xe39559);
  });
  texture('front', 100, 48, g => {
    rect(g, 37, 11, 28, 23, 0xe7ece1); rect(g, 42, 7, 18, 5, 0xb9c8be);
    rect(g, 39, 15, 11, 12, 0x68b7b9); rect(g, 53, 15, 10, 12, 0x68b7b9);
    rect(g, 39, 28, 24, 4, 0xe39559); rect(g, 43, 33, 3, 7, 0x9baba4);
    rect(g, 57, 33, 3, 7, 0x9baba4); rect(g, 30, 40, 17, 3, 0xd7ded3);
    rect(g, 56, 40, 17, 3, 0xd7ded3); rect(g, 48, 33, 5, 5, 0x667d78);
  });
  for (let frame = 0; frame < 3; frame++) texture(`person${frame}`, 16, 24, g => {
    rect(g, 6, 2, 5, 5, 0xe4d2ad); rect(g, 5, 8, 7, 8, 0xd5e5cb);
    if (frame === 0) { rect(g, 2, 4, 3, 8, 0xd5e5cb); rect(g, 12, 3, 3, 9, 0xd5e5cb); }
    else { rect(g, 2, 10, 3, 6, 0xc0d3b5); rect(g, 12, 9, 3, 5, 0xc0d3b5); }
    rect(g, frame === 2 ? 3 : 5, 16, 3, 7, 0x92aea2);
    rect(g, frame === 1 ? 11 : 9, 16, 3, 7, 0x92aea2);
  });
  texture('tank', 70, 34, g => {
    rect(g, 7, 20, 58, 12, 0x263832); rect(g, 10, 15, 52, 10, 0x788361);
    rect(g, 24, 7, 25, 10, 0x9a9f79); rect(g, 44, 10, 26, 4, 0xa8ab82);
    rect(g, 13, 15, 46, 3, 0xa4a986); rect(g, 16, 23, 8, 5, 0x667059);
    rect(g, 29, 23, 8, 5, 0x667059); rect(g, 43, 23, 8, 5, 0x667059);
    rect(g, 54, 23, 7, 5, 0x667059);
  });
  texture('jet', 92, 32, g => {
    rect(g, 8, 13, 66, 9, 0x9abcb9); rect(g, 74, 15, 16, 5, 0xc4d9cd);
    rect(g, 4, 4, 8, 17, 0x628d8f); rect(g, 38, 3, 13, 27, 0x71a3a3);
    rect(g, 52, 9, 18, 5, 0x345b69); rect(g, 0, 15, 6, 5, 0xe6ac66);
  });
  texture('mine', 28, 28, g => {
    rect(g, 5, 5, 18, 18, 0xa68b54); rect(g, 2, 10, 24, 8, 0xa68b54);
    rect(g, 10, 2, 8, 24, 0xa68b54); rect(g, 7, 8, 14, 12, 0x354c49);
    rect(g, 11, 11, 6, 6, 0xee9765);
  });
  for (const open of [false, true]) texture(open ? 'barracks-open' : 'barracks', 144, 76, g => {
    rect(g, 4, 20, 136, 54, 0x5e736d); rect(g, 0, 16, 144, 7, 0x8a9a89);
    rect(g, 14, 7, 116, 10, 0x788b7d); rect(g, 25, 2, 94, 5, 0x81907f);
    for (let x = 14; x < 130; x += 28) {
      rect(g, x, 32, 16, 13, 0x223a3e); rect(g, x + 6, 32, 3, 13, 0x7c8f81);
    }
    for (let y = 52; y < 73; y += 10) rect(g, 6, y, 132, 1, 0x4c655e);
    rect(g, 62, 48, 20, 26, 0x203237); rect(g, 62, 48, 20, 3, 0xa89567);
    if (open) {
      rect(g, 55, 22, 28, 52, 0x1a2c31); rect(g, 45, 39, 46, 17, 0x1a2c31);
      rect(g, 78, 18, 14, 13, 0x1a2c31); rect(g, 12, 69, 22, 5, 0xa09778);
      rect(g, 86, 68, 33, 6, 0xa09778);
    } else { rect(g, 63, 54, 18, 14, 0x807752); }
  });
}

class RescueScene extends Phaser.Scene {
  constructor() { super('rescue'); }
  create() {
    scene = this;
    makeTextures(this);
    this.keys = this.input.keyboard.addKeys('UP,DOWN,LEFT,RIGHT,W,A,S,D,SPACE,X,Z');
    this.input.keyboard.addCapture('UP,DOWN,LEFT,RIGHT,SPACE');
    this.cameras.main.setBounds(0, 0, WORLD, HEIGHT);
    this.drawWorld();
    this.effects = this.add.group();
    this.rotor = this.add.graphics().setDepth(21);
    this.shadow = this.add.ellipse(BASE, GROUND - 1, 70, 7, 0x091916, .38).setDepth(5);
    this.player = this.add.image(BASE, LAND, 'heli').setDepth(20).setFlipX(true);
    this.radar = this.add.graphics().setScrollFactor(0).setDepth(40);
    this.radarTitle = this.add.text(24, 518, 'SECTOR RADAR', { fontFamily: 'monospace', fontSize: '9px', color: '#8da7a6' }).setScrollFactor(0).setDepth(41);
    this.radarBase = this.add.text(1174, 518, 'HOME →', { fontFamily: 'monospace', fontSize: '9px', color: '#8ad1a6' }).setOrigin(1, 0).setScrollFactor(0).setDepth(41);
    this.telemetry = this.add.text(24, 24, '', { fontFamily: 'monospace', fontSize: '10px', color: '#a5c3c5', lineSpacing: 7 }).setScrollFactor(0).setDepth(30);
    this.homeArrow = this.add.text(1176, 26, '', { fontFamily: 'monospace', fontSize: '10px', color: '#91c7a6' }).setOrigin(1, 0).setScrollFactor(0).setDepth(30);
    this.resetMission();
    this.phase = 'ready';
    this.input.keyboard.enabled = false;
    this.input.keyboard.disableGlobalCapture();
    $('launch-button').disabled = false;
    $('launch-button').textContent = 'Launch mission  →';
  }

  drawWorld() {
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x101d2b).setScrollFactor(0);
    const stars = this.add.graphics().setScrollFactor(.08);
    const random = new Phaser.Math.RandomDataGenerator(['choplifter-night']);
    for (let i = 0; i < 230; i++) {
      stars.fillStyle(i % 3 === 0 ? 0x91aaa9 : 0x517278, random.frac() * .5 + .25);
      stars.fillRect(random.between(0, 1700), random.between(12, 330), i % 7 === 0 ? 3 : 2, 2);
    }
    const moon = this.add.graphics().setScrollFactor(.05);
    moon.fillStyle(0x89afb0, .035).fillCircle(1090, 125, 61);
    moon.fillStyle(0xc0cbb0).fillCircle(1090, 125, 28);
    moon.fillStyle(0x9eafa0).fillRect(1075, 111, 13, 7).fillRect(1095, 131, 13, 9).fillRect(1072, 128, 6, 5);
    for (const [color, height, factor] of [[0x203b43, 115, .18], [0x284746, 78, .4], [0x304d46, 48, .65]]) {
      const g = this.add.graphics().setScrollFactor(factor);
      const points = [{ x: 0, y: GROUND }];
      for (let x = 0; x <= WORLD + WIDTH; x += 120) points.push({ x, y: GROUND - random.between(height / 3, height) });
      points.push({ x: WORLD + WIDTH, y: GROUND });
      g.fillStyle(color).fillPoints(points, true);
    }
    const ground = this.add.graphics().setDepth(2);
    ground.fillStyle(0x415c4b).fillRect(0, GROUND, WORLD, 5);
    ground.fillStyle(0x243a32).fillRect(0, GROUND + 5, WORLD, 64);
    ground.fillStyle(0x334b3b);
    for (let i = 0; i < 700; i++) ground.fillRect(random.between(0, WORLD), random.between(GROUND + 9, 500), random.between(2, 12), 2);
    const fence = this.add.graphics().setDepth(3);
    fence.lineStyle(1, 0x88947b, .65);
    for (let x = BORDER; x < WORLD; x += 24) {
      fence.lineBetween(x, GROUND, x, GROUND - 24);
      fence.lineBetween(x, GROUND - 18, x + 24, GROUND - 12);
      fence.lineBetween(x, GROUND - 12, x + 24, GROUND - 18);
    }
    fence.fillStyle(0x8da08b).fillRect(BORDER, GROUND - 95, 4, 95);
    fence.fillStyle(0xc89362).fillRect(BORDER + 4, GROUND - 92, 54, 19);
    this.add.text(BORDER + 10, GROUND - 87, 'BORDER', { fontFamily: 'monospace', fontSize: '9px', color: '#263a36' }).setDepth(4);
    const home = this.add.graphics().setDepth(4);
    home.fillStyle(0x486e55).fillRect(BASE - 106, GROUND - 2, 204, 5);
    home.fillStyle(0x8ac797).fillRect(BASE - 96, GROUND - 2, 184, 2);
    for (let x = BASE - 100; x < BASE + 100; x += 22) home.fillStyle(0xcee1b4).fillRect(x, GROUND + 2, 8, 2);
    home.fillStyle(0x34463f).fillRect(BASE + 112, GROUND - 75, 166, 74);
    home.fillStyle(0x6e8578).fillRect(BASE + 105, GROUND - 79, 178, 8);
    home.fillStyle(0x62796b).fillRect(BASE + 120, GROUND - 61, 148, 5);
    for (let x = BASE + 130; x < BASE + 264; x += 28) home.fillStyle(0xb6c197).fillRect(x, GROUND - 47, 18, 14);
    home.fillStyle(0x192e2d).fillRect(BASE + 179, GROUND - 29, 22, 28);
    home.fillStyle(0x748b7b).fillRect(BASE + 253, GROUND - 116, 3, 39);
    home.fillStyle(0x9abbb0).fillRect(BASE + 256, GROUND - 114, 23, 13);
    this.add.text(BASE + 146, GROUND - 72, 'POST OFFICE', { fontFamily: 'monospace', fontSize: '9px', color: '#d1d6c2' }).setDepth(5);
    this.add.text(BASE, GROUND + 22, 'H O M E   B A S E', { fontFamily: 'monospace', fontSize: '11px', color: '#b2c9a5' }).setOrigin(.5).setDepth(5);
    this.add.text(BASE, GROUND - 58, '↓ LAND TO UNLOAD', { fontFamily: 'monospace', fontSize: '10px', color: '#8ab995' }).setOrigin(.5).setDepth(5);
  }

  resetMission() {
    for (const list of [this.people, this.buildings, this.enemies, this.shots]) {
      if (list) for (const item of list) { item.sprite?.destroy(); item.label?.destroy(); item.marker?.destroy(); }
    }
    this.effects.clear(true, true);
    this.mission = new Mission();
    this.people = this.mission.hostages.map(h => ({ hostage: h, sprite: this.add.image(h.x, GROUND, 'person0').setOrigin(.5, 1).setDepth(9).setVisible(h.state === 'waiting') }));
    this.buildings = BARRACKS.map((x, index) => ({
      x, index, health: index === 0 ? 0 : 3,
      sprite: this.add.image(x, GROUND, index === 0 ? 'barracks-open' : 'barracks').setOrigin(.5, 1).setDepth(6),
      label: this.add.text(x, GROUND + 22, '', { fontFamily: 'monospace', fontSize: '9px', color: '#9eb49e' }).setOrigin(.5).setDepth(6),
      marker: this.add.text(x + 260, GROUND - 34, '↓ PICKUP', { fontFamily: 'monospace', fontSize: '9px', color: '#8dc6b7' }).setOrigin(.5).setDepth(6),
    }));
    this.enemies = []; this.shots = [];
    this.elapsed = 0; this.nextTank = 7; this.nextJet = 0; this.nextMine = 0;
    this.fireTimer = 0; this.boardTimer = 0; this.unloadTimer = 0; this.hudTimer = 0;
    this.resetPlayer(); this.updateHud(); this.renderFlight(0);
  }

  resetPlayer() {
    this.player.setPosition(BASE, LAND).setVisible(true).setAlpha(1);
    this.vx = 0; this.vy = 0; this.facing = -1; this.lastSide = -1; this.grounded = true;
    this.invulnerable = 2.5; this.rotor.setVisible(true);
    this.cameras.main.scrollX = WORLD - WIDTH;
    this.clearInput();
  }
  clearInput() {
    for (const key of Object.values(this.keys)) key.reset();
    for (const name of Object.keys(touch)) touch[name] = false;
    document.querySelectorAll('.touch-controls .active').forEach(button => button.classList.remove('active'));
  }
  begin() {
    this.resetMission(); this.phase = 'playing';
    this.input.keyboard.enabled = true;
    this.input.keyboard.enableGlobalCapture();
    $('overlay').hidden = true; $('pause-button').disabled = false;
    $('status-label').textContent = 'Sortie 01 / In flight';
    audio.start(); audio.rotor(true);
    this.radio('Head west. The first group is already free. Land in a clear spot beside them.');
    $('game').focus({ preventScroll: true });
    if ($('game-viewport').getBoundingClientRect().bottom > innerHeight) {
      document.querySelector('.flight-deck').scrollIntoView({ block: 'start' });
    }
  }
  radio(message) { $('radio-message').textContent = message; }
  turn() { this.facing = this.lastSide = -this.lastSide; audio.tone(180, .05, 'triangle', 260); }
  groundAttack() { this.facing = this.facing === 0 ? this.lastSide : 0; audio.tone(180, .05, 'triangle', 260); }

  update(_time, delta) {
    const dt = Math.min(delta / 1000, .04);
    if (this.phase === 'playing') {
      this.elapsed += dt; this.invulnerable -= dt;
      this.fireTimer -= dt; this.boardTimer -= dt; this.unloadTimer -= dt;
      if (Phaser.Input.Keyboard.JustDown(this.keys.X)) this.groundAttack();
      if (Phaser.Input.Keyboard.JustDown(this.keys.Z)) this.turn();
      this.fly(dt);
      if (this.phase === 'playing') {
        this.updatePeople(dt); this.updateEnemies(dt); this.updateShots(dt);
        if (this.mission.finished) this.finish();
      }
      this.hudTimer -= dt;
      if (this.hudTimer <= 0) { this.updateHud(); this.hudTimer = .1; }
    } else if (this.phase === 'crashed') {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        if (this.mission.finished) this.finish();
        else {
          this.resetPlayer(); this.phase = 'playing'; audio.rotor(true);
          $('status-label').textContent = `Sortie ${pad(4 - this.mission.lives)} / In flight`;
          $('pause-button').disabled = false;
          this.radio(`Helicopter ${4 - this.mission.lives} ready. Your rescued hostages are safe. Head west again.`);
          if ($('manual').open) { resumeAfterManual = true; this.pause(); }
        }
      }
    }
    this.renderFlight(_time);
  }

  fly(dt) {
    const k = this.keys, p = this.player;
    const horizontal = Number(Boolean(k.RIGHT.isDown || k.D.isDown || touch.right)) - Number(Boolean(k.LEFT.isDown || k.A.isDown || touch.left));
    const vertical = Number(Boolean(k.DOWN.isDown || k.S.isDown || touch.down)) - Number(Boolean(k.UP.isDown || k.W.isDown || touch.up));
    this.vx = horizontal ? clamp(this.vx + horizontal * 580 * dt, -310, 310) : this.vx * Math.exp(-5 * dt);
    this.vy = vertical ? clamp(this.vy + vertical * 430 * dt, -180, 180) : this.vy * Math.exp(-6 * dt);
    const wasGrounded = p.y >= LAND;
    p.x = clamp(p.x + this.vx * dt, 46, WORLD - 70);
    p.y = clamp(p.y + this.vy * dt, 55, LAND);
    if (p.y === LAND && !wasGrounded) {
      for (const h of this.people) if (h.hostage.state === 'waiting' && Math.abs(h.hostage.x - p.x) < 25) this.losePerson(h);
      this.vy = 0;
      audio.tone(90, .07, 'triangle');
    }
    if (p.y === LAND && this.vy > 0) this.vy = 0;
    if (p.y === 55 && this.vy < 0) this.vy = 0;
    this.grounded = p.y === LAND && Math.abs(this.vx) < 35;
    if ((k.SPACE.isDown || touch.fire) && this.fireTimer <= 0) {
      const down = this.facing === 0;
      this.shoot(p.x + (down ? 0 : this.facing * 39), p.y + 2, down ? this.vx * .25 : this.facing * 700, down ? 140 : 0, true, down);
      this.fireTimer = down ? .38 : .15;
      audio.tone(down ? 150 : 320, .055, 'square', down ? 60 : 100);
    }
  }

  updatePeople(dt) {
    const p = this.player;
    const atBase = Math.abs(p.x - BASE) < 82;
    let aboard = this.mission.counts.aboard;
    for (const person of this.people) {
      const h = person.hostage;
      person.sprite.setVisible(h.state === 'waiting');
      if (h.state !== 'waiting') continue;
      const boarding = this.grounded && !atBase && aboard < CAPACITY && Math.abs(h.x - p.x) < 370;
      if (boarding) {
        h.x += Math.sign(p.x - h.x) * Math.min(Math.abs(p.x - h.x), dt * 60);
        person.sprite.setTexture(`person${1 + Math.floor(this.elapsed * 8 + h.x / 10) % 2}`).setFlipX(h.x > p.x);
        if (Math.abs(h.x - p.x) < 28 && this.boardTimer <= 0 && this.mission.board(h)) {
          aboard++; this.boardTimer = .27; person.sprite.setVisible(false);
          audio.tone(540, .045, 'triangle', 740);
          this.radio(aboard === CAPACITY ? 'Cabin full. Take off and return right to the green home pad.' : `Boarding ${pad(aboard)} / 16. Hold your position.`);
        }
      } else person.sprite.setTexture(Math.floor(this.elapsed * 2 + h.x) % 3 === 0 ? 'person1' : 'person0');
      person.sprite.x = h.x;
    }
    if (this.grounded && atBase && aboard > 0 && this.unloadTimer <= 0) {
      this.mission.unload(); this.unloadTimer = .2;
      const saved = this.add.image(p.x + 28, GROUND, 'person1').setOrigin(.5, 1).setDepth(9);
      this.effects.add(saved);
      this.tweens.add({ targets: saved, x: BASE + 190, duration: 2300, onComplete: () => saved.destroy() });
      audio.tone(720, .065, 'triangle', 1000);
      const c = this.mission.counts;
      this.radio(c.aboard ? `Welcome home. Unloading… ${pad(c.aboard)} still aboard.` : `${c.rescued} safely rescued. ${64 - c.rescued - c.lost} still need you. Head west.`);
      if (!c.aboard) this.popup(BASE, LAND - 55, 'SAFELY HOME', '#a0d3ad');
    }
  }

  spawnEnemy(type) {
    const p = this.player;
    const x = clamp(p.x - (type === 'tank' ? 650 : 850), 100, BORDER - 200);
    const y = type === 'tank' ? GROUND - 16 : type === 'jet' ? Phaser.Math.Between(90, 230) : 95;
    const enemy = { type, x, y, vx: type === 'jet' ? 245 : 0, vy: 0, health: type === 'mine' ? 2 : 1, cooldown: 2,
      sprite: this.add.image(x, y, type).setDepth(type === 'tank' ? 8 : 16) };
    this.enemies.push(enemy);
    if (type === 'jet') this.radio('Enemy jet inbound. Stay mobile and fire sideways to shoot it down.');
    if (type === 'mine') this.radio('Homing mine detected. It can follow you across the border.');
  }

  updateEnemies(dt) {
    const p = this.player, rescued = this.mission.counts.rescued;
    if (this.elapsed >= this.nextTank) {
      if (this.enemies.filter(e => e.type === 'tank').length < 4) this.spawnEnemy('tank');
      this.nextTank = this.elapsed + Math.max(12, 24 - rescued / 8);
    }
    if (rescued >= 16 && this.elapsed >= this.nextJet) {
      if (this.enemies.filter(e => e.type === 'jet').length < 2) this.spawnEnemy('jet');
      this.nextJet = this.elapsed + 21;
    }
    if (rescued >= 32 && this.elapsed >= this.nextMine) {
      if (this.enemies.filter(e => e.type === 'mine').length < 2) this.spawnEnemy('mine');
      this.nextMine = this.elapsed + 25;
    }
    for (const e of [...this.enemies]) {
      e.cooldown -= dt;
      if (e.type === 'tank') {
        const direction = Math.sign(p.x - e.x);
        e.x = clamp(e.x + direction * 17 * dt, 40, BORDER - 50);
        e.sprite.setFlipX(direction < 0);
        let target = p.x < BORDER && p.y > GROUND - 175 && Math.abs(p.x - e.x) < 650 ? p : null;
        if (!target && this.elapsed > 22) {
          const person = this.people.find(h => h.hostage.state === 'waiting' && Math.abs(h.hostage.x - e.x) < 250);
          if (person) target = { x: person.hostage.x, y: GROUND - 10 };
        }
        if (target && e.cooldown <= 0) {
          const angle = Math.atan2(target.y - e.y, target.x - e.x);
          this.shoot(e.x, e.y - 6, Math.cos(angle) * 155, Math.sin(angle) * 155, false);
          e.cooldown = 3.6;
        }
        for (const h of this.people) if (h.hostage.state === 'waiting' && Math.abs(h.hostage.x - e.x) < 18) this.losePerson(h);
      } else if (e.type === 'jet') {
        e.x += e.vx * dt;
        if (e.x > BORDER - 45) { this.removeEnemy(e); continue; }
        if (p.x < BORDER && Math.abs(e.x - p.x) < 750 && e.cooldown <= 0) {
          const angle = Math.atan2(p.y - e.y, p.x - e.x);
          this.shoot(e.x + 30, e.y, Math.cos(angle) * 230, Math.sin(angle) * 230, false);
          e.cooldown = 2.3;
        }
      } else {
        const angle = Math.atan2(p.y - e.y, p.x - e.x);
        e.vx += (Math.cos(angle) * 94 - e.vx) * dt * 1.5;
        e.vy += (Math.sin(angle) * 94 - e.vy) * dt * 1.5;
        e.x += e.vx * dt; e.y = clamp(e.y + e.vy * dt, 50, LAND);
        e.sprite.rotation += dt * 1.3;
      }
      e.sprite.setPosition(e.x, e.y);
      if (Math.abs(p.x - e.x) < (e.type === 'mine' ? 33 : 46) && Math.abs(p.y - e.y) < 25 && this.invulnerable <= 0) {
        this.explosion(e.x, e.y); this.removeEnemy(e); this.crash('Aircraft collision. Keep some distance from enemy vehicles.'); return;
      }
    }
  }

  shoot(x, y, vx, vy, friendly, bomb = false) {
    const sprite = this.add.rectangle(x, y, bomb ? 5 : friendly ? 10 : 6, bomb ? 9 : 3, friendly ? 0xf1dd9b : 0xeaa373).setDepth(18);
    if (!bomb) sprite.rotation = Math.atan2(vy, vx);
    this.shots.push({ x, y, vx, vy, friendly, bomb, life: 3.5, sprite });
  }
  updateShots(dt) {
    for (const shot of [...this.shots]) {
      if (!this.shots.includes(shot)) continue;
      const oldX = shot.x, oldY = shot.y;
      if (shot.bomb) shot.vy += 260 * dt;
      shot.x += shot.vx * dt; shot.y += shot.vy * dt; shot.life -= dt;
      shot.sprite.setPosition(shot.x, shot.y);
      const line = new Phaser.Geom.Line(oldX, oldY, shot.x, shot.y);
      const hits = (x, y, w, h) => Phaser.Geom.Intersects.LineToRectangle(line, new Phaser.Geom.Rectangle(x - w / 2, y - h / 2, w, h));
      let hit = false;
      if (shot.friendly) {
        const enemy = this.enemies.find(e => (e.type !== 'tank' || shot.bomb) && hits(e.x, e.y, e.type === 'jet' ? 75 : 48, 28));
        if (enemy) {
          enemy.health--; hit = true;
          if (enemy.health <= 0) { this.explosion(enemy.x, enemy.y); this.removeEnemy(enemy); }
          else enemy.sprite.setTint(0xffddaa);
        }
        if (!hit && !shot.bomb) {
          const missile = this.shots.find(s => !s.friendly && hits(s.x, s.y, 16, 14));
          if (missile) { this.removeShot(missile); hit = true; this.spark(shot.x, shot.y); }
        }
      } else if (this.invulnerable <= 0 && hits(this.player.x, this.player.y, 52, 26)) {
        this.removeShot(shot); this.crash('Enemy fire hit the helicopter. Change altitude and keep moving.'); return;
      }
      if (!hit) {
        const building = this.buildings.find(b => b.health > 0 && hits(b.x, GROUND - 31, 134, 63));
        if (building) { this.damageBuilding(building); hit = true; this.spark(shot.x, shot.y); }
      }
      if (!hit) {
        const person = this.people.find(h => h.hostage.state === 'waiting' && hits(h.hostage.x, GROUND - 10, 10, 20));
        if (person) { this.losePerson(person); hit = true; }
      }
      if (shot.y >= GROUND && shot.bomb) {
        this.explosion(shot.x, GROUND - 5, 12);
        for (const e of [...this.enemies]) if (e.type === 'tank' && Math.abs(e.x - shot.x) < 48) this.removeEnemy(e);
        for (const h of this.people) if (h.hostage.state === 'waiting' && Math.abs(h.hostage.x - shot.x) < 33) this.losePerson(h);
        hit = true;
      }
      if (hit || shot.life <= 0 || shot.y >= GROUND || shot.x < 0 || shot.x > WORLD) this.removeShot(shot);
    }
  }
  damageBuilding(building) {
    building.health--;
    if (building.health === 0) {
      building.sprite.setTexture('barracks-open'); this.mission.open(building.index);
      this.explosion(building.x, GROUND - 42, 16);
      this.popup(building.x, GROUND - 100, 'HOSTAGES FREE', '#b5dbb6');
      this.radio('Barracks open. Land beside the group, clear of the people.');
    } else {
      building.sprite.setTint(0xe6c3a0);
      this.time.delayedCall(100, () => { if (building.sprite.active) building.sprite.clearTint(); });
    }
  }
  losePerson(person) {
    if (!this.mission.lose(person.hostage)) return;
    person.sprite.setVisible(false); this.spark(person.hostage.x, GROUND - 10);
    this.radio('Hostage lost. Keep your landing area clear and watch your fire.');
  }
  removeEnemy(enemy) {
    enemy.sprite.destroy(); this.enemies = this.enemies.filter(e => e !== enemy);
  }
  removeShot(shot) {
    shot.sprite.destroy(); this.shots = this.shots.filter(s => s !== shot);
  }
  spark(x, y) { this.explosion(x, y, 4, false); }
  explosion(x, y, count = 26, sound = true) {
    if (sound) audio.boom();
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2, distance = 15 + Math.random() * 65;
      const size = 2 + Math.floor(Math.random() * 4) * 2;
      const particle = this.add.rectangle(x, y, size, size, [0xe8b064, 0xd57e50, 0xf3d797, 0x617569][i % 4]).setDepth(23);
      this.effects.add(particle);
      this.tweens.add({ targets: particle, x: x + Math.cos(angle) * distance, y: y + Math.sin(angle) * distance,
        alpha: 0, duration: 350 + Math.random() * 450, onComplete: () => particle.destroy() });
    }
  }
  popup(x, y, text, color) {
    const label = this.add.text(x, y, text, { fontFamily: 'monospace', fontSize: '11px', color }).setOrigin(.5).setDepth(24);
    this.effects.add(label);
    this.tweens.add({ targets: label, y: y - 25, alpha: 0, delay: 650, duration: 700, onComplete: () => label.destroy() });
  }
  crash(message) {
    if (this.phase !== 'playing') return;
    const passengers = this.mission.counts.aboard;
    this.mission.crash(); this.phase = 'crashed'; this.respawnTimer = 2;
    this.explosion(this.player.x, this.player.y, 42); this.cameras.main.shake(230, .006);
    this.player.setVisible(false); this.rotor.setVisible(false); audio.rotor(false);
    for (const shot of [...this.shots]) this.removeShot(shot);
    $('pause-button').disabled = true;
    $('status-label').textContent = 'Helicopter lost';
    this.radio(`${message}${passengers ? ` ${passengers} passengers lost.` : ''} ${this.mission.lives} helicopters remaining.`);
    this.updateHud();
  }
  pause() {
    if (!['playing', 'paused'].includes(this.phase)) return;
    if (this.phase === 'paused') {
      this.phase = 'playing'; this.tweens.resumeAll(); $('overlay').hidden = true; audio.rotor(true);
      this.input.keyboard.enabled = true;
      this.input.keyboard.enableGlobalCapture();
      $('status-label').textContent = `Sortie ${pad(4 - this.mission.lives)} / In flight`;
      $('pause-button').setAttribute('aria-label', 'Pause game');
      $('pause-button').innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>';
      $('game').focus({ preventScroll: true });
    } else {
      this.phase = 'paused'; this.tweens.pauseAll(); this.clearInput(); audio.rotor(false);
      this.input.keyboard.enabled = false;
      this.input.keyboard.disableGlobalCapture();
      $('status-label').textContent = 'Flight paused';
      $('overlay-title').textContent = 'Holding position.';
      $('overlay-description').textContent = 'Take a breath. Your helicopter, passengers, and enemies are right where you left them.';
      $('briefing-facts').hidden = true; $('overlay').hidden = false;
      $('launch-button').textContent = 'Resume flight  →';
      $('pause-button').setAttribute('aria-label', 'Resume game');
      $('pause-button').innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7z"/></svg>';
      $('launch-button').focus({ preventScroll: true });
    }
  }
  finish() {
    if (this.phase === 'ended') return;
    this.phase = 'ended'; audio.rotor(false); this.clearInput();
    this.input.keyboard.enabled = false;
    this.input.keyboard.disableGlobalCapture();
    const { rescued, lost, captive, waiting } = this.mission.counts;
    $('status-label').textContent = rescued === 64 ? 'Perfect rescue' : 'Mission ended';
    $('overlay-title').textContent = rescued === 64 ? 'Everyone home.' : rescued + lost === 64 ? 'Mission complete.' : 'Last helicopter down.';
    $('overlay-description').textContent = `${rescued} hostages made it home. ${lost} were lost.${captive + waiting ? ` ${captive + waiting} remain behind enemy lines.` : ''}${rescued === 64 ? ' A perfect rescue. Well flown, pilot.' : ' Every rescue counts. Try another sortie.'}`;
    $('briefing-facts').hidden = true; $('overlay').hidden = false;
    $('launch-button').textContent = 'Fly another mission  →'; $('pause-button').disabled = true;
    $('launch-button').focus({ preventScroll: true });
    this.updateHud(); audio.tone(rescued === 64 ? 660 : 220, .3, 'triangle', rescued === 64 ? 1320 : 110);
  }
  updateHud() {
    const c = this.mission.counts;
    for (const [id, count] of Object.entries({ rescued: c.rescued, aboard: c.aboard, lost: c.lost })) $(id).textContent = pad(count);
    $('lives').textContent = '▰ '.repeat(this.mission.lives) + '▱ '.repeat(3 - this.mission.lives);
    $('lives').setAttribute('aria-label', `${this.mission.lives} helicopters remaining`);
    if (c.rescued > best) {
      best = c.rescued; $('best').textContent = pad(best);
      try { localStorage.setItem('choplifter-best', String(best)); } catch {}
    }
    for (const b of this.buildings) {
      const remaining = this.mission.hostages.filter(h => h.barracks === b.index && ['waiting', 'captive'].includes(h.state)).length;
      b.label.setText(`${pad(b.index + 1)} / ${remaining ? `${remaining} ${b.health ? 'LOCKED' : 'WAITING'}` : 'CLEARED'}`);
      b.marker.setVisible(!b.health && remaining > 0);
    }
  }

  renderFlight(time) {
    const p = this.player;
    if (this.phase !== 'paused') {
      p.setTexture(this.facing === 0 ? 'front' : 'heli').setFlipX(this.facing < 0);
      p.rotation = this.grounded || this.facing === 0 ? 0 : clamp(this.vx / 2400, -.13, .13);
      if (this.phase === 'playing') p.alpha = this.invulnerable > 0 ? .5 + Math.sin(time / 100) * .5 : 1;
      this.rotor.clear();
      const rotorX = p.x + (this.facing === 0 ? 0 : this.facing * 7);
      const length = 44 * (.2 + Math.abs(Math.sin(time / 24)) * .8);
      this.rotor.lineStyle(2, 0xd6e0d1).lineBetween(rotorX - length, p.y - 20, rotorX + length, p.y - 20);
      this.rotor.lineStyle(2, 0x8eaba4).lineBetween(rotorX, p.y - 20, rotorX, p.y - 13);
      if (this.phase === 'playing' && p.y > LAND - 75 && !this.grounded && Math.floor(time / 85) !== this.lastDust) {
        this.lastDust = Math.floor(time / 85);
        const dust = this.add.rectangle(p.x + Phaser.Math.Between(-48, 48), GROUND, 4, 2, 0x90a080, .3).setDepth(7);
        this.effects.add(dust);
        this.tweens.add({ targets: dust, x: dust.x + Phaser.Math.Between(-55, 55), y: GROUND - Phaser.Math.Between(3, 12), alpha: 0, duration: 450, onComplete: () => dust.destroy() });
      }
    }
    this.shadow.x = p.x; this.shadow.alpha = Math.max(.03, .4 - (LAND - p.y) / 900);
    this.shadow.scaleX = 1 + (LAND - p.y) / 500;
    this.shadow.setVisible(p.visible);
    this.cameras.main.scrollX = clamp(p.x - WIDTH * .53, 0, WORLD - WIDTH);
    const mode = this.facing === 0 ? 'GROUND ATTACK ↓' : this.facing < 0 ? 'FACING WEST ←' : 'FACING EAST →';
    this.telemetry.setText(`ALT ${String(Math.round((LAND - p.y) / 3)).padStart(3, '0')} m    ${mode}\n${this.grounded ? 'LANDED' : 'AIRBORNE'}   /   ${p.x >= BORDER ? 'FRIENDLY AIRSPACE' : 'ENEMY TERRITORY'}`);
    this.homeArrow.setText(p.x < BORDER ? `HOME →  ${Math.round((BASE - p.x) / 3)} m` : 'HOME BASE / FRIENDLY');
    const radar = this.radar.clear();
    radar.fillStyle(0x0b1822).fillRect(0, 505, WIDTH, 65);
    radar.lineStyle(1, 0x314e53).lineBetween(24, 544, 1176, 544);
    const rx = x => 24 + x / WORLD * 1152;
    radar.fillStyle(0x335d48, .55).fillRect(rx(BORDER), 538, rx(WORLD) - rx(BORDER), 12);
    radar.lineStyle(1, 0x8fa7a0, .4).strokeRect(rx(this.cameras.main.scrollX), 535, WIDTH / WORLD * 1152, 18);
    for (const b of this.buildings) radar.fillStyle(b.health ? 0xc59a64 : 0x8fae84).fillRect(rx(b.x) - 4, 540, 8, 8);
    for (const e of this.enemies) radar.fillStyle(0xd58d61).fillRect(rx(e.x) - 2, 540 - (GROUND - e.y) / 30, 4, 4);
    radar.fillStyle(0x95d1c6).fillTriangle(rx(p.x), 536, rx(p.x) - 4, 531, rx(p.x) + 4, 531);
    radar.fillRect(rx(BASE) - 4, 540, 8, 8);
  }
}

function launch() {
  if (!scene || $('manual').open) return;
  if (scene.phase === 'paused') scene.pause();
  else if (['ready', 'ended'].includes(scene.phase)) scene.begin();
}
function mute() {
  muted = !muted; audio.mute();
  $('sound-button').setAttribute('aria-pressed', String(muted));
  $('sound-button').setAttribute('aria-label', muted ? 'Enable sound' : 'Mute sound');
  $('sound-button').style.opacity = muted ? '.45' : '1';
  if (scene?.phase === 'playing') $('game').focus({ preventScroll: true });
}
async function fullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await $('game-viewport').requestFullscreen();
    if (scene?.phase === 'playing') $('game').focus({ preventScroll: true });
  } catch { scene?.radio('Fullscreen is unavailable in this browser. You can keep flying here.'); }
}
$('launch-button').addEventListener('click', launch);
$('pause-button').addEventListener('click', () => scene?.pause());
$('sound-button').addEventListener('click', mute);
$('fullscreen-button').addEventListener('click', fullscreen);
$('help-button').addEventListener('click', () => {
  resumeAfterManual = scene?.phase === 'playing';
  if (resumeAfterManual) scene.pause();
  $('manual').showModal();
});
$('close-manual').addEventListener('click', () => $('manual').close());
$('manual').addEventListener('close', () => { if (resumeAfterManual && scene?.phase === 'paused') scene.pause(); resumeAfterManual = false; });
window.addEventListener('keydown', event => {
  if (event.repeat || $('manual').open || event.target.closest('button') && ['Enter', ' '].includes(event.key)) return;
  if (event.key === 'Enter') { event.preventDefault(); launch(); }
  if (['p', 'P', 'Escape'].includes(event.key)) { event.preventDefault(); scene?.pause(); }
  if (['m', 'M'].includes(event.key)) mute();
  if (['f', 'F'].includes(event.key)) fullscreen();
});
window.addEventListener('blur', () => { if (scene?.phase === 'playing') scene.pause(); else scene?.clearInput(); });
document.addEventListener('focusin', event => {
  if (!scene) return;
  const active = scene.phase === 'playing' && $('game').contains(event.target);
  scene.input.keyboard.enabled = active;
  if (active) scene.input.keyboard.enableGlobalCapture();
  else { scene.clearInput(); scene.input.keyboard.disableGlobalCapture(); }
});
document.addEventListener('visibilitychange', () => { if (document.hidden && scene?.phase === 'playing') scene.pause(); });
document.addEventListener('fullscreenchange', () => {
  $('fullscreen-button').setAttribute('aria-label', document.fullscreenElement ? 'Exit fullscreen' : 'Enter fullscreen');
  if (document.fullscreenElement) $('game-viewport').append($('touch-controls'));
  else document.querySelector('.flight-deck').after($('touch-controls'));
});
document.querySelectorAll('[data-control]').forEach(button => {
  const control = button.dataset.control;
  button.addEventListener('pointerdown', event => {
    event.preventDefault(); button.setPointerCapture(event.pointerId);
    if (scene?.phase !== 'playing') return;
    button.classList.add('active');
    if (control === 'ground') scene.groundAttack();
    else if (control === 'turn') scene.turn();
    else touch[control] = true;
  });
  const release = () => { touch[control] = false; button.classList.remove('active'); };
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(event, release);
});

if (typeof Phaser === 'undefined') {
  $('game-error').hidden = false;
} else {
  const game = new Phaser.Game({
    type: Phaser.AUTO, parent: 'game', width: WIDTH, height: HEIGHT,
    backgroundColor: '#101d2b', pixelArt: true, antialias: false,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: RescueScene,
  });
  // Expose Phaser's running instance for browser checks.
  window.choplifter = game;
}
