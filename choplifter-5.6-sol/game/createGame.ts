import Phaser from "phaser";

export type MissionPhase = "ready" | "playing" | "paused" | "won" | "lost";

export interface MissionReport {
  phase: MissionPhase;
  lost: number;
  aboard: number;
  saved: number;
  lives: number;
  message: string;
}

export interface MissionControls {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  fire: boolean;
  rotate: boolean;
  pause: boolean;
  restart: boolean;
  started: boolean;
  muted: boolean;
  audio: AudioContext | null;
}

type Facing = "left" | "right" | "front";
type ReportHandler = (report: MissionReport) => void;
type CollisionObject =
  | Phaser.Types.Physics.Arcade.GameObjectWithBody
  | Phaser.Physics.Arcade.Body
  | Phaser.Physics.Arcade.StaticBody
  | Phaser.Tilemaps.Tile;

type Barrack = {
  x: number;
  sprite: Phaser.Physics.Arcade.Sprite;
  open: boolean;
  hits: number;
  remaining: number;
};

const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;
const WORLD_WIDTH = 5800;
const GROUND_Y = 620;
const PAD_LEFT = 165;
const PAD_RIGHT = 620;
const HOME_PAD_MARGIN = 96;
const BARRIER_X = 940;
const BARRACK_X = [1580, 2780, 3980, 5180];

class MissionScene extends Phaser.Scene {
  private controls: MissionControls;
  private onReport: ReportHandler;
  private player!: Phaser.Physics.Arcade.Sprite;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private playerBullets!: Phaser.Physics.Arcade.Group;
  private enemyBullets!: Phaser.Physics.Arcade.Group;
  private tanks!: Phaser.Physics.Arcade.Group;
  private jets!: Phaser.Physics.Arcade.Group;
  private drones!: Phaser.Physics.Arcade.Group;
  private hostages!: Phaser.Physics.Arcade.Group;
  private barrackGroup!: Phaser.Physics.Arcade.StaticGroup;
  private barracks: Barrack[] = [];
  private radar!: Phaser.GameObjects.Graphics;
  private threatText!: Phaser.GameObjects.Text;
  private directionText!: Phaser.GameObjects.Text;
  private phase: MissionPhase = "ready";
  private facing: Facing = "right";
  private sideFacing: Exclude<Facing, "front"> = "right";
  private autoTurnTarget: Exclude<Facing, "front"> | null = null;
  private autoTurnUntil = 0;
  private lives = 3;
  private lost = 0;
  private aboard = 0;
  private saved = 0;
  private activeBarrack = 0;
  private message = "Awaiting pilot";
  private lastReport = "";
  private nextShotAt = 0;
  private nextTankAt = 0;
  private nextJetAt = 0;
  private nextDroneAt = 0;
  private unloadAt = 0;
  private invulnerableUntil = 0;
  private prevVirtualRotate = false;
  private prevVirtualPause = false;
  private startedTone = false;
  private isLanded = true;
  private flightTilt = 0;

  constructor(controls: MissionControls, onReport: ReportHandler) {
    super("Mission");
    this.controls = controls;
    this.onReport = onReport;
  }

  create() {
    this.resetState();
    this.createTextures();
    this.createWorld();

    this.playerBullets = this.physics.add.group({ maxSize: 32 });
    this.enemyBullets = this.physics.add.group({ maxSize: 42 });
    this.tanks = this.physics.add.group();
    this.jets = this.physics.add.group();
    this.drones = this.physics.add.group();
    this.hostages = this.physics.add.group();
    this.barrackGroup = this.physics.add.staticGroup();
    this.createBarracks();
    this.openBarrack(0, true);

    this.player = this.physics.add.sprite(365, GROUND_Y - 34, "heli-side");
    this.player.setDepth(20).setCollideWorldBounds(true);
    this.player.setDataEnabled();
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    playerBody.setSize(94, 38).setOffset(20, 13);
    playerBody.setMaxVelocity(360, 265);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, GAME_HEIGHT);
    this.physics.world.setBounds(0, 80, WORLD_WIDTH, GROUND_Y - 46);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setDeadzone(300, 170);

    this.keys = this.input.keyboard!.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      fire: Phaser.Input.Keyboard.KeyCodes.SPACE,
      rotate: Phaser.Input.Keyboard.KeyCodes.X,
      rotateAlt: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      pause: Phaser.Input.Keyboard.KeyCodes.P,
      mute: Phaser.Input.Keyboard.KeyCodes.M,
    }) as Record<string, Phaser.Input.Keyboard.Key>;

    this.physics.add.overlap(this.playerBullets, this.tanks, (bullet, enemy) => this.hitEnemy(bullet, enemy, 20));
    this.physics.add.overlap(this.playerBullets, this.jets, (bullet, enemy) => this.hitEnemy(bullet, enemy, 40));
    this.physics.add.overlap(this.playerBullets, this.drones, (bullet, enemy) => this.hitEnemy(bullet, enemy, 60));
    this.physics.add.overlap(this.playerBullets, this.barrackGroup, (bullet, building) => this.hitBarrack(bullet, building));
    this.physics.add.overlap(this.playerBullets, this.hostages, (bullet, hostage) => this.hitHostage(bullet, hostage));
    this.physics.add.overlap(this.enemyBullets, this.hostages, (bullet, hostage) => this.hitHostage(bullet, hostage));
    this.physics.add.overlap(this.player, this.enemyBullets, (_player, projectile) => {
      (projectile as Phaser.GameObjects.GameObject).destroy();
      this.crashHelicopter("Aircraft hit");
    });
    this.physics.add.overlap(this.player, this.jets, () => this.crashHelicopter("Mid-air collision"));
    this.physics.add.overlap(this.player, this.drones, (_player, drone) => {
      (drone as Phaser.GameObjects.GameObject).destroy();
      this.crashHelicopter("Drone mine impact");
    });

    this.createHud();
    this.time.addEvent({
      delay: 240,
      loop: true,
      callback: () => {
        if (this.phase === "playing" && this.player.active && !this.isLanded) {
          this.player.y += Math.sin(this.time.now * 0.021) * 0.28;
        }
      },
    });
    this.emitReport();
  }

  update(time: number, delta: number) {
    if (this.controls.restart) {
      this.controls.restart = false;
      this.scene.restart();
      return;
    }

    const virtualRotateDown = this.controls.rotate;
    const virtualPauseDown = this.controls.pause;
    const rotatePressed =
      Phaser.Input.Keyboard.JustDown(this.keys.rotate) ||
      Phaser.Input.Keyboard.JustDown(this.keys.rotateAlt) ||
      (virtualRotateDown && !this.prevVirtualRotate);
    const pausePressed =
      Phaser.Input.Keyboard.JustDown(this.keys.pause) ||
      (virtualPauseDown && !this.prevVirtualPause);
    this.prevVirtualRotate = virtualRotateDown;
    this.prevVirtualPause = virtualPauseDown;

    if (Phaser.Input.Keyboard.JustDown(this.keys.mute)) {
      this.controls.muted = !this.controls.muted;
    }

    if (!this.controls.started) {
      this.phase = "ready";
      this.updateHud();
      return;
    }

    if (!this.startedTone) {
      this.startedTone = true;
      this.phase = "playing";
      this.setMessage("Lift off · Barrack 1 is already open");
      this.tone(132, 0.08, "square", 0.035);
      this.tone(198, 0.13, "square", 0.025, 0.08);
      this.nextTankAt = time + 5200;
      this.nextJetAt = time + 11500;
    }

    if (pausePressed && (this.phase === "playing" || this.phase === "paused")) {
      this.phase = this.phase === "paused" ? "playing" : "paused";
      if (this.phase === "paused") this.physics.pause();
      else this.physics.resume();
      this.setMessage(this.phase === "paused" ? "Mission paused" : "Mission resumed");
    }

    if (this.phase !== "playing") {
      this.updateHud();
      return;
    }

    if (rotatePressed && this.player.active) this.rotateHelicopter();

    this.updatePlayer(time, delta);
    this.updateHostages(time);
    this.updateEnemies(time);
    this.updateProjectiles(time);
    this.handleUnloading(time);
    this.updateHud();
  }

  private resetState() {
    this.phase = "ready";
    this.facing = "right";
    this.sideFacing = "right";
    this.autoTurnTarget = null;
    this.autoTurnUntil = 0;
    this.lives = 3;
    this.lost = 0;
    this.aboard = 0;
    this.saved = 0;
    this.activeBarrack = 0;
    this.message = "Awaiting pilot";
    this.lastReport = "";
    this.nextShotAt = 0;
    this.nextTankAt = 0;
    this.nextJetAt = 0;
    this.nextDroneAt = 0;
    this.unloadAt = 0;
    this.invulnerableUntil = 0;
    this.prevVirtualRotate = false;
    this.prevVirtualPause = false;
    this.flightTilt = 0;
    this.startedTone = false;
    this.isLanded = true;
    this.barracks = [];
  }

  private createTextures() {
    const texture = (key: string, width: number, height: number, paint: (g: Phaser.GameObjects.Graphics) => void) => {
      if (this.textures.exists(key)) return;
      const g = this.make.graphics({ x: 0, y: 0 });
      paint(g);
      g.generateTexture(key, width, height);
      g.destroy();
    };

    texture("heli-side", 128, 64, (g) => {
      // Main rotor and mast.
      g.fillStyle(0x101923).fillRect(34, 4, 91, 4).fillRect(76, 6, 5, 12);
      g.fillStyle(0xf4f0e5).fillRect(57, 2, 46, 2);

      // Tail boom, vertical stabilizer, and a clearly visible tail rotor.
      g.fillStyle(0xd9822f).fillTriangle(11, 28, 75, 21, 72, 39).fillTriangle(11, 28, 72, 39, 13, 42);
      g.fillStyle(0xf3a23a).fillTriangle(14, 30, 19, 10, 31, 36);
      g.fillStyle(0x101923).fillCircle(13, 33, 9).fillStyle(0xf3a23a).fillCircle(13, 33, 3);
      g.lineStyle(2, 0xf4f0e5).strokeLineShape(new Phaser.Geom.Line(13, 23, 13, 43));
      g.strokeLineShape(new Phaser.Geom.Line(3, 33, 23, 33));

      // Rounded cabin and nose, with a separate blue cockpit canopy.
      g.fillStyle(0xf3a23a).fillEllipse(87, 33, 68, 38).fillCircle(112, 34, 15);
      g.fillStyle(0xd9822f).fillEllipse(79, 38, 43, 24);
      g.fillStyle(0x6bc2d6).fillEllipse(104, 29, 31, 24);
      g.fillStyle(0x203746).fillTriangle(94, 18, 113, 22, 113, 38);
      g.lineStyle(2, 0x101923).strokeLineShape(new Phaser.Geom.Line(90, 17, 91, 47));
      g.fillStyle(0x101923).fillCircle(101, 30, 3);

      // Rescue cross, intake, and landing skids.
      g.fillStyle(0xf4f0e5).fillRect(70, 27, 13, 5).fillRect(74, 23, 5, 13);
      g.fillStyle(0x101923).fillRect(57, 22, 8, 3).fillRect(58, 42, 10, 3);
      g.lineStyle(3, 0x101923).strokeLineShape(new Phaser.Geom.Line(68, 49, 63, 58));
      g.strokeLineShape(new Phaser.Geom.Line(105, 49, 110, 58));
      g.strokeLineShape(new Phaser.Geom.Line(55, 58, 117, 58));
      g.fillStyle(0xfff3c4).fillCircle(119, 37, 3);
    });

    texture("heli-front", 82, 68, (g) => {
      g.fillStyle(0x101923).fillRect(2, 6, 78, 4).fillRect(38, 5, 6, 13);
      g.fillStyle(0xf4f0e5).fillRect(18, 3, 46, 2);
      g.fillStyle(0xd9822f).fillTriangle(19, 33, 41, 14, 63, 33);
      g.fillStyle(0xf3a23a).fillEllipse(41, 38, 55, 43);
      g.fillStyle(0x6bc2d6).fillEllipse(41, 31, 38, 25);
      g.fillStyle(0x203746).fillTriangle(41, 19, 41, 41, 57, 34);
      g.lineStyle(2, 0x101923).strokeLineShape(new Phaser.Geom.Line(41, 18, 41, 43));
      g.fillStyle(0xf4f0e5).fillRect(37, 43, 9, 3).fillRect(40, 40, 3, 9);
      g.fillStyle(0x101923).fillCircle(26, 42, 3).fillCircle(56, 42, 3);
      g.lineStyle(3, 0x101923).strokeLineShape(new Phaser.Geom.Line(24, 53, 15, 64));
      g.strokeLineShape(new Phaser.Geom.Line(58, 53, 67, 64));
      g.strokeLineShape(new Phaser.Geom.Line(12, 64, 70, 64));
      g.fillStyle(0xfff3c4).fillCircle(30, 47, 3).fillCircle(52, 47, 3);
    });

    texture("tank", 62, 32, (g) => {
      g.fillStyle(0x3d5748).fillRoundedRect(5, 18, 48, 12, 4).fillRect(15, 11, 30, 11);
      g.fillStyle(0x101923).fillRect(34, 7, 27, 4);
      g.fillStyle(0x9ecf72).fillCircle(16, 29, 3).fillCircle(29, 29, 3).fillCircle(43, 29, 3);
    });

    texture("jet", 76, 30, (g) => {
      g.fillStyle(0x6bc2d6).fillTriangle(2, 15, 70, 7, 63, 21).fillTriangle(33, 15, 58, 0, 50, 16);
      g.fillStyle(0x101923).fillRect(28, 12, 30, 4);
      g.fillStyle(0xff5c46).fillTriangle(6, 12, 0, 15, 6, 18);
    });

    texture("drone", 36, 36, (g) => {
      g.fillStyle(0xff5c46).fillCircle(18, 18, 15);
      g.fillStyle(0x101923).fillCircle(18, 18, 8).fillRect(16, 0, 4, 36).fillRect(0, 16, 36, 4);
      g.fillStyle(0xf8e6b6).fillCircle(18, 18, 3);
    });

    texture("hostage", 16, 30, (g) => {
      g.fillStyle(0xf4c89a).fillCircle(8, 5, 4);
      g.fillStyle(0xf7ead0).fillRect(4, 9, 8, 11);
      g.fillStyle(0x101923).fillRect(2, 11, 3, 9).fillRect(11, 11, 3, 9).fillRect(4, 20, 3, 10).fillRect(9, 20, 3, 10);
    });

    texture("barrack-closed", 152, 82, (g) => {
      g.fillStyle(0x253e4c).fillRect(3, 18, 146, 61);
      g.fillStyle(0x162732).fillTriangle(0, 20, 76, 0, 152, 20);
      g.fillStyle(0xf3a23a).fillRect(59, 39, 34, 40);
      g.fillStyle(0x101923).fillRect(65, 45, 22, 34).fillCircle(83, 61, 2);
      g.lineStyle(3, 0x6bc2d6).strokeRect(15, 37, 27, 20).strokeRect(110, 37, 27, 20);
    });

    texture("barrack-open", 152, 82, (g) => {
      g.fillStyle(0x253e4c).fillRect(3, 18, 146, 61);
      g.fillStyle(0x162732).fillTriangle(0, 20, 76, 0, 152, 20);
      g.fillStyle(0x050c12).fillRect(49, 35, 54, 44);
      g.fillStyle(0xff5c46).fillTriangle(43, 30, 58, 42, 48, 54).fillTriangle(108, 30, 95, 46, 106, 60);
      g.fillStyle(0xf3a23a).fillCircle(75, 39, 4);
    });

    texture("bullet", 12, 5, (g) => g.fillStyle(0xfff3c4).fillRect(0, 0, 12, 5));
    texture("shell", 11, 7, (g) => g.fillStyle(0xff5c46).fillRoundedRect(0, 0, 11, 7, 2));
    texture("missile", 20, 8, (g) => {
      g.fillStyle(0xff5c46).fillTriangle(0, 4, 7, 0, 7, 8).fillStyle(0xf7ead0).fillRect(7, 2, 13, 4);
    });
  }

  private createWorld() {
    this.cameras.main.setBackgroundColor(0x0b1a2c);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0b1a2c).setScrollFactor(0).setDepth(-50);
    this.add.rectangle(GAME_WIDTH / 2, 345, GAME_WIDTH, 510, 0x132c42).setScrollFactor(0).setDepth(-49);
    this.add.rectangle(GAME_WIDTH / 2, 475, GAME_WIDTH, 250, 0x24485a).setScrollFactor(0).setDepth(-48);
    this.add.circle(1015, 150, 74, 0xf3a23a, 0.88).setScrollFactor(0).setDepth(-47);
    this.add.circle(1015, 150, 53, 0xffc668, 0.75).setScrollFactor(0).setDepth(-46);

    const seeded = new Phaser.Math.RandomDataGenerator(["lifeline-82"]);
    for (let i = 0; i < 90; i++) {
      const star = this.add.rectangle(seeded.between(0, 1600), seeded.between(85, 470), seeded.between(1, 3), seeded.between(1, 3), i % 8 === 0 ? 0xf3a23a : 0xbcd9dd, seeded.realInRange(0.28, 0.75));
      star.setScrollFactor(0.06).setDepth(-45);
    }

    const hills = this.add.graphics().setDepth(-30).setScrollFactor(0.22);
    hills.fillStyle(0x183343, 1);
    for (let x = -200; x < 2000; x += 250) hills.fillTriangle(x, GROUND_Y, x + 130, 385 + ((x / 250) % 2) * 45, x + 300, GROUND_Y);
    const nearHills = this.add.graphics().setDepth(-20).setScrollFactor(0.5);
    nearHills.fillStyle(0x213e47, 1);
    for (let x = -240; x < 2400; x += 310) nearHills.fillTriangle(x, GROUND_Y, x + 160, 470 + ((x / 310) % 2) * 24, x + 360, GROUND_Y);

    this.add.rectangle(WORLD_WIDTH / 2, GROUND_Y + 56, WORLD_WIDTH, 112, 0xd8893f).setDepth(-10);
    this.add.rectangle(WORLD_WIDTH / 2, GROUND_Y + 7, WORLD_WIDTH, 14, 0xefad5d).setDepth(-9);
    this.add.rectangle(WORLD_WIDTH / 2, GROUND_Y + 40, WORLD_WIDTH, 2, 0xb66b35, 0.7).setDepth(-8);

    for (let x = 30; x < WORLD_WIDTH; x += 86) {
      this.add.rectangle(x, GROUND_Y + 18 + (x % 3) * 8, 22 + (x % 5) * 5, 3, 0x9d6339, 0.55).setAngle((x % 7) - 3).setDepth(-7);
    }

    const base = this.add.graphics().setDepth(-5);
    base.fillStyle(0xede4cf).fillRect(150, 485, 300, 134);
    base.fillStyle(0x101923).fillTriangle(128, 492, 300, 427, 472, 492);
    base.fillStyle(0x6bc2d6).fillRect(184, 520, 64, 42).fillRect(328, 520, 74, 42);
    base.fillStyle(0x253440).fillRect(265, 527, 48, 92);
    base.fillStyle(0xf3a23a).fillRect(160, 475, 86, 10);
    this.add.text(171, 450, "RESCUE POST", { fontFamily: "monospace", fontSize: "14px", color: "#101923", fontStyle: "bold" }).setDepth(-4);

    this.add.rectangle((PAD_LEFT + PAD_RIGHT) / 2, GROUND_Y + 2, PAD_RIGHT - PAD_LEFT, 10, 0xf4f0e5).setDepth(1);
    for (let x = PAD_LEFT; x < PAD_RIGHT; x += 54) this.add.rectangle(x, GROUND_Y + 2, 26, 10, 0xff5c46).setDepth(2);
    this.add.text(PAD_LEFT + 8, GROUND_Y + 20, "HOME PAD · SET DOWN LEVEL TO UNLOAD", { fontFamily: "monospace", fontSize: "11px", color: "#603d2c" }).setDepth(2);

    this.add.rectangle(BARRIER_X, 525, 18, 190, 0x101923).setDepth(4);
    this.add.rectangle(BARRIER_X, 505, 56, 10, 0xf3a23a).setDepth(4);
    this.add.text(BARRIER_X - 46, 471, "FRONTIER", { fontFamily: "monospace", fontSize: "11px", color: "#f3a23a" }).setDepth(4);

    for (let i = 0; i < BARRACK_X.length; i++) {
      const x = BARRACK_X[i];
      this.add.text(x - 48, GROUND_Y + 23, `BARRACK ${i + 1}`, { fontFamily: "monospace", fontSize: "10px", color: "#68442f" }).setDepth(3);
    }
  }

  private createBarracks() {
    this.barracks = BARRACK_X.map((x, index) => {
      const sprite = this.barrackGroup.create(x, GROUND_Y - 40, "barrack-closed") as Phaser.Physics.Arcade.Sprite;
      sprite.setDepth(6).setData("index", index);
      return { x, sprite, open: false, hits: 0, remaining: 16 };
    });
  }

  private createHud() {
    this.radar = this.add.graphics().setScrollFactor(0).setDepth(80);
    this.threatText = this.add.text(28, 24, "THREAT LOW", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#f4f0e5",
      fontStyle: "bold",
    }).setScrollFactor(0).setDepth(81);
    this.directionText = this.add.text(GAME_WIDTH - 32, 24, "SIDE · EAST", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#f4f0e5",
      fontStyle: "bold",
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(81);
  }

  private updateHud() {
    const threat = this.saved >= 48 ? "SEVERE" : this.saved >= 24 ? "HIGH" : this.saved >= 8 ? "ELEVATED" : "LOW";
    this.threatText.setText(`THREAT ${threat}`);
    this.threatText.setColor(threat === "SEVERE" ? "#ff5c46" : threat === "HIGH" ? "#f3a23a" : "#f4f0e5");
    this.directionText.setText(
      this.autoTurnTarget
        ? `TURNING · ${this.autoTurnTarget === "right" ? "EAST" : "WEST"}`
        : this.facing === "front"
          ? "ATTACK · GROUND"
          : `SIDE · ${this.facing === "right" ? "EAST" : "WEST"}`,
    );

    this.radar.clear();
    this.radar.fillStyle(0x09131e, 0.78).fillRoundedRect(18, 14, 265, 32, 5);
    this.radar.lineStyle(2, 0x405564, 1).lineBetween(108, 31, 265, 31);
    for (let i = 0; i < BARRACK_X.length; i++) {
      const px = 108 + (BARRACK_X[i] / WORLD_WIDTH) * 157;
      const color = this.barracks[i]?.open ? 0x9ecf72 : i === this.activeBarrack ? 0xf3a23a : 0x60717e;
      this.radar.fillStyle(color, 1).fillRect(px - 2, 27, 5, 8);
    }
    const playerX = 108 + (this.player?.x / WORLD_WIDTH) * 157;
    this.radar.fillStyle(0x6bc2d6, 1).fillTriangle(playerX - 5, 23, playerX + 6, 31, playerX - 5, 39);
    this.emitReport();
  }

  private updatePlayer(time: number, delta: number) {
    if (!this.player.active) return;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const left = this.keys.left.isDown || this.keys.a.isDown || this.controls.left;
    const right = this.keys.right.isDown || this.keys.d.isDown || this.controls.right;
    const up = this.keys.up.isDown || this.keys.w.isDown || this.controls.up;
    const down = this.keys.down.isDown || this.keys.s.isDown || this.controls.down;
    const horizontal = (right ? 1 : 0) - (left ? 1 : 0);
    const vertical = (down ? 1 : 0) - (up ? 1 : 0);
    const dtScale = Math.min(1.8, delta / 16.67);

    if (this.autoTurnTarget && time >= this.autoTurnUntil) {
      const completedTurn = this.autoTurnTarget;
      this.autoTurnTarget = null;
      this.sideFacing = completedTurn;
      this.setFacing(completedTurn);
    }

    if (horizontal !== 0) {
      body.setAccelerationX(horizontal * 430);
      const requestedFacing = horizontal > 0 ? "right" : "left";
      if (this.autoTurnTarget) {
        this.autoTurnTarget = requestedFacing;
      } else if (this.facing !== "front" && requestedFacing !== this.sideFacing) {
        this.beginDirectionalTurn(requestedFacing, time);
      } else if (this.facing !== "front") {
        this.sideFacing = requestedFacing;
        this.setFacing(requestedFacing);
      }
    } else {
      body.setAccelerationX(0);
      body.velocity.x *= Math.pow(0.9, dtScale);
    }

    if (vertical !== 0) body.setAccelerationY(vertical * 360);
    else {
      body.setAccelerationY(0);
      body.velocity.y *= Math.pow(0.88, dtScale);
    }

    const landingY = GROUND_Y - 32;
    let justLiftedOff = false;
    if (up && this.isLanded) {
      this.isLanded = false;
      justLiftedOff = true;
      this.player.y = Math.min(this.player.y, landingY - 2);
      body.setAccelerationY(-360).setVelocityY(-110);
      this.setMessage("Airborne");
      this.tone(92, 0.06, "sawtooth", 0.02);
    }

    if (!justLiftedOff && this.player.y >= landingY) {
      const impactSpeed = Math.abs(body.velocity.y);
      this.player.y = landingY;
      body.setVelocityY(0).setAccelerationY(0);
      if (down || impactSpeed < 120) {
        this.isLanded = true;
        body.velocity.x *= 0.75;
      }
      if (impactSpeed > 235) {
        this.crashHelicopter("Hard landing");
        return;
      }
    } else if (this.player.y < landingY - 5) {
      this.isLanded = false;
    }

    if (this.player.y < 105) {
      this.player.y = 105;
      body.velocity.y = Math.max(0, body.velocity.y);
    }

    this.updateFlightTilt(horizontal, body, dtScale);

    if ((this.keys.fire.isDown || this.controls.fire) && time >= this.nextShotAt) {
      this.fire(time);
    }
  }

  private updateFlightTilt(horizontal: number, body: Phaser.Physics.Arcade.Body, dtScale: number) {
    let targetTilt = 0;
    if (!this.isLanded && this.facing !== "front" && !this.autoTurnTarget) {
      if (horizontal !== 0) targetTilt = horizontal * 11;
      else if (Math.abs(body.velocity.x) > 45) targetTilt = -Math.sign(body.velocity.x) * 5;
    }

    const blend = 1 - Math.pow(0.78, dtScale);
    this.flightTilt = Phaser.Math.Linear(this.flightTilt, targetTilt, blend);
    if (Math.abs(this.flightTilt) < 0.05) this.flightTilt = 0;
    this.player.setAngle(this.flightTilt);
  }

  private rotateHelicopter() {
    this.autoTurnTarget = null;
    if (this.facing === "front") this.setFacing(this.sideFacing);
    else {
      this.sideFacing = this.facing;
      this.setFacing("front");
    }
    this.tone(240, 0.045, "square", 0.018);
  }

  private beginDirectionalTurn(target: Exclude<Facing, "front">, time: number) {
    this.autoTurnTarget = target;
    this.autoTurnUntil = time + 170;
    this.setFacing("front");
    this.tone(210, 0.035, "square", 0.014);
  }

  private setFacing(next: Facing) {
    this.facing = next;
    if (next === "front") {
      this.player.setTexture("heli-front").setFlipX(false);
      const body = this.player.body as Phaser.Physics.Arcade.Body;
      body.setSize(58, 43).setOffset(12, 13);
    } else {
      this.player.setTexture("heli-side").setFlipX(next === "left");
      const body = this.player.body as Phaser.Physics.Arcade.Body;
      body.setSize(94, 38).setOffset(next === "left" ? 14 : 20, 13);
    }
  }

  private fire(time: number) {
    if (this.autoTurnTarget) {
      this.nextShotAt = time + 100;
      return;
    }
    if (this.isLanded && this.facing === "front") {
      this.setMessage("Lift off to engage ground targets");
      this.nextShotAt = time + 260;
      return;
    }
    const bullet = this.playerBullets.get(this.player.x, this.player.y, "bullet") as Phaser.Physics.Arcade.Sprite | null;
    if (!bullet) return;
    bullet.setActive(true).setVisible(true).setDepth(18).setData("expires", time + 1550);
    const body = bullet.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.setAllowGravity(false);
    if (this.facing === "front") {
      bullet.setPosition(this.player.x, this.player.y + 26).setAngle(90);
      body.setVelocity(0, 610);
    } else {
      const firingAngle = this.flightTilt + (this.facing === "right" ? 0 : 180);
      const firingRadians = Phaser.Math.DegToRad(firingAngle);
      const muzzleX = Math.cos(firingRadians) * 48;
      const muzzleY = Math.sin(firingRadians) * 48;
      bullet.setPosition(this.player.x + muzzleX, this.player.y + muzzleY).setAngle(firingAngle);
      body.setVelocity(Math.cos(firingRadians) * 760, Math.sin(firingRadians) * 760);
    }
    this.nextShotAt = time + 155;
    this.tone(340, 0.025, "square", 0.018);
  }

  private openBarrack(index: number, initial = false) {
    const barrack = this.barracks[index];
    if (!barrack || barrack.open) return;
    barrack.open = true;
    barrack.sprite.setTexture("barrack-open");
    this.explosion(barrack.x, GROUND_Y - 55, 0xf3a23a, 1.5);
    for (let i = 0; i < 16; i++) {
      const offset = (i - 7.5) * 18;
      const hostage = this.hostages.create(barrack.x + offset, GROUND_Y - 15, "hostage") as Phaser.Physics.Arcade.Sprite;
      hostage.setDepth(12).setDataEnabled();
      hostage.setData({ cell: index, state: "waiting", homeX: barrack.x + offset, nextTurn: this.time.now + 600 + i * 80 });
      hostage.setTint(i % 3 === 0 ? 0xdcebb9 : i % 3 === 1 ? 0xc6e6ef : 0xffffff);
      const body = hostage.body as Phaser.Physics.Arcade.Body;
      body.setAllowGravity(false).setSize(12, 27).setOffset(2, 2);
    }
    if (!initial) this.setMessage(`Barrack ${index + 1} breached · 16 waiting`);
  }

  private hitBarrack(
    bulletObject: CollisionObject,
    buildingObject: CollisionObject,
  ) {
    const bullet = bulletObject as Phaser.Physics.Arcade.Sprite;
    const building = buildingObject as Phaser.Physics.Arcade.Sprite;
    bullet.destroy();
    const index = Number(building.getData("index"));
    const barrack = this.barracks[index];
    if (barrack.open) return;
    if (index !== this.activeBarrack) {
      this.setMessage(`Barrack ${this.activeBarrack + 1} must be cleared first`);
      return;
    }
    barrack.hits += 1;
    this.explosion(building.x + Phaser.Math.Between(-40, 40), building.y, 0xff5c46, 0.75);
    if (barrack.hits >= 2) this.openBarrack(index);
    else this.setMessage(`Barrack ${index + 1} damaged · hit it again`);
  }

  private updateHostages(time: number) {
    if (!this.player.active) return;
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    const children = this.hostages.getChildren() as Phaser.Physics.Arcade.Sprite[];
    for (const hostage of children) {
      if (!hostage.active) continue;
      const body = hostage.body as Phaser.Physics.Arcade.Body;
      const state = hostage.getData("state") as string;
      const distance = Math.abs(hostage.x - this.player.x);

      if (state === "waiting" && this.isLanded && distance < 255 && this.aboard < 16) {
        hostage.setData("state", "boarding");
      }

      if (hostage.getData("state") === "boarding") {
        const direction = Math.sign(this.player.x - hostage.x);
        body.setVelocityX(direction * 82);
        hostage.setFlipX(direction < 0);
        if (distance < 52 && this.isLanded) {
          this.boardHostage(hostage);
          continue;
        }
        if (!this.isLanded || distance > 300 || this.aboard >= 16) hostage.setData("state", "waiting");
      } else if (time >= Number(hostage.getData("nextTurn"))) {
        const homeX = Number(hostage.getData("homeX"));
        const direction = Phaser.Math.Between(0, 1) ? 1 : -1;
        body.setVelocityX(direction * 20);
        hostage.setFlipX(direction < 0);
        hostage.setData("nextTurn", time + Phaser.Math.Between(700, 1600));
        if (Math.abs(hostage.x - homeX) > 210) body.setVelocityX(Math.sign(homeX - hostage.x) * 30);
      }

      hostage.y = GROUND_Y - 15;
      const canBeCrushed =
        hostage.getData("state") !== "boarding" && Math.abs(playerBody.velocity.x) > 70;
      if (
        this.isLanded &&
        canBeCrushed &&
        Math.abs(hostage.x - this.player.x) < 46 &&
        Math.abs(hostage.y - this.player.y) < 42
      ) {
        this.loseHostage(hostage, "Civilian crushed");
      }
    }
  }

  private boardHostage(hostage: Phaser.Physics.Arcade.Sprite) {
    if (this.aboard >= 16 || !hostage.active) return;
    const cell = Number(hostage.getData("cell"));
    hostage.destroy();
    this.aboard += 1;
    this.barracks[cell].remaining -= 1;
    this.explosion(this.player.x, GROUND_Y - 20, 0x9ecf72, 0.34);
    this.tone(520 + this.aboard * 12, 0.045, "sine", 0.025);
    if (this.aboard === 16) this.setMessage("Cabin full · return to the home pad");
    else this.setMessage(`${this.aboard}/16 aboard`);
    this.resolveBarrack(cell);
  }

  private hitHostage(
    projectileObject: CollisionObject,
    hostageObject: CollisionObject,
  ) {
    const projectile = projectileObject as Phaser.Physics.Arcade.Sprite;
    const hostage = hostageObject as Phaser.Physics.Arcade.Sprite;
    projectile.destroy();
    this.loseHostage(hostage, "Civilian lost in crossfire");
  }

  private loseHostage(hostage: Phaser.Physics.Arcade.Sprite, reason: string) {
    if (!hostage.active) return;
    const cell = Number(hostage.getData("cell"));
    const x = hostage.x;
    hostage.destroy();
    this.lost += 1;
    this.barracks[cell].remaining -= 1;
    this.explosion(x, GROUND_Y - 14, 0xff5c46, 0.42);
    this.tone(110, 0.13, "sawtooth", 0.022);
    this.setMessage(reason);
    this.resolveBarrack(cell);
  }

  private resolveBarrack(cell: number) {
    if (this.barracks[cell].remaining > 0 || cell !== this.activeBarrack) return;
    if (cell < this.barracks.length - 1) {
      this.activeBarrack = cell + 1;
      this.setMessage(`Barrack ${cell + 1} clear · Barrack ${cell + 2} is the next target`);
    }
    this.checkMissionEnd();
  }

  private handleUnloading(time: number) {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const landingY = GROUND_Y - 32;
    const settledOnGround =
      this.isLanded || (this.player.y >= landingY - 3 && Math.abs(body.velocity.y) < 45);
    const overlapsHomePad =
      this.player.x + body.width / 2 >= PAD_LEFT - HOME_PAD_MARGIN &&
      this.player.x - body.width / 2 <= PAD_RIGHT + HOME_PAD_MARGIN;
    const onPad = settledOnGround && overlapsHomePad;
    if (!onPad || this.aboard === 0 || time < this.unloadAt) return;
    this.aboard -= 1;
    this.saved += 1;
    this.unloadAt = time + 125;
    const passenger = this.add.sprite(this.player.x - 30 + Phaser.Math.Between(-8, 8), GROUND_Y - 15, "hostage").setDepth(13);
    this.tweens.add({ targets: passenger, x: 300, alpha: 0, duration: 750, onComplete: () => passenger.destroy() });
    this.tone(260 + this.saved * 2, 0.035, "sine", 0.02);
    this.setMessage(`${this.saved} safely home`);
    this.checkMissionEnd();
  }

  private updateEnemies(time: number) {
    const playerInEnemyTerritory = this.player.x > BARRIER_X;
    const accounted = this.saved + this.lost + this.aboard;
    const intensity = 1 + accounted / 32;

    if (time >= this.nextTankAt && this.activeBarrack < 4) {
      this.spawnTank();
      this.nextTankAt = time + Phaser.Math.Between(4500, 6800) / intensity;
    }
    if (playerInEnemyTerritory && time >= this.nextJetAt && accounted >= 8) {
      this.spawnJet();
      this.nextJetAt = time + Phaser.Math.Between(6200, 9000) / intensity;
    }
    if (time >= this.nextDroneAt && accounted >= 32) {
      this.spawnDrone();
      this.nextDroneAt = time + Phaser.Math.Between(9000, 13000) / intensity;
    }

    for (const tank of this.tanks.getChildren() as Phaser.Physics.Arcade.Sprite[]) {
      if (!tank.active) continue;
      const body = tank.body as Phaser.Physics.Arcade.Body;
      const targetX = this.player.active && playerInEnemyTerritory ? this.player.x : this.barracks[Math.min(this.activeBarrack, 3)].x;
      body.setVelocityX(Math.sign(targetX - tank.x) * 38);
      tank.setFlipX(body.velocity.x < 0);
      const distance = Math.abs(targetX - tank.x);
      if (distance < 660 && time >= Number(tank.getData("fireAt"))) {
        this.fireEnemyProjectile(tank.x, tank.y - 12, targetX, playerInEnemyTerritory ? this.player.y : GROUND_Y - 18, "shell", 260, false);
        tank.setData("fireAt", time + Phaser.Math.Between(1700, 2800));
      }
      if (tank.x < BARRIER_X + 80) body.setVelocityX(Math.abs(body.velocity.x));
    }

    for (const jet of this.jets.getChildren() as Phaser.Physics.Arcade.Sprite[]) {
      if (!jet.active) continue;
      if (!jet.getData("fired") && Math.abs(jet.x - this.player.x) < 650) {
        jet.setData("fired", true);
        this.fireEnemyProjectile(jet.x, jet.y + 6, this.player.x, this.player.y, "missile", 330, true);
      }
      if (jet.x < -120 || jet.x > WORLD_WIDTH + 120) jet.destroy();
    }

    for (const drone of this.drones.getChildren() as Phaser.Physics.Arcade.Sprite[]) {
      if (!drone.active || !this.player.active) continue;
      this.physics.moveToObject(drone, this.player, 120 + accounted * 0.5);
      drone.rotation += 0.055;
    }
  }

  private spawnTank() {
    const target = this.barracks[Math.min(this.activeBarrack, 3)]?.x ?? BARRACK_X[3];
    const x = Phaser.Math.Clamp(target + Phaser.Math.Between(-420, 420), BARRIER_X + 140, WORLD_WIDTH - 100);
    const tank = this.tanks.create(x, GROUND_Y - 15, "tank") as Phaser.Physics.Arcade.Sprite;
    tank.setDepth(11).setData("fireAt", this.time.now + Phaser.Math.Between(900, 1800));
    (tank.body as Phaser.Physics.Arcade.Body).setAllowGravity(false).setSize(54, 25).setOffset(4, 5);
  }

  private spawnJet() {
    const fromRight = Phaser.Math.Between(0, 1) === 1;
    const camera = this.cameras.main;
    const x = Phaser.Math.Clamp(fromRight ? camera.scrollX + GAME_WIDTH + 100 : camera.scrollX - 100, 50, WORLD_WIDTH - 50);
    const jet = this.jets.create(x, Phaser.Math.Between(165, 390), "jet") as Phaser.Physics.Arcade.Sprite;
    jet.setDepth(13).setFlipX(!fromRight).setData("fired", false);
    const body = jet.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false).setVelocityX(fromRight ? -310 : 310).setSize(66, 22).setOffset(5, 4);
  }

  private spawnDrone() {
    const camera = this.cameras.main;
    const x = Phaser.Math.Clamp(camera.scrollX + GAME_WIDTH + 60, BARRIER_X + 80, WORLD_WIDTH - 80);
    const drone = this.drones.create(x, Phaser.Math.Between(150, 420), "drone") as Phaser.Physics.Arcade.Sprite;
    drone.setDepth(14);
    (drone.body as Phaser.Physics.Arcade.Body).setAllowGravity(false).setCircle(15, 3, 3);
    this.setMessage("Warning · homing drone detected");
  }

  private fireEnemyProjectile(x: number, y: number, targetX: number, targetY: number, texture: "shell" | "missile", speed: number, homing: boolean) {
    const projectile = this.enemyBullets.get(x, y, texture) as Phaser.Physics.Arcade.Sprite | null;
    if (!projectile) return;
    projectile.setActive(true).setVisible(true).setDepth(15).setData({ expires: this.time.now + 4200, homing });
    const body = projectile.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.setAllowGravity(false);
    this.physics.moveTo(projectile, targetX, targetY, speed);
    projectile.setRotation(Math.atan2(body.velocity.y, body.velocity.x));
  }

  private updateProjectiles(time: number) {
    const cleanGroup = (group: Phaser.Physics.Arcade.Group) => {
      for (const child of group.getChildren() as Phaser.Physics.Arcade.Sprite[]) {
        if (!child.active) continue;
        if (time > Number(child.getData("expires")) || child.y > GROUND_Y + 16 || child.x < -40 || child.x > WORLD_WIDTH + 40) {
          if (child.y > GROUND_Y - 30 && group === this.enemyBullets) this.explosion(child.x, GROUND_Y - 4, 0xff5c46, 0.4);
          child.destroy();
          continue;
        }
        if (group === this.enemyBullets && child.getData("homing") && this.player.active) {
          const body = child.body as Phaser.Physics.Arcade.Body;
          const desired = new Phaser.Math.Vector2(this.player.x - child.x, this.player.y - child.y).normalize().scale(8);
          body.velocity.add(desired).limit(350);
          child.rotation = Math.atan2(body.velocity.y, body.velocity.x);
        }
      }
    };
    cleanGroup(this.playerBullets);
    cleanGroup(this.enemyBullets);
  }

  private hitEnemy(
    bulletObject: CollisionObject,
    enemyObject: CollisionObject,
    toneFrequency: number,
  ) {
    const bullet = bulletObject as Phaser.Physics.Arcade.Sprite;
    const enemy = enemyObject as Phaser.Physics.Arcade.Sprite;
    if (!enemy.active) return;
    const x = enemy.x;
    const y = enemy.y;
    bullet.destroy();
    enemy.destroy();
    this.explosion(x, y, 0xf3a23a, 1);
    this.tone(90 + toneFrequency, 0.12, "sawtooth", 0.03);
  }

  private crashHelicopter(reason: string) {
    if (!this.player?.active || this.time.now < this.invulnerableUntil || this.phase !== "playing") return;
    const x = this.player.x;
    const y = this.player.y;
    this.player.setActive(false).setVisible(false);
    (this.player.body as Phaser.Physics.Arcade.Body).enable = false;
    this.explosion(x, y, 0xff5c46, 2.1);
    this.tone(58, 0.45, "sawtooth", 0.05);
    this.lives -= 1;
    if (this.aboard > 0) {
      this.lost += this.aboard;
      this.aboard = 0;
    }
    this.setMessage(`${reason} · ${this.lives} aircraft remaining`);
    if (this.lives <= 0) {
      this.finishMission("lost");
      return;
    }
    this.time.delayedCall(1650, () => {
      if (this.phase !== "playing") return;
      this.player.setPosition(365, GROUND_Y - 34).setActive(true).setVisible(true);
      const body = this.player.body as Phaser.Physics.Arcade.Body;
      body.enable = true;
      body.setVelocity(0, 0).setAcceleration(0, 0);
      this.sideFacing = "right";
      this.setFacing("right");
      this.flightTilt = 0;
      this.player.setAngle(0);
      this.isLanded = true;
      this.invulnerableUntil = this.time.now + 1800;
      this.setMessage("Replacement aircraft ready");
    });
  }

  private checkMissionEnd() {
    const accounted = this.saved + this.lost + this.aboard;
    const fieldRemaining = this.barracks.reduce((sum, barrack) => sum + barrack.remaining, 0);
    if (this.saved === 64) {
      this.finishMission("won");
    } else if (accounted === 64 && this.aboard === 0 && fieldRemaining === 0) {
      this.finishMission("lost");
    }
  }

  private finishMission(result: "won" | "lost") {
    if (this.phase === "won" || this.phase === "lost") return;
    this.phase = result;
    this.physics.pause();
    this.setMessage(result === "won" ? "THE END · 64 safely home" : `Mission closed · ${this.saved} saved`);
    if (result === "won") {
      [262, 330, 392, 523].forEach((frequency, index) => this.tone(frequency, 0.18, "square", 0.025, index * 0.13));
    } else this.tone(74, 0.5, "sawtooth", 0.035);
  }

  private explosion(x: number, y: number, color: number, scale = 1) {
    const sparks = this.add.graphics().setDepth(40);
    sparks.fillStyle(color, 0.95).fillCircle(0, 0, 9).fillStyle(0xffedb0, 0.9).fillCircle(0, 0, 4);
    sparks.setPosition(x, y).setScale(0.3);
    this.tweens.add({
      targets: sparks,
      scaleX: 3.2 * scale,
      scaleY: 3.2 * scale,
      alpha: 0,
      duration: 330,
      ease: "Cubic.Out",
      onComplete: () => sparks.destroy(),
    });
  }

  private setMessage(message: string) {
    this.message = message;
    this.emitReport();
  }

  private emitReport() {
    const report: MissionReport = {
      phase: this.phase,
      lost: this.lost,
      aboard: this.aboard,
      saved: this.saved,
      lives: this.lives,
      message: this.message,
    };
    const serialized = JSON.stringify(report);
    if (serialized === this.lastReport) return;
    this.lastReport = serialized;
    this.onReport(report);
  }

  private tone(frequency: number, duration: number, type: OscillatorType, volume: number, delay = 0) {
    const context = this.controls.audio;
    if (!context || this.controls.muted || context.state === "closed") return;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }
}

export function createLifelineGame(parent: HTMLElement, controls: MissionControls, onReport: ReportHandler) {
  const scene = new MissionScene(controls, onReport);
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: "#0b1a2c",
    pixelArt: true,
    antialias: false,
    render: { roundPixels: true },
    physics: {
      default: "arcade",
      arcade: { gravity: { x: 0, y: 0 }, debug: false },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene,
  });
}
