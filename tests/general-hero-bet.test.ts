import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// 2026-10-14 hero A: drzwi general stawiaja zaklad ("czy masz racje?"), ktory zamyka
// istniejace pytanie `prediction` + prediction_gap w wyniku + test 72h.
const copy = fs.readFileSync('app/lib/entry-copy.ts', 'utf8');
const page = fs.readFileSync('app/diagnoza/page.tsx', 'utf8');
const layout = fs.readFileSync('app/layout.tsx', 'utf8');
const og = fs.readFileSync('app/api/og/route.tsx', 'utf8');
const general = copy.match(/general: \{([\s\S]*?)\n  \}/)?.[1] ?? '';

test('general door opens a bet loop the result can close', () => {
  assert.match(general, /headline: 'Wiesz, co Ci psuje formę\?'/);
  assert.match(general, /accent: 'Sprawdźmy, czy masz rację\.'/);
  assert.match(general, /Obstaw, co z tego zabiera Ci najwięcej\./);
  assert.match(general, /Na końcu zobaczysz, czy Twoje odpowiedzi mówią to samo\./);
  assert.match(general, /proof: 'Do tego jeden ruch na 3 dni, który rozstrzygnie, kto ma rację\.'/);
  assert.match(general, /cta: 'Sprawdzam, czy mam rację'/);
  assert.doesNotMatch(general, /Ile dni w tygodniu jesteś w formie/);
});

test('the promised bet exists in the product before behavioural questions', () => {
  const cfg = fs.readFileSync('app/lib/assessment-config.ts', 'utf8');
  assert.match(cfg, /Obstaw, zanim policzymy/);
});

test('hit and th2 keep their own proof line, page renders accent and proof from copy', () => {
  for (const door of ['hit', 'th2']) {
    const block = copy.match(new RegExp(`${door}: \\{([\\s\\S]*?)\\n  \\}`))?.[1] ?? '';
    assert.match(block, /proof: 'Porównasz swoje podejrzenie z resztą odpowiedzi i dostaniesz jeden ruch do sprawdzenia przez 3 dni\.'/);
    assert.doesNotMatch(block, /accent:/);
  }
  assert.match(page, /entry\.accent/);
  assert.match(page, /entry\.proof/);
  assert.doesNotMatch(page, /<strong[^>]*>Porównasz swoje podejrzenie/);
});

test('social metadata and OG carry the new general headline', () => {
  assert.match(layout, /title: 'Wiesz, co Ci psuje formę\? Sprawdźmy, czy masz rację\. \| Diagnostyka 168'/);
  assert.doesNotMatch(layout, /Ile dni w tygodniu jesteś w formie/);
  assert.match(og, /TY OBSTAWIASZ/);
  assert.doesNotMatch(og, /Ile dni w tygodniu jesteś w formie/);
});

test('hero copy stays inside voice rules', () => {
  const text = general + (layout.match(/title: '([^']*)'/)?.[1] ?? '');
  assert.doesNotMatch(text, /—|naprawdę|, i /);
  assert.doesNotMatch(text, /To nie .*, to /);
});
