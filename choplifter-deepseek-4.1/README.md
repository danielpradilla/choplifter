# Choplifter, web clone

A playable browser clone of Broderbund's *Choplifter!* (Dan Gorlin, 1982), built with
Phaser 3, Vite and TypeScript.

All sprites are drawn procedurally into Phaser textures at boot and all sound is synthesized
with the Web Audio API, so the project has no external asset dependencies and runs offline.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + bundle into dist/
npm run preview    # serve the production bundle
```

If `NODE_ENV=production` is set in the shell, npm omits devDependencies and Vite and
TypeScript will not install. Use `npm install --include=dev` in that case.

## Controls

| Input | Action |
| --- | --- |
| Arrow keys or WASD | Move left/right; up thrusts, down dives |
| Space or J | Fire. A missile when facing left or right, a bomb when facing the camera |
| Shift or K | Rotate 90 degrees |
| P or Esc | Pause |
| M | Mute |
| Enter | Start or restart |

On touch devices an on-screen d-pad and fire/rotate buttons appear over the canvas.

Orientation cycles right, front, left, front, so each rotate press is a 90-degree step.

## Rules implemented

Taken from the original Apple II manual and the StrategyWiki reference.

- 64 hostages are held in 4 barracks of 16. One barrack starts already blown open and
  burning, with its hostages running loose.
- Land next to loose hostages and they board, up to a 16-seat capacity. Landing on a hostage
  kills it. Landing on the helipad disembarks everyone aboard; each rescued hostage walks to
  the post office. The score is hostages returned, maximum 64.
- You have 3 choppers. The game ends when the third is lost, or when all 64 hostages have
  been rescued or killed.
- Facing left or right fires a missile. Facing the camera drops a bomb, which is the only way
  to hit ground targets. One bomb hit opens a sealed barrack; the manual warns that firing
  more than one shot can kill the hostages as they emerge, and that is modelled.
- Tanks: ground vehicles that kill hostages, destroy a landed chopper, and blast sealed
  barracks open. They cannot cross the frontier and cannot reach the post office area, so the
  base is safe from ground fire.
- Jets: appear after the first delivery. They attack at the altitude the chopper held when
  they entered, carry two air-to-air missiles each, cannot cross the frontier, and only
  strafe a grounded chopper in the later rounds.
- Drone air mines: appear after the second delivery. They home in on the chopper, drop bombs
  on loose hostages once most hostages are accounted for, and are the only enemy that can
  cross into home territory.
- Losing a chopper kills the hostages aboard.

## Differences from the original

- Fixed 960x540 view with a horizontally scrolling 2560-wide battlefield, driven by keyboard
  or touch instead of a joystick.
- Player bombs and enemy shells can kill hostages, including friendly fire, which follows the
  manual's warning about firing repeatedly at a barrack.
- All art and audio are original procedural placeholder work. No Broderbund assets are used.

## Layout

```
index.html                 canvas host, page shell, touch controls
src/main.ts                Phaser game configuration and boot
src/config/constants.ts    world size, layout, tuning values, palette keys
src/systems/               textures, terrain, input, audio
src/entities/              helicopter, hostage, barrack, tank, jet, mine, projectile
src/scenes/                boot, title, game, hud, game over
```

In development builds `window.__choplifter` exposes the active game scene for automated
testing. It is stripped from production builds.
