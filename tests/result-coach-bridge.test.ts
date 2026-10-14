import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// 2026-10-14 audyt przejscia do naboru: spersonalizowany plan startu (4 kroki z jego wyniku) siedzial
// w zwinietym <details> POD przyciskiem, a przycisk stal ~10 ekranow od hero. Kto chcial prowadzenia,
// klikal w ciemno; kto nie klikal, nigdy nie zobaczyl, co by dostal.
const rx = fs.readFileSync('app/components/ResultExperience.tsx', 'utf8');
const beat6 = rx.match(/data-beat="6"[\s\S]*?<\/section>/)?.[0] ?? '';

test('personal start plan is visible before the CTA, not hidden in details', () => {
  assert.ok(beat6, 'beat 6 exists');
  const demo = beat6.indexOf('className="rx-demo"');
  const cta = beat6.indexOf('className="rx-final-action"');
  assert.ok(demo > -1 && cta > -1, 'demo and CTA exist');
  assert.ok(demo < cta, 'plan stands before the CTA');
  const before = beat6.slice(0, demo);
  const opened = (before.match(/<details/g) ?? []).length;
  const closed = (before.match(/<\/details>/g) ?? []).length;
  assert.equal(opened, closed, 'plan is not inside a collapsed <details>');
});

test('hero lets a nabor-route reader jump straight to the plan', () => {
  assert.match(rx, /data-beat="6"[^>]*id="plan-1na1"|id="plan-1na1"[^>]*data-beat="6"/);
  const hero = rx.match(/data-beat="1"[\s\S]*?<\/section>/)?.[0] ?? '';
  assert.match(hero, /route\.primary === 'nabor'[\s\S]*?href="#plan-1na1"/);
});

test('trust reassurance sits next to the CTA, not after it in a fold', () => {
  const cta = beat6.slice(beat6.indexOf('className="rx-final-action"'));
  assert.match(cta, /Nie musisz niczego wypełniać drugi raz/);
  assert.doesNotMatch(beat6, /Zobacz, co byłoby następnym krokiem/);
});
