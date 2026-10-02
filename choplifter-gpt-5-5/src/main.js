import Phaser from "phaser";
import "./styles.css";
import { clamp, gameResult, isOnBasePad, nextFacing } from "./rules.js";

const WIDTH = 960;
const HEIGHT = 540;
const WORLD = 3600;
const GROUND = 462;
const TOTAL_HOSTAGES = 64;
const CAPACITY = 16;
const PAD_X = 3180;
const PAD_W = 230;

const hud = {
  lost: document.querySelector("#lost"),
  onboard: document.querySelector("#onboard"),
  rescued: document.querySelector("#rescued"),
  lives: document.querySelector("#lives"),
  message: document.querySelector("#message"),
};

const touch = { left: false, right: false, up: false, down: false, fire: false, rotate: false, fireTap: false, rotateTap: false };
for (const button of document.querySelectorAll("[data-control]")) {
  const key = button.dataset.control;
  const set = (value) => {
    touch[key] = value;
    if (value) button.setAttribute("aria-pressed", "true");
    else button.removeAttribute("aria-pressed");
  };
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    set(true);
  });
  button.addEventListener("pointerup", () => set(false));
  button.addEventListener("pointerleave", () => set(false));
  button.addEventListener("click", () => {
    if (key === "fire") touch.fireTap = true;
    if (key === "rotate") touch.rotateTap = true;
  });
}

class RescueScene extends Phaser.Scene {
  constructor() {
    super("rescue");
  }

  create() {
    this.cameras.main.setBounds(0, 0, WORLD, HEIGHT);
    this.keys = this.input.keyboard.addKeys("W,A,S,D,SPACE,Z,C,SHIFT,ENTER");
    this.cursors = this.input.keyboard.createCursorKeys();
    this.g = this.add.graphics();
    this.uiText = this.add.text(12, 10, "", {
      fontFamily: "ui-sans-serif, system-ui, sans-serif",
      fontSize: "14px",
      color: "#111111",
      backgroundColor: "rgba(255,253,249,0.86)",
      padding: { x: 8, y: 6 },
    }).setScrollFactor(0);
    this.resetGame();
  }

  resetGame() {
    this.result = "playing";
    this.rescued = 0;
    this.lost = 0;
    this.jetTimer = 8;
    this.mineTimer = 18;
    this.tankTimer = 1.5;
    this.rotateWasDown = false;
    this.fireWasDown = false;
    this.heli = {
      x: 3260,
      y: GROUND - 34,
      vx: 0,
      vy: 0,
      facing: "left",
      landed: true,
      onboard: 0,
      lives: 3,
      cooldown: 0,
      invincible: 1.5,
    };
    this.barracks = [260, 600, 940, 1280].map((x, index) => ({
      x,
      y: GROUND - 50,
      open: false,
      hp: index === 0 ? 0 : 3,
      remaining: 16,
    }));
    this.hostages = [];
    this.bullets = [];
    this.bombs = [];
    this.shells = [];
    this.jets = [];
    this.mines = [];
    this.tanks = [460, 780, 1120, 1480, 1900, 2380].map((x) => ({
      x,
      y: GROUND - 13,
      alive: true,
      cooldown: Phaser.Math.FloatBetween(0.4, 2.2),
    }));
    this.openBarrack(this.barracks[0]);
    hud.message.hidden = true;
    this.updateHud();
  }

  update(_time, deltaMs) {
    const dt = Math.min(deltaMs / 1000, 0.035);
    if (Phaser.Input.Keyboard.JustDown(this.keys.ENTER)) this.resetGame();
    if (this.result !== "playing") {
      this.draw();
      return;
    }

    this.updateHelicopter(dt);
    this.updateHostages(dt);
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.checkCollisions();
    this.result = gameResult({
      rescued: this.rescued,
      lost: this.lost,
      total: TOTAL_HOSTAGES,
      lives: this.heli.lives,
    });
    if (this.result !== "playing") {
      hud.message.textContent = this.result === "won"
        ? "All hostages rescued. Press Enter to fly again."
        : "Mission over. Press Enter to retry.";
      hud.message.hidden = false;
    }
    this.updateHud();
    this.draw();
  }

  updateHelicopter(dt) {
    const wasLanded = this.heli.landed;
    const left = this.cursors.left.isDown || this.keys.A.isDown || touch.left;
    const right = this.cursors.right.isDown || this.keys.D.isDown || touch.right;
    const up = this.cursors.up.isDown || this.keys.W.isDown || touch.up;
    const down = this.cursors.down.isDown || this.keys.S.isDown || touch.down;
    const rotate = this.keys.C.isDown || this.keys.SHIFT.isDown || touch.rotate || touch.rotateTap;
    const fire = this.keys.SPACE.isDown || this.keys.Z.isDown || touch.fire || touch.fireTap;

    if (rotate && !this.rotateWasDown) this.heli.facing = nextFacing(this.heli.facing);
    this.rotateWasDown = rotate;
    touch.rotateTap = false;

    if (fire && (!this.fireWasDown || this.heli.cooldown <= 0)) this.fireWeapon();
    this.fireWasDown = fire;
    touch.fireTap = false;
    this.heli.cooldown -= dt;
    this.heli.invincible -= dt;

    const airborne = !this.heli.landed || up;
    if (airborne) {
      this.heli.landed = false;
      if (left) this.heli.vx -= 360 * dt;
      if (right) this.heli.vx += 360 * dt;
      if (up) this.heli.vy -= 520 * dt;
      if (down) this.heli.vy += 380 * dt;
      this.heli.vy += up ? 150 * dt : 240 * dt;
      this.heli.vx *= 0.986;
      this.heli.vy *= 0.992;
    } else {
      this.heli.vx *= 0.86;
    }

    this.heli.vx = clamp(this.heli.vx, -220, 220);
    this.heli.vy = clamp(this.heli.vy, -260, 260);
    this.heli.x = clamp(this.heli.x + this.heli.vx * dt, 70, WORLD - 80);
    this.heli.y += this.heli.vy * dt;
    if (this.heli.y < 76) {
      this.heli.y = 76;
      this.heli.vy = 20;
    }

    const landingY = GROUND - 34;
    if (this.heli.y >= landingY) {
      const hard = this.heli.vy > 230;
      const touchedDown = !wasLanded;
      this.heli.y = landingY;
      this.heli.vy = 0;
      this.heli.landed = true;
      if (hard) this.crash();
      else if (touchedDown && !isOnBasePad(this.heli.x, PAD_X, PAD_W)) this.crushHostagesUnderSkids();
      if (isOnBasePad(this.heli.x, PAD_X, PAD_W) && this.heli.onboard > 0) {
        this.rescued += this.heli.onboard;
        this.heli.onboard = 0;
      }
    }

    const viewX = clamp(this.heli.x - WIDTH * 0.58, 0, WORLD - WIDTH);
    this.cameras.main.scrollX = viewX;
  }

  fireWeapon() {
    if (this.heli.cooldown > 0) return;
    this.heli.cooldown = 0.18;
    if (this.heli.facing === "front") {
      this.bombs.push({ x: this.heli.x, y: this.heli.y + 18, vy: 80 });
      return;
    }
    const dir = this.heli.facing === "left" ? -1 : 1;
    this.bullets.push({ x: this.heli.x + dir * 45, y: this.heli.y - 2, vx: dir * 520, life: 1.1 });
  }

  openBarrack(barrack) {
    if (barrack.open) return;
    barrack.open = true;
    barrack.hp = 0;
    for (let i = 0; i < barrack.remaining; i += 1) {
      this.hostages.push({
        x: barrack.x + 24 + (i % 8) * 10,
        y: GROUND - 8,
        vx: Phaser.Math.FloatBetween(-20, 26),
        state: "free",
        barrack,
      });
    }
  }

  updateHostages(dt) {
    for (const person of this.hostages) {
      if (person.state !== "free") continue;
      const nearLandedHeli = this.heli.landed
        && this.heli.onboard < CAPACITY
        && Math.abs(person.x - this.heli.x) < 110
        && !isOnBasePad(this.heli.x, PAD_X, PAD_W);
      if (nearLandedHeli) person.vx = Math.sign(this.heli.x - person.x) * 54;
      else if (Math.random() < 0.01) person.vx = Phaser.Math.FloatBetween(-24, 24);
      person.x = clamp(person.x + person.vx * dt, person.barrack.x - 40, person.barrack.x + 170);
      if (nearLandedHeli && Math.abs(person.x - this.heli.x) < 18) {
        person.state = "rescued";
        this.heli.onboard += 1;
      }
    }

  }

  crushHostagesUnderSkids() {
    for (const person of this.hostages) {
      if (person.state === "free" && Math.abs(person.x - this.heli.x) < 38) this.loseHostage(person);
    }
  }

  updateEnemies(dt) {
    this.tankTimer -= dt;
    for (const tank of this.tanks) {
      if (!tank.alive) continue;
      tank.x += Math.sign(this.heli.x - tank.x) * 12 * dt;
      tank.cooldown -= dt;
      if (tank.cooldown <= 0 && Math.abs(this.heli.x - tank.x) < 560 && this.heli.y > GROUND - 165) {
        tank.cooldown = Phaser.Math.FloatBetween(2.0, 3.8);
        this.fireShell(tank.x, tank.y - 10, this.heli.x, this.heli.y);
      }
    }

    this.jetTimer -= dt;
    if (this.jetTimer <= 0 && (this.rescued > 0 || this.heli.x < 2500)) {
      this.jetTimer = Phaser.Math.FloatBetween(6, 10);
      const fromLeft = this.heli.x > WORLD / 2;
      this.jets.push({
        x: fromLeft ? this.heli.x - 620 : this.heli.x + 620,
        y: Phaser.Math.Between(100, 260),
        vx: fromLeft ? 250 : -250,
        shots: 2,
        cooldown: 0.8,
        alive: true,
      });
    }

    for (const jet of this.jets) {
      if (!jet.alive) continue;
      jet.x += jet.vx * dt;
      jet.cooldown -= dt;
      if (jet.cooldown <= 0 && jet.shots > 0 && Math.abs(jet.x - this.heli.x) < 420) {
        jet.shots -= 1;
        jet.cooldown = 1.1;
        this.fireShell(jet.x, jet.y + 8, this.heli.x, this.heli.y, 260);
      }
      if (jet.x < -200 || jet.x > WORLD + 200) jet.alive = false;
    }

    this.mineTimer -= dt;
    if (this.mineTimer <= 0 && (this.rescued >= 16 || this.heli.x < 1800)) {
      this.mineTimer = Phaser.Math.FloatBetween(10, 16);
      this.mines.push({
        x: clamp(this.heli.x + Phaser.Math.Between(-420, 420), 160, WORLD - 260),
        y: Phaser.Math.Between(120, 300),
        vx: 0,
        vy: 0,
        alive: true,
      });
    }
    for (const mine of this.mines) {
      if (!mine.alive) continue;
      const dx = this.heli.x - mine.x;
      const dy = this.heli.y - mine.y;
      const length = Math.max(1, Math.hypot(dx, dy));
      mine.vx += (dx / length) * 38 * dt;
      mine.vy += (dy / length) * 38 * dt;
      mine.vx = clamp(mine.vx, -90, 90);
      mine.vy = clamp(mine.vy, -70, 70);
      mine.x += mine.vx * dt;
      mine.y += mine.vy * dt;
    }
  }

  fireShell(x, y, targetX, targetY, speed = 210) {
    const dx = targetX - x;
    const dy = targetY - y;
    const length = Math.max(1, Math.hypot(dx, dy));
    this.shells.push({ x, y, vx: (dx / length) * speed, vy: (dy / length) * speed, life: 3 });
  }

  updateProjectiles(dt) {
    for (const bullet of this.bullets) {
      bullet.x += bullet.vx * dt;
      bullet.life -= dt;
    }
    for (const bomb of this.bombs) {
      bomb.vy += 420 * dt;
      bomb.y += bomb.vy * dt;
    }
    for (const shell of this.shells) {
      shell.x += shell.vx * dt;
      shell.y += shell.vy * dt;
      shell.life -= dt;
    }
    this.bullets = this.bullets.filter((p) => p.life > 0);
    this.bombs = this.bombs.filter((p) => p.y < GROUND + 12);
    this.shells = this.shells.filter((p) => p.life > 0 && p.y < HEIGHT + 40);
    this.jets = this.jets.filter((jet) => jet.alive);
    this.mines = this.mines.filter((mine) => mine.alive);
  }

  checkCollisions() {
    for (const bullet of this.bullets) {
      for (const barrack of this.barracks) {
        if (!barrack.open && bullet.x > barrack.x && bullet.x < barrack.x + 130 && bullet.y > barrack.y && bullet.y < barrack.y + 48) {
          bullet.life = 0;
          barrack.hp -= 1;
          if (barrack.hp <= 0) this.openBarrack(barrack);
        }
      }
      for (const jet of this.jets) {
        if (jet.alive && Math.abs(bullet.x - jet.x) < 34 && Math.abs(bullet.y - jet.y) < 18) {
          jet.alive = false;
          bullet.life = 0;
        }
      }
      for (const mine of this.mines) {
        if (mine.alive && Math.hypot(bullet.x - mine.x, bullet.y - mine.y) < 18) {
          mine.alive = false;
          bullet.life = 0;
        }
      }
      for (const person of this.hostages) {
        if (person.state === "free" && Math.abs(bullet.x - person.x) < 8 && Math.abs(bullet.y - person.y) < 18) {
          this.loseHostage(person);
          bullet.life = 0;
        }
      }
    }

    for (const bomb of this.bombs) {
      if (bomb.y < GROUND - 20) continue;
      for (const tank of this.tanks) {
        if (tank.alive && Math.abs(bomb.x - tank.x) < 34) {
          tank.alive = false;
          bomb.y = GROUND + 40;
        }
      }
      for (const person of this.hostages) {
        if (person.state === "free" && Math.abs(bomb.x - person.x) < 18) this.loseHostage(person);
      }
    }

    for (const shell of this.shells) {
      if (this.heli.invincible <= 0 && Math.abs(shell.x - this.heli.x) < 42 && Math.abs(shell.y - this.heli.y) < 24) {
        shell.life = 0;
        this.crash();
      }
      for (const person of this.hostages) {
        if (person.state === "free" && Math.abs(shell.x - person.x) < 10 && Math.abs(shell.y - person.y) < 16) {
          this.loseHostage(person);
          shell.life = 0;
        }
      }
    }

    for (const mine of this.mines) {
      if (mine.alive && this.heli.invincible <= 0 && Math.hypot(mine.x - this.heli.x, mine.y - this.heli.y) < 38) {
        mine.alive = false;
        this.crash();
      }
    }
    for (const jet of this.jets) {
      if (jet.alive && this.heli.invincible <= 0 && Math.abs(jet.x - this.heli.x) < 54 && Math.abs(jet.y - this.heli.y) < 24) {
        jet.alive = false;
        this.crash();
      }
    }
  }

  crash() {
    if (this.heli.invincible > 0) return;
    this.heli.lives -= 1;
    this.lost += this.heli.onboard;
    this.heli.x = 3260;
    this.heli.y = GROUND - 34;
    this.heli.vx = 0;
    this.heli.vy = 0;
    this.heli.facing = "left";
    this.heli.landed = true;
    this.heli.onboard = 0;
    this.heli.invincible = 2;
  }

  loseHostage(person) {
    if (person.state !== "free") return;
    person.state = "lost";
    this.lost += 1;
  }

  updateHud() {
    hud.lost.textContent = this.lost;
    hud.onboard.textContent = `${this.heli.onboard}/${CAPACITY}`;
    hud.rescued.textContent = `${this.rescued}/${TOTAL_HOSTAGES}`;
    hud.lives.textContent = this.heli.lives;
    this.uiText.setText(`Facing: ${this.heli.facing.toUpperCase()}   Base is right, prison camps are left`);
  }

  draw() {
    const g = this.g;
    g.clear();
    this.drawWorld(g);
    for (const barrack of this.barracks) this.drawBarrack(g, barrack);
    for (const person of this.hostages) if (person.state === "free") this.drawHostage(g, person);
    for (const tank of this.tanks) if (tank.alive) this.drawTank(g, tank);
    for (const jet of this.jets) if (jet.alive) this.drawJet(g, jet);
    for (const mine of this.mines) if (mine.alive) this.drawMine(g, mine);
    for (const shell of this.shells) this.drawShell(g, shell, 0xb42318);
    for (const bullet of this.bullets) this.drawShell(g, bullet, 0x111111);
    for (const bomb of this.bombs) this.drawBomb(g, bomb);
    this.drawBase(g);
    this.drawHelicopter(g);
  }

  drawWorld(g) {
    g.fillStyle(0xdfe9f2);
    g.fillRect(0, 0, WORLD, HEIGHT);
    g.fillStyle(0xb8c8d5, 0.55);
    for (let x = -120; x < WORLD; x += 260) {
      g.fillTriangle(x, GROUND, x + 145, 230, x + 310, GROUND);
    }
    g.fillStyle(0x6f8666);
    g.fillRect(0, GROUND, WORLD, HEIGHT - GROUND);
    g.lineStyle(2, 0x111111, 0.18);
    g.lineBetween(0, GROUND, WORLD, GROUND);
  }

  drawBase(g) {
    g.fillStyle(0xffffff);
    g.fillRect(3120, GROUND - 96, 210, 96);
    g.lineStyle(2, 0x111111);
    g.strokeRect(3120, GROUND - 96, 210, 96);
    g.fillStyle(0x1f5fbf);
    g.fillRect(PAD_X, GROUND - 4, PAD_W, 6);
    g.fillStyle(0x111111);
    g.fillRect(3160, GROUND - 72, 38, 72);
    g.fillStyle(0x267247);
    g.fillRect(3220, GROUND - 72, 54, 34);
  }

  drawBarrack(g, barrack) {
    g.fillStyle(barrack.open ? 0xb42318 : 0xeee6da);
    g.fillRect(barrack.x, barrack.y, 130, 50);
    g.lineStyle(2, 0x111111);
    g.strokeRect(barrack.x, barrack.y, 130, 50);
    if (barrack.open) {
      g.fillStyle(0x111111);
      g.fillRect(barrack.x + 40, barrack.y + 12, 50, 38);
      g.lineStyle(2, 0xffc857);
      g.lineBetween(barrack.x + 20, barrack.y + 4, barrack.x + 52, barrack.y - 20);
      g.lineBetween(barrack.x + 78, barrack.y - 16, barrack.x + 112, barrack.y + 4);
    } else {
      g.fillStyle(0x9b6b00);
      g.fillRect(barrack.x + 12, barrack.y + 12, 106 * (barrack.hp / 3), 7);
    }
  }

  drawHostage(g, person) {
    g.fillStyle(0xffb000);
    g.fillCircle(person.x, person.y - 15, 4);
    g.lineStyle(2, 0x111111);
    g.lineBetween(person.x, person.y - 11, person.x, person.y - 2);
    g.lineBetween(person.x - 5, person.y - 7, person.x + 5, person.y - 7);
    g.lineBetween(person.x, person.y - 2, person.x - 4, person.y + 6);
    g.lineBetween(person.x, person.y - 2, person.x + 4, person.y + 6);
  }

  drawTank(g, tank) {
    g.fillStyle(0x333333);
    g.fillRect(tank.x - 24, tank.y - 8, 48, 16);
    g.fillStyle(0xb42318);
    g.fillRect(tank.x - 14, tank.y - 19, 28, 12);
    g.lineStyle(4, 0x111111);
    g.lineBetween(tank.x, tank.y - 17, tank.x + Math.sign(this.heli.x - tank.x) * 34, tank.y - 26);
  }

  drawJet(g, jet) {
    g.fillStyle(0xb42318);
    const dir = Math.sign(jet.vx) || 1;
    g.fillTriangle(jet.x + dir * 36, jet.y, jet.x - dir * 32, jet.y - 16, jet.x - dir * 20, jet.y + 16);
    g.fillStyle(0x111111);
    g.fillRect(jet.x - dir * 16, jet.y - 3, dir * -28, 6);
  }

  drawMine(g, mine) {
    g.fillStyle(0x9b6b00);
    g.fillCircle(mine.x, mine.y, 15);
    g.lineStyle(2, 0x111111);
    g.strokeCircle(mine.x, mine.y, 15);
  }

  drawShell(g, shell, color) {
    g.fillStyle(color);
    g.fillCircle(shell.x, shell.y, 4);
  }

  drawBomb(g, bomb) {
    g.fillStyle(0x111111);
    g.fillCircle(bomb.x, bomb.y, 6);
  }

  drawHelicopter(g) {
    const h = this.heli;
    const blink = h.invincible > 0 && Math.floor(h.invincible * 8) % 2 === 0;
    if (blink) return;
    g.lineStyle(3, 0x111111);
    g.fillStyle(0xffffff);
    if (h.facing === "front") {
      g.fillEllipse(h.x, h.y, 46, 34);
      g.fillStyle(0x1f5fbf);
      g.fillRect(h.x - 13, h.y - 12, 26, 16);
      g.strokeLineShape(new Phaser.Geom.Line(h.x - 55, h.y - 28, h.x + 55, h.y - 28));
      g.strokeLineShape(new Phaser.Geom.Line(h.x, h.y - 45, h.x, h.y - 12));
      return;
    }
    const dir = h.facing === "left" ? -1 : 1;
    g.fillEllipse(h.x, h.y, 70, 30);
    g.fillRect(h.x - dir * 5, h.y - 8, dir * -62, 10);
    g.lineBetween(h.x - dir * 64, h.y - 13, h.x - dir * 82, h.y - 28);
    g.lineBetween(h.x - dir * 64, h.y + 3, h.x - dir * 82, h.y + 18);
    g.lineBetween(h.x - 56, h.y + 22, h.x + 56, h.y + 22);
    g.lineBetween(h.x - 24, h.y + 14, h.x - 12, h.y + 22);
    g.lineBetween(h.x + 24, h.y + 14, h.x + 12, h.y + 22);
    g.lineBetween(h.x - 58, h.y - 28, h.x + 58, h.y - 28);
    g.fillStyle(0x1f5fbf);
    g.fillRect(h.x + dir * 5, h.y - 12, dir * 28, 18);
  }
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: "#dfe9f2",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: RescueScene,
});

if (import.meta.env.DEV) window.__rescueGame = game;
