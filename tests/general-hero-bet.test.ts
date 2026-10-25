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

test('general mówi pełnym zdaniem, nie ciągiem sloganów', () => {
  assert.match(field('general', 'headline'), /Siemano :D/);
  assert.match(field('general', 'body'), /Bo wiesz,/);
  assert.match(field('general', 'body'), /No dobra, tylko co się działo wcześniej/);
  assert.match(field('general', 'body'), /Bo ja bym właśnie od tego zaczął/);
  assert.match(field('general', 'proof'), /Na koniec pokażę Ci, co ja bym sprawdził jako pierwsze i dlaczego/);
  assert.equal(field('general', 'cta'), 'Dobra, sprawdzam');
  assert.doesNotMatch(doors.general, /accent:/, 'bez sztucznego sloganu złotą kursywą');
  assert.doesNotMatch(doors.general, /Twój plan działa|Jakby kolejny czwartek|Obstaw winnego/);
});

test('mobile: naturalne 2 akapity, bez eseju i pogrubionej reklamy', () => {
  const b = field('general', 'body');
  const p = field('general', 'proof');
  const words = (b + ' ' + p).trim().split(/\s+/).length;
  assert.ok(words >= 35 && words <= 70, `pod H1 ${words} słów, oczekiwano 35–70`);
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

test('HiT oraz TH2 nie mieszają języka i celu', () => {
  assert.match(field('hit', 'headline'), /Siemano :D/);
  assert.match(field('hit', 'body'), /No dobra, tylko po co od razu zmieniać trening/);
  assert.match(field('hit', 'proof'), /pokażę Ci/);
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

test('głos nie powtarza technicznego hasła ani sztucznego przeciwstawienia', () => {
  const text = doors.general + doors.hit;
  assert.doesNotMatch(text, /—|naprawdę|, i /);
  assert.doesNotMatch(text, /To nie .*, to /);
  assert.doesNotMatch(text, /naprawiasz nie ten moment|Zestawię ją z odpowiedziami/);
});
