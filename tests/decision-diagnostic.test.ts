import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getQuestions, cleanAnswers, updateAnswer, isComplete, buildDecisionResult, invitation,
  FIT_OPTIONS, OBJECTION_OPTIONS, resultAsText, type Answers,
} from '../app/lib/decision-diagnostic.ts';

const base: Answers = { goal: 'form', scene: 'training', before: 'work', context: 'extra', planned: 3, missed: 1, previous: 'plan', attempt: 'schedule', protect: 'family', impact: 'training', why: 'repeat' };
function finish(seed: Answers): Answers {
  let a = cleanAnswers(seed);
  for (let i = 0; i < 15; i++) {
    const q = getQuestions(a).find(q => a[q.id] === undefined);
    if (!q) return a;
    a = updateAnswer(a, q.id, q.type === 'number' ? 0 : q.options![0].id);
  }
  throw new Error('Unfinished path');
}

test('every scene, upstream answer and previous-attempt branch completes in 6 to 11 answers', () => {
  const scenes = getQuestions({}).find(q => q.id === 'scene')!.options!;
  const counts = new Set<number>();
  let paths = 0;
  for (const scene of scenes) {
    const before = getQuestions({ scene: scene.id }).find(q => q.id === 'before')?.options || [{ id: '', label: '' }];
    for (const b of before) {
      for (const previous of ['plan', 'calendar', 'small', 'support', 'none', 'unknown']) {
        for (const attempt of ['works', 'schedule', 'too_much', 'no_change', 'no_feedback', 'unknown']) {
          for (const count of [0, 1, 3]) {
            const a = finish({ ...base, scene: scene.id, before: b.id, previous, attempt, planned: count, missed: count, frequency: String(count) });
            assert.ok(isComplete(a));
            const q = getQuestions(a);
            assert.ok(q.length >= 6 && q.length <= 11);
            assert.equal(new Set(q.map(x => x.id)).size, q.length);
            for (const item of q) {
              assert.ok(item.job.length > 10 && item.downstream.length > 20);
              assert.ok(a[item.id] !== undefined);
            }
            const result = buildDecisionResult(a);
            assert.ok(result.title && result.experiment.action && result.experiment.observe && result.constraint);
            assert.equal(result.evidence.length, q.length);
            assert.doesNotMatch(resultAsText(a), /undefined|NaN|\[object Object\]|[—–]|, i /);
            counts.add(q.length); paths++;
          }
        }
      }
    }
  }
  assert.ok(paths > 2000);
  assert.ok(counts.has(6) && counts.has(11));
});

test('changing scene discards reused and hidden answers, retaining independent decisions', () => {
  const next = updateAnswer(base, 'scene', 'sleep');
  for (const id of ['before', 'planned', 'missed', 'frequency', 'impact']) assert.equal(next[id], undefined);
  assert.equal(next.goal, 'form');
  assert.equal(next.previous, 'plan');
  assert.equal(next.protect, 'family');
  assert.equal(isComplete(next), false);
});

test('fewer planned trainings invalidates a now-impossible missed count; zero removes the question', () => {
  const next = updateAnswer({ ...base, missed: 3 }, 'planned', 1);
  assert.equal(next.missed, undefined);
  assert.equal(getQuestions(next).find(q => q.id === 'missed')!.max, 1);
  const zero = updateAnswer(base, 'planned', 0);
  assert.equal(zero.missed, undefined);
  assert.equal(getQuestions(zero).some(q => q.id === 'missed'), false);
});

test('zero missed trainings and unknown frequency never become evidence of failure', () => {
  assert.equal(buildDecisionResult({ ...base, missed: 0 }).certainty, 'observation');
  for (const frequency of ['0', 'unknown']) {
    const r = buildDecisionResult(finish({ ...base, scene: 'food', before: 'meal', frequency }));
    assert.equal(r.certainty, 'observation');
    assert.equal(r.experiment.id, 'observe');
  }
});

test('a working previous attempt overrides the urge to prescribe a new intervention', () => {
  const r = buildDecisionResult({ ...base, attempt: 'works' });
  assert.equal(r.certainty, 'maintain');
  assert.equal(r.experiment.id, 'maintain');
  assert.doesNotMatch(r.previous, /brakowało|odpuściłeś|poraż/);
});

test('a good week without previous attempts does not invent an existing change', () => {
  const r = buildDecisionResult(finish({ ...base, scene: 'steady', previous: 'none' }));
  assert.equal(r.certainty, 'maintain');
  assert.doesNotMatch(r.experiment.action, /obecną zmianę/);
});

test('no observed progress triggers an evidence review, including after an otherwise good week', () => {
  for (const scene of ['training', 'steady']) {
    const r = buildDecisionResult(finish({ ...base, scene, attempt: 'no_change' }));
    assert.equal(r.experiment.id, 'review');
    assert.equal(r.certainty, 'observation');
    assert.match(r.experiment.action, /jak długo/);
  }
});

test('upstream answers change the actual experiment, not just a report label', () => {
  const work = buildDecisionResult(base);
  const family = buildDecisionResult({ ...base, before: 'family' });
  assert.notEqual(work.experiment.id, family.experiment.id);
  assert.notEqual(work.experiment.action, family.experiment.action);
  const unknown = buildDecisionResult({ ...base, before: 'unknown' });
  assert.equal(unknown.certainty, 'observation');
});

test('single occurrences stay single and weekend observation uses the next weekend', () => {
  assert.match(buildDecisionResult(base).hypothesis, /pojedynczy przypadek/);
  const r = buildDecisionResult(finish({ ...base, scene: 'weekend', before: 'unknown', frequency: '1' }));
  assert.match(r.experiment.action, /najbliższym weekendzie/);
  assert.doesNotMatch(r.experiment.action, /trzy dni/);
  assert.equal(r.evidence.find(e => e.id === 'frequency')!.value, '1');
});

test('goal, cost, constraint, previous attempt and why-now each change a downstream recommendation', () => {
  const original = buildDecisionResult(base);
  for (const [answer, value, field] of [
    ['goal', 'sleep', 'goalMetric'], ['protect', 'rest', 'constraint'],
    ['impact', 'none', 'impact'], ['previous', 'small', 'previous'],
    ['attempt', 'too_much', 'previous'], ['why', 'curious', 'timing'],
  ] as const) assert.notEqual(buildDecisionResult({ ...base, [answer]: value })[field], original[field]);
});

test('previous-attempt outcome is removed when changing the previous attempt', () => {
  for (const previous of ['none', 'unknown', 'support']) {
    const a = updateAnswer(base, 'previous', previous);
    assert.equal(a.attempt, undefined);
    assert.equal(getQuestions(a).some(q => q.id === 'attempt'), previous === 'support');
  }
});

test('untrusted saved answers cannot inject prose, synthetic scores or impossible counts', () => {
  const raw = { ...base, score: 100, symptoms: ['libido'], before: '<script>', planned: 1.5, missed: 7 };
  const a = cleanAnswers(raw);
  for (const key of ['score', 'symptoms', 'before', 'planned', 'missed']) assert.equal(a[key], undefined);
  assert.equal(isComplete(a), false);
  assert.deepEqual(cleanAnswers(null), {});
  assert.deepEqual(cleanAnswers([]), {});
});

test('medical fit does not invite to coaching, while a self-directed choice remains autonomous', () => {
  assert.equal(invitation('medical', '', 'ready').showNabor, false);
  assert.match(invitation('self', '', 'repeat').text, /Masz pierwszy krok/);
  assert.match(invitation('', '', 'curious').text, /najpierw sprawdzić ten krok sam/);
});

test('every stated objection produces a distinct relevant invitation without scores or readiness claims', () => {
  const messages = new Set(OBJECTION_OPTIONS.map(o => invitation('coaching', o.id, 'repeat').text));
  assert.equal(messages.size, OBJECTION_OPTIONS.length);
  assert.match(invitation('coaching', 'price', 'ready').cta, /pełny koszt/);
  for (const f of FIT_OPTIONS) for (const o of OBJECTION_OPTIONS) {
    const invite = invitation(f.id, o.id, 'curious');
    assert.doesNotMatch(invite.text, /jesteś gotowy|kwalifikujesz|gwarantuję|, i |[—–]/i);
  }
});
