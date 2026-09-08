import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const result = fs.readFileSync('app/components/ResultExperience.tsx', 'utf8');
const bank = fs.readFileSync('app/lib/experiment-bank.ts', 'utf8');
const page = fs.readFileSync('app/diagnoza/page.tsx', 'utf8');

test('V4 renders a real Mapa 168 visual from existing five-axis data', () => {
  assert.match(page, /statuses=\{statuses\}/);
  assert.match(result, /Mapa 168/);
  assert.match(result, /className="rx-radar"/);
  assert.match(result, /className="rx-axis-track"/);
  assert.match(result, /Indeks powstaje wyłącznie z Twoich odpowiedzi/);
});

test('72h module is visual and public experiment names are Polish', () => {
  assert.match(result, /className="rx-72line"/);
  for (const token of ['FALLBACK MEAL','DECISION LOCK','WORK SHUTDOWN','PARKING LOT','ENERGY MAP','WAKE WINDOW']) {
    assert.doesNotMatch(bank, new RegExp(token, 'i'), `public English label leaked: ${token}`);
  }
});