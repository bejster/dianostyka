import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const layout = fs.readFileSync('app/layout.tsx', 'utf8');
const og = fs.readFileSync('app/api/og/route.tsx', 'utf8');

test('cold social metadata carries the same curiosity loop as the public hero', () => {
  assert.match(layout, /Gdzie w Twoim tygodniu tracisz najwięcej\?/);
  assert.match(layout, /największy zapas, gdzie zaczyna się rozjazd i co warto ruszyć najpierw/);
  assert.match(layout, /https:\/\/diagnostyka\.talerzihantle\.com\/api\/og/);
  assert.doesNotMatch(layout, /\/og\.png/);
});

test('public OG never invents a fracture time for a cold visitor', () => {
  assert.match(og, /const rawG = searchParams\.get\('g'\)/);
  assert.match(og, /if \(!g\)/);
  assert.match(og, /W poniedziałek ogarniasz\. W piątek znowu to samo\./);
  assert.match(og, /Zobacz, gdzie tracisz najwięcej i co ruszyć najpierw\./);
  assert.doesNotMatch(og, /\|\| '22:47'/);
});
