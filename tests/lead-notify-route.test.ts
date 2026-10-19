import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const route = readFileSync(new URL('../app/api/lead-notify/route.ts', import.meta.url), 'utf8');

test('endpoint odrzuca niekompletną sesję PRZED zapisem w CRM i Telegramem', () => {
  assert.match(route, /invalidDiagnosticFields\(b\.raw_answers\)/);
  assert.match(route, /status: 422/);
  const guard = route.indexOf('incomplete_lead');
  assert.ok(guard > 0 && guard < route.indexOf('MAKE_DIAGNOSTYKA_WEBHOOK'), 'walidacja musi być przed Make');
  assert.ok(guard < route.indexOf('api.telegram.org'), 'walidacja musi być przed Telegramem');
});

test('anonimowy wynik nie wywołuje alertu sprzedażowego', () => {
  const anon = route.indexOf("reason: 'anonymous'");
  assert.ok(anon > 0, 'brak bramki anonimowej');
  assert.match(route, /if \(!validInstagram\(b\.instagram\)\)/);
  assert.ok(anon < route.indexOf('api.telegram.org'), 'bramka anonimowa musi być przed Telegramem');
});

test('notyfikacja bez sztucznego budżetu', () => {
  assert.doesNotMatch(route, /budzet_proxy|budget_proxy|Budżet na usługę/);
});
