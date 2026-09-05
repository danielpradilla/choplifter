// Package existing games for a static host without editing their source folders.
import assert from 'node:assert/strict';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('.', import.meta.url));
const output = resolve(process.argv[2] || '/tmp/choplifter-stage');
assert(!output.startsWith(root), 'Use a staging directory outside the source tree');
await mkdir(output, { recursive: true });
for (const file of ['index.html', 'styles.css', 'PROMPT.md', 'images']) {
  await cp(resolve(root, file), resolve(output, file), { recursive: true });
}
for (const [game, files] of Object.entries({
  'choplifter-5.3': ['index.html'],
  'choplifter-5.4': ['index.html', 'main.js', 'logic.js', 'styles.css'],
})) {
  await mkdir(resolve(output, game), { recursive: true });
  for (const file of files) await cp(resolve(root, game, file), resolve(output, game, file));
}
execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--base=./', `--outDir=${resolve(output, 'choplifter-6-astra')}`], {
  cwd: resolve(root, 'choplifter-6-astra'), stdio: 'inherit',
});

// Sol has no server-side gameplay. Render the existing build once and retain its
// client bundles byte-for-byte; only relocate asset URLs in the exported HTML.
const { default: worker } = await import('./choplifter-5.6-sol/dist/server/index.js');
const response = await worker.fetch(new Request('https://www.danielpradilla.info/', {
  headers: { accept: 'text/html', host: 'www.danielpradilla.info' },
}), { ASSETS: { fetch: async () => new Response('Not found', { status: 404 }) } }, {
  waitUntil() {}, passThroughOnException() {},
});
assert.equal(response.status, 200);
let html = await response.text();
assert(html.includes('Bring every') && html.includes('64 lives are waiting.'));
const sol = resolve(output, 'choplifter-5.6-sol');
await cp(resolve(root, 'choplifter-5.6-sol/dist/client'), sol, { recursive: true });
html = html.replaceAll('/assets/', './assets/').replaceAll('https://www.danielpradilla.info/og.png', 'https://www.danielpradilla.info/projects/choplifter/choplifter-5.6-sol/og.png');
await writeFile(resolve(sol, 'index.html'), html);
assert.equal(await readFile(resolve(output, 'choplifter-5.3/index.html'), 'utf8'), await readFile(resolve(root, 'choplifter-5.3/index.html'), 'utf8'));
console.log(`Staged homepage and four games: ${output}`);
