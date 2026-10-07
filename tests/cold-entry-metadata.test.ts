import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const layout = fs.readFileSync('app/layout.tsx', 'utf8');
const og = fs.readFileSync('app/api/og/route.tsx', 'utf8');

test('cold social metadata carries the same curiosity loop as the public hero', () => {
  assert.match(layout, /Ile dni w tygodniu jesteś w formie\? \| Diagnostyka 168/);
  assert.match(layout, /co w Twoim tygodniu najbardziej Ci ją zabiera i od czego zacząć w najbliższe 3 dni/);
  assert.match(layout, /https:\/\/diagnostyka\.talerzihantle\.com\/api\/og/);
  assert.doesNotMatch(layout, /\/og\.png/);
});

test('public OG never invents a fracture time for a cold visitor', () => {
  assert.match(og, /const rawG = searchParams\.get\('g'\)/);
  assert.match(og, /if \(!g\)/);
  assert.match(og, /Ile dni w tygodniu jesteś w formie\?/);
  assert.match(og, /Zobacz, co najbardziej Ci ją zabiera\./);
  assert.doesNotMatch(og, /\|\| '22:47'/);
});
