import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// 2026-10-14: 0f214ce (jj-bio) wycial metadata /rozjazd i wariant OG th2 razem z testem.
// Link z bio TH2 pokazywal od 10.10 tytul drzwi general. Ten test pilnuje powrotu.
const ROUTE = fs.readFileSync('app/rozjazd/page.tsx', 'utf8');
const OG = fs.readFileSync('app/api/og/route.tsx', 'utf8');

test('/rozjazd ma wlasny title i OG, nie dziedziczy hero general', () => {
  assert.match(ROUTE, /export const metadata/);
  assert.match(ROUTE, /Gdzie pęka Twój tydzień\?/);
  assert.match(ROUTE, /Zobaczysz, gdzie problem się zaczyna i który jeden ruch/);
  assert.match(ROUTE, /canonical: 'https:\/\/168\.talerzihantle\.com\/rozjazd'/);
  assert.match(ROUTE, /\/api\/og\?v=th2/);
  assert.doesNotMatch(ROUTE, /Ile dni w tygodniu|Wiesz, co Ci psuje formę|naprawdę/);
});

test('OG ma wariant th2 obok nowego naglowka general', () => {
  assert.match(OG, /searchParams\.get\('v'\) === 'th2'/);
  assert.match(OG, /if \(th2\)/);
  assert.match(OG, /Gdzie pęka Twój tydzień\?/);
});
