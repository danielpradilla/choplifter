# choplifter-5.3

Web clone of a 1982 Choplifter-style gameplay loop built with Phaser.

## Run

Open `index.html` in a browser.

## Controls

- Arrow keys: Move helicopter.
- Space: Fire.
- Z: Rotate weapon orientation (left / forward / right).
- R: Restart after win/lose.
- On touch devices, use the on-screen controls at the bottom for move, rotate, fire, and restart.
- Short tone-based SFX are generated in-browser for shooting, enemy kills, damage, and win/lose events.

## Mechanics implemented

- 4 barracks in hostile territory, 16 hostages each (64 total).
- Rescue and carry up to 16 hostages per trip.
- Deliver hostages to the base/post-office pad on the right.
- 3 lives (helicopters).
- Enemy progression: tanks from start, jets after first delivery, mines after second.
