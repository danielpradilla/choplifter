# Choplifter '82

A playable tribute to Dan Gorlin's *Choplifter* (Brøderbund, Apple II, 1982), built with [Phaser 4](https://phaser.io) (4.2.1).

Open `index.html` in a browser. It needs an internet connection, because Phaser and the Silkscreen font load from CDNs.

There's also a hosted copy at https://claude.ai/artifact/EWxHgXwfWwSXYaXERvV9Tf (private until shared). Click the game first so it gets keyboard focus.

## Controls

| Key | Action |
|---|---|
| Arrows / WASD | Fly |
| Z / Space | Fire |
| X / Shift | Tap: face front (the only way to hit tanks). Hold: reverse direction |
| P / Esc | Pause |
| M | Sound on/off |

A gamepad works too.

## Gameplay

These rules come from the original 1982 Apple II manual:

- 64 hostages are held in 4 barracks, 16 in each. One barracks is already blown open at the start; shoot the others open.
- The helicopter seats 16, and you get 3 helicopters.
- The counters are the manual's red/blue/green "lemons" for killed, aboard and rescued.
- Tapping the turn button faces the helicopter front, which is the only way to hit tanks. Holding it reverses direction.
- Landing on hostages kills them. When the helicopter is full, the rest wave you off.
- Tanks shoot you when you're low or on the ground.
- Jets appear after your first trip home. They grow out of the background, then fire missiles, or bomb you if you're landed.
- Homing air mines appear after the second trip and follow you right up to the post office.
- The game ends with "THE END" and your totals.

## How it's built

The whole game is in `game.js` (882 lines). `index.html` is a 35-line page that holds the canvas and the controls legend. The only outside pieces are Phaser and the Silkscreen font.

It fits in one file because there are no asset files. Everything is generated when the game starts:

- **Sprites** are text grids at the top of the file, one character per pixel (`W` for white, `B` for blue, and so on). For example, a hostage looks like `'..W..', '.WWW.', 'W.W.W', ...`. At startup each grid is painted onto a small canvas and turned into a texture.
- **Buildings** (barracks, post office, flag) are drawn with a few rectangle-fill calls.
- **Scenery** (mountains, hills, stars, ground, fence) is random shapes drawn with Phaser's graphics tools, so it changes slightly every game.
- **Sound** is synthesized live with the browser's Web Audio API. The rotor is filtered noise switched on and off about 10 times a second. Gunfire and explosions are short tones and noise bursts.
- **Game logic** is ordinary code: position, speed, simple distance checks for hits, and a small state for each hostage (milling around, waving, running, boarding, dead).

The file runs top to bottom:

| Lines | Section |
|---|---|
| 26 | `ART`: all sprite pixel grids |
| 133 | `makeTextures`: turns the grids into textures |
| 162 | `Sfx`: sound synthesizer |
| 227 | `Chop` scene: world setup |
| 333 | Chopper: flying, turning, firing, landing, crashing |
| 488 | Hostages |
| 567 | Enemies: tanks, jets, air mines |
| 685 | Projectiles and hit checks |
| 735 | Heads-up display, title/end screens, main update loop |

The 1982 original was even smaller: about 48K of memory on an Apple II, for the whole game including graphics and sound.

## Research notes

The mechanics come from the original manual and written descriptions of the game. The Apple II longplay video listed under Sources couldn't be watched: fetching YouTube only returns the page title.

Where the sources were vague, these were judgment calls:

- The exact firing angles when facing front.
- How fast jets and mines ramp up with each trip.
- Tanks running over hostages.

The manual says each barracks must be emptied before the next can be opened. That rule isn't enforced, since other descriptions have several barracks open at once.

## Testing

The game was tested in a headless browser by driving it directly. These all worked:

- Takeoff, boarding (11 aboard), unloading at the post office, and trips raising the difficulty.
- Shooting a barracks open and killing a tank from the front-facing position.
- Jets and air mines.
- Losing all three helicopters, the everyone-accounted-for ending, and restart.
- Tap vs. hold turning.

There were no console errors. `game.js` checks every frame that the hostage counts add up to 64, and that check never failed. Testing showed jets were too fast to react to, so their approach and their missiles were slowed down.

## Not built

- Touch controls for phones. Only keyboard and gamepad work; phones would need on-screen buttons.
- A saved high score.

## Sources

- [Choplifter Apple II manual (Internet Archive)](https://archive.org/stream/ChoplifterManualAppleII/Choplifter%20Manual%20Apple%20II_djvu.txt)
- [Choplifter – Wikipedia](https://en.wikipedia.org/wiki/Choplifter)
- [The Digital Antiquarian: Choplifter](https://www.filfre.net/2012/08/choplifter/)
- [Apple II Longplay – Choplifter (YouTube)](https://www.youtube.com/watch?v=2KDxRSeDKy8)
