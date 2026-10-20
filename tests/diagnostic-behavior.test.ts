import assert from 'node:assert/strict';
import test from 'node:test';
import { QUESTIONS } from '../app/lib/assessment-config.ts';
import { invalidDiagnosticFields } from '../app/lib/lead-integrity.ts';
import { answersToFD } from '../app/lib/answers-to-fd.ts';

export function completeAnswers(): Record<string, unknown> {
  const a: Record<string, unknown> = {};
  for (const q of QUESTIONS) {
    if (q.optional || (q.condition && !q.condition(a))) continue;
    if (q.type === 'single') a[q.id] = q.options![0].id;
    else if (q.type === 'multi') a[q.id] = [q.options![0].id];
    else if (q.type === 'slider' || q.type === 'number') a[q.id] = q.min ?? 0;
    else if (q.type === 'text') a[q.id] = 'Po pracy brakuje mi energii na trening i przygotowanie jedzenia.';
    else if (q.type === 'contact') a[q.id] = 'qa.synthetic_2026';
  }
  return a;
}

test('every visible required field rejects absent and whitespace answers', () => {
  const a = {...completeAnswers(), planned_trainings:3, missed_trainings:0, weekend_pattern:'wp_reset', weekend_cash:0};
  assert.deepEqual(invalidDiagnosticFields(a), []);
  for (const q of QUESTIONS.filter(q=>!q.optional && (!q.condition || q.condition(a)))) {
    for (const bad of [undefined, null, '', '   ', '\t\n']) {
      assert.ok(invalidDiagnosticFields({...a,[q.id]:bad}).includes(q.id), q.id);
    }
  }
});
test('missed training count cannot exceed the declared plan', () => {
  assert.ok(invalidDiagnosticFields({...completeAnswers(),planned_trainings:1,missed_trainings:7}).includes('missed_trainings'));
});
test('changing a branch cannot preserve hidden answers in the result', () => {
  const a = completeAnswers();
  const stale = {...a,missed_trainings:7,weekend_cash:800,sleep_hours:3,screen_bed:'sb_fallasleep'};
  assert.deepEqual(answersToFD(stale), answersToFD(a));
});

test('numeric answers reject out-of-range, non-finite, wrong step and strings', () => {
 const a={...completeAnswers(),planned_trainings:3,missed_trainings:0,weekend_pattern:'wp_reset',weekend_cash:0};
 for(const q of QUESTIONS.filter(q=>(q.type==='slider'||q.type==='number')&&(!q.condition||q.condition(a)))){
  for(const bad of [NaN,Infinity,-Infinity,String(q.min??0),(q.min??0)-(q.step??1),(q.max??1000)+(q.step??1),(q.min??0)+(q.step??1)/3]){
   assert.ok(invalidDiagnosticFields({...a,[q.id]:bad}).includes(q.id),`${q.id}: ${String(bad)}`);
  }
 }
});
