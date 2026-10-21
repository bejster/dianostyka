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

// 2026-10-14 zrzut 1440x900: koncowka planu i sekcja z przyciskiem mialy 12.5-14.5 px w kolumnie 620 px,
// czytaly sie jak przypis. Od 900 px tekst rosnie do ok. 16 px, od 1100 px kolumna tresci ma 680 px.
// Mobile (pod 900 px) bez zmian.
test('desktop result ending reads at body size, mobile untouched', () => {
  const block = rx.match(/@media\(min-width:900px\)\{([\s\S]*?)\}\r?\n/)?.[1] ?? '';
  assert.ok(block, 'result has a 900px desktop typography block');
  const size = (sel: string) => {
    const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const m = block.match(new RegExp('(?:^|\\})' + esc + '\\{[^}]*font-size:([\\d.]+)px'));
    return m ? Number(m[1]) : 0;
  };
  assert.ok(size('.rx-demo li p') >= 16, 'plan step text >= 16px');
  assert.ok(size('.rx-demo li strong') >= 16.5, 'plan step title >= 16.5px');
  assert.ok(size('.rx-method-lead') >= 16, 'method lead >= 16px');
  assert.ok(size('.rx-expectation p') >= 16, 'expectation >= 16px');
  assert.ok(size('.rx-final-action>p') >= 16, 'CTA paragraph >= 16px');
  assert.ok(size('.rx-final-action .rx-fine') >= 14, 'IG line >= 14px');
  assert.match(rx, /\.rx-demo li p\{margin:0;color:\$\{C\.mute\};font-size:13\.5px/, 'mobile base size stays 13.5px');
  assert.match(rx, /@media\(min-width:1100px\)\{[^\n]*minmax\(0,680px\)/, 'desktop content column widened to 680px');
});
