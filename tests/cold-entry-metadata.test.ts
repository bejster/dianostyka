import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const layout = fs.readFileSync('app/layout.tsx', 'utf8');
const og = fs.readFileSync('app/api/og/route.tsx', 'utf8');

test('cold social metadata carries the same curiosity loop as the public hero', () => {
  assert.match(layout, /Mapa 168\. Sprawdź, gdzie zaczyna się sypać Twój tydzień/);
  assert.match(layout, /Obstaw przyczynę\. Mapa 168 daje trop i test na 72 godziny/);
  assert.match(layout, /https:\/\/168\.talerzihantle\.com\/api\/og/);
  assert.doesNotMatch(layout, /\/og\.png/);
});

test('public OG never invents a fracture time for a cold visitor', () => {
  assert.match(og, /const rawG = searchParams\.get\('g'\)/);
  assert.match(og, /if \(!g\)/);
  assert.match(og, /TY OBSTAWIASZ/);
  assert.match(og, /TWÓJ TYDZIEŃ MÓWI/);
  assert.doesNotMatch(og, /\|\| '22:47'/);
});
