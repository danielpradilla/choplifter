# Choplifter · Rescue Operations

A playable browser recreation of the original 1982 rescue game, built from scratch with Phaser 3.90 and Vite. All game code and artwork live in this folder; no sibling project was inspected or reused.

## Run

```sh
npm install
npm run dev
```

Open the localhost address printed by Vite. `npm run build` produces a static website in `dist/`; `npm run preview` serves that build. Node 22.12+ is recommended. The only remote presentation asset is an optional Google Fonts stylesheet; system fonts work without it.

## Play

| Control | Action |
| --- | --- |
| WASD / arrows | Fly; release to slow into a hover |
| X | Rotate west → forward → east → forward |
| Space | Fire sideways, or downward when facing forward |
| Enter | Start, resume, or play again |
| P / Escape | Pause |
| M | Toggle synthesized sound |

Movement and weapon facing are independent. Touch devices have flight and action buttons. Fullscreen is available in the instrument bar.

Fly west from the post office. The nearest barracks is open. Shoot the other three to release their hostages. Descend vertically beside a group, wait for boarding, and return east to the marked home pad. Capacity is 16. People unload individually. Every delivery counts toward the 64-person rescue record.

Tanks threaten low flight; fighters arrive after the first delivery and homing mines after the second. Mines can cross the border. Bullets, bombs, careless landings, and helicopter destruction can kill hostages. Three lost aircraft or 64 people accounted for ends the mission.

## Research and adaptation

- [Apple II longplay supplied in the brief](https://www.youtube.com/watch?v=2KDxRSeDKy8): six-minute reference played through in the browser; visual observations sampled across sorties, boarding, unloading, and independent helicopter facing.
- [Atari's Choplifter manual](https://www.atariage.com/manual_html_page.php?SoftwareLabelID=614): controls, 64 hostages, 16 seats, three aircraft, the home pad, and the border's limitations. This is a later original-style port, used to corroborate the Apple II footage.
- [MobyGames version comparison](https://www.mobygames.com/game/8127/choplifter/): distinguishes the 1982 rescue design from Sega's later arcade game.
- [Phaser documentation](https://docs.phaser.io/phaser/getting-started/installation): framework setup.

This recreation uses original procedural artwork and synthesized audio. Flight tuning, enemy timing, dusk scenery, radar, touch controls, and saved records are modern adaptations. It does not use the original ROM, sprites, or audio, and does not add the 1985 arcade game's fuel system or extra environments.

## Check

```sh
npm test
npm run build
```

The deterministic simulation check flies four rescue trips for 64/64, bombs the closed camps, and checks capacity, casualties, respawn, defeat, enemy escalation, homing, and projectile collision. Enemy spawning is disabled only during the rescue-route assertion; combat is checked separately. Browser checks cover rendering, launch, keyboard lift and rotation, pause/resume, sound controls, the manual, and narrow-screen layout.
