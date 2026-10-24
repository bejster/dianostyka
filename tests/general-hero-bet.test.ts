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
  // 2026-10-14 hero B (/pp 14A 4/4): tozsamosc + emocja (pilnujesz sie / pekasz),
  // ciekawosc (zaczyna sie wczesniej), stawka (miesiace naprawiania nie tego miejsca),
  // obietnica = ekran wyniku (Gdzie zaczynasz + Pierwszy ruch 72h).
  assert.match(general, /headline: 'W robocie dowozisz\. A po pracy nie masz już siły na siebie\?'/);
  assert.match(general, /accent: 'A jeśli sypie się dużo wcześniej\?'/);
  assert.match(general, /Siemano :D Zrobiłem Mapę 168/);
  assert.match(general, /możesz od miesięcy naprawiać nie ten moment/);
  assert.match(general, /proof: 'Obstaw przyczynę\. Zestawię ją z odpowiedziami i dam test na 72 godziny\.'/);
  assert.match(general, /cta: 'Dobra, sprawdzam swój tydzień'/);
  assert.doesNotMatch(general, /Wiesz, co Ci psuje formę/);
  assert.doesNotMatch(general, /headline: '[^']*\s(a|i|w|z) [^']*'/);
  assert.doesNotMatch(general, /Ile dni w tygodniu jesteś w formie/);
});

test('general hero body stays short on mobile (max 30 words under the headline)', () => {
  // 2026-10-14 Michal: 58 slow pod naglowkiem = sciana tekstu na telefonie.
  const body = general.match(/body: '([^']*)'/)?.[1] ?? '';
  const proof = general.match(/proof: '([^']*)'/)?.[1] ?? '';
  const words = (body + ' ' + proof).trim().split(/\s+/).length;
  assert.ok(words <= 30, `pod naglowkiem ${words} slow`);
});

test('the promised bet exists in the product before behavioural questions', () => {
  const cfg = fs.readFileSync('app/lib/assessment-config.ts', 'utf8');
  assert.match(cfg, /Obstaw, zanim policzymy/);
});

test('hit and th2 keep their own proof line, page renders accent and proof from copy', () => {
  for (const door of ['hit', 'th2']) {
    const block = copy.match(new RegExp(`${door}: \\{([\\s\\S]*?)\\n  \\}`))?.[1] ?? '';
    assert.match(block, /proof: '[^']+test na 72 godziny\.'|proof: '[^']+jeden test na 72 godziny\.'/);
    assert.doesNotMatch(block, /accent:/);
  }
  assert.match(page, /entry\.accent/);
  assert.match(page, /entry\.proof/);
  assert.doesNotMatch(page, /<strong[^>]*>Porównasz swoje podejrzenie/);
});

test('social metadata and OG carry the new general headline', () => {
  assert.match(layout, /title: 'Mapa 168\. Sprawdź, gdzie zaczyna się sypać Twój tydzień/);
  assert.doesNotMatch(layout, /Ile dni w tygodniu jesteś w formie/);
  assert.match(og, /TY OBSTAWIASZ/);
  assert.doesNotMatch(og, /Ile dni w tygodniu jesteś w formie/);
});

test('hero copy stays inside voice rules', () => {
  const text = general + (layout.match(/title: '([^']*)'/)?.[1] ?? '');
  assert.doesNotMatch(text, /—|naprawdę|, i /);
  assert.doesNotMatch(text, /To nie .*, to /);
  assert.doesNotMatch(general, /\b(chciałeś|sam |obstawiłeś|miałeś)/i);
});
