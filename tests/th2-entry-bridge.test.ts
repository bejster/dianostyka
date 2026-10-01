import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const PAGE = fs.readFileSync('app/diagnoza/page.tsx', 'utf8');
const ROUTE = fs.readFileSync('app/api/lead-notify/route.ts', 'utf8');

test('TH2 ma osobny front door, ale ten sam silnik diagnostyki', () => {
  assert.match(PAGE, /th2: 'Talerz i Hantle · 5 min · wynik od razu'/);
  assert.match(PAGE, /door === 'th2'/);
  assert.match(PAGE, /Weekend nie zawsze jest problemem/);
  assert.match(PAGE, /gdzie tydzień pęka/);
  assert.match(PAGE, /Znajdź mój Punkt Pęknięcia/);
  assert.match(PAGE, /<SingleQuestionFlow onComplete=\{handleComplete\} \/>/);
});

test('TH2 attribution przechodzi do prywatnego handoffu i oferty', () => {
  for (const field of ['entry_door', 'entry_topic', 'entry_variant']) {
    assert.ok(PAGE.includes(field), `brak ${field} w payloadzie diagnostyki`);
    assert.ok(ROUTE.includes(field), `brak ${field} w lead handoffie`);
  }
  assert.match(PAGE, /new URLSearchParams\(\{ from: 'diag', door,/);
  assert.match(ROUTE, /TH2 · Talerz i Hantle/);
  assert.match(ROUTE, /ŹRÓDŁO:/);
});

test('analityka rozróżnia copy TH2 bez zmiany scoringu', () => {
  assert.match(PAGE, /th2_bridge_v1/);
  assert.match(PAGE, /registerContext\(ctx\)/);
  assert.ok(!PAGE.includes("mode: 'th2'"), 'TH2 nie może tworzyć osobnego trybu scoringu');
});
