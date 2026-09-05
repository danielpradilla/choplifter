# Lifeline ’82

A playable browser rescue game inspired by the original 1982 *Choplifter!*.
The implementation, visual identity, procedural pixel art, and sound are original.

## Play

- Fly with arrow keys or `WASD`.
- Rotate between side and ground-attack views with `X` or `Shift`.
- Fire with `Space`.
- Pause with `P` and toggle sound with `M`.
- Touch controls appear on smaller screens.

Free each group of 16 captives, land nearby to board them, and return to the
striped home pad. The helicopter carries 16 people and the mission provides
three aircraft. Tanks, jets, and homing drones become more aggressive as the
rescue proceeds.

## Development

```bash
npm install
npm run dev
npm test
```

The game uses React, Vinext, Phaser, and the Cloudflare Workers-compatible
Sites runtime.
