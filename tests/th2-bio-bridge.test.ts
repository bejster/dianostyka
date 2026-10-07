import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const PAGE = fs.readFileSync('app/diagnoza/page.tsx', 'utf8');
const ROUTE = fs.readFileSync('app/api/lead-notify/route.ts', 'utf8');
const CLEAN_ROUTE = fs.readFileSync('app/rozjazd/page.tsx', 'utf8');

test('TH2 ma osobny front door, ale ten sam silnik diagnostyki', () => {
  assert.match(PAGE, /th2: 'Talerz i Hantle · 5 min · wynik od razu'/);
  assert.match(PAGE, /door === 'th2'/);
  assert.match(PAGE, /Ile dni wracasz do siebie <em[^>]*>po weekendzie\?<\/em>/);
  assert.doesNotMatch(PAGE, /Weekend nie zawsze|Często tylko pokazuje|problem naprawdę się zaczyna/);
  assert.match(PAGE, /gdzie problem się zaczyna, co płacisz/);
  assert.match(PAGE, /Pokaż mi, gdzie zaczyna się rozjazd/);
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
  assert.match(PAGE, /th2_bridge_v1/);
  assert.ok(!PAGE.includes("mode: 'th2'"), 'TH2 nie może tworzyć osobnego scoringu');
  assert.match(PAGE, /human_leverage_v2/);
});

test('publiczny link TH2 ma czysty slug i ukrywa techniczne parametry', () => {
  assert.match(CLEAN_ROUTE, /export \{ default \} from '\.\.\/diagnoza\/page'/);
  assert.match(PAGE, /window\.location\.pathname === '\/rozjazd'/);
  assert.match(PAGE, /\?door=th2&src=organic&campaign=th2_bio_v1/);
});

test('/rozjazd ma własny title i OG, nie dziedziczy hero general', () => {
  assert.match(CLEAN_ROUTE, /export const metadata/);
  assert.match(CLEAN_ROUTE, /Gdzie pęka Twój tydzień\?/);
  assert.match(CLEAN_ROUTE, /canonical: 'https:\/\/diagnostyka\.talerzihantle\.com\/rozjazd'/);
  assert.match(CLEAN_ROUTE, /\/api\/og\?v=th2/);
  assert.ok(!CLEAN_ROUTE.includes('Ile dni w tygodniu'), 'TH2 nie może pokazywać OG general');
  const OG = fs.readFileSync('app/api/og/route.tsx', 'utf8');
  assert.match(OG, /searchParams\.get\('v'\) === 'th2'/);
  assert.match(OG, /Gdzie pęka Twój tydzień\?/);
});
