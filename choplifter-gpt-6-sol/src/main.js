import Phaser from 'phaser';
import { CAPACITY, TOTAL_HOSTAGES, canBoard, missionComplete, tally } from './rules.js';
import './style.css';

const W = 1120;
const H = 630;
const WORLD = 3420;
const GROUND = 520;
const PAD = { left: 225, right: 370 };
const HUT_X = [850, 1480, 2170, 2870];
const C = {
  sky: 0x080d18, star: 0xd8f6f5, moon: 0xcdebed, moonShade: 0x88b9bc,
  ground: 0xd927aa, groundDark: 0xa6167c, grass: 0xc7e8dc, green: 0x54fa93,
  cyan: 0x5ceafa, blue: 0x2783cd, cream: 0xfff5dc, orange: 0xff944e,
  red: 0xff5d64, ink: 0x07101d, white: 0xffffff,
};
const ui = {
  overlay: document.querySelector('#overlay'), kicker: document.querySelector('#overlay-kicker'),
  title: document.querySelector('#overlay-title'), copy: document.querySelector('#overlay-copy'),
  start: document.querySelector('#start'), pause: document.querySelector('#pause'),
  sound: document.querySelector('#sound'), fullscreen: document.querySelector('#fullscreen'),
  exitFullscreen: document.querySelector('#exit-fullscreen'),
  mobileLost: document.querySelector('#mobile-lost'), mobileAboard: document.querySelector('#mobile-aboard'),
  mobileRescued: document.querySelector('#mobile-rescued'),
};

function overlay(kicker, title, copy, button) {
  ui.kicker.textContent = kicker;
  ui.title.textContent = title;
  ui.copy.textContent = copy;
  ui.start.firstChild.textContent = `${button} `;
  ui.overlay.hidden = false;
}

function seeded(seed) {
  let n = seed;
  return () => ((n = (n * 1664525 + 1013904223) >>> 0) / 4294967296);
}

class RescueScene extends Phaser.Scene {
  constructor() { super('rescue'); }

  create() {
    this.g = this.add.graphics();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,X,P,ENTER,M');
    this.input.keyboard.addCapture([32, 37, 38, 39, 40]);
    this.touch = { up: false, down: false, left: false, right: false, fire: false };
    this.stars = Array.from({ length: 220 }, (_, i) => {
      const rand = seeded(i * 79 + 6);
      return { x: rand() * WORLD, y: 60 + rand() * 424, r: rand() > .88 ? 2 : 1, phase: rand() * 6.28 };
    });
    this.reset();
    this.draw();
  }

  reset() {
    this.mode = 'ready';
    this.elapsed = 0;
    this.lives = 3;
    this.cameraX = 0;
    this.heli = { x: 290, y: GROUND - 32, vx: 0, vy: 0, facing: 1, invuln: 0 };
    this.huts = HUT_X.map((x, i) => ({ x, open: i === 0 }));
    this.hostages = HUT_X.flatMap((x, hut) => Array.from({ length: 16 }, (_, i) => ({
      x: x + (i % 2 ? 46 : -36) + (i % 8) * 5, home: hut,
      state: hut === 0 ? 'free' : 'captive',
    })));
    this.tanks = [1320, 1770, 2440, 3110].map((x, i) => ({ x, home: x, dir: i % 2 ? -1 : 1, fire: 2 + i * .8 }));
    this.jets = [];
    this.mines = [];
    this.shots = [];
    this.sparks = [];
    this.jetClock = 17;
    this.mineClock = 32;
    this.fireClock = 0;
    this.boardClock = 0;
    this.unloadClock = 0;
    this.notice = 'FIRST SORTIE';
    this.noticeClock = 2;
    this.updateHud();
  }

  startMission() {
    if (this.mode === 'paused') { this.mode = 'playing'; ui.overlay.hidden = true; ui.pause.textContent = 'Pause'; return; }
    if (this.mode !== 'ready') this.reset();
    this.mode = 'playing';
    ui.overlay.hidden = true;
    ui.pause.textContent = 'Pause';
    this.soundEffect(260, .09, 'sawtooth', .035);
  }

  togglePause() {
    if (this.mode === 'playing') {
      this.mode = 'paused';
      overlay('SORTIE PAUSED', 'TAKE A BREATH', 'Your mission is waiting. Resume when ready.', 'Resume mission');
      ui.pause.textContent = 'Resume';
    } else if (this.mode === 'paused') this.startMission();
  }

  turn() {
    if (this.mode !== 'playing') return;
    this.heli.facing = this.heli.facing === 1 ? 0 : this.heli.facing === 0 ? -1 : 1;
    this.soundEffect(440, .035, 'square', .014);
  }

  soundEffect(freq, duration, type = 'square', volume = .025) {
    if (this.muted) return;
    try {
      this.audio ??= new (window.AudioContext || window.webkitAudioContext)();
      if (this.audio.state === 'suspended') this.audio.resume();
      const osc = this.audio.createOscillator();
      const gain = this.audio.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audio.currentTime);
      osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq * .55), this.audio.currentTime + duration);
      gain.gain.setValueAtTime(volume, this.audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, this.audio.currentTime + duration);
      osc.connect(gain).connect(this.audio.destination);
      osc.start(); osc.stop(this.audio.currentTime + duration);
    } catch { /* Audio is optional when the browser blocks it. */ }
  }

  message(text, seconds = 2) { this.notice = text; this.noticeClock = seconds; }

  update(_, ms) {
    if (!this.g) return;
    if (Phaser.Input.Keyboard.JustDown(this.keys.ENTER) && this.mode !== 'playing') this.startMission();
    if (Phaser.Input.Keyboard.JustDown(this.keys.P)) this.togglePause();
    if (Phaser.Input.Keyboard.JustDown(this.keys.X)) this.turn();
    if (Phaser.Input.Keyboard.JustDown(this.keys.M)) {
      this.muted = !this.muted;
      ui.sound.textContent = this.muted ? 'Sound off' : 'Sound on';
    }
    if (this.mode !== 'playing') { this.draw(); return; }
    const dt = Math.min(ms / 1000, .035);
    this.elapsed += dt;
    this.noticeClock = Math.max(0, this.noticeClock - dt);
    this.heli.invuln = Math.max(0, this.heli.invuln - dt);
    this.fireClock = Math.max(0, this.fireClock - dt);
    this.fly(dt);
    if (this.keys.SPACE.isDown || this.touch.fire) this.fire();
    this.updateHostages(dt);
    this.updateEnemies(dt);
    this.updateShots(dt);
    this.sparks = this.sparks.filter(p => (p.life -= dt) > 0);
    this.cameraX += (Phaser.Math.Clamp(this.heli.x - 350, 0, WORLD - W) - this.cameraX) * Math.min(1, dt * 5);
    this.updateHud();
    this.draw();
  }

  fly(dt) {
    const h = this.heli;
    const horizontal = (this.keys.RIGHT.isDown || this.keys.D.isDown || this.touch.right ? 1 : 0)
      - (this.keys.LEFT.isDown || this.keys.A.isDown || this.touch.left ? 1 : 0);
    const vertical = (this.keys.DOWN.isDown || this.keys.S.isDown || this.touch.down ? 1 : 0)
      - (this.keys.UP.isDown || this.keys.W.isDown || this.touch.up ? 1 : 0);
    h.vx = Phaser.Math.Clamp(h.vx + horizontal * 560 * dt, -275, 275);
    h.vy = Phaser.Math.Clamp(h.vy + vertical * 540 * dt, -240, 235);
    if (!horizontal) h.vx *= Math.exp(-4 * dt);
    if (!vertical) h.vy *= Math.exp(-4.8 * dt);
    h.x = Phaser.Math.Clamp(h.x + h.vx * dt, 28, WORLD - 28);
    h.y = Phaser.Math.Clamp(h.y + h.vy * dt, 78, GROUND - 32);
    if (h.y === GROUND - 32 && h.vy > 0) {
      if (h.vy > 195) this.crash();
      h.vy = 0;
    }
  }

  fire() {
    if (this.fireClock || this.heli.y >= GROUND - 32) return;
    const h = this.heli;
    const front = h.facing === 0;
    this.fireClock = front ? .31 : .13;
    this.shots.push({ x: h.x + h.facing * 29, y: h.y + 5, vx: front ? h.vx * .2 : h.facing * 580 + h.vx * .2,
      vy: front ? 395 : h.vy * .1, ttl: 1.5, owner: 'player', kind: front ? 'bomb' : 'bullet' });
    this.soundEffect(front ? 150 : 320, .055, 'square', .018);
  }

  updateHostages(dt) {
    const h = this.heli;
    const landed = h.y >= GROUND - 32 && Math.abs(h.vx) < 35;
    this.boardClock -= dt;
    this.unloadClock -= dt;
    if (landed && h.x >= PAD.left && h.x <= PAD.right) {
      if (this.unloadClock <= 0) {
        const person = this.hostages.find(p => p.state === 'aboard');
        if (person) {
          person.state = 'rescued';
          this.unloadClock = .16;
          this.soundEffect(640, .07, 'sine', .026);
          if (!this.hostages.some(p => p.state === 'aboard')) this.message('SORTIE COMPLETE  ·  FLY AGAIN', 2.4);
          this.checkEnd();
        }
      }
      return;
    }
    for (const p of this.hostages) {
      if (p.state !== 'free') continue;
      if (landed && Math.abs(p.x - h.x) < 170 && canBoard(this.hostages)) {
        p.x += Math.sign(h.x - p.x) * Math.min(Math.abs(h.x - p.x), 74 * dt);
        if (Math.abs(p.x - h.x) < 20 && this.boardClock <= 0) {
          p.state = 'aboard';
          this.boardClock = .17;
          this.soundEffect(560, .05, 'sine', .018);
          if (!canBoard(this.hostages)) this.message('CABIN FULL  ·  RETURN TO BASE');
        }
      }
    }
  }

  updateEnemies(dt) {
    const h = this.heli;
    for (const tank of this.tanks) {
      tank.x += tank.dir * 24 * dt;
      if (Math.abs(tank.x - tank.home) > 85) tank.dir *= -1;
      tank.fire -= dt;
      if (tank.fire <= 0 && Math.abs(tank.x - h.x) < 380 && h.y > 330 && h.x > 610) {
        const dx = h.x - tank.x, dy = h.y - (GROUND - 22), len = Math.hypot(dx, dy);
        this.shots.push({ x: tank.x, y: GROUND - 22, vx: dx / len * 225, vy: dy / len * 225, ttl: 2.4, owner: 'enemy', kind: 'shell' });
        tank.fire = 2.6 + Math.random() * 1.8;
      }
    }
    this.jetClock -= dt;
    if (this.jetClock <= 0 && this.jets.length < 2) {
      const fromRight = h.x < WORLD - 580;
      this.jets.push({ x: Phaser.Math.Clamp(h.x + (fromRight ? 630 : -630), 610, WORLD - 40),
        y: 155 + Math.random() * 190, vx: fromRight ? -210 : 210, fire: 1.1 });
      this.jetClock = Math.max(8, 15 - this.elapsed / 55);
    }
    for (const jet of this.jets) {
      jet.x += jet.vx * dt;
      jet.fire -= dt;
      if (jet.fire <= 0 && Math.abs(jet.x - h.x) < 440) {
        const dx = h.x - jet.x, dy = h.y - jet.y, len = Math.hypot(dx, dy);
        this.shots.push({ x: jet.x, y: jet.y, vx: dx / len * 245, vy: dy / len * 245, ttl: 2.8, owner: 'enemy', kind: 'missile' });
        jet.fire = 3.5;
      }
      if (Math.hypot(jet.x - h.x, jet.y - h.y) < 32) { this.burst(jet.x, jet.y); jet.dead = true; this.crash(); }
    }
    this.jets = this.jets.filter(j => !j.dead && j.x > 520 && j.x < WORLD + 80);
    this.mineClock -= dt;
    if (this.mineClock <= 0 && this.mines.length < 2 && h.x > 650) {
      this.mines.push({ x: Math.min(WORLD - 30, h.x + 510), y: 140 + Math.random() * 270 });
      this.mineClock = 20;
    }
    for (const mine of this.mines) {
      const dx = h.x - mine.x, dy = h.y - mine.y, len = Math.hypot(dx, dy) || 1;
      mine.x += dx / len * 80 * dt;
      mine.y += dy / len * 80 * dt;
      if (len < 27) { mine.dead = true; this.crash(); }
    }
    this.mines = this.mines.filter(m => !m.dead);
  }

  updateShots(dt) {
    const h = this.heli;
    for (const shot of this.shots) {
      shot.x += shot.vx * dt; shot.y += shot.vy * dt; shot.ttl -= dt;
      if (shot.owner === 'enemy') {
        if (shot.x < 570) { shot.ttl = 0; continue; }
        if (Math.hypot(shot.x - h.x, shot.y - h.y) < 23) { shot.ttl = 0; this.crash(); }
      } else {
        for (const hut of this.huts) {
          if (!hut.open && Math.abs(shot.x - hut.x) < 43 && shot.y > GROUND - 80 && shot.y < GROUND) {
            hut.open = true;
            this.hostages.filter(p => p.home === this.huts.indexOf(hut)).forEach(p => { p.state = 'free'; });
            shot.ttl = 0;
            this.burst(hut.x, GROUND - 28, C.cyan);
            this.message('BARRACK OPEN  ·  LAND TO BOARD');
            break;
          }
        }
        if (shot.ttl <= 0) continue;
        for (const jet of this.jets) if (Math.hypot(shot.x - jet.x, shot.y - jet.y) < 26) {
          jet.dead = true; shot.ttl = 0; this.burst(jet.x, jet.y); break;
        }
        for (const mine of this.mines) if (Math.hypot(shot.x - mine.x, shot.y - mine.y) < 18) {
          mine.dead = true; shot.ttl = 0; this.burst(mine.x, mine.y); break;
        }
        if (shot.kind === 'bomb') for (const tank of this.tanks) if (Math.abs(shot.x - tank.x) < 25 && shot.y > GROUND - 34) {
          tank.dead = true; shot.ttl = 0; this.burst(tank.x, GROUND - 17); break;
        }
        if (shot.ttl > 0 && shot.y > GROUND - 20) for (const p of this.hostages) if (p.state === 'free' && Math.abs(shot.x - p.x) < 7) {
          p.state = 'lost'; shot.ttl = 0; this.burst(p.x, GROUND - 13, C.red); this.checkEnd(); break;
        }
      }
      if (shot.y < 48 || shot.y > GROUND || shot.x < 0 || shot.x > WORLD) shot.ttl = 0;
    }
    this.shots = this.shots.filter(s => s.ttl > 0);
    this.jets = this.jets.filter(j => !j.dead);
    this.mines = this.mines.filter(m => !m.dead);
    this.tanks = this.tanks.filter(t => !t.dead);
  }

  burst(x, y, color = C.orange) {
    for (let i = 0; i < 10; i++) {
      const a = i * Math.PI / 5;
      this.sparks.push({ x, y, vx: Math.cos(a) * (35 + Math.random() * 70), vy: Math.sin(a) * (35 + Math.random() * 70), life: .5, color });
    }
    this.soundEffect(90, .18, 'sawtooth', .04);
  }

  crash() {
    if (this.heli.invuln || this.mode !== 'playing') return;
    this.burst(this.heli.x, this.heli.y);
    for (const p of this.hostages) if (p.state === 'aboard') p.state = 'lost';
    this.lives--;
    this.shots = this.shots.filter(s => s.owner === 'player');
    if (!this.lives) {
      this.finish();
      return;
    }
    this.heli = { x: 290, y: GROUND - 32, vx: 0, vy: 0, facing: 1, invuln: 3 };
    this.message(`${this.lives === 2 ? 'SECOND' : 'FINAL'} SORTIE`, 2.6);
    this.checkEnd();
  }

  checkEnd() { if (missionComplete(this.hostages)) this.finish(); }

  finish() {
    this.mode = 'ended';
    const { rescued, lost } = tally(this.hostages);
    overlay(rescued === TOTAL_HOSTAGES ? 'PERFECT RESCUE' : 'MISSION COMPLETE',
      rescued === TOTAL_HOSTAGES ? 'ALL 64 HOME' : `${rescued} RESCUED`,
      `${lost} lost · ${this.lives} helicopter${this.lives === 1 ? '' : 's'} remaining. Fly another mission and try to bring everyone home.`,
      'Fly again');
    ui.pause.textContent = 'Pause';
  }

  updateHud() {
    const { lost, aboard, rescued } = tally(this.hostages);
    if (!this.hud) {
      const style = { fontFamily: 'Courier New, monospace', fontSize: '18px', color: '#fff8e7', fontStyle: 'bold' };
      this.hud = [this.add.text(91, 13, '', style), this.add.text(342, 13, '', style), this.add.text(619, 13, '', style)];
      this.lifeText = this.add.text(981, 14, '', { ...style, fontSize: '15px' });
      this.noticeText = this.add.text(W / 2, 72, '', { fontFamily: 'Courier New, monospace', fontSize: '19px', color: '#ffffff', fontStyle: 'bold', stroke: '#07101d', strokeThickness: 4 }).setOrigin(.5);
    }
    this.hud[0].setText(`LOST  ${String(lost).padStart(2, '0')}`);
    this.hud[1].setText(`ABOARD  ${String(aboard).padStart(2, '0')}/${CAPACITY}`);
    this.hud[2].setText(`RESCUED  ${String(rescued).padStart(2, '0')}/${TOTAL_HOSTAGES}`);
    this.lifeText.setText(`CHOPPERS ${this.lives}`);
    this.noticeText.setText(this.noticeClock > 0 ? this.notice : '');
    ui.mobileLost.textContent = String(lost).padStart(2, '0');
    ui.mobileAboard.textContent = `${String(aboard).padStart(2, '0')}/${CAPACITY}`;
    ui.mobileRescued.textContent = `${String(rescued).padStart(2, '0')}/${TOTAL_HOSTAGES}`;
  }

  sx(x) { return Math.round(x - this.cameraX); }

  draw() {
    const g = this.g; g.clear();
    g.fillStyle(C.sky).fillRect(0, 0, W, H);
    for (const star of this.stars) {
      const x = this.sx(star.x * .42);
      if (x < 0 || x > W) continue;
      g.fillStyle(C.star, .35 + .45 * (1 + Math.sin(this.elapsed * 2 + star.phase)) / 2).fillRect(x, star.y, star.r, star.r);
    }
    const moonX = 883 - this.cameraX * .06;
    g.fillStyle(C.moon).fillCircle(moonX, 166, 35);
    g.fillStyle(C.moonShade).fillCircle(moonX - 11, 159, 7).fillCircle(moonX + 10, 179, 9).fillCircle(moonX + 16, 149, 4);
    g.fillStyle(C.cream, .65).fillRect(moonX - 25, 161, 11, 2).fillRect(moonX + 1, 146, 7, 2);
    g.fillStyle(C.ground).fillRect(0, GROUND, W, H - GROUND);
    g.fillStyle(C.groundDark).fillRect(0, GROUND + 39, W, H - GROUND - 39);
    g.lineStyle(2, C.cream, .7).lineBetween(0, GROUND, W, GROUND);
    for (let x = Math.floor(this.cameraX / 47) * 47; x < this.cameraX + W + 47; x += 47) {
      const sx = this.sx(x);
      g.fillStyle(C.grass, .62).fillRect(sx, GROUND - 4, 10, 3).fillRect(sx + 17, GROUND - 3, 5, 2);
    }
    this.drawBase(g);
    for (const hut of this.huts) this.drawHut(g, hut);
    for (const tank of this.tanks) this.drawTank(g, tank);
    for (const p of this.hostages) if (p.state === 'free') this.drawPerson(g, p);
    for (const jet of this.jets) this.drawJet(g, jet);
    for (const mine of this.mines) this.drawMine(g, mine);
    for (const shot of this.shots) {
      const x = this.sx(shot.x);
      if (x < -10 || x > W + 10) continue;
      g.fillStyle(shot.owner === 'player' ? C.cream : C.orange);
      if (shot.kind === 'missile') { g.fillRect(x - 5, shot.y - 2, 11, 4); g.fillStyle(C.red).fillRect(x - 9, shot.y - 1, 4, 2); }
      else g.fillRect(x - (shot.kind === 'bomb' ? 3 : 5), shot.y - 2, shot.kind === 'bomb' ? 6 : 10, 4);
    }
    this.drawHeli(g);
    for (const p of this.sparks) {
      const x = this.sx(p.x + p.vx * (.5 - p.life));
      const y = p.y + p.vy * (.5 - p.life);
      g.fillStyle(p.color, p.life * 2).fillRect(x, y, 4, 4);
    }
    this.drawHud(g);
  }

  drawBase(g) {
    const x = this.sx(56);
    if (x < -400 || x > W) return;
    g.fillStyle(C.green).fillRect(this.sx(PAD.left), GROUND - 3, PAD.right - PAD.left, 5);
    g.fillStyle(C.cream).fillRect(x, GROUND - 42, 144, 42);
    g.fillStyle(C.orange).fillRect(x + 7, GROUND - 35, 127, 5);
    g.fillStyle(C.sky).fillRect(x + 12, GROUND - 27, 25, 15).fillRect(x + 46, GROUND - 27, 25, 15).fillRect(x + 80, GROUND - 27, 25, 15);
    g.fillStyle(C.cyan).fillRect(x + 112, GROUND - 24, 22, 24);
    g.fillStyle(C.cream).fillRect(x + 74, GROUND - 54, 3, 12);
    g.fillStyle(C.red).fillTriangle(x + 77, GROUND - 54, x + 98, GROUND - 49, x + 77, GROUND - 46);
    g.fillStyle(C.cream).fillRect(x - 7, GROUND - 46, 157, 5);
    g.fillStyle(C.sky).fillRect(x + 43, GROUND - 39, 67, 3);
  }

  drawHut(g, hut) {
    const x = this.sx(hut.x);
    if (x < -80 || x > W + 80) return;
    g.fillStyle(C.cyan).fillRect(x - 41, GROUND - 40, 82, 40);
    g.fillStyle(C.blue).fillTriangle(x - 49, GROUND - 40, x, GROUND - 67, x + 49, GROUND - 40);
    g.fillStyle(C.cream).fillRect(x - 29, GROUND - 27, 17, 12).fillRect(x + 13, GROUND - 27, 17, 12);
    g.fillStyle(hut.open ? C.sky : C.red).fillRect(x - 9, GROUND - 28, 18, 28);
    if (hut.open) { g.fillStyle(C.orange).fillRect(x - 24, GROUND - 41, 13, 6).fillRect(x + 15, GROUND - 40, 10, 5); }
    else { g.fillStyle(C.cream).fillRect(x - 2, GROUND - 22, 4, 4); }
  }

  drawPerson(g, p) {
    const x = this.sx(p.x), y = GROUND - 13;
    if (x < -8 || x > W + 8) return;
    g.fillStyle(C.cream).fillCircle(x, y - 5, 3);
    g.fillRect(x - 2, y - 2, 4, 8);
    g.fillRect(x - 4, y + 5, 3, 4).fillRect(x + 1, y + 5, 3, 4);
    if (Math.abs(p.x - this.heli.x) > 100 && Math.sin(this.elapsed * 6 + p.x) > .1) g.fillRect(x + 2, y - 3, 6, 2);
  }

  drawTank(g, tank) {
    const x = this.sx(tank.x), y = GROUND - 11;
    if (x < -40 || x > W + 40) return;
    g.fillStyle(C.green).fillRect(x - 23, y - 5, 46, 12).fillRect(x - 12, y - 14, 25, 10);
    g.fillRect(x + (tank.dir > 0 ? 5 : -28), y - 13, 24, 3);
    g.fillStyle(C.ink).fillRect(x - 17, y + 3, 9, 5).fillRect(x + 8, y + 3, 9, 5);
  }

  drawJet(g, jet) {
    const x = this.sx(jet.x), y = jet.y, d = Math.sign(jet.vx);
    if (x < -70 || x > W + 70) return;
    g.fillStyle(C.cyan).fillTriangle(x + d * 30, y, x - d * 21, y - 7, x - d * 21, y + 7);
    g.fillTriangle(x + d * 2, y - 2, x - d * 15, y - 18, x - d * 15, y + 2);
    g.fillTriangle(x + d * 2, y + 2, x - d * 15, y + 18, x - d * 15, y - 2);
    g.fillStyle(C.red).fillRect(x - d * 32, y - 3, 8, 6);
  }

  drawMine(g, mine) {
    const x = this.sx(mine.x), y = mine.y;
    if (x < -30 || x > W + 30) return;
    g.fillStyle(C.orange).fillCircle(x, y, 9);
    g.fillStyle(C.red).fillCircle(x, y, 5);
    g.lineStyle(3, C.cream).lineBetween(x - 15, y, x + 15, y).lineBetween(x, y - 15, x, y + 15);
  }

  drawHeli(g) {
    const h = this.heli, x = this.sx(h.x), y = Math.round(h.y);
    if (h.invuln && Math.floor(this.elapsed * 12) % 2) return;
    const d = h.facing;
    g.lineStyle(3, C.cream).lineBetween(x - 30, y - 22, x + 30, y - 22);
    g.lineStyle(2, C.cream).lineBetween(x, y - 21, x, y - 14);
    g.fillStyle(C.cream).fillRect(x - 17, y - 13, 35, 20);
    g.fillStyle(C.ink).fillRect(x - 5, y - 9, 17, 11);
    g.fillStyle(C.cyan).fillRect(x + (d >= 0 ? 10 : -17), y - 10, 7, 8);
    if (d) {
      g.fillStyle(C.cream).fillRect(x - d * 46, y - 7, 31, 5);
      g.fillRect(x - d * 49, y - 13, 4, 18);
      g.fillStyle(C.cream).fillTriangle(x + d * 18, y - 10, x + d * 30, y, x + d * 18, y + 7);
    } else {
      g.fillStyle(C.cream).fillRect(x - 20, y - 7, 40, 6);
      g.fillStyle(C.blue).fillRect(x - 10, y - 9, 20, 9);
    }
    g.lineStyle(2, C.cream).lineBetween(x - 23, y + 11, x + 22, y + 11).lineBetween(x - 15, y + 5, x - 17, y + 11).lineBetween(x + 13, y + 5, x + 15, y + 11);
    if (tally(this.hostages).aboard) { g.fillStyle(C.green).fillRect(x - 4, y + 3, 8, 3); }
  }

  drawHud(g) {
    g.fillStyle(C.green).fillRect(0, 0, W, 47);
    g.fillStyle(C.sky).fillRect(6, 5, W - 12, 36);
    g.lineStyle(2, C.cream).strokeRect(6, 5, W - 12, 36);
    g.fillStyle(C.red).fillTriangle(43, 23, 54, 17, 65, 23).fillTriangle(43, 23, 54, 29, 65, 23);
    g.fillStyle(C.cyan).fillTriangle(293, 23, 304, 17, 315, 23).fillTriangle(293, 23, 304, 29, 315, 23);
    g.fillStyle(C.green).fillTriangle(569, 23, 580, 17, 591, 23).fillTriangle(569, 23, 580, 29, 591, 23);
    g.lineStyle(1, C.cream, .35).lineBetween(272, 9, 272, 38).lineBetween(548, 9, 548, 38).lineBetween(948, 9, 948, 38);
  }
}

const scene = new RescueScene();
new Phaser.Game({ type: Phaser.AUTO, parent: 'game', width: W, height: H, backgroundColor: '#080d18',
  render: { pixelArt: true, antialias: false }, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, scene });

ui.start.addEventListener('click', () => scene.startMission());
ui.pause.addEventListener('click', () => scene.togglePause());
ui.sound.addEventListener('click', () => { scene.muted = !scene.muted; ui.sound.textContent = scene.muted ? 'Sound off' : 'Sound on'; });
ui.fullscreen.addEventListener('click', () => {
  const frame = document.querySelector('.game-section');
  if (document.fullscreenElement) document.exitFullscreen();
  else frame.requestFullscreen?.();
});
ui.exitFullscreen.addEventListener('click', () => document.exitFullscreen());
for (const button of document.querySelectorAll('[data-control]')) {
  const control = button.dataset.control;
  button.addEventListener('pointerdown', event => { event.preventDefault(); button.setPointerCapture(event.pointerId); if (control === 'turn') scene.turn(); else scene.touch[control] = true; });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(name, () => { if (control !== 'turn') scene.touch[control] = false; });
}
window.addEventListener('blur', () => { for (const key of Object.keys(scene.touch)) scene.touch[key] = false; });
