import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../public/latte-art/', import.meta.url);

test('the drawing studio exposes pen, undo, confirmation, preview, save and return controls', async () => {
  const html = await readFile(new URL('index.html', root), 'utf8');
  for (const id of ['scene', 'width', 'undo', 'clear', 'clearDialog', 'finish', 'preview', 'saveImage', 'editAgain']) {
    assert.ok(html.includes(`id="${id}"`), id);
  }
  assert.doesNotMatch(html, /ランキング|対戦|スコア|報酬/);
});

test('the home exposes the independent latte demo', async () => {
  const home = await readFile(new URL('../public/js/home.js', import.meta.url), 'utf8');
  assert.match(home, /ラテアート.*\/latte-art\/index\.html/);
});

test('drawing controls stay hidden until the studio selects a stage', async () => {
  const html = await readFile(new URL('index.html', root), 'utf8');
  assert.match(html, /<div id="drawControls"[^>]*\bhidden\b/);
});
