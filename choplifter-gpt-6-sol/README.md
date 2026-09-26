# Choplifter! browser tribute

A playable, original-art tribute to Dan Gorlin's 1982 Apple II game, built with Phaser 4 and Vite.

```sh
npm install
npm run dev
```

Open the local URL Vite prints. `npm test` checks the 64-person mission accounting and 16-seat limit; `npm run build` creates `dist/`.

**Controls:** arrows or WASD to fly, X to turn right → front → left, Space to fire, P to pause, M to mute. Touch controls appear on narrow screens. Face front to drop bombs on tanks; face sideways to shoot jets and open barracks.

The game keeps the original rescue loop: 64 hostages in four barracks, 16 seats, landing to board and unload, and three helicopters. It uses code-drawn graphics and synthesized effects; no original game assets are included.

Research: [Apple II full playthrough](https://www.youtube.com/watch?v=2KDxRSeDKy8) and [Atari's Choplifter manual](https://atariage.com/manual_html_page.php?SoftwareID=2121), which documents the shared core rules and enemy types.
