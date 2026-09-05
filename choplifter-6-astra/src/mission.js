export const WORLD = 3800;
export const GROUND = 430;
export const PAD = { x: 3400, width: 270 };
export const BORDER = 3090;
export const CAPACITY = 16;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const near = (a, b, x, y) => Math.abs(a.x - b.x) < x && Math.abs(a.y - b.y) < y;

// A deterministic simulation lets the actual flight and rescue rules run in Node too.
export class Mission {
  constructor(seed = 1982) {
    this.seed = seed;
    this.time = 0;
    this.lives = 3;
    this.trips = 0;
    this.status = 'playing';
    this.events = [];
    this.bullets = [];
    this.enemies = [];
    this.camps = [2650, 1950, 1250, 550].map((x, i) => ({ x, y: GROUND - 28, open: i === 0, hp: 3, id: i }));
    this.people = this.camps.flatMap(c => Array.from({ length: 16 }, (_, i) => ({
      x: c.x + 85 + (i % 8) * 11, y: GROUND - 7, homeX: c.x + 85 + (i % 8) * 11,
      camp: c.id, state: c.open ? 'waiting' : 'captive', phase: i * 1.4,
    })));
    this.cooldowns = { tank: 8, jet: 6, mine: 8, fire: 0, board: 0, unload: 0 };
    this.heli = this.newHelicopter();
  }

  random() {
    this.seed = (Math.imul(1664525, this.seed) + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  newHelicopter() {
    return { x: PAD.x, y: GROUND - 20, vx: 0, vy: 0, face: -1, turnIndex: 0, grounded: true, dead: 0, invincible: 3, delivered: false };
  }

  counts() {
    const c = { rescued: 0, aboard: 0, lost: 0, waiting: 0, captive: 0 };
    for (const person of this.people) c[person.state === 'aboard' ? 'aboard' : person.state]++;
    return c;
  }

  emit(type, x, y, text) { this.events.push({ type, x, y, text }); }

  turn() {
    if (this.status !== 'playing' || this.heli.dead) return;
    this.heli.turnIndex = (this.heli.turnIndex + 1) % 4;
    this.heli.face = [-1, 0, 1, 0][this.heli.turnIndex];
    this.emit('turn');
  }

  openCamp(camp) {
    if (camp.open) return;
    camp.open = true;
    for (const p of this.people) if (p.camp === camp.id && p.state === 'captive') p.state = 'waiting';
    this.emit('explosion', camp.x, camp.y);
    this.emit('radio', 0, 0, 'BARRACKS OPEN · Land beside the hostages');
  }

  losePerson(person) {
    if (person.state === 'lost' || person.state === 'rescued' || person.state === 'captive') return;
    person.state = 'lost';
    this.emit('casualty', person.x, person.y);
  }

  crash(reason = 'AIRCRAFT LOST') {
    const h = this.heli;
    if (h.dead || this.status !== 'playing') return;
    this.emit('explosion', h.x, h.y);
    this.emit('crash', h.x, h.y);
    for (const p of this.people) if (p.state === 'aboard') this.losePerson(p);
    this.lives--;
    h.dead = 2.4;
    h.vx = h.vy = 0;
    this.emit('radio', 0, 0, `${reason} · ${this.lives ? 'Replacement aircraft inbound' : 'Fleet exhausted'}`);
    this.checkEnd();
  }

  checkEnd() {
    const c = this.counts();
    if (this.lives === 0 || c.rescued + c.lost === 64) {
      this.status = 'ended';
      this.emit('end');
    }
  }

  shoot() {
    const h = this.heli;
    if (this.cooldowns.fire > 0 || h.dead) return;
    this.cooldowns.fire = h.face === 0 ? 0.36 : 0.16;
    this.bullets.push({ x: h.x + h.face * 34, y: h.y + (h.face === 0 ? 19 : 3),
      vx: h.face * 640 + h.vx * 0.2, vy: h.face === 0 ? 235 : 0,
      ttl: 1.6, friendly: true, bomb: h.face === 0 });
    this.emit('shot', h.x, h.y);
  }

  step(delta, input = {}) {
    if (this.status !== 'playing') return;
    const dt = clamp(delta, 0, 0.034);
    this.time += dt;
    for (const key of Object.keys(this.cooldowns)) this.cooldowns[key] -= dt;
    const h = this.heli;
    h.invincible = Math.max(0, h.invincible - dt);
    if (h.dead) {
      h.dead -= dt;
      if (h.dead <= 0) {
        this.heli = this.newHelicopter();
        this.bullets = this.bullets.filter(b => b.friendly);
        this.enemies = this.enemies.filter(e => e.x < BORDER - 200);
      }
      return;
    }

    const ax = Number(!!input.right) - Number(!!input.left);
    const ay = Number(!!input.down) - Number(!!input.up);
    const wasGrounded = h.grounded;
    if (input.up) h.grounded = false;
    if (!h.grounded) {
      h.vx = clamp((h.vx + ax * 680 * dt) * Math.exp(-(ax ? 1.4 : 5.8) * dt), -260, 260);
      h.vy = clamp((h.vy + ay * 550 * dt) * Math.exp(-(ay ? 2.2 : 6.8) * dt), -165, 145);
      h.x = clamp(h.x + h.vx * dt, 45, WORLD - 45);
      h.y = Math.max(48, h.y + h.vy * dt);
      if (h.y === 48) h.vy = Math.max(0, h.vy);
      if (h.y >= GROUND - 20) {
        h.y = GROUND - 20;
        if (Math.abs(h.vx) > 105) { this.crash('HARD LANDING · Reduce horizontal speed'); return; }
        if (!wasGrounded) {
          for (const p of this.people) if (p.state === 'waiting' && Math.abs(p.x - h.x) < 24) this.losePerson(p);
          this.emit('land', h.x, GROUND);
        }
        h.grounded = true;
        h.vx = h.vy = 0;
      }
    }
    if (input.fire) this.shoot();
    this.rescue(dt);
    this.spawnEnemies();
    this.moveEnemies(dt);
    this.moveBullets(dt);
    this.checkEnd();
  }

  rescue(dt) {
    const h = this.heli;
    let aboard = this.counts().aboard;
    for (const p of this.people) {
      if (p.state !== 'waiting') continue;
      const withinReach = Math.abs(p.x - h.x) < 210;
      if (h.grounded && withinReach && aboard < CAPACITY) {
        p.x += Math.sign(h.x - p.x) * 39 * dt;
        if (Math.abs(h.x - p.x) < 23 && this.cooldowns.board <= 0) {
          p.state = 'aboard';
          aboard++;
          h.delivered = false;
          this.cooldowns.board = 0.24;
          this.emit('board', p.x, p.y);
          if (aboard === CAPACITY) this.emit('radio', 0, 0, 'CABIN FULL · Return east to the home pad →');
        }
      } else {
        const target = p.homeX + Math.sin(this.time * 0.8 + p.phase) * 8;
        p.x += clamp(target - p.x, -12 * dt, 12 * dt);
      }
    }
    if (h.grounded && Math.abs(h.x - PAD.x) < PAD.width / 2 && aboard && this.cooldowns.unload <= 0) {
      const p = this.people.find(p => p.state === 'aboard');
      p.state = 'rescued';
      p.x = h.x + 35;
      p.y = GROUND - 7;
      this.cooldowns.unload = 0.3;
      this.emit('rescue', p.x, p.y);
      if (!h.delivered) {
        h.delivered = true;
        this.trips++;
        this.emit('radio', 0, 0, 'HOME SAFE · Unloading passengers');
      }
    }
  }

  spawnEnemies() {
    const h = this.heli;
    if (this.cooldowns.tank <= 0 && h.x < BORDER && this.enemies.filter(e => e.type === 'tank').length < 5) {
      // ponytail: capped enemy counts make a linear collision scan sufficient; use a grid for crowds.
      const x = clamp(h.x - 490 - this.random() * 210, 65, BORDER - 130);
      this.enemies.push({ type: 'tank', x, y: GROUND - 12, vx: 23, hp: 2, cooldown: 2.5 });
      this.cooldowns.tank = Math.max(7, 15 - this.trips * 2);
    }
    if (this.trips > 0 && this.cooldowns.jet <= 0 && h.x < BORDER) {
      this.enemies.push({ type: 'jet', x: clamp(h.x - 750, 10, BORDER - 750), y: clamp(h.y - 65, 80, 270), vx: 225 + this.trips * 12, hp: 1, cooldown: 1.4 });
      this.cooldowns.jet = 13;
      this.emit('radio', 0, 0, 'AIR CONTACT · Fighter approaching from the west');
    }
    if (this.trips >= 2 && this.cooldowns.mine <= 0 && this.enemies.filter(e => e.type === 'mine').length < 2) {
      this.enemies.push({ type: 'mine', x: clamp(h.x - 550, 50, WORLD - 50), y: 75, vx: 0, hp: 1, phase: this.time });
      this.cooldowns.mine = 19;
      this.emit('radio', 0, 0, 'HOMING MINE · It can follow you across the border');
    }
  }

  moveEnemies(dt) {
    const h = this.heli;
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      if (e.type === 'mine') {
        const angle = Math.atan2(h.y - e.y, h.x - e.x);
        e.x += Math.cos(angle) * 87 * dt;
        e.y += Math.sin(angle) * 87 * dt;
      } else {
        e.x += e.vx * dt;
        if (e.type === 'tank' && (e.x > BORDER - 90 || e.x < 40)) e.vx *= -1;
        e.cooldown -= dt;
        const dx = h.x - e.x;
        if (e.cooldown <= 0 && Math.abs(dx) < 600 && h.x < BORDER && (e.type === 'jet' || h.y > GROUND - 155)) {
          const angle = Math.atan2(h.y - e.y, dx);
          const speed = e.type === 'tank' ? 165 : 200;
          this.bullets.push({ x: e.x, y: e.y - 8, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, friendly: false, ttl: 3.8, bomb: false });
          e.cooldown = e.type === 'tank' ? 3.5 : 1.8;
          this.emit('enemyshot', e.x, e.y);
        }
      }
      if (near(e, h, e.type === 'mine' ? 32 : 42, e.type === 'tank' ? 25 : 22) && h.invincible <= 0) this.crash();
    }
    this.enemies = this.enemies.filter(e => e.hp > 0 && (e.type !== 'jet' || e.x < BORDER - 25));
  }

  moveBullets(dt) {
    const h = this.heli;
    for (const b of this.bullets) {
      if (b.ttl <= 0) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.bomb) b.vy += 180 * dt;
      b.ttl -= dt;
      if (b.friendly) {
        for (const e of this.enemies) if (e.hp > 0 && near(b, e, e.type === 'mine' ? 18 : 31, 18)) {
          e.hp -= b.bomb ? 2 : 1;
          b.ttl = 0;
          this.emit(e.hp <= 0 ? 'explosion' : 'spark', e.x, e.y);
          break;
        }
        if (b.ttl <= 0) continue;
        for (const other of this.bullets) if (!other.friendly && other.ttl > 0 && near(b, other, 13, 13)) {
          b.ttl = other.ttl = 0;
          this.emit('spark', b.x, b.y);
          break;
        }
      } else if (!h.dead && h.invincible <= 0 && near(b, h, 29, 17)) {
        b.ttl = 0;
        this.crash('AIRCRAFT HIT');
      }
      if (b.ttl <= 0) continue;
      for (const c of this.camps) if (!c.open && near(b, c, 64, 32)) {
        c.hp -= b.bomb ? 3 : 1;
        b.ttl = 0;
        if (c.hp <= 0) this.openCamp(c);
        else this.emit('spark', b.x, b.y);
        break;
      }
      if (b.ttl <= 0) continue;
      for (const p of this.people) if (p.state === 'waiting' && near(b, p, 7, 13)) {
        this.losePerson(p);
        b.ttl = 0;
        break;
      }
      if (b.y >= GROUND) {
        b.ttl = 0;
        this.emit('spark', b.x, GROUND);
        if (b.bomb) for (const p of this.people) if (p.state === 'waiting' && Math.abs(p.x - b.x) < 24) this.losePerson(p);
      }
    }
    this.bullets = this.bullets.filter(b => b.ttl > 0 && b.x > 0 && b.x < WORLD && b.y > 0);
  }
}
