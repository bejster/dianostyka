import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const route = readFileSync(new URL('../app/api/lead-notify/route.ts', import.meta.url), 'utf8');
const diagnosis = readFileSync(new URL('../app/diagnoza/page.tsx', import.meta.url), 'utf8');
const legacy = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');

test('endpoint blokuje puste payloady PRZED wysyłką na Telegram', () => {
  assert.match(route, /invalidDiagnosticFields\(b\?\.answers\)/);
  assert.match(route, /status: 422/);
  assert.match(route, /const raw = b!\.answers/);
  assert.match(route, /const sc = score\(D\)/);
  assert.doesNotMatch(route, /const score = Number\(b\.score\)/);
});
test('formularz przesyła odpowiedzi, nie wynik kwalifikacji do podpisania w przeglądarce', () => {
  assert.match(diagnosis, /JSON\.stringify\(\{ answers: raw \}\)/);
  assert.doesNotMatch(diagnosis, /budget_proxy: q\.budgetProxy/);
});
test('anonimowy wynik nie jest rekordem w unified-leads i nie jest eventem Meta Lead', () => {
  assert.doesNotMatch(legacy, /webhook\/unified-leads/);
  assert.match(legacy, /fbqTrack\('ViewContent'/);
});
test('notyfikacja ma realny kontakt i własne słowa, bez sztucznego budżetu', () => {
  assert.match(route, /cleanInstagram\(raw\.instagram\)/);
  assert.match(route, /statedProblem/);
  assert.doesNotMatch(route, /budzet_proxy|budget_proxy|Budżet na usługę/);
});
