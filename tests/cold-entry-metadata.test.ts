import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const layout = fs.readFileSync('app/layout.tsx', 'utf8');
const og = fs.readFileSync('app/api/og/route.tsx', 'utf8');

test('cold social metadata carries the same curiosity loop as the public hero', () => {
  assert.match(layout, /Wiesz, co Ci psuje formę\? Sprawdźmy, czy masz rację\. \| Diagnostyka 168/);
  assert.match(layout, /co w Twoim tygodniu najbardziej Ci ją zabiera i od czego zacząć w najbliższe 3 dni/);
  assert.match(layout, /https:\/\/diagnostyka\.talerzihantle\.com\/api\/og/);
  assert.doesNotMatch(layout, /\/og\.png/);
});

test('public OG never invents a fracture time for a cold visitor', () => {
  assert.match(og, /const rawG = searchParams\.get\('g'\)/);
  assert.match(og, /if \(!g\)/);
  assert.match(og, /TY OBSTAWIASZ/);
  assert.match(og, /TWÓJ TYDZIEŃ MÓWI/);
  assert.doesNotMatch(og, /\|\| '22:47'/);
});
