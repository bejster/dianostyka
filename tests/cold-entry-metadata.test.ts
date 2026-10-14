import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const layout = fs.readFileSync('app/layout.tsx', 'utf8');
const og = fs.readFileSync('app/api/og/route.tsx', 'utf8');

test('cold social metadata carries the same curiosity loop as the public hero', () => {
  assert.match(layout, /Cały dzień się pilnujesz, a wieczorem i tak pękasz\? \| Diagnostyka 168/);
  assert.match(layout, /Zobacz, gdzie to się u Ciebie zaczyna i jaki ruch sprawdzić w najbliższe 3 dni/);
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
