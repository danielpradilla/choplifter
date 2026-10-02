# Choplifter

A playable browser reimagining of Dan Gorlin’s 1982 Brøderbund game, using **Phaser 3.90**, original procedural pixel art, and synthesized audio.

## Play locally

```sh
npm install
npm start
```

On this Mac, open **http://127.0.0.1:8090/dev/choplifter-sol-6-1/**. The existing `devserve` service serves the project; no separate development server is needed.

## Controls

| Input | Action |
| --- | --- |
| Arrows / WASD | Fly; release to hover; hold down to land |
| Space | Fire in the direction the helicopter faces |
| X | Toggle forward-facing ground attack |
| Z | Turn left/right independently of movement |
| P / Escape | Pause/resume |
| M | Mute/unmute |
| F | Fullscreen |
| Enter | Start/resume/restart |

Touch controls appear on small screens and touch devices. The game automatically pauses when the window loses focus or the flight manual opens.

## Mission

Rescue 64 hostages from four barracks. The first is open; shoot the other three open. Land in a clear spot nearby and wait while people run aboard. There are 16 seats. Fly right and land on the green home pad to unload; only delivered passengers count as rescued.

You have three helicopters. Tanks attack low aircraft and exposed hostages. Jets arrive after 16 people are rescued, homing mines after 32. Tanks and jets stay behind the friendly border; mines can follow you home. A hit or vehicle collision destroys the helicopter and loses its passengers. Landing on hostages and shooting them also cause casualties. Fuel and ammunition are unlimited. The mission ends after three helicopters or once every hostage is rescued or lost. Best rescue is saved locally when storage is available.

## Build and check

```sh
npm test
npm run test:browser  # Uses the installed agent-browser CLI and the local devserve URL
npm run build
```

`dist/` is a self-contained static site, including Phaser. Serve it from any static web host. It makes no external asset requests. For the browser check against another deployment, set `CHOPLIFTER_URL` to its URL.

The small check covers mission accounting; the browser check covers real keyboard input, pause/resume, flight, automatic boarding and unloading, barracks destruction, ground attack, mine pursuit, passenger loss, respawn, victory, and restart.

## Research

- [Supplied Apple II longplay, reviewed across its full six-minute timeline](https://www.youtube.com/watch?v=2KDxRSeDKy8): right-hand home base, progressive threats, boarding/unloading, a complete 64-person rescue, then the three-sortie failure sequence.
- [Original Brøderbund manual scan](https://mirrors.apple2.org.za/ftp.apple.asimov.net/documentation/games/misc/Choplifter%20Manual.pdf).
- [1982 Brøderbund cartridge instructions](https://archive.org/details/Choplifter_1982_Broderbund): capacity, casualty accounting, three helicopters, forward-facing tank attack, and enemy behavior.
- [Atari 5200 manual](https://atariage.com/manual_html_page.php?SoftwareID=2057): friendly border behavior and the requirement to unload on the pad.
- [Phaser documentation](https://docs.phaser.io/phaser/concepts/game).

The original rescue rules are preserved, with browser-friendly separate controls, hover braking, readable graphics, radar, touch input, and a pause/manual overlay. This is an independent tribute, not an emulator or an official release; it contains no ROM, original artwork, or sampled game audio.
