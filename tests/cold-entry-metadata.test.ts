import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const layout = fs.readFileSync('app/layout.tsx', 'utf8');
const og = fs.readFileSync('app/api/og/route.tsx', 'utf8');

test('cold social metadata carries the same curiosity loop as the public hero', () => {
  assert.match(layout, /Sprawdź, gdzie sypie Ci się tydzień/);
  assert.match(layout, /Zaznacz sen, energię, trening, wieczorne jedzenie i weekend/);
  assert.match(layout, /https:\/\/diagnostyka\.talerzihantle\.com\/api\/og/);
  assert.doesNotMatch(layout, /\/og\.png/);
});

test('public OG never invents a fracture time for a cold visitor', () => {
  assert.match(og, /const rawG = searchParams\.get\('g'\)/);
  assert.match(og, /if \(!g\)/);
  assert.match(og, /Wiesz, jak jeść i trenować\. Sprawdź, gdzie sypie Ci się tydzień\./);
  assert.match(og, /Sen, energia, trening, jedzenie i weekend/);
  assert.doesNotMatch(og, /\|\| '22:47'/);
});
