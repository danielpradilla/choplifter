import {
  BASE_BUILDING,
  BASE_PAD,
  BASE_ZONE_X,
  BARRACKS,
  HELI_GROUND_OFFSET,
  HELI_HALF_HEIGHT,
  HELI_HALF_WIDTH,
  HOSTAGES_PER_BARRACK,
  MAX_CARRY,
  MAX_LIVES,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  WORLD_WIDTH,
  circleHit,
  clamp,
  cycleFacing,
  isInBasePad,
  pad2,
  rectsOverlap,
  terrainYAt,
} from "./logic.js";

const Phaser = window.Phaser;

if (!Phaser) {
  document.body.innerHTML = "<pre style='color:#fff;padding:24px'>Phaser failed to load.</pre>";
  throw new Error("Phaser failed to load");
}

const HUD_STYLE = {
  fontFamily: "Courier New, monospace",
  fontSize: "18px",
  color: "#fff5d4",
  stroke: "#0f172a",
  strokeThickness: 4,
};

const MSG_STYLE = {
  fontFamily: "Courier New, monospace",
  fontSize: "20px",
  color: "#ffffff",
  stroke: "#0f172a",
  strokeThickness: 5,
};

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function cargoOffset(index) {
  const slot = Math.max(0, index);
  const col = slot % 4;
  const row = Math.floor(slot / 4);
  return {
    x: -18 + col * 10,
    y: 10 + row * 7,
  };
}

function rectFromSprite(sprite) {
  const b = sprite.getBounds();
  return {
    left: b.left,
    right: b.right,
    top: b.top,
    bottom: b.bottom,
  };
}

function makeTexture(scene, key, width, height, draw) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  draw(g);
  g.generateTexture(key, width, height);
  g.destroy();
}

class ChoplifterScene extends Phaser.Scene {
  constructor() {
    super("choplifter");
  }

  init() {
    this.resetState();
  }

  resetState() {
    this.gameState = "play";
    this.rescued = 0;
    this.lost = 0;
    this.lives = MAX_LIVES;
    this.tripCount = 0;
    this.message = "Lift off and rescue the hostages.";
    this.messageUntil = 0;

    this.enemyTimers = {
      tank: 1.5,
      jet: 7.0,
      mine: 12.0,
    };

    this.heli = {
      x: BASE_PAD.x1 + 110,
      y: terrainYAt(BASE_PAD.x1 + 110) - HELI_GROUND_OFFSET,
      vx: 0,
      vy: 0,
      facing: "left",
      landed: true,
      dead: false,
      invulnerable: 1.2,
      fireCooldown: 0,
      unloadCooldown: 0,
      unloading: false,
      respawnAt: 0,
      carry: [],
      sprite: null,
      shadow: null,
    };

    this.barracks = BARRACKS.map((barrack, index) => ({
      ...barrack,
      open: index === 0,
      sprite: null,
      shadow: null,
    }));

    this.hostages = [];
    for (let barrackIndex = 0; barrackIndex < BARRACKS.length; barrackIndex += 1) {
      for (let i = 0; i < HOSTAGES_PER_BARRACK; i += 1) {
        const baseX = BARRACKS[barrackIndex].x + rand(-18, 18);
        const hostage = {
          barrackIndex,
          x: baseX,
          y: terrainYAt(baseX) - 12,
          homeX: BARRACKS[barrackIndex].x + rand(-28, 28),
          wanderDir: Math.random() < 0.5 ? -1 : 1,
          vx: 0,
          state: barrackIndex === 0 ? "free" : "sealed",
          sprite: null,
        };

        this.hostages.push(hostage);
      }
    }

    this.enemies = [];
    this.projectiles = [];
  }

  create() {
    this.createTextures();
    this.createBackdrop();
    this.createTerrain();
    this.createBuildings();
    this.createHostages();
    this.createHelicopter();
    this.createHud();
    this.createInput();
    this.updateCamera();
    this.refreshSprites(true);
  }

  createTextures() {
    makeTexture(this, "cloud", 132, 64, (g) => {
      g.fillStyle(0xffffff, 0.9);
      g.fillEllipse(40, 34, 42, 18);
      g.fillEllipse(62, 24, 50, 26);
      g.fillEllipse(88, 36, 38, 18);
      g.fillEllipse(22, 38, 28, 14);
    });

    makeTexture(this, "heli-side", 64, 32, (g) => {
      g.fillStyle(0x2f8f62, 1);
      g.fillRect(12, 11, 28, 9);
      g.fillStyle(0x67d7a9, 1);
      g.fillTriangle(12, 11, 12, 20, 3, 16);
      g.fillStyle(0x1f563b, 1);
      g.fillRect(38, 13, 14, 5);
      g.fillStyle(0x1b1b1b, 1);
      g.fillRect(8, 5, 48, 2);
      g.fillRect(30, 3, 2, 4);
      g.fillStyle(0xe7ecea, 1);
      g.fillRect(16, 12, 11, 4);
      g.fillStyle(0xcfd5d3, 1);
      g.fillRect(12, 22, 28, 2);
      g.fillRect(14, 20, 2, 6);
      g.fillRect(32, 20, 2, 6);
    });

    makeTexture(this, "heli-forward", 34, 34, (g) => {
      g.fillStyle(0x2f8f62, 1);
      g.fillEllipse(17, 18, 18, 16);
      g.fillStyle(0x1b1b1b, 1);
      g.fillRect(2, 16, 30, 2);
      g.fillRect(16, 4, 2, 26);
      g.fillStyle(0x67d7a9, 1);
      g.fillTriangle(17, 7, 24, 14, 10, 14);
      g.fillStyle(0xe7ecea, 1);
      g.fillRect(12, 22, 10, 3);
    });

    makeTexture(this, "tank", 40, 24, (g) => {
      g.fillStyle(0x7c6430, 1);
      g.fillRect(7, 9, 26, 9);
      g.fillRect(14, 5, 12, 7);
      g.fillStyle(0x5d4c24, 1);
      g.fillCircle(14, 19, 4);
      g.fillCircle(27, 19, 4);
      g.fillRect(21, 8, 13, 2);
      g.fillStyle(0xb9a367, 1);
      g.fillRect(14, 7, 6, 3);
    });

    makeTexture(this, "jet", 40, 20, (g) => {
      g.fillStyle(0xeaf4ff, 1);
      g.fillTriangle(6, 10, 24, 4, 24, 16);
      g.fillRect(9, 8, 16, 4);
      g.fillStyle(0x7ba5c6, 1);
      g.fillRect(15, 2, 3, 16);
      g.fillRect(20, 12, 10, 2);
      g.fillStyle(0x9ed0ff, 1);
      g.fillTriangle(24, 6, 34, 10, 24, 14);
    });

    makeTexture(this, "mine", 24, 24, (g) => {
      g.fillStyle(0xab6cff, 1);
      g.fillCircle(12, 12, 7);
      g.lineStyle(2, 0xf0ddff, 1);
      g.beginPath();
      g.moveTo(12, 1);
      g.lineTo(12, 5);
      g.moveTo(12, 19);
      g.lineTo(12, 23);
      g.moveTo(1, 12);
      g.lineTo(5, 12);
      g.moveTo(19, 12);
      g.lineTo(23, 12);
      g.moveTo(4, 4);
      g.lineTo(7, 7);
      g.moveTo(17, 4);
      g.lineTo(14, 7);
      g.moveTo(4, 20);
      g.lineTo(7, 17);
      g.moveTo(17, 20);
      g.lineTo(14, 17);
      g.strokePath();
    });

    makeTexture(this, "hostage", 12, 16, (g) => {
      g.fillStyle(0xf1ddb0, 1);
      g.fillCircle(6, 4, 3);
      g.fillStyle(0xf6f0dc, 1);
      g.fillRect(4, 7, 4, 5);
      g.fillStyle(0x5f4023, 1);
      g.fillRect(3, 0, 6, 2);
      g.fillStyle(0x2d2d2d, 1);
      g.fillRect(5, 12, 2, 4);
      g.fillRect(2, 9, 2, 4);
      g.fillRect(8, 9, 2, 4);
    });

    makeTexture(this, "bullet", 10, 4, (g) => {
      g.fillStyle(0xffd65a, 1);
      g.fillRect(1, 1, 8, 2);
    });

    makeTexture(this, "bomb", 8, 10, (g) => {
      g.fillStyle(0x181818, 1);
      g.fillCircle(4, 5, 3);
      g.fillRect(3, 0, 2, 3);
    });

    makeTexture(this, "shell", 8, 4, (g) => {
      g.fillStyle(0xec8e2e, 1);
      g.fillRect(1, 1, 6, 2);
    });

    makeTexture(this, "missile", 10, 6, (g) => {
      g.fillStyle(0xff5959, 1);
      g.fillTriangle(1, 3, 6, 0, 6, 6);
      g.fillRect(0, 2, 3, 2);
    });

    makeTexture(this, "barrack-closed", 60, 46, (g) => {
      g.fillStyle(0x8e5534, 1);
      g.fillRect(6, 10, 48, 28);
      g.fillStyle(0x5f341d, 1);
      g.fillRect(24, 18, 12, 20);
      g.fillStyle(0xbf8b59, 1);
      g.fillRect(8, 12, 44, 3);
      g.fillStyle(0x2e1a10, 1);
      g.fillRect(25, 14, 10, 24);
      g.fillStyle(0x9d5f35, 1);
      g.fillRect(12, 20, 8, 5);
      g.fillRect(40, 20, 8, 5);
    });

    makeTexture(this, "barrack-open", 60, 46, (g) => {
      g.fillStyle(0x8e5534, 1);
      g.fillRect(6, 10, 48, 28);
      g.fillStyle(0x2d160d, 1);
      g.fillRect(24, 18, 12, 20);
      g.fillStyle(0xffd55a, 0.85);
      g.fillTriangle(18, 10, 24, 2, 30, 10);
      g.fillTriangle(30, 10, 36, 2, 42, 10);
      g.fillStyle(0xff7a2d, 0.9);
      g.fillRect(19, 13, 22, 5);
      g.fillStyle(0x3a2212, 1);
      g.fillRect(10, 18, 12, 14);
      g.fillRect(38, 18, 12, 14);
    });

    makeTexture(this, "base", 128, 74, (g) => {
      g.fillStyle(0xf4efe5, 1);
      g.fillRect(12, 20, 104, 34);
      g.fillStyle(0xc34242, 1);
      g.fillTriangle(8, 20, 64, 2, 120, 20);
      g.fillStyle(0x2b3f59, 1);
      g.fillRect(52, 30, 24, 24);
      g.fillStyle(0x8fc8ff, 1);
      g.fillRect(26, 30, 14, 10);
      g.fillRect(90, 30, 14, 10);
      g.fillStyle(0x3c8c4c, 1);
      g.fillEllipse(64, 56, 48, 16);
      g.lineStyle(2, 0xe7ecea, 1);
      g.strokeEllipse(64, 56, 48, 16);
    });
  }

  createBackdrop() {
    this.cameras.main.setBackgroundColor(0x8ec9ff);

    const sun = this.add.circle(3860, 108, 48, 0xf6d66b, 0.9);
    sun.setScrollFactor(0.25);
    sun.setDepth(0);

    const clouds = [
      [240, 92, 0.34, 1.0],
      [860, 72, 0.28, 1.2],
      [1520, 106, 0.22, 0.9],
      [2780, 88, 0.18, 1.3],
      [3520, 112, 0.26, 1.0],
    ];

    this.cloudSprites = clouds.map(([x, y, factor, scale]) => {
      const cloud = this.add.image(x, y, "cloud");
      cloud.setScrollFactor(factor);
      cloud.setScale(scale);
      cloud.setAlpha(0.35);
      cloud.setDepth(0.2);
      return cloud;
    });
  }

  createTerrain() {
    this.terrainGraphics = this.add.graphics();
    this.terrainGraphics.setDepth(1);

    this.terrainGraphics.fillStyle(0x8d6b39, 1);
    this.terrainGraphics.beginPath();
    this.terrainGraphics.moveTo(0, VIEW_HEIGHT);
    for (let x = 0; x <= WORLD_WIDTH; x += 24) {
      this.terrainGraphics.lineTo(x, terrainYAt(x));
    }
    this.terrainGraphics.lineTo(WORLD_WIDTH, VIEW_HEIGHT);
    this.terrainGraphics.closePath();
    this.terrainGraphics.fillPath();

    this.terrainGraphics.lineStyle(2, 0xc9ae73, 0.8);
    this.terrainGraphics.beginPath();
    for (let x = 0; x <= WORLD_WIDTH; x += 24) {
      const y = terrainYAt(x);
      if (x === 0) {
        this.terrainGraphics.moveTo(x, y);
      } else {
        this.terrainGraphics.lineTo(x, y);
      }
    }
    this.terrainGraphics.strokePath();
  }

  createBuildings() {
    this.baseShadow = this.add.ellipse(
      BASE_BUILDING.x,
      terrainYAt(BASE_BUILDING.x) - 4,
      92,
      14,
      0x000000,
      0.18,
    );
    this.baseShadow.setDepth(1.8);

    this.baseSprite = this.add.sprite(
      BASE_BUILDING.x,
      terrainYAt(BASE_BUILDING.x) - BASE_BUILDING.yOffset,
      "base",
    );
    this.baseSprite.setOrigin(0.5, 1);
    this.baseSprite.setDepth(2);

    this.barrackSprites = this.barracks.map((barrack) => {
      const shadow = this.add.ellipse(
        barrack.x,
        terrainYAt(barrack.x) - 3,
        54,
        10,
        0x000000,
        0.16,
      );
      shadow.setDepth(1.8);

      const sprite = this.add.sprite(
        barrack.x,
        terrainYAt(barrack.x) - barrack.yOffset,
        barrack.open ? "barrack-open" : "barrack-closed",
      );
      sprite.setOrigin(0.5, 1);
      sprite.setDepth(2);

      barrack.shadow = shadow;
      barrack.sprite = sprite;
      return sprite;
    });
  }

  createHostages() {
    this.hostages.forEach((hostage) => {
      const sprite = this.add.sprite(hostage.x, hostage.y, "hostage");
      sprite.setOrigin(0.5, 0.5);
      sprite.setScale(1);
      sprite.setDepth(3);
      sprite.setVisible(hostage.state === "free");
      hostage.sprite = sprite;
    });
  }

  createHelicopter() {
    this.heli.shadow = this.add.ellipse(
      this.heli.x,
      terrainYAt(this.heli.x) - 2,
      28,
      7,
      0x000000,
      0.24,
    );
    this.heli.shadow.setDepth(3.5);

    this.heli.sprite = this.add.sprite(
      this.heli.x,
      this.heli.y,
      "heli-side",
    );
    this.heli.sprite.setOrigin(0.5, 0.5);
    this.heli.sprite.setDepth(6);
    this.applyFacingTexture();
  }

  createHud() {
    this.hudTop = this.add.rectangle(VIEW_WIDTH / 2, 22, VIEW_WIDTH, 44, 0x101827, 0.72);
    this.hudTop.setScrollFactor(0);
    this.hudTop.setDepth(30);

    this.titleText = this.add.text(16, 8, "CHOPLIFTER 5.4", {
      ...HUD_STYLE,
      fontSize: "20px",
    });
    this.titleText.setScrollFactor(0);
    this.titleText.setDepth(31);

    this.lostText = this.add.text(240, 8, "LOST 00", HUD_STYLE);
    this.lostText.setScrollFactor(0);
    this.lostText.setDepth(31);

    this.aboardText = this.add.text(390, 8, "ABOARD 00", HUD_STYLE);
    this.aboardText.setScrollFactor(0);
    this.aboardText.setDepth(31);

    this.rescuedText = this.add.text(560, 8, "RESCUED 00", HUD_STYLE);
    this.rescuedText.setScrollFactor(0);
    this.rescuedText.setDepth(31);

    this.livesText = this.add.text(760, 8, "HELIS 03", HUD_STYLE);
    this.livesText.setScrollFactor(0);
    this.livesText.setDepth(31);

    this.messageText = this.add.text(
      VIEW_WIDTH / 2,
      66,
      this.message,
      {
        ...MSG_STYLE,
        align: "center",
      },
    );
    this.messageText.setOrigin(0.5, 0);
    this.messageText.setScrollFactor(0);
    this.messageText.setDepth(31);

    this.controlsText = this.add.text(
      VIEW_WIDTH / 2,
      VIEW_HEIGHT - 30,
      "ARROWS/WASD MOVE  |  X ROTATE  |  SPACE FIRE  |  R RESTART",
      {
        ...HUD_STYLE,
        fontSize: "14px",
      },
    );
    this.controlsText.setOrigin(0.5, 0.5);
    this.controlsText.setScrollFactor(0);
    this.controlsText.setDepth(31);
  }

  createInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyX = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    this.keyR = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.input.keyboard.addCapture([
      Phaser.Input.Keyboard.KeyCodes.SPACE,
      Phaser.Input.Keyboard.KeyCodes.X,
      Phaser.Input.Keyboard.KeyCodes.R,
    ]);
  }

  applyFacingTexture() {
    if (this.heli.facing === "forward") {
      this.heli.sprite.setTexture("heli-forward");
      this.heli.sprite.setFlipX(false);
      this.heli.sprite.setAngle(0);
      return;
    }

    this.heli.sprite.setTexture("heli-side");
    this.heli.sprite.setFlipX(this.heli.facing === "left");
    this.heli.sprite.setAngle(0);
  }

  showMessage(text, duration = 1600) {
    this.message = text;
    this.messageUntil = (this.now ?? 0) + duration;
    this.messageText.setText(text);
  }

  updateMessage() {
    if (this.messageUntil && (this.now ?? 0) > this.messageUntil) {
      this.messageUntil = 0;
      this.message = "";
      this.messageText.setText("");
    }
  }

  updateCamera() {
    const target = clamp(this.heli.x - VIEW_WIDTH * 0.42, 0, WORLD_WIDTH - VIEW_WIDTH);
    this.cameras.main.scrollX = target;
  }

  setFacing(nextFacing) {
    this.heli.facing = nextFacing;
    this.applyFacingTexture();
  }

  openBarrack(index, cause = "player") {
    const barrack = this.barracks[index];
    if (!barrack || barrack.open) {
      return;
    }

    barrack.open = true;
    barrack.sprite.setTexture("barrack-open");

    const freed = this.hostages.filter((hostage) => hostage.barrackIndex === index && hostage.state === "sealed");
    freed.forEach((hostage, offset) => {
      hostage.state = "free";
      hostage.x = barrack.x + rand(-20, 20);
      hostage.y = terrainYAt(hostage.x) - 12 - rand(0, 10);
      hostage.homeX = barrack.x + rand(-30, 30);
      hostage.wanderDir = offset % 2 === 0 ? -1 : 1;
      hostage.vx = rand(-18, 18);
      hostage.sprite.setVisible(true);
    });

    this.showMessage(cause === "enemy" ? `Barrack ${barrack.label} breached` : `Barrack ${barrack.label} open`);
  }

  boardHostage(hostage) {
    if (hostage.state !== "free") {
      return;
    }

    if (this.heli.carry.length >= MAX_CARRY) {
      return;
    }

    hostage.state = "aboard";
    this.heli.carry.push(hostage);
    this.showMessage(`Boarding ${pad2(this.heli.carry.length)}/${MAX_CARRY}`, 700);
  }

  rescueHostage(hostage) {
    if (hostage.state !== "aboard") {
      return;
    }

    hostage.state = "rescued";
    hostage.sprite.setVisible(false);
    this.rescued += 1;
    this.heli.carry = this.heli.carry.filter((h) => h !== hostage);
  }

  loseHostage(hostage) {
    if (hostage.state === "dead" || hostage.state === "rescued") {
      return;
    }

    hostage.state = "dead";
    hostage.sprite.setVisible(false);
    this.lost += 1;
    this.heli.carry = this.heli.carry.filter((h) => h !== hostage);
  }

  boardCheck(hostage) {
    const dx = Math.abs(hostage.x - this.heli.x);
    const dy = Math.abs(hostage.y - this.heli.y);
    if (dx < 11 && dy < 8) {
      this.loseHostage(hostage);
      return true;
    }

    if (this.heli.landed && dx < 25 && dy < 18) {
      this.boardHostage(hostage);
      return true;
    }

    return false;
  }

  respawnHeli() {
    this.heli.dead = false;
    this.heli.x = BASE_PAD.x1 + 110;
    this.heli.y = terrainYAt(this.heli.x) - HELI_GROUND_OFFSET;
    this.heli.vx = 0;
    this.heli.vy = 0;
    this.heli.landed = true;
    this.heli.invulnerable = 1.5;
    this.heli.fireCooldown = 0;
    this.heli.unloadCooldown = 0;
    this.heli.unloading = false;
    this.heli.sprite.setVisible(true);
    this.heli.shadow.setVisible(true);
    this.applyFacingTexture();
    this.showMessage("New helicopter ready", 1100);
  }

  crashHeli(reason = "hit") {
    if (this.heli.dead || this.heli.invulnerable > 0 || this.gameState !== "play") {
      return;
    }

    this.cameras.main.shake(180, 0.005);
    this.showMessage(reason === "terrain" ? "Terrain strike" : "Helicopter hit", 1200);

    while (this.heli.carry.length > 0) {
      this.loseHostage(this.heli.carry[0]);
    }

    this.lives -= 1;
    this.heli.dead = true;
    this.heli.respawnAt = (this.now ?? 0) + 1000;
    this.heli.sprite.setVisible(false);
    this.heli.shadow.setVisible(false);

    if (this.lives <= 0) {
      this.finishGame("Game over");
    }
  }

  finishGame(text) {
    this.gameState = "over";
    this.showMessage(text, 999999);
    this.messageText.setText(`${text}\nPress R to restart.`);
  }

  finishVictory() {
    this.gameState = "victory";
    this.showMessage("All hostages rescued", 999999);
    this.messageText.setText("All hostages rescued\nPress R to restart.");
  }

  spawnProjectile(type, x, y, vx, vy, owner, extra = {}) {
    const texture = {
      shot: "bullet",
      bomb: "bomb",
      shell: "shell",
      missile: "missile",
    }[type];

    const sprite = this.add.sprite(x, y, texture);
    sprite.setDepth(7);
    sprite.setRotation(extra.angle ?? 0);
    if (type === "missile") {
      sprite.setScale(1.1);
    }

    const projectile = {
      type,
      owner,
      x,
      y,
      vx,
      vy,
      gravity: extra.gravity ?? 0,
      ttl: extra.ttl ?? 4,
      sprite,
      dead: false,
    };

    this.projectiles.push(projectile);
    return projectile;
  }

  spawnEnemy(type) {
    if (type === "tank") {
      const source = pick(this.barracks.filter((barrack) => barrack.open));
      const x = clamp(source.x + rand(-28, 28), 80, BASE_ZONE_X - 60);
      const patrolHalf = rand(50, 110);
      const enemy = {
        type,
        x,
        y: terrainYAt(x) - 10,
        vx: Math.random() < 0.5 ? -rand(18, 30) : rand(18, 30),
        vy: 0,
        minX: clamp(x - patrolHalf, 60, BASE_ZONE_X - 180),
        maxX: clamp(x + patrolHalf, 100, BASE_ZONE_X - 40),
        fireCooldown: rand(0.4, 1.4),
        sprite: this.add.sprite(x, terrainYAt(x) - 10, "tank"),
        dead: false,
      };
      enemy.sprite.setOrigin(0.5, 1);
      enemy.sprite.setDepth(4);
      this.enemies.push(enemy);
      return enemy;
    }

    if (type === "jet") {
      const fromLeft = Math.random() < 0.5;
      const y = rand(126, 216);
      const x = fromLeft
        ? clamp(this.cameras.main.scrollX - 56, 20, WORLD_WIDTH - 20)
        : clamp(this.cameras.main.scrollX + VIEW_WIDTH + 56, 20, WORLD_WIDTH - 20);
      const enemy = {
        type,
        x,
        y,
        vx: fromLeft ? rand(150, 180) : -rand(150, 180),
        vy: rand(-8, 8),
        fireCooldown: rand(0.8, 1.8),
        sprite: this.add.sprite(x, y, "jet"),
        dead: false,
      };
      enemy.sprite.setOrigin(0.5, 0.5);
      enemy.sprite.setDepth(4.2);
      this.enemies.push(enemy);
      return enemy;
    }

    if (type === "mine") {
      const x = clamp(this.heli.x + rand(-380, 380), 120, WORLD_WIDTH - 120);
      const y = rand(112, 250);
      const enemy = {
        type,
        x,
        y,
        vx: rand(-24, 24),
        vy: rand(-24, 24),
        fireCooldown: 0,
        sprite: this.add.sprite(x, y, "mine"),
        dead: false,
      };
      enemy.sprite.setOrigin(0.5, 0.5);
      enemy.sprite.setDepth(4.3);
      this.enemies.push(enemy);
      return enemy;
    }

    return null;
  }

  updateHeli(dt, time) {
    if (this.heli.dead) {
      if (this.lives > 0 && time >= this.heli.respawnAt) {
        this.respawnHeli();
      }
      return;
    }

    this.heli.invulnerable = Math.max(0, this.heli.invulnerable - dt);
    this.heli.fireCooldown = Math.max(0, this.heli.fireCooldown - dt);
    this.heli.unloadCooldown = Math.max(0, this.heli.unloadCooldown - dt);

    const left = this.cursors.left.isDown || this.keyA.isDown;
    const right = this.cursors.right.isDown || this.keyD.isDown;
    const up = this.cursors.up.isDown || this.keyW.isDown;
    const down = this.cursors.down.isDown || this.keyS.isDown;
    const fire = this.keySpace.isDown;

    if (Phaser.Input.Keyboard.JustDown(this.keyX)) {
      this.setFacing(cycleFacing(this.heli.facing));
    }

    const accelX = this.heli.landed ? 620 : 480;
    const drag = this.heli.landed ? 0.88 : 0.99;
    if (left) this.heli.vx -= accelX * dt;
    if (right) this.heli.vx += accelX * dt;
    if (!left && !right) {
      this.heli.vx *= Math.pow(drag, dt * 60);
    }
    this.heli.vx = clamp(this.heli.vx, -170, 170);

    if (this.heli.landed) {
      if (up) {
        this.heli.landed = false;
        this.heli.vy = -160;
      } else {
        this.heli.vy = 0;
      }
    } else {
      if (up) this.heli.vy -= 500 * dt;
      if (down) this.heli.vy += 420 * dt;
      this.heli.vy += 260 * dt;
      this.heli.vy = clamp(this.heli.vy, -220, 260);
    }

    this.heli.x = clamp(this.heli.x + this.heli.vx * dt, 28, WORLD_WIDTH - 28);

    const groundY = terrainYAt(this.heli.x) - HELI_GROUND_OFFSET;

    if (!this.heli.landed) {
      this.heli.y += this.heli.vy * dt;
      if (this.heli.y >= groundY) {
        if (this.heli.vy > 150) {
          this.heli.y = groundY;
          this.crashHeli("terrain");
          return;
        }

        this.heli.y = groundY;
        this.heli.vy = 0;
        this.heli.landed = true;
      }
    } else {
      this.heli.y = groundY;
    }

    if (this.heli.landed && this.heli.y >= groundY - 1 && this.heli.vx !== 0 && this.heli.y >= terrainYAt(this.heli.x) - HELI_GROUND_OFFSET - 1) {
      // keep the landed helicopter pinned to the ground line while moving.
      this.heli.y = groundY;
    }

    this.heli.unloading = this.heli.landed && isInBasePad(this.heli.x) && this.heli.carry.length > 0;

    if (this.heli.unloading && this.heli.unloadCooldown <= 0 && this.heli.carry.length > 0) {
      const hostage = this.heli.carry[0];
      this.rescueHostage(hostage);
      this.heli.unloadCooldown = 0.14;
    }

    if (this.heli.unloading && this.heli.carry.length === 0) {
      this.heli.unloading = false;
      this.tripCount += 1;
      this.showMessage(`Trip ${this.tripCount} complete`, 900);
    }

    if (this.heli.landed && !isInBasePad(this.heli.x)) {
      this.crushNearbyHostages();
    }

    if (fire && this.heli.fireCooldown <= 0) {
      this.fireWeapon();
    }
  }

  crushNearbyHostages() {
    for (const hostage of this.hostages) {
      if (hostage.state !== "free") {
        continue;
      }

      const dx = Math.abs(hostage.x - this.heli.x);
      const dy = Math.abs(hostage.y - this.heli.y);
      if (dx < HELI_HALF_WIDTH - 1 && dy < HELI_HALF_HEIGHT + 1) {
        this.loseHostage(hostage);
      }
    }
  }

  fireWeapon() {
    this.heli.fireCooldown = 0.14;

    if (this.heli.facing === "forward") {
      this.spawnProjectile(
        "bomb",
        this.heli.x,
        this.heli.y + 10,
        this.heli.vx * 0.25,
        this.heli.vy + 10,
        "player",
        {
          gravity: 320,
          ttl: 3.8,
        },
      );
      return;
    }

    const dir = this.heli.facing === "left" ? -1 : 1;
    this.spawnProjectile(
      "shot",
      this.heli.x + dir * 24,
      this.heli.y - 3,
      dir * 560,
      0,
      "player",
      {
        ttl: 2.5,
      },
    );
  }

  updateHostages(dt) {
    for (const hostage of this.hostages) {
      if (hostage.state === "sealed" || hostage.state === "dead" || hostage.state === "rescued") {
        hostage.sprite.setVisible(false);
        continue;
      }

      if (hostage.state === "aboard") {
        const slot = this.heli.carry.indexOf(hostage);
        const offset = cargoOffset(slot);
        hostage.sprite.setVisible(true);
        hostage.sprite.x = this.heli.x + offset.x;
        hostage.sprite.y = this.heli.y + offset.y;
        hostage.sprite.setDepth(7);
        continue;
      }

      const heliReach = this.heli.landed ? 240 : 180;
      const dx = this.heli.x - hostage.x;
      const dy = Math.abs(this.heli.y - hostage.y);

      if (Math.abs(dx) < heliReach && dy < 95 && this.gameState === "play") {
        hostage.vx = clamp(dx * 2.8, -78, 78);
      } else {
        const leftBound = hostage.homeX - 26;
        const rightBound = hostage.homeX + 26;
        if (hostage.x < leftBound) {
          hostage.wanderDir = 1;
        } else if (hostage.x > rightBound) {
          hostage.wanderDir = -1;
        }
        hostage.vx = hostage.wanderDir * 18;
      }

      hostage.x = clamp(hostage.x + hostage.vx * dt, 18, WORLD_WIDTH - 18);
      hostage.y = terrainYAt(hostage.x) - 12;
      hostage.sprite.setVisible(true);
      hostage.sprite.x = hostage.x;
      hostage.sprite.y = hostage.y;
      hostage.sprite.setDepth(3.5);

      if (this.heli.landed && this.gameState === "play") {
        this.boardCheck(hostage);
      }
    }
  }

  updateEnemies(dt) {
    if (this.gameState !== "play") {
      return;
    }

    this.enemyTimers.tank -= dt;
    if (this.enemyTimers.tank <= 0) {
      const activeTanks = this.enemies.filter((enemy) => enemy.type === "tank").length;
      if (activeTanks < 4) {
        this.spawnEnemy("tank");
      }
      this.enemyTimers.tank = rand(6, 10);
    }

    if (this.tripCount >= 1) {
      this.enemyTimers.jet -= dt;
      if (this.enemyTimers.jet <= 0) {
        const activeJets = this.enemies.filter((enemy) => enemy.type === "jet").length;
        if (activeJets < 2) {
          this.spawnEnemy("jet");
        }
        this.enemyTimers.jet = rand(7, 11);
      }
    }

    if (this.tripCount >= 2) {
      this.enemyTimers.mine -= dt;
      if (this.enemyTimers.mine <= 0) {
        const activeMines = this.enemies.filter((enemy) => enemy.type === "mine").length;
        if (activeMines < 2) {
          this.spawnEnemy("mine");
        }
        this.enemyTimers.mine = rand(8, 12);
      }
    }

    for (const enemy of this.enemies) {
      if (enemy.dead) {
        continue;
      }

      if (enemy.type === "tank") {
        enemy.fireCooldown = Math.max(0, enemy.fireCooldown - dt);
        enemy.x += enemy.vx * dt;
        if (enemy.x <= enemy.minX) {
          enemy.x = enemy.minX;
          enemy.vx = Math.abs(enemy.vx);
        } else if (enemy.x >= enemy.maxX) {
          enemy.x = enemy.maxX;
          enemy.vx = -Math.abs(enemy.vx);
        }

        enemy.y = terrainYAt(enemy.x) - 10;
        enemy.sprite.x = enemy.x;
        enemy.sprite.y = enemy.y;
        enemy.sprite.setFlipX(enemy.vx < 0);

        const heliLow = this.heli.y >= enemy.y - 56;
        if (this.heli.x < BASE_ZONE_X && heliLow && Math.abs(this.heli.x - enemy.x) < 520 && enemy.fireCooldown <= 0) {
          const dir = this.heli.x < enemy.x ? -1 : 1;
          this.spawnProjectile("shell", enemy.x + dir * 16, enemy.y - 6, dir * 330, 0, "enemy", {
            ttl: 3,
          });
          enemy.fireCooldown = rand(1.0, 1.6);
        }
        continue;
      }

      if (enemy.type === "jet") {
        enemy.fireCooldown = Math.max(0, enemy.fireCooldown - dt);
        enemy.x += enemy.vx * dt;
        enemy.y += enemy.vy * dt;
        if (enemy.x < 10 || enemy.x > WORLD_WIDTH - 10) {
          enemy.dead = true;
          enemy.sprite.destroy();
          continue;
        }

        if (enemy.x > BASE_ZONE_X + 60) {
          enemy.vx = -Math.abs(enemy.vx);
        }
        if (enemy.x < 120) {
          enemy.vx = Math.abs(enemy.vx);
        }

        enemy.y = clamp(enemy.y + Math.sin(((this.now ?? 0) + enemy.x) * 0.005) * 0.12, 110, 250);
        enemy.sprite.x = enemy.x;
        enemy.sprite.y = enemy.y;
        enemy.sprite.setFlipX(enemy.vx < 0);

        const dx = this.heli.x - enemy.x;
        const dy = this.heli.y - enemy.y;
        if (Math.abs(dx) < 440 && Math.abs(dy) < 170 && enemy.fireCooldown <= 0) {
          const magnitude = Math.hypot(dx, dy) || 1;
          const speed = 300;
          this.spawnProjectile("missile", enemy.x, enemy.y, (dx / magnitude) * speed, (dy / magnitude) * speed, "enemy", {
            ttl: 3.5,
            angle: Math.atan2(dy, dx),
          });
          enemy.fireCooldown = rand(1.4, 2.0);
        }
        continue;
      }

      if (enemy.type === "mine") {
        const dx = this.heli.x - enemy.x;
        const dy = this.heli.y - enemy.y;
        const dist = Math.max(1, Math.hypot(dx, dy));
        const accel = 220;
        enemy.vx += (dx / dist) * accel * dt;
        enemy.vy += (dy / dist) * accel * dt;

        const speed = Math.hypot(enemy.vx, enemy.vy);
        const maxSpeed = 230;
        if (speed > maxSpeed) {
          const scale = maxSpeed / speed;
          enemy.vx *= scale;
          enemy.vy *= scale;
        }

        enemy.x = clamp(enemy.x + enemy.vx * dt, 12, WORLD_WIDTH - 12);
        enemy.y = clamp(enemy.y + enemy.vy * dt, 80, 330);
        enemy.sprite.x = enemy.x;
        enemy.sprite.y = enemy.y;
        enemy.sprite.setAngle(Phaser.Math.RadToDeg(Math.atan2(enemy.vy, enemy.vx)));
      }
    }
  }

  updateProjectiles(dt) {
    for (const projectile of this.projectiles) {
      if (projectile.dead) {
        continue;
      }

      projectile.ttl -= dt;
      projectile.vy += projectile.gravity * dt;
      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;
      projectile.sprite.x = projectile.x;
      projectile.sprite.y = projectile.y;
      projectile.sprite.setRotation(Math.atan2(projectile.vy, projectile.vx));

      if (projectile.ttl <= 0 || projectile.x < -40 || projectile.x > WORLD_WIDTH + 40 || projectile.y < -40 || projectile.y > VIEW_HEIGHT + 40) {
        projectile.dead = true;
        projectile.sprite.destroy();
        continue;
      }

      if (projectile.owner === "player") {
        if (projectile.type === "bomb" && projectile.y >= terrainYAt(projectile.x) - 2) {
          this.explodeProjectile(projectile, 32);
          continue;
        }

        let hit = false;
        for (const enemy of this.enemies) {
          if (enemy.dead) {
            continue;
          }

          const radius = enemy.type === "tank" ? 16 : enemy.type === "jet" ? 14 : 12;
          if (circleHit(projectile.x, projectile.y, 8, enemy.x, enemy.y, radius)) {
            enemy.dead = true;
            enemy.sprite.destroy();
            hit = true;
            this.showMessage(`${enemy.type.toUpperCase()} down`, 700);
            break;
          }
        }

        if (hit) {
          projectile.dead = true;
          projectile.sprite.destroy();
          continue;
        }

        for (const hostage of this.hostages) {
          if (hostage.state !== "free") {
            continue;
          }

          if (circleHit(projectile.x, projectile.y, 5, hostage.x, hostage.y, 7)) {
            this.loseHostage(hostage);
            projectile.dead = true;
            projectile.sprite.destroy();
            hit = true;
            break;
          }
        }

        if (hit) {
          continue;
        }

        for (let i = 0; i < this.barracks.length; i += 1) {
          const barrack = this.barracks[i];
          const bounds = rectFromSprite(barrack.sprite);
          if (rectsOverlap({
            left: projectile.x - 4,
            right: projectile.x + 4,
            top: projectile.y - 4,
            bottom: projectile.y + 4,
          }, bounds)) {
            this.openBarrack(i, "player");
            if (projectile.type === "bomb") {
              this.explodeProjectile(projectile, 24);
              hit = true;
            } else {
              projectile.dead = true;
              projectile.sprite.destroy();
              hit = true;
            }
            break;
          }
        }

        if (hit) {
          continue;
        }

        if (projectile.type === "bomb" && projectile.y >= terrainYAt(projectile.x) - 4) {
          this.explodeProjectile(projectile, 28);
        }
        continue;
      }

      if (projectile.owner === "enemy") {
        if (projectile.type === "shell" || projectile.type === "missile") {
          if (!this.heli.dead && this.heli.invulnerable <= 0 && circleHit(projectile.x, projectile.y, 6, this.heli.x, this.heli.y, 14)) {
            projectile.dead = true;
            projectile.sprite.destroy();
            this.crashHeli(projectile.type);
            continue;
          }

          for (const hostage of this.hostages) {
            if (hostage.state !== "free") {
              continue;
            }

            if (circleHit(projectile.x, projectile.y, 5, hostage.x, hostage.y, 7)) {
              this.loseHostage(hostage);
              projectile.dead = true;
              projectile.sprite.destroy();
              break;
            }
          }

          if (projectile.dead) {
            continue;
          }

          for (let i = 0; i < this.barracks.length; i += 1) {
            const barrack = this.barracks[i];
            const bounds = rectFromSprite(barrack.sprite);
            if (rectsOverlap({
              left: projectile.x - 4,
              right: projectile.x + 4,
              top: projectile.y - 4,
              bottom: projectile.y + 4,
            }, bounds)) {
              this.openBarrack(i, "enemy");
              projectile.dead = true;
              projectile.sprite.destroy();
              break;
            }
          }

          if (projectile.dead) {
            continue;
          }
        }
      }
    }

    this.projectiles = this.projectiles.filter((projectile) => !projectile.dead);
    this.enemies = this.enemies.filter((enemy) => !enemy.dead);
  }

  explodeProjectile(projectile, radius) {
    for (const enemy of this.enemies) {
      if (enemy.dead) {
        continue;
      }

      const enemyRadius = enemy.type === "tank" ? 18 : enemy.type === "jet" ? 16 : 14;
      if (circleHit(projectile.x, projectile.y, radius, enemy.x, enemy.y, enemyRadius)) {
        enemy.dead = true;
        enemy.sprite.destroy();
      }
    }

    for (const hostage of this.hostages) {
      if (hostage.state !== "free") {
        continue;
      }

      if (circleHit(projectile.x, projectile.y, radius, hostage.x, hostage.y, 8)) {
        this.loseHostage(hostage);
      }
    }

    for (let i = 0; i < this.barracks.length; i += 1) {
      const barrack = this.barracks[i];
      const bounds = rectFromSprite(barrack.sprite);
      if (rectsOverlap({
        left: projectile.x - radius,
        right: projectile.x + radius,
        top: projectile.y - radius,
        bottom: projectile.y + radius,
      }, bounds)) {
        this.openBarrack(i, "player");
      }
    }

    projectile.dead = true;
    projectile.sprite.destroy();
  }

  refreshSprites(force = false) {
    this.baseShadow.x = BASE_BUILDING.x;
    this.baseShadow.y = terrainYAt(BASE_BUILDING.x) - 4;
    this.baseSprite.x = BASE_BUILDING.x;
    this.baseSprite.y = terrainYAt(BASE_BUILDING.x) - BASE_BUILDING.yOffset;

    this.barracks.forEach((barrack) => {
      barrack.shadow.x = barrack.x;
      barrack.shadow.y = terrainYAt(barrack.x) - 3;
      barrack.sprite.x = barrack.x;
      barrack.sprite.y = terrainYAt(barrack.x) - barrack.yOffset;
      barrack.sprite.setTexture(barrack.open ? "barrack-open" : "barrack-closed");
    });

    for (const hostage of this.hostages) {
      if (hostage.state === "free") {
        hostage.sprite.setVisible(true);
        hostage.sprite.x = hostage.x;
        hostage.sprite.y = hostage.y;
      } else if (hostage.state === "sealed") {
        hostage.sprite.setVisible(false);
      }
    }

    this.heli.sprite.x = this.heli.x;
    this.heli.sprite.y = this.heli.y;
    this.heli.shadow.x = this.heli.x;
    this.heli.shadow.y = terrainYAt(this.heli.x) - 2;

    const altitude = clamp(terrainYAt(this.heli.x) - HELI_GROUND_OFFSET - this.heli.y, 0, 240);
    const shadowScale = clamp(1 - altitude / 300, 0.4, 1);
    this.heli.shadow.setScale(shadowScale, clamp(shadowScale * 0.42, 0.18, 0.45));
    this.heli.shadow.setAlpha(clamp(0.3 - altitude / 900, 0.08, 0.3));
  }

  updateHud() {
    this.lostText.setText(`LOST ${pad2(this.lost)}`);
    this.aboardText.setText(`ABOARD ${pad2(this.heli.carry.length)}`);
    this.rescuedText.setText(`RESCUED ${pad2(this.rescued)}`);
    this.livesText.setText(`HELIS ${pad2(this.lives)}`);

    if (this.heli.invulnerable > 0 && !this.heli.dead) {
      const blink = Math.floor((this.now ?? 0) / 90) % 2 === 0;
      this.heli.sprite.setAlpha(blink ? 0.45 : 1);
    } else {
      this.heli.sprite.setAlpha(1);
    }
  }

  checkEndState() {
    if (this.gameState !== "play") {
      return;
    }

    if (this.rescued >= BARRACKS.length * HOSTAGES_PER_BARRACK) {
      this.finishVictory();
      return;
    }

    if (this.lost >= BARRACKS.length * HOSTAGES_PER_BARRACK) {
      this.finishGame("Everyone is gone");
    }
  }

  update(time, delta) {
    this.now = time;
    const dt = Math.min(delta / 1000, 0.05);

    this.updateMessage();

    if (Phaser.Input.Keyboard.JustDown(this.keyR)) {
      this.scene.restart();
      return;
    }

    if (this.gameState !== "play") {
      this.refreshSprites();
      this.updateHud();
      this.updateCamera();
      return;
    }

    this.updateHeli(dt, time);
    this.updateHostages(dt);
    this.updateEnemies(dt);
    this.updateProjectiles(dt);

    this.refreshSprites();
    this.updateHud();
    this.checkEndState();
    this.updateCamera();
  }
}

const config = {
  type: Phaser.AUTO,
  parent: "game",
  width: VIEW_WIDTH,
  height: VIEW_HEIGHT,
  backgroundColor: "#8ec9ff",
  pixelArt: true,
  roundPixels: true,
  render: {
    antialias: false,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [ChoplifterScene],
};

new Phaser.Game(config);
