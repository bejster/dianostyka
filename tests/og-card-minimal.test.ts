import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// 2026-10-14: karta linku w FB miała 4 warstwy tekstu na obrazie i ten sam nagłówek
// powtórzony w og:title. Obraz ma nieść jedno otwarte pytanie, tytuł drugie, opis krótki.
const OG = fs.readFileSync('app/api/og/route.tsx', 'utf8');
const LAYOUT = fs.readFileSync('app/layout.tsx', 'utf8');
const ROZJAZD = fs.readFileSync('app/rozjazd/page.tsx', 'utf8');
const publicOg = OG.slice(0, OG.indexOf('O tej godzinie pęka mój tydzień'));

test('publiczny OG bez osi kroków, podpisu i badge', () => {
  assert.doesNotMatch(publicOg, /PO PRACY|OBJAW|5 MIN · WYNIK OD RAZU|Zobacz, co najbardziej Ci ją zabiera/);
  assert.match(publicOg, /TY OBSTAWIASZ/);
  assert.match(publicOg, /TWÓJ TYDZIEŃ MÓWI/);
  assert.match(publicOg, /Gdzie pęka Twój tydzień\?/);
});

// 2026-10-14 v2 (/pp §14A ENTRY GATE): sama ciekawość to za mało. Wejście ma nieść
// tożsamość + stawkę (pętla zaczynania od nowa) i obietnicę tego, co realnie jest na
// ekranie wyniku ("Gdzie zaczynasz" + "Pierwszy ruch 72h").
test('obraz OG obiecuje to, co jest na ostatnim ekranie', () => {
  assert.match(publicOg, /Na końcu: od czego to się u Ciebie zaczyna i jeden ruch na 3 dni/);
  assert.equal(publicOg.split('{payoff}').length - 1, 2, 'linia obietnicy w general i th2');
});

test('og:title nie dubluje obrazu, opis krótki', () => {
  assert.match(LAYOUT, /const OG_TITLE = 'Pilnujesz się, a co poniedziałek zaczynasz od nowa\?';/);
  assert.match(ROZJAZD, /const OG_TITLE = 'Pilnujesz się, a co poniedziałek zaczynasz od nowa\?';/);
  assert.match(LAYOUT, /const OG_DESCRIPTION = 'Obstaw, co Ci psuje formę\. Wynik pokaże, czy masz rację\.';/);
  assert.match(ROZJAZD, /const OG_DESCRIPTION = 'Sen, apetyt czy weekend\? Wynik pokaże, od czego to się zaczyna\.';/);
  for (const src of [LAYOUT, ROZJAZD]) {
    const desc = src.match(/const OG_DESCRIPTION = '([^']+)'/);
    assert.ok(desc, 'brak OG_DESCRIPTION');
    assert.ok(desc[1].length <= 70, `opis za długi: ${desc[1].length}`);
    assert.match(src, /openGraph: \{\n    title: OG_TITLE,\n    description: OG_DESCRIPTION,/);
    assert.match(src, /card: 'summary_large_image',\n    title: OG_TITLE,\n    description: OG_DESCRIPTION,/);
  }
});
