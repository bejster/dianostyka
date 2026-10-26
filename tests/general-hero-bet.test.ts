import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const copy = fs.readFileSync('app/lib/entry-copy.ts', 'utf8');
const page = fs.readFileSync('app/diagnoza/page.tsx', 'utf8');
const layout = fs.readFileSync('app/layout.tsx', 'utf8');
const og = fs.readFileSync('app/api/og/route.tsx', 'utf8');
const doors = Object.fromEntries(
  ['general', 'hit', 'th2'].map((name) => [
    name,
    copy.match(new RegExp(`${name}: \\{([\\s\\S]*?)\\n  \\}`))?.[1] ?? '',
  ]),
);
const field = (door: string, key: string) =>
  doors[door]?.match(new RegExp(`${key}: '([^']*)'`))?.[1] ?? '';

test('general: prowokacja dotyka realnego kosztu, ale zostawia możliwość wyjścia', () => {
  assert.match(field('general', 'headline'), /Możesz zamknąć tę stronę/);
  assert.match(field('general', 'accent'), /co tym razem zmienisz od poniedziałku/);
  assert.match(field('general', 'body'), /Siemano :D/);
  assert.match(field('general', 'body'), /w czwartek robota wywala Ci trening/);
  assert.match(field('general', 'body'), /kolejne pół roku/);
  assert.match(field('general', 'proof'), /co ja bym sprawdził jako pierwsze/);
  assert.match(field('general', 'proof'), /72 godziny/);
  assert.match(field('general', 'cta'), /sprawdzam, co mnie trzyma/);
  assert.doesNotMatch(doors.general, /Obstaw winnego|Twój plan działa|Jakby kolejny czwartek/);
});

test('mobile: mówiony tekst w 2 akapitach bez sloganów i bez pogrubienia całego wywodu', () => {
  const b = field('general', 'body');
  const p = field('general', 'proof');
  const words = (b + ' ' + p).trim().split(/\s+/).length;
  assert.ok(words >= 65 && words <= 105, `pod H1 ${words} słów, zakres 65–105`);
  assert.match(page, /className="dx-lede"[\s\S]*?\{entry\.body\}\s*<\/p>/);
  assert.match(page, /className="dx-lede"[\s\S]*?\{entry\.proof\}\s*<\/p>/);
  assert.doesNotMatch(page, /<strong[^>]*>\{entry\.proof\}<\/strong>/);
});

test('obietnica jest sprawdzalna i istnieje w aktualnej ankiecie', () => {
  const cfg = fs.readFileSync('app/lib/assessment-config.ts', 'utf8');
  assert.match(cfg, /Obstaw, zanim policzymy/);
  assert.match(cfg, /break_window/);
  assert.match(page, /entry\.proof/);
  assert.match(page, /entry\.cta/);
  assert.doesNotMatch(doors.general, /na pewno|wykryję prawdziwą przyczynę|wyleczę/i);
});

test('HiT i TH2 mają osobne sceny i nie mieszają swoich problemów', () => {
  assert.match(field('hit', 'headline'), /Na kolejnego calla/);
  assert.match(field('hit', 'body'), /resztki energii/);
  assert.match(field('hit', 'body'), /co zrobisz, kiedy znowu skończysz pracę późno/);
  assert.match(field('hit', 'proof'), /72 godziny/);
  assert.doesNotMatch(doors.hit, /alkohol|używki|narkotyk|impreza/i);
  assert.match(field('th2', 'body'), /Impreza/);
  assert.match(field('th2', 'proof'), /72 godziny/);
  assert.doesNotMatch(doors.hit, /accent:/);
  assert.doesNotMatch(doors.th2, /accent:/);
});

test('metadata i OG pozostają zgodne z bezpieczną obietnicą strony', () => {
  assert.match(layout, /title: 'Mapa 168\. Sprawdź, gdzie zaczyna się sypać Twój tydzień/);
  assert.match(og, /TY OBSTAWIASZ/);
  assert.doesNotMatch(layout + og, /Ile dni w tygodniu jesteś w formie/);
});

test('głos nie produkuje taniej presji ani fałszywego claimu', () => {
  const text = doors.general + doors.hit;
  assert.doesNotMatch(text, /wystarczy ci chcieć|jak ci zależy|przegryw|jesteś leniwy/i);
  assert.doesNotMatch(text, /uzdrowię|wykryję przyczynę|zmierzę twoje hormony/i);
  assert.doesNotMatch(text, /Obstaw winnego|Zestawię ją z odpowiedziami/);
});
