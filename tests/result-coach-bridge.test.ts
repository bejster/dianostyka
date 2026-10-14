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

test('trust reassurance sits right above the CTA, not after it in a fold', () => {
  const cta = beat6.indexOf('className="rx-final-action"');
  const reassure = beat6.indexOf('Nie każę Ci opisywać od nowa');
  assert.ok(reassure > -1 && reassure < cta, 'reassurance stands before the CTA');
  assert.doesNotMatch(beat6, /Zobacz, co byłoby następnym krokiem/);
});

// 2026-10-14 zrzuty z telefonu: koncowka byla o ekran za dluga przez dwa powtorzenia.
test('closing section does not repeat what the reader already saw', () => {
  const step02 = beat6.match(/rx-demo-n">02[\s\S]*?<\/li>/)?.[0] ?? '';
  assert.ok(step02, 'step 02 exists');
  assert.doesNotMatch(step02, /experiment\.action|experiment\.observe/, 'step 02 does not repeat the 72h task from the result card');
  assert.equal((beat6.match(/drugi raz|od nowa/g) ?? []).length, 1, 'reassurance about not filling twice appears once');
});
