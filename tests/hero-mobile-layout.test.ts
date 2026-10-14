import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// 2026-10-14: na telefonie (375 px) kicker general lamal sie na "RAZU" w osobnej linii,
// a pionowe wysrodkowanie zostawialo ~45% pustego ekranu nad blokiem hero.
const page = fs.readFileSync('app/diagnoza/page.tsx', 'utf8');
const css = fs.readFileSync('app/globals.css', 'utf8');

test('general kicker fits one line on mobile ("wynik od razu" stays under the CTA)', () => {
  const general = page.match(/general: '([^']+)',/)?.[1];
  assert.equal(general, 'Diagnostyka 168 · 5 min');
  assert.match(page, /th2: 'Talerz i Hantle · 5 min · wynik od razu'/);
  assert.match(page, /5 minut · bez maila · wynik od razu/);
});

test('intro hero is top-aligned on mobile, centered on desktop', () => {
  const wrapper = page.match(/<div className="dx-intro" style=\{\{([^}]*)\}\}>/)?.[1];
  assert.ok(wrapper, 'intro wrapper has dx-intro class');
  assert.doesNotMatch(wrapper, /justifyContent/);
  assert.match(css, /\.dx-intro \{\s*justify-content: center;/);
  assert.match(css, /@media \(max-width: 640px\) \{\s*\.dx-intro \{\s*justify-content: flex-start;/);
});
