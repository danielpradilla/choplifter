import Phaser from 'phaser';
import './style.css';
import { Mission, WORLD, GROUND, PAD, BORDER } from './mission.js';

const $ = id => document.getElementById(id);
const UI = Object.fromEntries(['rescued', 'aboard', 'lost', 'lives', 'timer', 'sector', 'facing', 'flight-status', 'overlay', 'overlay-title', 'overlay-copy', 'overlay-kicker', 'launch', 'launch-hint', 'radio', 'pause', 'sound', 'manual', 'record'].map(id => [id, $(id)]));
const C = { cream: 0xe3ebd0, mint: 0xb6d9b0, orange: 0xefaa72, dark: 0x16232b, steel: 0x53696d };
const poly = (g, color, points, alpha = 1) => { g.fillStyle(color, alpha); g.fillPoints(points.map(([x, y]) => ({ x, y })), true); };
const rect = (g, color, x, y, w, h, alpha = 1) => { g.fillStyle(color, alpha); g.fillRect(Math.round(x), Math.round(y), w, h); };
const line = (g, color, x1, y1, x2, y2, width = 1, alpha = 1) => { g.lineStyle(width, color, alpha); g.lineBetween(x1, y1, x2, y2); };
let best = 0;
try { best = Number(localStorage.getItem('choplifter-rescue-record')) || 0; } catch { /* Storage is optional. */ }

class RescueScene extends Phaser.Scene {
  create() {
    this.mission = new Mission();
    this.mode = 'ready';
    this.fx = [];
    this.touch = {};
    this.visualTime = 0;
    this.radioUntil = 0;
    this.lastCounts = '';
    this.soundEnabled = false;
    this.drawLandscape();
    this.buildings = this.add.graphics();
    this.shadows = this.add.graphics();
    this.actors = this.add.graphics();
    this.helicopter = this.add.graphics();
    this.effects = this.add.graphics();
    this.radar = this.add.graphics().setScrollFactor(0).setDepth(10);
    this.cameras.main.setBounds(0, 0, WORLD, 560);
    this.cameras.main.scrollX = WORLD - 1200;
    this.labels = this.mission.camps.map((c, i) => this.label(c.x, GROUND - 82, `CAMP 0${i + 1}`, '#bac7bd', 9).setOrigin(0.5));
    this.label(PAD.x, GROUND + 34, 'H O M E   /   L A N D I N G   Z O N E', '#acc7ae', 9).setOrigin(0.5);
    this.label(3630, GROUND - 43, 'POST OFFICE', '#e3ebd0', 9).setOrigin(0.5);
    this.label(BORDER, GROUND + 31, 'BORDER', '#859993', 8).setOrigin(0.5);
    this.label(25, 492, 'TACTICAL OVERVIEW', '#718789', 8).setScrollFactor(0).setDepth(11);
    this.label(25, 511, 'W  ←  ENEMY TERRITORY', '#aab8ad', 8).setScrollFactor(0).setDepth(11);
    this.label(1021, 492, 'PASSENGER MANIFEST', '#718789', 8).setScrollFactor(0).setDepth(11);
    this.label(933, 536, 'HOME  →  E', '#aab8ad', 7).setScrollFactor(0).setDepth(11);
    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,X,P,ESC,ENTER,M');
    this.input.keyboard.addCapture(['UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE']);
    this.input.keyboard.on('keydown', event => {
      if (event.repeat || UI.manual.open) return;
      if (event.code === 'Enter' && this.mode !== 'playing') this.launch();
      if (event.code === 'KeyX' && this.mode === 'playing') this.mission.turn();
      if (event.code === 'KeyP' || event.code === 'Escape') this.togglePause();
      if (event.code === 'KeyM') this.toggleSound();
    });
    UI.launch.addEventListener('click', () => this.launch());
    UI.pause.addEventListener('click', () => this.togglePause());
    UI.sound.addEventListener('click', () => this.toggleSound());
    $('fullscreen').addEventListener('click', async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await document.querySelector('.console').requestFullscreen();
      } catch { this.radio('Fullscreen is unavailable in this browser'); }
    });
    $('help').addEventListener('click', () => {
      if (this.mode === 'playing') this.togglePause();
      UI.record.textContent = `BEST RESCUE: ${String(best).padStart(2, '0')} / 64`;
      UI.manual.showModal();
    });
    $('close-manual').addEventListener('click', () => UI.manual.close());
    UI.manual.addEventListener('close', () => $('game').focus({ preventScroll: true }));
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.mode === 'playing') this.togglePause(); });
    window.addEventListener('blur', () => { this.touch = {}; if (this.mode === 'playing') this.togglePause(); });
    for (const button of document.querySelectorAll('[data-control]')) {
      button.addEventListener('pointerdown', event => {
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        if (button.dataset.control === 'turn') { if (this.mode === 'playing') this.mission.turn(); }
        else this.touch[button.dataset.control] = true;
      });
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, () => { this.touch[button.dataset.control] = false; });
    }
    this.renderMission();
    this.updateHUD();
  }

  label(x, y, text, color = '#e3ebd0', size = 10) {
    return this.add.text(x, y, text, { fontFamily: '"IBM Plex Mono", monospace', fontSize: `${size}px`, color, resolution: 2 });
  }

  drawLandscape() {
    const sky = this.textures.createCanvas('sky', 1200, 560);
    const ctx = sky.context;
    const gradient = ctx.createLinearGradient(0, 0, 0, 445);
    gradient.addColorStop(0, '#263745');
    gradient.addColorStop(0.5, '#58606b');
    gradient.addColorStop(0.85, '#bd8c80');
    gradient.addColorStop(1, '#d3a180');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1200, 560);
    sky.refresh();
    this.add.image(0, 0, 'sky').setOrigin(0).setScrollFactor(0);
    const atmosphere = this.add.graphics().setScrollFactor(0);
    atmosphere.fillStyle(0xe7bd93, 0.07).fillCircle(864, 184, 101);
    atmosphere.fillStyle(0xe9c4a0, 0.12).fillCircle(864, 184, 77);
    atmosphere.fillStyle(0xe7bd99, 0.88).fillCircle(864, 184, 54);
    for (let i = 0; i < 42; i++) {
      const x = (i * 137 + 73) % 1200;
      const y = (i * 41 + 17) % 190;
      rect(atmosphere, 0xd5dfd4, x, y, i % 9 === 0 ? 2 : 1, 1, 0.25 + (i % 4) * 0.1);
    }
    for (let i = 0; i < 13; i++) {
      const x = (i * 229 + 52) % 1200, y = 87 + (i * 53) % 240;
      rect(atmosphere, 0xd3b5a3, x, y, 65 + i * 7, 2, 0.13);
      rect(atmosphere, 0xd3b5a3, x - 23, y + 5, 110, 2, 0.06);
    }
    for (let layer = 0; layer < 3; layer++) {
      const g = this.add.graphics().setScrollFactor(0.13 + layer * 0.13, 0);
      const points = [[0, GROUND]];
      for (let x = 0; x <= 5400; x += 32) {
        const broad = Math.sin(x * 0.006 + layer * 2) * 45 + Math.sin(x * 0.014 + layer) * 22;
        const jagged = Math.sin(x * 0.071 + layer) * 7;
        points.push([x, Math.floor((295 + layer * 43 + broad + jagged) / 3) * 3]);
      }
      points.push([5400, GROUND]);
      poly(g, [0x606471, 0x424e5a, 0x2b3e48][layer], points);
    }
    const ground = this.add.graphics();
    rect(ground, 0x253d40, 0, GROUND - 5, WORLD, 7);
    rect(ground, 0x546454, 0, GROUND, WORLD, 3);
    rect(ground, 0x233237, 0, GROUND + 3, WORLD, 43);
    rect(ground, 0x19272e, 0, GROUND + 46, WORLD, 100);
    for (let i = 0; i < 470; i++) {
      const x = (i * 127) % WORLD, y = GROUND + 8 + (i * 67) % 35;
      rect(ground, i % 2 ? 0x36494a : 0x1a2c32, x, y, 2 + i % 9, 2);
    }
    for (let i = 0; i < 160; i++) {
      const x = (i * 137 + 26) % WORLD;
      if (x > 3240) continue;
      const height = 5 + i % 16;
      poly(ground, 0x2a4144, [[x - 12, GROUND], [x - 9, GROUND - height * 0.5], [x - 3, GROUND - height * 0.5], [x, GROUND - height], [x + 5, GROUND - height], [x + 6, GROUND - 3], [x + 13, GROUND]]);
    }
    for (let x = BORDER - 12; x < BORDER + 13; x += 12) {
      rect(ground, 0x889a86, x, GROUND - 29, 3, 31);
      rect(ground, 0xc5be8c, x, GROUND - 28, 3, 5);
    }
    line(ground, 0xa8b49d, BORDER - 12, GROUND - 18, BORDER + 15, GROUND - 18);
    line(ground, 0x93a68d, BORDER, GROUND - 54, BORDER, GROUND - 33);
    poly(ground, C.orange, [[BORDER, GROUND - 55], [BORDER - 31, GROUND - 51], [BORDER, GROUND - 47]]);
  }

  launch() {
    if (UI.manual.open) return;
    if (this.mode === 'ended') {
      this.mission = new Mission();
      this.fx = [];
      this.cameras.main.scrollX = WORLD - 1200;
      this.lastCounts = '';
    }
    const resume = this.mode === 'paused';
    this.mode = 'playing';
    UI.overlay.hidden = true;
    UI.pause.textContent = 'Ⅱ';
    UI.pause.setAttribute('aria-label', 'Pause game');
    this.touch = {};
    this.input.keyboard.resetKeys();
    $('game').focus({ preventScroll: true });
    document.querySelector('.console').scrollIntoView({ block: 'center', behavior: 'smooth' });
    this.radio(resume ? 'FLIGHT RESUMED' : 'FLY WEST ← · The nearest camp is already open');
    if (this.audio?.state === 'suspended') this.audio.resume();
  }

  togglePause() {
    if (UI.manual.open || this.mode === 'ready' || this.mode === 'ended') return;
    if (this.mode === 'paused') { this.launch(); return; }
    this.mode = 'paused';
    this.touch = {};
    UI.overlay.hidden = false;
    UI['overlay-kicker'].textContent = 'FLIGHT SUSPENDED';
    UI['overlay-title'].innerHTML = 'Holding<br>position.';
    UI['overlay-copy'].textContent = 'Take a breath. Your mission will resume exactly where you left it.';
    UI.launch.innerHTML = 'RESUME MISSION <span>↗</span>';
    UI['launch-hint'].textContent = 'PRESS ENTER OR P TO RESUME';
    UI.pause.textContent = '▷';
    UI.pause.setAttribute('aria-label', 'Resume game');
    UI.radio.textContent = '';
    this.updateHUD();
  }

  radio(message) { UI.radio.textContent = message; this.radioUntil = this.visualTime + 5; }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    UI.sound.innerHTML = `♪ <span>${this.soundEnabled ? 'ON' : 'OFF'}</span>`;
    UI.sound.setAttribute('aria-label', this.soundEnabled ? 'Mute sound' : 'Enable sound');
    if (this.soundEnabled && !this.audio) {
      this.audio = new AudioContext();
      this.rotor = this.audio.createOscillator();
      this.rotor.type = 'triangle';
      this.rotor.frequency.value = 48;
      this.rotorGain = this.audio.createGain();
      this.rotorGain.gain.value = 0;
      this.rotor.connect(this.rotorGain).connect(this.audio.destination);
      this.rotor.start();
    }
    if (this.soundEnabled) { this.audio.resume(); this.beep(660, 0.08, 0.025); }
    else if (this.rotorGain) this.rotorGain.gain.value = 0;
  }

  beep(frequency, duration, volume = 0.03, type = 'square', end = frequency) {
    if (!this.soundEnabled || !this.audio) return;
    const osc = this.audio.createOscillator(), gain = this.audio.createGain(), t = this.audio.currentTime;
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, end), t + duration);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain).connect(this.audio.destination);
    osc.start(t);
    osc.stop(t + duration);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }

  endMission() {
    this.mode = 'ended';
    const c = this.mission.counts();
    best = Math.max(best, c.rescued);
    try { localStorage.setItem('choplifter-rescue-record', String(best)); } catch { /* Private mode still plays. */ }
    UI.overlay.hidden = false;
    UI['overlay-kicker'].textContent = 'MISSION DEBRIEF';
    UI['overlay-title'].innerHTML = c.rescued === 64 ? 'Everyone<br>came home.' : `${c.rescued} lives<br>brought home.`;
    const missing = 64 - c.rescued - c.lost;
    UI['overlay-copy'].textContent = `${c.rescued} rescued. ${c.lost} lost.${missing ? ` ${missing} still behind enemy lines.` : ''} Best rescue: ${best} / 64.`;
    UI.launch.innerHTML = 'FLY AGAIN <span>↗</span>';
    UI['launch-hint'].textContent = 'PRESS ENTER TO START A NEW MISSION';
    UI.radio.textContent = '';
    this.beep(c.rescued === 64 ? 880 : 220, 0.6, 0.04, 'triangle', 440);
    this.updateHUD();
  }

  update(_time, delta) {
    const dt = Math.min(delta / 1000, 0.034);
    this.visualTime += dt;
    if (this.mode === 'playing') {
      const k = this.keys;
      this.mission.step(dt, {
        left: k.LEFT.isDown || k.A.isDown || this.touch.left,
        right: k.RIGHT.isDown || k.D.isDown || this.touch.right,
        up: k.UP.isDown || k.W.isDown || this.touch.up,
        down: k.DOWN.isDown || k.S.isDown || this.touch.down,
        fire: k.SPACE.isDown || this.touch.fire,
      });
      this.processEvents();
    }
    if (UI.radio.textContent && this.visualTime > this.radioUntil) UI.radio.textContent = '';
    const h = this.mission.heli;
    const desired = Phaser.Math.Clamp(h.x - 600, 0, WORLD - 1200);
    this.cameras.main.scrollX += (desired - this.cameras.main.scrollX) * (1 - Math.exp(-4 * dt));
    if (this.rotorGain) {
      const active = this.soundEnabled && this.mode === 'playing' && !h.dead;
      this.rotorGain.gain.value = active ? 0.018 + (Math.sin(this.visualTime * 70) + 1) * 0.012 : 0;
      this.rotor.frequency.value = h.grounded ? 36 : 52 + Math.abs(h.vx) * 0.035;
    }
    if (this.mode !== 'paused') this.advanceEffects(dt);
    this.renderMission();
    this.updateHUD();
  }

  processEvents() {
    for (const event of this.mission.events) {
      const { type, x, y, text } = event;
      if (type === 'radio') this.radio(text);
      if (type === 'board') this.beep(600, 0.07, 0.024, 'sine', 850);
      if (type === 'rescue') { this.beep(1000, 0.1, 0.03, 'sine', 1300); this.fx.push({ x, y, vx: 44, vy: 0, life: 1.2, max: 1.2, person: true }); }
      if (type === 'shot') this.beep(180, 0.055, 0.018, 'sawtooth', 55);
      if (type === 'turn') this.beep(160, 0.06, 0.012, 'triangle', 260);
      if (type === 'explosion' || type === 'spark' || type === 'land' || type === 'casualty') {
        const count = type === 'explosion' ? 32 : 7;
        for (let i = 0; i < count; i++) this.fx.push({ x, y, vx: (Math.random() - 0.5) * (count === 32 ? 180 : 80), vy: -Math.random() * 110 - 10, life: 0.3 + Math.random() * 0.8, max: 1.1, color: type === 'land' ? 0x81918a : [C.orange, 0xe7d9a0, 0x71817b][i % 3], size: count === 32 ? 3 + i % 5 : 2 });
        if (type === 'explosion') this.beep(90, 0.35, 0.1, 'sawtooth', 20);
        if (type === 'casualty') this.beep(110, 0.16, 0.02, 'triangle', 50);
      }
      if (type === 'crash') this.cameras.main.shake(250, 0.005);
      if (type === 'end') this.endMission();
    }
    this.mission.events = [];
  }

  advanceEffects(dt) {
    for (const p of this.fx) { p.x += p.vx * dt; p.y += p.vy * dt; if (!p.person) p.vy += 110 * dt; p.life -= dt; }
    this.fx = this.fx.filter(p => p.life > 0).slice(-300);
  }

  drawBuildings() {
    const g = this.buildings.clear();
    for (const c of this.mission.camps) {
      const x = c.x - 65, y = GROUND - 55;
      rect(g, 0x16282e, x - 8, GROUND - 2, 147, 5);
      rect(g, 0x6d7165, x, y + 9, 130, 46);
      rect(g, 0x9c9680, x, y + 9, 130, 4);
      poly(g, 0x929480, [[x - 5, y + 9], [x + 11, y - 1], [x + 116, y - 1], [x + 136, y + 9]]);
      rect(g, 0x393f3d, x, y + 43, 130, 12);
      for (let i = 0; i < 5; i++) {
        rect(g, 0x26383c, x + 9 + i * 24, y + 19, 15, 12);
        rect(g, 0xafaa83, x + 10 + i * 24, y + 20, 13, 2);
        line(g, 0x6b7467, x + 16 + i * 24, y + 20, x + 16 + i * 24, y + 31);
      }
      rect(g, 0x2e3735, x + 55, y + 19, 23, 36);
      if (c.open) {
        poly(g, 0x203139, [[x + 24, y + 55], [x + 29, y + 23], [x + 43, y + 28], [x + 53, y + 13], [x + 66, y + 29], [x + 84, y + 22], [x + 101, y + 55]]);
        for (let i = 0; i < 8; i++) rect(g, i % 2 ? 0x777e6c : 0x535d55, x + 17 + i * 13, y + 48 + (i % 2) * 4, 10, 6);
        if (c.id !== 0) for (let i = 0; i < 4; i++) {
          const t = this.visualTime + i;
          rect(g, 0x5e5c5e, c.x + Math.sin(t) * 10, y - ((t * 15) % 55), 7 + i * 2, 7, 0.18);
          rect(g, C.orange, x + 26 + i * 23, y + 47 - Math.sin(t * 10) * 3, 3, 5, 0.6);
        }
      }
      rect(g, c.open ? C.mint : C.orange, c.x - 2, y - 13, 4, 4);
    }
    const x = 3557, y = GROUND - 61;
    rect(g, 0x26383c, x + 6, y + 3, 152, 61);
    rect(g, 0x9ba28b, x, y + 9, 145, 52);
    rect(g, 0xc5c4a3, x - 5, y + 4, 155, 7);
    rect(g, 0x536963, x, y + 54, 145, 7);
    for (let i = 0; i < 4; i++) {
      rect(g, 0x3b5358, x + 10 + i * 33, y + 31, 22, 14);
      rect(g, 0xd9cc96, x + 11 + i * 33, y + 32, 20, 3);
      line(g, 0x9da98d, x + 21 + i * 33, y + 31, x + 21 + i * 33, y + 45);
    }
    rect(g, 0x203039, x + 61, y + 31, 24, 30);
    line(g, 0xabb8a6, x + 131, y + 6, x + 131, y - 43, 2);
    poly(g, C.orange, [[x + 132, y - 43], [x + 162, y - 40 + Math.sin(this.visualTime * 5) * 2], [x + 161, y - 23], [x + 132, y - 25]]);
    rect(g, C.cream, x + 139, y - 39, 4, 12);
    rect(g, C.cream, x + 135, y - 35, 12, 4);
    rect(g, 0x42574f, PAD.x - 137, GROUND - 1, 276, 5);
    line(g, 0xa7b899, PAD.x - 130, GROUND + 4, PAD.x + 130, GROUND + 4, 1);
    for (let i = -1; i <= 1; i += 2) {
      rect(g, 0xd3d2a7, PAD.x + i * 115 - 3, GROUND - 4, 6, 4);
      g.fillStyle(C.mint, 0.07).fillEllipse(PAD.x + i * 115, GROUND - 2, 42, 12);
    }
    rect(g, 0x859883, PAD.x - 23, GROUND + 13, 4, 9);
    rect(g, 0x859883, PAD.x + 19, GROUND + 13, 4, 9);
    rect(g, 0x859883, PAD.x - 22, GROUND + 16, 44, 3);
  }

  person(g, p, rescued = false) {
    const x = Math.round(p.x), y = Math.round(p.y), phase = this.visualTime * 10 + (p.phase || 0);
    const walking = rescued || (this.mission.heli.grounded && Math.abs(p.x - this.mission.heli.x) < 210);
    rect(g, 0xdfc6a0, x - 2, y - 9, 4, 4);
    rect(g, rescued ? C.mint : C.cream, x - 2, y - 5, 5, 7);
    const step = walking ? Math.sin(phase) * 2 : 0;
    line(g, 0xb7c1a9, x - 1, y + 1, x - 2 - step, y + 7, 2);
    line(g, 0xb7c1a9, x + 1, y + 1, x + 3 + step, y + 7, 2);
    line(g, C.cream, x - 3, y - 4, x - 6, y - (walking ? 1 : 9 + Math.sin(phase) * 2), 2);
    line(g, C.cream, x + 2, y - 4, x + 6, y - (walking ? 1 : 8 - Math.sin(phase) * 2), 2);
  }

  drawHelicopter() {
    const h = this.mission.heli, g = this.helicopter.clear();
    if (h.dead) return;
    g.setPosition(Math.round(h.x), Math.round(h.y));
    g.setAlpha(h.invincible > 0 && this.mode === 'playing' ? 0.6 + Math.sin(this.visualTime * 15) * 0.25 : 1);
    g.setScale(h.face === -1 ? -1 : 1, 1);
    g.setRotation(h.grounded ? 0 : Phaser.Math.Clamp(h.vx * 0.00045, -0.1, 0.1) * (h.face === -1 ? -1 : 1));
    const rotor = this.mode === 'paused' ? 46 : 12 + Math.abs(Math.sin(this.visualTime * 55)) * 43;
    if (h.face === 0) {
      poly(g, C.cream, [[-17, -12], [-10, -20], [10, -20], [17, -12], [17, 7], [10, 14], [-10, 14], [-17, 7]]);
      rect(g, 0x36535f, -13, -12, 26, 12);
      rect(g, 0x88b1b4, -11, -10, 9, 3);
      rect(g, 0x88b1b4, 3, -10, 9, 3);
      line(g, C.cream, 0, -14, 0, 1, 2);
      rect(g, 0x93ada1, -13, 6, 26, 5);
      line(g, C.cream, -13, 9, -19, 20, 2);
      line(g, C.cream, 13, 9, 19, 20, 2);
      line(g, C.cream, -24, 20, -13, 20, 3);
      line(g, C.cream, 13, 20, 24, 20, 3);
      line(g, 0x758e89, 0, -20, 0, -29, 3);
      line(g, C.cream, -rotor, -30, rotor, -30, 2);
    } else {
      poly(g, 0xb0c5af, [[-26, -9], [-69, -16], [-73, -26], [-81, -26], [-75, -2], [-23, 5]]);
      poly(g, C.cream, [[-28, -10], [-18, -17], [14, -17], [29, -8], [37, 3], [29, 11], [-20, 11], [-30, 3]]);
      poly(g, 0x426573, [[9, -14], [17, -14], [28, -6], [30, 0], [9, 0]]);
      poly(g, 0xa1c2bc, [[11, -12], [17, -12], [24, -7], [11, -7]]);
      rect(g, 0x7b9b99, -7, -12, 12, 12);
      rect(g, 0xa3bfaf, -19, -12, 8, 12);
      rect(g, 0x9ab6a3, -23, 5, 51, 6);
      rect(g, C.orange, -21, -1, 7, 5);
      line(g, C.cream, -20, 10, -18, 19, 2);
      line(g, C.cream, 17, 10, 19, 19, 2);
      line(g, C.cream, -28, 20, 32, 20, 3);
      line(g, C.cream, 32, 20, 36, 16, 2);
      rect(g, 0x7f9a91, -7, -22, 14, 6);
      line(g, C.cream, 0, -22, 0, -28, 3);
      line(g, C.cream, -rotor - 5, -29, rotor + 7, -29, 2);
      line(g, C.cream, -75, -14, -64, -14, 1);
      line(g, C.cream, -70, -20 + Math.sin(this.visualTime * 50) * 4, -70, -8 - Math.sin(this.visualTime * 50) * 4, 1);
      rect(g, C.orange, -2, -25, 3, 2, Math.sin(this.visualTime * 4) > 0 ? 1 : 0.1);
    }
  }

  renderMission() {
    this.drawBuildings();
    this.drawHelicopter();
    const a = this.actors.clear(), s = this.shadows.clear(), f = this.effects.clear(), h = this.mission.heli;
    if (!h.dead) {
      const altitude = GROUND - h.y;
      s.fillStyle(0x101c22, 0.18 + 0.22 * (1 - altitude / GROUND)).fillEllipse(h.x, GROUND + 4, 90 - altitude * 0.12, 6);
      if (altitude < 90 && !h.grounded) for (let i = 0; i < 6; i++) {
        const x = h.x + Math.sin(this.visualTime * 8 + i * 2) * (45 + i * 8);
        rect(s, 0xabaf87, x, GROUND - 2 - (i % 2), 7, 1, 0.35);
      }
    }
    for (const p of this.mission.people) if (p.state === 'waiting') this.person(a, p);
    for (const e of this.mission.enemies) {
      const x = Math.round(e.x), y = Math.round(e.y);
      if (e.hp <= 0) continue;
      if (e.type === 'tank') {
        rect(a, 0x101e25, x - 30, y + 3, 60, 11);
        for (let i = 0; i < 6; i++) { a.fillStyle(0x5c6a61).fillCircle(x - 24 + i * 10, y + 9, 4); rect(a, 0x263831, x - 25 + i * 10, y + 8, 3, 2); }
        poly(a, 0x828b70, [[x - 30, y + 2], [x - 23, y - 8], [x + 22, y - 8], [x + 31, y + 3]]);
        rect(a, 0xa7a588, x - 12, y - 16, 27, 9);
        rect(a, 0x69745f, x - 16, y - 9, 37, 5);
        const angle = Math.atan2(h.y - e.y, h.x - e.x);
        line(a, 0xb1ae8c, x + 2, y - 12, x + Math.cos(angle) * 36, y - 12 + Math.sin(angle) * 20, 4);
        rect(a, C.orange, x - 24, y - 1, 4, 3);
      } else if (e.type === 'jet') {
        line(a, 0xccc1a5, x - 130, y + 2, x - 37, y + 2, 1, 0.25);
        poly(a, 0xa4b6b5, [[x - 33, y + 3], [x - 45, y - 13], [x - 31, y - 13], [x - 20, y - 3], [x + 18, y - 3], [x + 37, y + 3], [x + 15, y + 8], [x - 28, y + 8]]);
        poly(a, 0xd3d3b5, [[x - 12, y + 2], [x + 8, y - 19], [x + 16, y - 19], [x + 10, y + 5], [x + 2, y + 16], [x - 9, y + 16]]);
        rect(a, 0x4f747b, x + 12, y - 4, 11, 4);
        rect(a, C.orange, x - 40, y + 1, 8 + Math.round(Math.sin(this.visualTime * 50) * 3), 3);
      } else {
        const r = 12 + Math.sin(this.visualTime * 5) * 2;
        for (let i = 0; i < 8; i++) {
          const angle = i * Math.PI / 4 + this.visualTime;
          line(a, 0xb4af89, x + Math.cos(angle) * 8, y + Math.sin(angle) * 8, x + Math.cos(angle) * 20, y + Math.sin(angle) * 20, 2);
        }
        poly(a, 0x6c867c, [[x, y - r], [x + r, y], [x, y + r], [x - r, y]]);
        rect(a, C.orange, x - 4, y - 4, 8, 8);
        rect(a, C.cream, x - 2, y - 2, 3, 3);
      }
    }
    for (const b of this.mission.bullets) {
      const color = b.friendly ? 0xf8d58a : 0xf29369;
      if (b.bomb) rect(a, color, b.x - 2, b.y - 4, 4, 8);
      else line(a, color, b.x, b.y, b.x - b.vx * 0.014, b.y - b.vy * 0.014, b.friendly ? 2 : 3);
    }
    for (const p of this.fx) {
      if (p.person) this.person(f, p, true);
      else rect(f, p.color, p.x, p.y, p.size, p.size, Math.min(1, p.life * 2));
    }
    this.drawRadar();
  }

  drawRadar() {
    const g = this.radar.clear(), m = this.mission, h = m.heli;
    rect(g, 0x14232b, 0, 482, 1200, 78, 0.9);
    line(g, 0x34494c, 0, 482, 1200, 482);
    const mapX = x => 236 + x / WORLD * 748;
    line(g, 0x445b5a, 236, 524, 984, 524);
    for (let i = 0; i <= 38; i++) line(g, 0x30484b, 236 + i * 19.68, 525, 236 + i * 19.68, 528 + (i % 5 === 0 ? 3 : 0));
    rect(g, 0x7d9b85, mapX(BORDER), 504, (WORLD - BORDER) / WORLD * 748, 20, 0.1);
    for (const c of m.camps) {
      const remaining = m.people.filter(p => p.camp === c.id && (p.state === 'waiting' || p.state === 'captive')).length;
      rect(g, !remaining ? 0x53675f : c.open ? C.mint : C.orange, mapX(c.x) - 5, 517, 10, 7);
      if (remaining) line(g, c.open ? C.mint : C.orange, mapX(c.x), 511, mapX(c.x), 515, 1);
    }
    for (const e of m.enemies) rect(g, 0xd88764, mapX(e.x), 515 - (GROUND - e.y) * 0.05, 3, 3);
    line(g, C.mint, mapX(PAD.x) - 8, 523, mapX(PAD.x) + 8, 523, 2);
    rect(g, C.mint, mapX(PAD.x) - 2, 516, 4, 5);
    if (!h.dead) poly(g, C.cream, [[mapX(h.x), 500], [mapX(h.x) - 4, 494], [mapX(h.x) + 4, 494]]);
    const c = m.counts();
    for (let i = 0; i < 16; i++) rect(g, i < c.aboard ? C.cream : 0x35494b, 1022 + (i % 8) * 18, 510 + Math.floor(i / 8) * 12, 12, 7);
  }

  updateHUD() {
    const m = this.mission, h = m.heli, c = m.counts();
    const key = `${c.rescued},${c.aboard},${c.lost},${m.lives},${h.face},${h.grounded},${this.mode},${Math.floor(m.time)},${h.x > BORDER},${h.dead > 0}`;
    if (this.lastCounts === key) return;
    this.lastCounts = key;
    UI.rescued.innerHTML = `${String(c.rescued).padStart(2, '0')}<small> / 64</small>`;
    UI.aboard.innerHTML = `${String(c.aboard).padStart(2, '0')}<small> / 16</small>`;
    UI.lost.textContent = String(c.lost).padStart(2, '0');
    UI.lives.textContent = '◆ '.repeat(m.lives) + '◇ '.repeat(3 - m.lives);
    UI.timer.textContent = `${String(Math.floor(m.time / 60)).padStart(2, '0')}:${String(Math.floor(m.time % 60)).padStart(2, '0')}`;
    UI.sector.textContent = h.x > BORDER ? 'HOME BASE' : 'ENEMY TERRITORY';
    UI.facing.textContent = h.face === -1 ? 'FACING ← WEST' : h.face === 1 ? 'FACING EAST →' : 'FACING FORWARD ↓';
    UI['flight-status'].textContent = this.mode === 'ready' ? 'AWAITING PILOT' : this.mode === 'paused' ? 'PAUSED' : this.mode === 'ended' ? 'MISSION COMPLETE' : h.dead ? 'AIRCRAFT LOST' : h.grounded ? (c.aboard ? 'PASSENGER TRANSFER' : 'ON THE GROUND') : 'AIRBORNE';
    // A compact accessible snapshot also makes rendering/state mismatches observable.
    $('game').setAttribute('aria-description', `${UI['flight-status'].textContent}. ${c.rescued} rescued, ${c.aboard} aboard, ${c.lost} lost. ${m.lives} aircraft. ${UI.sector.textContent}. ${UI.facing.textContent}.`);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 1200,
  height: 560,
  backgroundColor: '#263745',
  pixelArt: true,
  antialias: false,
  roundPixels: true,
  audio: { noAudio: true },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: RescueScene,
});
