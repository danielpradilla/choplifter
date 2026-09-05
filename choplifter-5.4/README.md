# Choplifter 5.4

This is a static browser game. Upload the contents of this folder to any normal
web host; there is no Node.js server or build step.

For local testing, serve this folder with any static file server:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000/`.

The Phaser library is loaded from jsDelivr, so the deployed page needs outbound
internet access for that CDN request. For a fully offline copy, download Phaser
and replace the CDN script in `index.html` with the local file.

Controls:

- Arrow keys or WASD: move
- `X`: rotate facing
- `Space`: fire
- `R`: restart after game over

`verify.mjs` is an optional developer-only Node.js rule check. It is not needed
to deploy or play the game.
