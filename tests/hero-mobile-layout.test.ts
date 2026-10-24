import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// 2026-10-14: na telefonie (375 px) kicker general lamal sie na "RAZU" w osobnej linii,
// a pionowe wysrodkowanie zostawialo ~45% pustego ekranu nad blokiem hero.
const page = fs.readFileSync('app/diagnoza/page.tsx', 'utf8');
const css = fs.readFileSync('app/globals.css', 'utf8');

test('general kicker fits one line on mobile ("wynik od razu" stays under the CTA)', () => {
  const general = page.match(/general: '([^']+)',/)?.[1];
  assert.equal(general, 'Mapa 168 · Hantle i Talerz');
  assert.match(page, /th2: 'Mapa 168 · Talerz i Hantle'/);
  assert.match(page, /5 minut · bez maila · wynik od razu/);
});

test('kicker and lede scale up on desktop, mobile sizes unchanged', () => {
  assert.match(page, /className="dx-kicker"/);
  assert.match(page, /className="dx-lede"/);
  assert.match(css, /\.dx-kicker \{\s*font-size: 10\.2px;/);
  assert.match(css, /\.dx-lede \{\s*font-size: 15\.8px;/);
  const desk = css.match(/@media \(min-width: 900px\) \{([\s\S]*?)\n\}/)?.[1] ?? '';
  const k = Number(desk.match(/\.dx-kicker \{\s*font-size: ([\d.]+)px/)?.[1]);
  const l = Number(desk.match(/\.dx-lede \{\s*font-size: ([\d.]+)px/)?.[1]);
  assert.ok(k >= 12 && l >= 18, `desktop kicker ${k}px, lede ${l}px`);
});

test('intro hero is top-aligned on mobile, centered on desktop', () => {
  const wrapper = page.match(/<div className="dx-intro" style=\{\{([^}]*)\}\}>/)?.[1];
  assert.ok(wrapper, 'intro wrapper has dx-intro class');
  assert.doesNotMatch(wrapper, /justifyContent/);
  assert.match(css, /\.dx-intro \{\s*justify-content: center;/);
  assert.match(css, /@media \(max-width: 640px\) \{\s*\.dx-intro \{\s*justify-content: flex-start;/);
});
