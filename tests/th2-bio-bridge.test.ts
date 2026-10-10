import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const PAGE = fs.readFileSync('app/diagnoza/page.tsx', 'utf8');
const ROUTE = fs.readFileSync('app/api/lead-notify/route.ts', 'utf8');
const CLEAN_ROUTE = fs.readFileSync('app/rozjazd/page.tsx', 'utf8');

test('TH2 ma osobny front door, ale ten sam silnik diagnostyki', () => {
  assert.match(PAGE, /th2: 'Talerz i Hantle · 5 min · wynik od razu'/);
  assert.match(PAGE, /resolveEntryDoor/);
  assert.match(PAGE, /ENTRY_COPY/);
  assert.match(PAGE, /<SingleQuestionFlow onComplete=\{handleComplete\} \/>/);
});

test('TH2 source idzie do CRM, operatora i dalej do naboru', () => {
  for (const field of ['entry_door', 'entry_topic', 'entry_variant']) {
    assert.ok(PAGE.includes(field), `brak ${field} w payloadzie`);
    assert.ok(ROUTE.includes(field), `brak ${field} w handoffie`);
  }
  assert.match(ROUTE, /acquisition_channel_json/);
  assert.match(ROUTE, /TH2 → HiT/);
  assert.match(ROUTE, /Źródło:/);
  assert.match(PAGE, /new URLSearchParams\(\{ from: 'diag', door,/);
});

test('TH2 zmienia framing, nie scoring ani tryb produktu', () => {
  assert.match(PAGE, /jj_entry_v3/);
  assert.ok(!PAGE.includes("mode: 'th2'"), 'TH2 nie może tworzyć osobnego scoringu');
  assert.match(PAGE, /human_leverage_v2/);
});

test('publiczny link TH2 ma czysty slug i ukrywa techniczne parametry', () => {
  assert.match(CLEAN_ROUTE, /export \{ default \} from '\.\.\/diagnoza\/page'/);
  assert.match(PAGE, /window\.location\.pathname === '\/rozjazd'/);
  assert.match(PAGE, /\?door=th2&src=organic&campaign=th2_bio_v1/);
});
